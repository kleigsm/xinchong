# 2026-11-22 · P1-12 快捷面板（第一版）

## 目标

桌宠右键不再弹 Electron 原生 `Menu`，改成一张独立 HTML 卡片：**4 个动作 + 性格 + 音量 + 静音/勿扰 + 打开控制中心**。
设计稿见 [`docs/design/quick-panel-request.md`](../design/quick-panel-request.md) 与 `docs/design/mockups/shots/quick-panel.png`。

## 为什么是独立窗口

桌宠窗口是「透明 + 整窗穿透 + 只放行角色命中圆」。在里面画菜单要再折腾一遍命中区域（输入条/浮球都踩过）。
独立窗口没有穿透问题，失焦即关，还能直接放滑杆和开关——顺带把 **BUG-013（原生菜单点外部不关）** 一起解决。

## 实现

| 文件 | 内容 |
|---|---|
| `src/main/quick-panel.ts` | 面板窗口（320×420 透明、无边框、置顶）、按光标定位 + 越界翻转 + 夹取、失焦 120ms 后隐藏、IPC |
| `src/renderer/quick-panel/` | `index.html` / `quick-panel.css` / `quick-panel.ts`，复用设置页配色 |
| `src/preload/index.ts` | `window.pet.openQuickPanel()` + `window.quickPanel`（getState / patchSettings / setPersonality / action / openSettings / close / quit） |
| `src/renderer/main.ts` | 右键从 `showMenu()` 改为 `openQuickPanel()` |
| `electron.vite.config.ts` | 渲染层新增 `quick-panel` 页面 |

### 定位

```
默认：面板在光标右上方（点 + 8, - 420 - 8）
右边放不下 → 翻到光标左侧
上面放不下 → 翻到光标下方
最后夹进当前显示器工作区
```

坐标全程用 DIP（`screen.getCursorScreenPoint()` + `workArea`），不做缩放换算。

### 关闭

- 点外部：窗口 `blur` → 延迟 120ms 隐藏
- Esc：渲染层 `keydown` → `quickPanel.close()`
- 点动作 / 打开控制中心 / 退出：各自处理完顺手关

## 验证（开发版，125% 缩放）

| 项 | 结果 |
|---|---|
| 右键桌宠 → 面板出现在光标右上方 | ✅ 日志 `[quick-panel] open at (928,248) from cursor (1256,676)` |
| 点「招手」 | ✅ 面板关闭，状态机 `idle → wave`，气泡「拜拜拜拜！」 |
| 点「静音」 | ✅ 开关变橙、状态行变「开朗 · 静音」、`settings.json` `muted=true` |
| 点外部 | ✅ 面板消失 |
| 按 Esc | ✅ 面板消失 |
| 点「打开控制中心」 | ✅ 设置窗口打开（日志 `[settings] ready-to-show`） |
| `pnpm typecheck` / `build` / `test` | ✅ 11 个单测全过 |

## 与设计稿的偏差（第一版刻意砍的）

| 设计稿 | 第一版 | 原因 |
|---|---|---|
| 4 动作含「睡觉」 | 改成「伸懒腰」 | 状态机没有对外暴露「立即入睡」，伸懒腰已有 `play-action` 通道；睡觉要另加 IPC |
| 毛玻璃 | 纯色卡片（`#fffdfb`） | `backdrop-filter` 在透明窗口上会拉高合成成本，先不碰性能红线 |
| 头像用角色图 | 渐变色块 + 「芯」 | 取角色缩略图要跨进程传 data URL，二轮再做 |
| 选中性格后显示"使用中" | ✅ 已实现 | — |

## 已知限制 / 二轮

- 面板高度 420，内容只占 ~340，底部有一段空隙（可缩到 390）
- 多屏 / 150% 缩放**没实测**（只有单屏 125%）
- 加载失败时只打日志，没有回落原生菜单（设计稿要求回落）
- 键盘只能 Tab + Esc，没有方向键导航
- 托盘菜单仍是原生（按设计保留）

## 下一步

- 二轮：睡觉动作、角色头像、加载失败回落、多屏实测
- BUG-013 可关闭：桌宠右键已不走原生菜单
