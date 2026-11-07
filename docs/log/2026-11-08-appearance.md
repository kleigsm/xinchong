# 2026-11-08 · P1-8b 外观分区（透明度 / 动画速度 / 置顶）

## 目标

设置面板已经有 7 个分区，缺一个「外观」——用户在"它长什么样"上还没得选。
任务书见 [`docs/tasks/p1-8b-appearance.md`](../tasks/p1-8b-appearance.md)。

三项：透明度 50–100%（默认 100%）、动画速度 0.5× / 1× / 2×（默认 1×）、始终置顶（默认开）。
硬要求：**2× 速度下空闲 CPU 不超过 8%**（透明窗口每帧合成成本很高，见 perf-baseline 第八节）。

## 改了什么

| 文件 | 改什么 |
|---|---|
| `src/shared/types.ts` | `Settings` 加 `petOpacity` / `animationSpeed` / `alwaysOnTop` |
| `src/main/store.ts` | 三个默认值：1 / 1 / true |
| `src/main/window.ts` | `createMainWindow(alwaysOnTop)`；抽出 `applyAlwaysOnTop()` |
| `src/main/api.ts` | `settings:patch` 收到 `alwaysOnTop` 立刻应用；「恢复默认」也一并重置并应用 |
| `src/main/index.ts` | 启动时按设置创建窗口 |
| `src/main/tray.ts` | 托盘重新显示时不再无条件置顶 |
| `src/renderer/pet-view.ts` | `setSpeed()` / `setOpacity()`；帧率乘倍速并封顶 |
| `src/renderer/main.ts` | `applySettings` 里接上速度与透明度 |
| `src/renderer/settings/settings.ts` + `index.html` | 新增「外观」页（第 3 个导航项） |

## 三个实现上的坑（都是"照任务书抄会出错"的地方）

### 1. 透明度不能直接写 `petEl.style.opacity`

任务书给的写法是 `petEl.style.opacity = String(settings.petOpacity)`。
但 `PetView` 在 `stop()`、睡觉帧（`renderStatic`）里**每帧都会重写 opacity**，
外部设一次，下一次状态切换就被覆盖回 1——表现为"调完透明度过一会儿自己变回去"。

改法：由 `PetView` 持有 `baseOpacity`，所有写 opacity 的地方都从它算：
睡觉帧是 `baseOpacity * 0.94`，其余是 `baseOpacity`，`stop()` 也回到 `baseOpacity`。

### 2. 置顶有四条入口，漏一条就会"关掉又自己弹回来"

创建窗口、托盘隐藏后重新显示、设置里切换、恢复默认设置——四处都碰过 `setAlwaysOnTop`。
第二处原来写死了 `setAlwaysOnTop(true, "screen-saver")`，只改设置页的话，
用户点一下托盘图标置顶就复活了。

改法：主进程只保留一个 `applyAlwaysOnTop(win, on)`，四处统一走它。

### 3. 2× 不是"帧率翻倍"就完事

待机基准 4fps，2× 就是 8fps。实测**空闲 CPU 10.2%**，直接踩穿 8% 红线
（比 perf-baseline 记的 6fps→5.89% 还高，因为透明窗口的合成成本随帧数线性涨）。

改法：**循环动画（待机 / 拖拽 / 睡觉）在 2× 下封顶 6fps**，
一次性动作（点击 / 招手 / 摸头 / 生气）播完就回待机，不封顶，仍然是完整 2×。
封顶后实测 3.0–4.1%，留出余量。

## 实测

| 验收项 | 结果 | 证据 |
|---|---|---|
| 「外观」分区出现，三项可改 | ✅ | 截图 `docs/shots/appearance/settings-60.png` |
| 改透明度立即变淡/恢复 | ✅ | `getComputedStyle(pet).opacity = 0.6`；对比图 `pet-opacity-60.png` / `pet-opacity-100.png` |
| 改速度立即变快/变慢 | ✅ | DOM 采样：1× = 4fps，2× = 6fps（封顶生效） |
| 关置顶 → 别的窗口盖住它 | ✅ | 窗口样式 `WS_EX_TOPMOST` 清零；激活普通窗口后完全被盖住 `ontop-off-covered.png` |
| 再开置顶 → 又浮在最上面 | ✅ | `ontop-on.png` |
| 三项持久化，重启保持 | ✅ | `settings.json` 写入 `petOpacity/animationSpeed/alwaysOnTop`，重启后读到 |
| **2× 空闲 CPU ≤ 8%** | ✅ | 30s 差分：**3.0% / 4.1%**（封顶前 8fps 为 10.2%） |
| `pnpm typecheck` / `pnpm build` / `pnpm test` | ✅ | 10 个单测全过 |

### 测量方法（这次特意换了口径）

`app.getAppMetrics()` 的 `percentCPUUsage` 在窗口被遮挡时会给 **0.2–0.4%** 的假数
（和 perf-baseline 的 5.89% 差了 20 倍，明显不可信）。
所以这次改用：**对 electron 进程树的 CPU 时间做 30 秒差分**，
并且在测量窗口前后各截两张图比对像素，确认桌宠**真的在动**——
否则测到的是"窗口被挡住、根本没在画"的空转。

## 已知限制

- **2× 下循环动画实际是 6fps（1.5×）**，不是严格 2×。要两者兼得，需要
  perf-baseline 第六节说的「精灵条 + transform」改造（把 background-position 换成 GPU 合成），
  那是 P1-10 的活，不在本任务。
- 透明度下限 0.5 写死在 `pet-view.ts`，没做成可配置。
- 截图为 125% 缩放下的物理像素，和逻辑坐标不是 1:1（拼 PR 时别对不上）。

## 下一步

- 合并后，P1-10 的二次优化优先做精灵条，把 2× 的 6fps 上限解开。
- 「外观」页后续可加：窗口大小、置顶层级（普通 / screen-saver）。
