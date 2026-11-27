# 2026-11-27 · 桌宠光晕自定义

## 问题

原来光晕是 `#pet` 上的 `drop-shadow`，但 L2 动画类为了性能都把 `filter` 关掉了：

```css
#pet { filter: drop-shadow(0 6px 14px rgba(201, 79, 112, 0.35)); }
#pet.anim-idle { filter: none; }
```

结果是：**颜色写死、动画时几乎没有光晕、用户改不了**。

## 方案

新增独立的 `#pet-glow` 层，放在 `#pet` 后面：

- **纯径向渐变，不加 `filter: blur`**：透明 Electron 窗口上 blur 会合成出灰黑底
- 渐变末端用**同色的 0 透明度**（`rgb(var(--glow-rgb) / 0)`），不用 `transparent`（透明黑）
- 不做 transform / will-change 动画，避免再生成带黑底的合成层
- 颜色/强度只换 CSS 变量：`--glow-rgb` / `--glow-alpha`
- `#pet` 完全不碰 filter，L2/L3 动画期间光晕也保留

## 设置项

| 字段 | 默认 | 说明 |
|---|---|---|
| `glowEnabled` | true | 显示光晕 |
| `glowFollow` | true | 跟随性格：害羞粉 / 开朗橙 / 傲娇玫红 |
| `glowColor` | `#F06C8A` | 自定义颜色（关闭跟随后生效） |
| `glowIntensity` | 0.55 | 0–1 强度 |

外观页新增「桌宠光晕」卡片：

- 8 个预设色：樱花粉 / 蜜桃橙 / 柠檬黄 / 薄荷 / 天空蓝 / 薰衣草 / 月白 / 墨夜
- 系统取色器 + HEX 输入 + 吸管取色（EyeDropper，失败提示）
- 强度滑杆；0% 等同关闭
- 跟随性格时禁用自定义控件并提示

## 文件

- `src/shared/types.ts`、`src/main/store.ts`
- `src/renderer/index.html`、`src/renderer/style.css`
- `src/renderer/main.ts`
- `src/renderer/settings/settings.ts`、`settings.css`

## 验证

- `pnpm typecheck` ✅
- `pnpm test` 71/71 ✅
- `pnpm build` ✅
- 实机：
  - `glowFollow=true` → 粉色光晕
  - `glowFollow=false, glowColor=#5EE0B8` → 薄荷色光晕
  - 设置页控件渲染正常：色板、HEX、吸管、强度
- 光晕层 `pointer-events:none`，不挡点击

## 补充修复（2026-11-28）

- **双击摸头失效**：光晕比角色宽 64px，落在命中圆外，`HIT_RADIUS` 82 → 105，覆盖光晕边缘；实测双击日志 `idle → click → pat`
- **最大强度椭圆硬边**：渐变默认 `farthest-corner`，元素左右边缘还没到 0；改成 `ellipse closest-side`，末端 100% 同色 0 透明，边缘完全淡出
- **取色器被桌宠盖住**：桌宠是 `screen-saver` 层级，设置窗口原普通层级；设置窗口 `ready-to-show` 时也设为 `screen-saver` 并聚焦，色板/取色器不再被桌宠覆盖

## 遗留

- 控制中心（沉浸式导航）落地后，光晕卡片要迁到新外观页
- 吸管取色在无 EyeDropper 的旧系统上只提示，不降级
- 还没做“取当前角色主色”的自动取色
