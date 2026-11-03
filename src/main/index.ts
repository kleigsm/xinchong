import { app } from "electron";
import { describeDisplays, watchDisplays } from "./display";
import { startHitTesting } from "./hit-test";
import { isDragging, registerIpc } from "./ipc";
import { createTray, destroyTray } from "./tray";
import { createMainWindow } from "./window";

const T0 = Date.now();

let stopHitTesting: (() => void) | null = null;
let stopWatchingDisplays: (() => void) | null = null;

app.whenReady().then(() => {
  console.log(`[app] ready in ${Date.now() - T0}ms`);

  const win = createMainWindow();
  registerIpc(win);
  createTray(win);
  stopHitTesting = startHitTesting(win, isDragging);
  stopWatchingDisplays = watchDisplays(win);

  console.log(`[app] displays: ${describeDisplays()}`);

  // 把渲染进程的 console 转发到主进程，否则页面里报错完全看不见（P0-1 踩过的坑）
  win.webContents.on("console-message", (event, _level, message) => {
    const text = typeof message === "string" ? message : (event as unknown as { message: string }).message;
    console.log(`[renderer] ${text}`);
  });

  win.webContents.once("did-finish-load", () => {
    console.log(`[app] window ready in ${Date.now() - T0}ms`);
  });
});

app.on("window-all-closed", () => {
  stopHitTesting?.();
  stopWatchingDisplays?.();
  destroyTray();
  app.quit();
});
