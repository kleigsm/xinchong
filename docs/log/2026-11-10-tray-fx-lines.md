# 2026-11-10 · 托盘切回内置 / 通用特效 / 台词去重

## 1. BUG-010 自定义角色下切不回内置形象

**根因**：`src/main/tray.ts` 的「性格」菜单只调 `updateSettings({ personality })`，
没有清 `activePetId`；渲染层 `applySettings` 又有 `if (!usingUserPet)` 守卫，所以跳过切换。

**修复**：菜单点击改走 `useBuiltInPet(win, personality.id)`，统一清设置 + 发 `pet:builtin`。

**验证**：自定义角色状态下从右键菜单切换，`settings.json` 里 `activePetId` 变为 `null`，形象切回内置。

## 2. 通用动作小特效（click / pat / angry）

- 新增 `src/renderer/fx.ts` + `#fx-layer`
- click：3 颗金色小星星散开
- pat：2 颗粉色爱心上浮
- angry：头顶 💢 弹出
- 只用 DOM + CSS transform/opacity，`animationend` 自动清理，跟随「动画速度」倍率

## 3. 台词去重

`historySize` 默认从 10 提到 20，click 池 12 条现在会**先轮完 12 条再重复**。
新增单测：12 条连取 12 次全部不重复。

## 验证

- `pnpm typecheck` ✅
- `pnpm test` 11 个用例全过 ✅
- 实机抓帧：三个特效都可见；托盘切回内置成功