import { app, ipcMain } from "electron";
import { initAutoStart } from "./autostart";
import { registerSettingsApi } from "./api";
import { destroyQuickPanel, registerQuickPanel } from "./quick-panel";
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
