import { app, dialog, ipcMain } from "electron";
import { initAutoStart } from "./autostart";
import { registerSettingsApi } from "./api";
import { destroyQuickPanel, registerQuickPanel } from "./quick-panel";
import { flushChats } from "./chat-store";
import { closeChatInput, openChatInput } from "./chat-input";
import { exportTemplate } from "./template";
import { importFromPath } from "./import-flow";
import { destroySettingsWindow, openSettingsWindow } from "./settings-window";
import { setLogWriteEnabled, setupLogging } from "./logging";
import { buildPetPayload } from "./pet-payload";
import { getSettings, updateSettings } from "./store";
import { describeDisplays, watchDisplays } from "./display";
import { startHitTesting } from "./hit-test";
import { isDragging, registerIpc } from "./ipc";
import { startPerfSampling } from "./perf";
import { createTray, destroyTray, notifySettings } from "./tray";
import { createMainWindow } from "./window";

/**
 * BUG-008：中文（非 ASCII）路径下 Electron 会**静默崩溃**（D-404），
 * 用户只看到「双击没反应」，完全不知道原因。
 *
 * 这里在启动最早期检查一次安装路径，给一句人话提示再退出。
 * 只检查程序所在路径；用户数据目录（%APPDATA%）不受这个限制。
 */
function ensureAsciiInstallPath(): void {
  const target = app.isPackaged ? process.execPath : app.getAppPath();
  if (!/[^\x00-\x7F]/.test(target)) return;

  dialog.showErrorBox(
    "芯宠无法从这个位置启动",
    `当前路径里含有中文或特殊字符：\n${target}\n\n` +
      "Electron 在这类路径下会直接闪退，且不给出任何报错。\n" +
      "请把芯宠放到纯英文、层级不太深的目录，例如：D:\\xinchong\\XinChong.exe",
  );
  app.exit(1);
}

ensureAsciiInstallPath();

// 日志落盘与「是否记录日志」开关都在 logging.ts（P1-13 起隐私页可控）
setupLogging();

const T0 = Date.now();

let stopHitTesting: (() => void) | null = null;
let stopWatchingDisplays: (() => void) | null = null;
let stopPerfSampling: (() => void) | null = null;

app.whenReady().then(() => {
  // 设置读出来之后再决定要不要写日志文件（隐私页可关）
  setLogWriteEnabled(getSettings().privacyLogs !== false);

  console.log(`[app] ready in ${Date.now() - T0}ms`);

  initAutoStart();

  const win = createMainWindow(getSettings().alwaysOnTop);
  registerIpc(win);
  registerSettingsApi(() => (win.isDestroyed() ? null : win));
  registerQuickPanel(() => (win.isDestroyed() ? null : win));
  createTray(win);
  stopHitTesting = startHitTesting(win, isDragging);
  stopWatchingDisplays = watchDisplays(win);
  stopPerfSampling = startPerfSampling(win);

  console.log(`[app] displays: ${describeDisplays()}`);

  // 把渲染进程的 console 转发到主进程，否则页面里报错完全看不见（P0-1 踩过的坑）
  win.webContents.on("console-message", (event, _level, message) => {
    const text = typeof message === "string" ? message : (event as unknown as { message: string }).message;
    console.log(`[renderer] ${text}`);
  });

  win.webContents.once("did-finish-load", () => {
    console.log(`[app] window ready in ${Date.now() - T0}ms`);
    // 首屏把当前设置同步给页面
    notifySettings(win);
  });

  // 输入条关闭后恢复"不可聚焦"
  ipcMain.on("chat-input-closed", () => closeChatInput(win));

  // 渲染层初始化完毕（监听器都已注册）之后再派发事件，避免时序竞争
  ipcMain.once("renderer-ready", () => {
    console.log("[app] renderer ready");

    // 恢复上次使用的自定义角色
    const activePetId = getSettings().activePetId;
    if (activePetId) {
      const payload = buildPetPayload(activePetId);
      if (payload) {
        win.webContents.send("pet:use", payload);
        console.log(`[app] 恢复自定义角色 ${activePetId}`);
      } else {
        console.warn(`[app] 上次的角色 ${activePetId} 不在了，回退内置角色`);
        updateSettings({ activePetId: null });
      }
    }

    // 开发期：直接弹出聊天输入条
    if (process.env.XINCHONG_CHAT_INPUT === "1") {
      setTimeout(() => openChatInput(win), 1200);
    }

    // 开发期：连开两次，用来验证"第二次还能不能打字"
    if (process.env.XINCHONG_CHAT_INPUT === "twice") {
      setTimeout(() => openChatInput(win), 2000);
      setTimeout(() => openChatInput(win), 12000);
    }

    // 开发期：直接验证素材包导出
    if (process.env.XINCHONG_EXPORT_TEMPLATE === "1") {
      void exportTemplate(win);
    }

    // 开发期：直接打开设置窗口，省得点托盘
    if (process.env.XINCHONG_OPEN_SETTINGS === "1") {
      openSettingsWindow();
    }

    const testPath = process.env.XINCHONG_IMPORT_TEST;
    if (testPath) {
      console.log(`[import] 测试模式，导入 ${testPath}`);
      const mode = process.env.XINCHONG_IMPORT_MODE === "l2" ? "l2" : "l3";
      void importFromPath(win, testPath, mode);
    }
  });
});

app.on("window-all-closed", () => {
  stopHitTesting?.();
  stopWatchingDisplays?.();
  stopPerfSampling?.();
  destroyTray();
  destroySettingsWindow();
  destroyQuickPanel();
  app.quit();
});

// 退出前把还在 500ms 防抖窗口里的对话记录写掉（P2-10）
app.on("before-quit", () => {
  flushChats();
});
