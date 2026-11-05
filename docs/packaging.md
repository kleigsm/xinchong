# 打包与发布

> 给要出安装包的人：一条命令出 zip，以及**打包后才会遇到**的坑。

---

## 一条命令

```powershell
pnpm build:win
```

等价于：

```powershell
pnpm build          # electron-vite 构建到 out/
pnpm electron-builder --win zip --x64
```

产物：

```
dist/
├── win-unpacked/                     ← 解压运行版（调试用）
└── xinchong-win-x64-0.1.0.zip        ← 分发包，解压即用
```

---

## 当前体积

| 项目 | 大小 |
|---|---|
| zip 分发包 | **135.1 MB** |
| 解压后 | 309 MB |
| 其中 app.asar（我们的代码） | **0.11 MB** |

> 剩下的都是 Electron 运行时（Chromium + Node）。

**已做的体积优化**：
`electronLanguages` 只保留 `zh-CN` 和 `en-US`，语言包从 55 个减到 2 个，省了约 **45 MB**。

---

## 配置要点

配置在 `electron-builder.yml`：

| 配置 | 值 | 原因 |
|---|---|---|
| `electronDist` | `node_modules/electron/dist` | 直接用本地已装的 Electron，避免打包时再下 150MB |
| `files` | `out/**/*`、`package.json` | 只打构建产物，不带源码和文档 |
| `asar` | `true` | 代码打进 asar，防止误改 |
| `npmRebuild` | `false` | 没有原生依赖，跳过重建 |
| `electronLanguages` | `zh-CN`、`en-US` | 砍掉 53 个用不到的语言包 |

---

## 打包后才会遇到的四个坑

### 1. EPIPE：主进程一写日志就崩

**现象**：双击 exe 后弹出「A JavaScript error occurred in the main process」，
堆栈里是 `Error: EPIPE: broken pipe, write`，位置在 `console.log`。

**原因**：打包后的 GUI 应用**没有控制台**，stdout 是断开的管道。
而我们把渲染进程的 console 转发到主进程，一启动就写日志 → 抛错。

**已修**：`src/main/index.ts` 的 `setupLogging()` 在打包模式下把日志改写进
`%APPDATA%\xinchong\main.log`，不再碰 stdout。

### 2. `ELECTRON_RUN_AS_NODE=1` 会让 exe 静默退出

**现象**：双击 exe，进程一闪而过，**没有任何报错**，也没有窗口。

**原因**：环境变量 `ELECTRON_RUN_AS_NODE=1` 会让 Electron 以 Node 模式运行，
不启动 GUI。有些开发环境（或 IDE 插件）会设置它。

**排查**：命令行 `echo %ELECTRON_RUN_AS_NODE%`，有值就先清掉再运行。

### 3. 中文 / 长路径直接崩

和开发模式一样：Electron 在含中文的深路径下会启动即崩（`0x80000003`）。
**分发时提醒用户解压到** `E:\xinchong`、`D:\apps\xinchong` 这类短英文路径。

### 4. package.json 的中文被 PowerShell 写坏

**现象**：`electron-builder` 报 `JSON.parse` 失败，位置在 `modifyMainPackageJson`。

**原因**：PowerShell 5.1 的 `ConvertTo-Json | Out-File` 默认不是 UTF-8，
中文会变成乱码，甚至吞掉引号导致 JSON 非法。

**规矩**：改 `package.json` 一律用编辑器（或 `Get-Content -Encoding UTF8`），
**不要用 PowerShell 的 ConvertTo-Json 回写**。

---

## 发布前检查清单

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm build:win` 成功产出 zip
- [ ] **干净机器**解压 → 双击 → 能看到桌宠
- [ ] 托盘图标正常
- [ ] 右键菜单能打开
- [ ] 点击有反应、有声音
- [ ] 退出后任务管理器无残留
- [ ] 记录 zip 体积到本文件

---

## 上传到 GitHub Release

```powershell
# 版本号先改 package.json 的 version
gh release create v0.1.0 .\dist\xinchong-win-x64-0.1.0.zip `
  --title "芯宠 v0.1.0" `
  --notes "首个可用版本：桌面悬浮、点击反馈、三套性格、静音勿扰"
```

官网的下载按钮指向 `releases/latest`，发版后自动生效。
