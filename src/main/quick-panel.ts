import { BrowserWindow, app, ipcMain, screen } from "electron";
import { join } from "node:path";
import type { Point, Settings } from "../shared/types";
import { PERSONALITIES, isPersonalityId } from "../shared/personalities";
import { getSettings, updateSettings } from "./store";
import { useBuiltInPet } from "./pet-switch";
import { openSettingsWindow } from "./settings-window";

/**
 * 快捷面板（P1-12 第一版）。
 *
 * 为什么是独立窗口而不是画在桌宠窗口里：
 * 桌宠窗口是「透明 + 整窗穿透 + 只放行角色命中圆」，在里面画菜单要再折腾一遍命中区域；
 * 独立窗口没有穿透问题，失焦即关，还能直接放滑杆和开关。
 *
 * 第一版只做最小可用：4 个动作 + 性格 + 音量 + 静音/勿扰 + 打开控制中心。
 * 多屏翻转、键盘全操作、异常回落原生菜单留到下一轮（见 docs/log）。
 */

const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 420;
const CURSOR_GAP = 8;
/** 失焦后稍等一下再关，避免"点面板里的下拉/拖滑杆"被误判成失焦 */
const BLUR_CLOSE_DELAY_MS = 120;

let panel: BrowserWindow | null = null;
let getPetWindow: () => BrowserWindow | null = () => null;

export function registerQuickPanel(petWindow: () => BrowserWindow | null): void {
  getPetWindow = petWindow;

  ipcMain.on("quick-panel:open", () => {
    // 用系统光标位置而不是渲染层传来的坐标：多屏/缩放下更靠得住
    openQuickPanel(screen.getCursorScreenPoint());
  });

  ipcMain.handle("quick-panel:state", () => ({
    settings: getSettings(),
    personalities: PERSONALITIES.map((p) => ({ id: p.id, label: p.label })),
  }));

  ipcMain.handle("quick-panel:settings", (_event, patch: Partial<Settings>) => {
    const next = updateSettings(patch);
    notifyPet(next);
    return next;
  });

  ipcMain.handle("quick-panel:personality", (_event, id: string) => {
    const win = getPetWindow();
    if (!win || win.isDestroyed()) return false;
    if (!isPersonalityId(id)) return false;
    useBuiltInPet(win, id);
    // 面板上的"使用中"和主窗口的菜单都要跟着变
    notifyPet(getSettings());
    closeQuickPanel();
    return true;
  });

  ipcMain.on("quick-panel:action", (_event, name: string) => {
    const win = getPetWindow();
    if (!win || win.isDestroyed()) return;

    if (name === "hide") {
      win.hide();
      closeQuickPanel();
      return;
    }
    // 招手 / 摸头 / 伸懒腰都走已有的 play-action 通道
    win.webContents.send("play-action", name);
    closeQuickPanel();
  });

  ipcMain.on("quick-panel:open-settings", () => {
    closeQuickPanel();
    openSettingsWindow();
  });

  ipcMain.on("quick-panel:close", () => {
    closeQuickPanel();
  });

  ipcMain.on("quick-panel:quit", () => {
    app.quit();
  });
}

/** 在光标右上方弹出；越界就翻到另一侧，并夹在工作区内 */
export function openQuickPanel(point: Point): void {
  const win = ensurePanel();
  const bounds = computePosition(point);
  win.setPosition(bounds.x, bounds.y);

  win.show();
  win.focus();
  console.log(`[quick-panel] open at (${bounds.x},${bounds.y}) from cursor (${point.x},${point.y})`);
}

export function closeQuickPanel(): void {
  if (!panel || panel.isDestroyed()) return;
  panel.hide();
}

export function destroyQuickPanel(): void {
  if (panel && !panel.isDestroyed()) {
    (panel as unknown as { forceClose?: boolean }).forceClose = true;
    panel.destroy();
  }
  panel = null;
}

function computePosition(point: Point): { x: number; y: number } {
  const display = screen.getDisplayNearestPoint({ x: point.x, y: point.y });
  const area = display.workArea;

  // 默认：面板在光标右上方
  let x = point.x + CURSOR_GAP;
  let y = point.y - PANEL_HEIGHT - CURSOR_GAP;

  // 右边放不下 → 翻到光标左侧
  if (x + PANEL_WIDTH > area.x + area.width) {
    x = point.x - PANEL_WIDTH - CURSOR_GAP;
  }
  // 上面放不下 → 翻到光标下方
  if (y < area.y) {
    y = point.y + CURSOR_GAP;
  }

  // 最后夹一次，保证整块面板在工作区内
  x = Math.min(Math.max(x, area.x), area.x + area.width - PANEL_WIDTH);
  y = Math.min(Math.max(y, area.y), area.y + area.height - PANEL_HEIGHT);

  return { x: Math.round(x), y: Math.round(y) };
}

function ensurePanel(): BrowserWindow {
  if (panel && !panel.isDestroyed()) return panel;

  const win = new BrowserWindow({
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.setAlwaysOnTop(true, "screen-saver");

  // 点到别的地方 → 关（这是原生菜单点外部不关那个 bug 的正解）
  win.on("blur", () => {
    setTimeout(() => {
      if (!win.isDestroyed() && !win.isFocused()) win.hide();
    }, BLUR_CLOSE_DELAY_MS);
  });

  win.on("close", (event) => {
    if (!win.isDestroyed() && !(win as unknown as { forceClose?: boolean }).forceClose) {
      event.preventDefault();
      win.hide();
    }
  });

  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error(`[quick-panel] 页面加载失败 ${code} ${desc} ${url}`);
  });

  // 开发和打包要分开加载（设置窗口曾经因为写死 loadFile 白屏过）
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    void win.loadURL(`${devUrl}/quick-panel/index.html`);
  } else {
    void win.loadFile(join(__dirname, "../renderer/quick-panel/index.html"));
  }

  panel = win;
  return win;
}

function notifyPet(settings: Settings): void {
  const win = getPetWindow();
  if (!win || win.isDestroyed()) return;
  win.webContents.send("settings-changed", settings);
}
