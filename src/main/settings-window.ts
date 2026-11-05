import { BrowserWindow } from "electron";
import { join } from "node:path";

/**
 * 设置窗口。
 *
 * - 常规窗口（有边框、不透明），和桌宠的透明窗完全独立
 * - 关闭时是**隐藏**而不是销毁，下次打开更快
 * - 只在用户主动打开时创建
 */

let settingsWindow: BrowserWindow | null = null;

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow && !settingsWindow.isDestroyed() ? settingsWindow : null;
}

export function openSettingsWindow(): BrowserWindow {
  const existing = getSettingsWindow();
  if (existing) {
    if (existing.isMinimized()) existing.restore();
    existing.show();
    existing.focus();
    return existing;
  }

  const win = new BrowserWindow({
    width: 760,
    height: 580,
    minWidth: 680,
    minHeight: 480,
    title: "芯宠 · 设置",
    backgroundColor: "#faf7f5",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once("ready-to-show", () => {
    console.log("[settings] ready-to-show");
    win.show();
  });
  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error(`[settings] 页面加载失败 ${code} ${desc} ${url}`);
  });
  win.webContents.on("did-finish-load", () => {
    console.log("[settings] did-finish-load");
    if (!win.isVisible()) win.show();
  });

  // 关掉只是隐藏，不销毁（下次打开秒开）
  win.on("close", (event) => {
    if (!win.isDestroyed() && !(win as unknown as { forceClose?: boolean }).forceClose) {
      event.preventDefault();
      win.hide();
    }
  });

  const pagePath = join(__dirname, "../renderer/settings/index.html");
  console.log(`[settings] loading ${pagePath}`);
  void win.loadFile(pagePath);

  settingsWindow = win;
  return win;
}

/** 真正退出时用：跳过 close 拦截，直接销毁 */
export function destroySettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    (settingsWindow as unknown as { forceClose?: boolean }).forceClose = true;
    settingsWindow.destroy();
  }
  settingsWindow = null;
}
