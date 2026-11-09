# 2026-11-09 · 修复：队友打开设置面板是白板

## 现象

其他组员拉代码后运行，桌宠正常，但**设置面板一片空白**，什么都没有。

我本地跑 `pnpm start` 一直是正常的，所以这个 bug 一直没暴露。

## 根因

`src/main/settings-window.ts` 里写死了：

```ts
void win.loadFile(join(__dirname, "../renderer/settings/index.html"));
```

而渲染层有**两种运行方式**：

| 命令 | 渲染层从哪来 |
|---|---|
| `pnpm dev` | Vite 开发服务器（内存里），**不写 out/renderer** |
| `pnpm start` / 打包 | `out/renderer/**` 里的构建产物 |

桌宠主窗口在 `window.ts` 里做了判断：

```ts
const devUrl = process.env.ELECTRON_RENDERER_URL;
if (devUrl) win.loadURL(devUrl);
else win.loadFile(...);
```

**设置窗口漏了这个判断**。队友用 `pnpm dev` 跑时，`out/renderer/settings/index.html` 根本不存在，
`loadFile` 失败 → 白窗，而且窗口还是会显示出来（`ready-to-show`/`did-finish-load` 都没触发错误提示）。

## 修复

设置窗口也按同样规则分流：

```ts
const devUrl = process.env.ELECTRON_RENDERER_URL;
if (devUrl) void win.loadURL(`${devUrl}/settings/index.html`);
else void win.loadFile(join(__dirname, "../renderer/settings/index.html"));
```

路径用 `/settings/index.html`，因为 `electron.vite.config.ts` 里渲染层的 root 是 `src/renderer`，
设置页作为第二个入口注册在 `settings/index.html`。

## 为什么之前没发现

因为我一直在用 `pnpm start`（preview，会构建 `out/renderer`），
队友用 `pnpm dev`（不构建），路径差异只有在 dev 模式下才暴露。

**教训：验证要看队友怎么跑，不能只验证自己习惯的方式。**

## 验证

| 项 | 结果 |
|---|---|
| `pnpm dev` + 打开设置 | ✅ 正常渲染（截图确认，v0.1.1，九分区都在） |
| `pnpm build` | ✅ |
| typecheck | ✅ |
