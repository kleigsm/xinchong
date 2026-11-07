# 任务书 · 外观分区（透明度 / 动画速度 / 置顶）

**负责人**：待定（派给子对话）
**分支**：`feat/appearance-section`
**估时**：半天
**性质**：代码任务

---

## 一、要做什么

设置面板已经有 7 个分区，缺一个「外观」——用户在"它长什么样"上还没得选。

新增三项：

| 设置 | 控件 | 范围 | 默认 |
|---|---|---|---|
| 透明度 | 滑块 | 50% – 100% | 100% |
| 动画速度 | 分段：0.5× / 1× / 2× | — | 1× |
| 始终置顶 | 开关 | — | 开 |

---

## 二、每一项怎么做

### 1. 透明度

渲染层直接改 `#pet` 的 `opacity`：

```ts
petEl.style.opacity = String(settings.petOpacity);
```

⚠️ 注意：**透明窗口里 opacity 太低会让人以为它消失了**，下限设 0.5，且提示文字要说明。

### 2. 动画速度

影响雪碧图播放帧率。`PetView` 现在从 `spec.fps` 读帧率，改成乘一个系数：

```ts
const fps = spec.fps * this.speedFactor;
```

`speedFactor` 由 `PetView` 的 setter 设置（0.5 / 1 / 2）。

⚠️ 注意：**必须先看 `docs/perf-baseline.md` 的第八节**——
CSS 动画在透明窗口上跑 60fps 会让 CPU 从 5% 涨到 25%。
所以 2× 不要把 fps 提到很高，8fps × 2 = 16fps 是上限，别超过 20。

### 3. 始终置顶

主进程直接调 `win.setAlwaysOnTop(settings.alwaysOnTop)`。

⚠️ 注意：关掉置顶后，桌宠会被其他窗口盖住——这是预期行为，但要在设置页写清楚。

---

## 三、要改的文件

| 文件 | 改什么 |
|---|---|
| `src/shared/types.ts` | Settings 加 `petOpacity: number`、`animationSpeed: number`、`alwaysOnTop: boolean` |
| `src/main/store.ts` | 加三个默认值 |
| `src/main/api.ts` | 在 `api:settings:patch` 之后应用 `setAlwaysOnTop`（或用已有的 settings-changed 广播） |
| `src/renderer/pet-view.ts` | 加 `setSpeed(factor)`；fps 计算乘系数 |
| `src/renderer/main.ts` | `applySettings` 里应用透明度与速度 |
| `src/renderer/settings/settings.ts` | 新增 `pageAppearance()` + 导航项 |
| `src/renderer/settings/index.html` | 导航加「外观」 |
| `docs/STATUS.md` / `docs/log/` | 按规矩更新 |

---

## 四、验收

- [ ] 设置里出现「外观」分区，三项都能改
- [ ] 改透明度 → 桌宠立即变淡/恢复
- [ ] 改动画速度 → 待机动画明显变快/变慢
- [ ] 关置顶 → 打开别的窗口能盖住它；再开回来 → 又浮在最上面
- [ ] 三项都能持久化，重启后保持
- [ ] **测 CPU**：2× 速度下空闲 CPU 不超过 8%（超过就是 fps 给太高了）
- [ ] `pnpm typecheck` / `pnpm build` 通过

---

## 五、边界与冲突

今天并行的其他任务（T1 测试清单、C1 台词、P3-4 演示材料）**都不改代码**，
所以你改这些文件不会和别人冲突。

但 `main` 有分支保护，**必须走 PR**。

---

## 六、参考

- 设置面板的写法看 `src/renderer/settings/settings.ts`（已有 7 个页面照抄结构）
- 设置字段与 IPC 看 `src/shared/types.ts` 和 `src/main/api.ts`
- 性能红线看 `docs/perf-baseline.md` 第八节

---

## 七、提交规矩

1. 分支 `feat/appearance-section`
2. PR 标题 `[P1-8] 外观分区：透明度 / 动画速度 / 置顶`
3. 更新 `docs/STATUS.md` + 新增 `docs/log/<日期>-appearance.md`
4. PR 描述里贴三张截图：透明度 60%、2× 速度、关置顶后别的窗口盖住它
