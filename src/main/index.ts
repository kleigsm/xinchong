import { app, ipcMain } from "electron";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { initAutoStart } from "./autostart";
import { importFromPath } from "./import-flow";
import { buildPetPayload } from "./pet-payload";
import { getSettings, updateSettings } from "./store";
import { describeDisplays, watchDisplays } from "./display";
import { startHitTesting } from "./hit-test";
import { isDragging, registerIpc } from "./ipc";
import { startPerfSampling } from "./perf";
import { createTray, destroyTray, notifySettings } from "./tray";
import { createMainWindow } from "./window";

/**
 * 打包后的应用没有控制台，stdout 是断开的管道。
 * 此时任何 console.log 都会抛 EPIPE 并弹出「JavaScript error occurred in the main process」。
 * 解决：打包模式下把日志写到 userData/main.log，不再往 stdout 写。
 */
function setupLogging(): void {
  if (!app.isPackaged) return;

  const write = (level: string, args: unknown[]): void => {
    try {
      const dir = app.getPath("userData");
      mkdirSync(dir, { recursive: true });
      const line = `${new Date().toISOString()} [${level}] ${args.map(String).join(" ")}\n`;
      appendFileSync(join(dir, "main.log"), line);
    } catch {
      // 日志失败不能影响主流程
    }
  };

  console.log = (...args: unknown[]) => write("log", args);
  console.info = (...args: unknown[]) => write("info", args);
  console.warn = (...args: unknown[]) => write("warn", args);
  console.error = (...args: unknown[]) => write("error", args);
}

setupLogging();

const T0 = Date.now();

let stopHitTesting: (() => void) | null = null;
let stopWatchingDisplays: (() => void) | null = null;
let stopPerfSampling: (() => void) | null = null;

app.whenReady().then(() => {
  console.log(`[app] ready in ${Date.now() - T0}ms`);

  initAutoStart();

  const win = createMainWindow();
  registerIpc(win);
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

    const testPath = process.env.XINCHONG_IMPORT_TEST;
    if (testPath) {
      console.log(`[import] 测试模式，导入 ${testPath}`);
      void importFromPath(win, testPath);
    }
  });
});

app.on("window-all-closed", () => {
  stopHitTesting?.();
  stopWatchingDisplays?.();
  stopPerfSampling?.();
  destroyTray();
  app.quit();
});
