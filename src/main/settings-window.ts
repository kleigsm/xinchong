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
    win.focus();
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

  // ⚠️ 必须区分开发/生产：
  // 开发模式下渲染层由 Vite 开发服务器提供，out/renderer 里**没有**这个文件，
  // 硬编码 loadFile 会导致设置窗口一片白（2026-11-09 队友踩到的 bug）。
  // 桌宠主窗口在 window.ts 里做了这个判断，这里之前漏了。
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    const url = `${devUrl}/settings/index.html`;
    console.log(`[settings] loading ${url}（dev）`);
    void win.loadURL(url);
  } else {
    const pagePath = join(__dirname, "../renderer/settings/index.html");
    console.log(`[settings] loading ${pagePath}`);
    void win.loadFile(pagePath);
  }

  settingsWindow = win;
  return win;
}

/**
 * 桌宠收起时，把设置窗口一起藏起来（BUG-023）。
 *
 * 三个窗口（桌宠 / 快捷面板 / 设置）各自独立，`win.hide()` 只作用于桌宠，
 * 于是出现过「面板和桌宠都关了，只剩一个隐私设置页飘在桌面上」。
 * 用户把芯宠「收起来」时，界面上不应该还留着一个窗口。
 */
export function hideSettingsWindow(): void {
  const win = getSettingsWindow();
  if (!win || !win.isVisible()) return;
  win.hide();
  console.log("[settings] 桌宠收起，设置窗口一并隐藏");
}

/** 真正退出时用：跳过 close 拦截，直接销毁 */
export function destroySettingsWindow(): void {  if (settingsWindow && !settingsWindow.isDestroyed()) {
    (settingsWindow as unknown as { forceClose?: boolean }).forceClose = true;
    settingsWindow.destroy();
  }
  settingsWindow = null;
}
