# 桌宠光晕：自定义颜色与调色板

> 实现状态：✅ 2026-11-27 已落地（独立 #pet-glow 层 + 设置页控件）。

> 目标：用户可开关光晕、跟随性格、或用调色板/HEX/吸管自定义颜色与强度。
> 分工：C 线出设计与验收；B 线实现设置项、光晕层与播放器联动。

---

## 一、现状

```css
#pet {
  filter: drop-shadow(0 6px 14px rgba(201, 79, 112, 0.35));
}
#pet.anim-idle { filter: none; }
#pet.anim-click { filter: none; }
/* drag / sleep 同样被关掉 */
```

问题：

- 颜色写死粉色，用户不能改
- 所有 L2 动画类都把 `filter` 关掉了，所以**动画时几乎没有光晕**
- 直接把 `filter` 加回动画元素会强制每帧重新栅格化，
  之前实测 GPU 2% → 35%、CPU 6% → 43%，不能这么做

---

## 二、方案：独立光晕层

新增一层 `#pet-glow`，放在 `#pet` 后面：

```html
<div id="pet-glow" aria-hidden="true"></div>
<div id="pet">…</div>
```

```css
#pet-glow {
  position: absolute;
  left: 50%;
  bottom: 8px;
  width: 220px;
  height: 140px;
  margin-left: -110px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at 50% 55%,
    rgba(var(--glow-rgb), calc(var(--glow-alpha) * 1.0)) 0%,
    rgba(var(--glow-rgb), calc(var(--glow-alpha) * 0.45)) 42%,
    transparent 72%
  );
  filter: blur(18px);
  opacity: var(--glow-enabled);
  pointer-events: none;
  z-index: 0;
  transition: opacity 240ms ease;
}

#pet { z-index: 1; }
```

要点：

- **不碰 `#pet` 的 `filter`**，动画照常走合成器
- 光晕层只做静态渐变 + 一次 blur，不参与每帧重绘
- 颜色通过 CSS 变量注入，切换无需重建 DOM
- 呼吸起伏只动 `#pet-glow` 的 `transform: scale()` / `opacity`，成本低
- `prefers-reduced-motion` 下关闭起伏

### 轮廓光（后续可选）

如果以后要“贴着轮廓”的光，再用 `mask-image` 复制宠物 alpha 做彩色剪影；
P1 先做径向光晕，性能和兼容性最稳。

---

## 三、设置项

```ts
interface Settings {
  glowEnabled: boolean;   // 默认 true
  glowFollow: boolean;    // 默认 true，跟随性格
  glowColor: string;      // 默认 "#F06C8A"
  glowIntensity: number;  // 0–1，默认 0.55
}
```

跟随性格时的颜色：

| 性格 | 光晕 |
|---|---|
| 害羞 shy | `#F06C8A` 樱花粉 |
| 开朗 cheerful | `#FF9A62` 蜜桃橙 |
| 傲娇 tsundere | `#E85D8A` 玫红 |

- `glowFollow=true` 时忽略 `glowColor`，但保留用户上次自定义值
- `glowIntensity=0` 等价关闭
- 光晕只作用于桌宠窗口，不影响控制中心

---

## 四、调色板 UI

见 [`mockups/shots/glow-picker.png`](mockups/shots/glow-picker.png)（深色见 `glow-picker-dark.png`）。

设置 → 外观 → 桌宠光晕：

1. **显示光晕** 开关
2. **跟随性格** 开关
3. **预设颜色**：8 个色点
   - 樱花粉 `#F06C8A`
   - 蜜桃橙 `#FF9A62`
   - 柠檬黄 `#FFD166`
   - 薄荷 `#5EE0B8`
   - 天空蓝 `#62B6FF`
   - 薰衣草 `#B08CFF`
   - 月白 `#F2E9E4`
   - 墨夜 `#2E2521`
4. **自定义**：
   - 原生 `<input type="color">` 色块（系统取色器）
   - HEX 输入（校验 `#RRGGBB`）
   - **吸管取色**：`EyeDropper` API，失败时隐藏/提示
5. **强度**：0–100% 滑杆
6. **最近使用**：5 个最近颜色
7. **恢复默认**

### 交互细节

- 改色实时预览，不需要“保存”按钮
- 预设点选中后有外环 + 勾
- 跟随性格开启时，色板置灰并显示当前性格色
- 颜色太接近浅色背景时，预览区自动加一圈淡描边
- 失焦/关闭设置时自动持久化（走现有 `patchSettings`）

---

## 五、性能验收

- 空闲 CPU 与旧版持平（±1%）
- L2 呼吸/点击/拖拽/睡觉期间光晕不消失
- 光晕层不拦截鼠标（`pointer-events:none`）
- 切换颜色/强度无闪烁
- 低端机可降低 blur 半径（可选 `glowQuality`）

---

## 六、B 线改动

| 文件 | 改动 |
|---|---|
| `src/renderer/index.html` | 加 `#pet-glow` |
| `src/renderer/style.css` | 光晕层样式 + 变量 |
| `src/renderer/main.ts` | 应用 `glow*` 设置、监听变化 |
| `src/renderer/settings/settings.ts` | 外观页新卡片、色板/HEX/吸管/滑杆 |
| `src/shared/types.ts` | 4 个字段 |
| `src/main/store.ts` | 默认值 |
| `src/preload` | 无需新增 API（复用 patchSettings） |

---

## 七、验收清单

- [ ] 开关能立即隐藏/显示光晕
- [ ] 跟随性格切换三套角色，颜色正确
- [ ] 关闭跟随后，预设 8 色都能用
- [ ] 自定义色块 / HEX / 吸管三种方式都能改色
- [ ] 强度 0–100% 连续可调
- [ ] 重启后设置保留
- [ ] L2/L3 所有动作期间光晕正常
- [ ] 空闲 CPU 无明显上升
- [ ] 浅色/深色主题下都好看
