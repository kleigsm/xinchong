import { BrowserWindow, app, ipcMain, screen } from "electron";
import { join } from "node:path";
import type { Point, Settings } from "../shared/types";
import { PERSONALITIES, isPersonalityId } from "../shared/personalities";
import { getSettings, updateSettings } from "./store";
import { useBuiltInPet } from "./pet-switch";
import { hideSettingsWindow, openSettingsWindow } from "./settings-window";
import { openChatInput } from "./chat-input";
import { PET_SIZE } from "../shared/constants";
import { isDragging } from "./ipc";

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

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
/** 失焦后稍等一下再关，避免"点面板里的下拉/拖滑杆"被误判成失焦 */
const BLUR_CLOSE_DELAY_MS = 160;

let panel: BrowserWindow | null = null;
/** 面板打开期间记录桌宠窗口位置，用来算位移 */
let lastPetBounds: Rect | null = null;
/** 拖动停稳后把焦点收回面板的定时器 */
let settleTimer: NodeJS.Timeout | null = null;
let getPetWindow: () => BrowserWindow | null = () => null;

export function registerQuickPanel(petWindow: () => BrowserWindow | null): void {
  getPetWindow = petWindow;

  // 面板开着的时候，桌宠被拖走 → 面板跟着走（保持相对位置）
  const win = petWindow();
  win?.on("move", () => {
    if (!panel || panel.isDestroyed() || !panel.isVisible()) return;
    const pet = petWindow();
    if (!pet || pet.isDestroyed()) return;

    const bounds = pet.getBounds();
    if (!lastPetBounds) {
      lastPetBounds = bounds;
      return;
    }
    const dx = bounds.x - lastPetBounds.x;
    const dy = bounds.y - lastPetBounds.y;
    lastPetBounds = bounds;
    if (dx === 0 && dy === 0) return;

    const display = screen.getDisplayNearestPoint({
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    });
    const area = display.workArea;
    const [px, py] = panel.getPosition();
    const nextX = Math.min(Math.max(px + dx, area.x), area.x + area.width - PANEL_WIDTH);
    const nextY = Math.min(Math.max(py + dy, area.y), area.y + area.height - PANEL_HEIGHT);
    panel.setPosition(Math.round(nextX), Math.round(nextY));

    // 拖完停稳后把焦点收回面板，否则 Esc / 点外部关闭会失效
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      if (!panel || panel.isDestroyed() || !panel.isVisible()) return;
      if (isDragging()) return;
      panel.focus();
    }, 400);
  });

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

    if (name === "chat") {
      // 先关面板再开输入条：面板失焦会把输入条的焦点抢回来
      closeQuickPanel();
      openChatInput(win);
      return;
    }

    if (name === "hide") {
      win.hide();
      closeQuickPanel();
      // 一起收起来，别留一个设置窗口在桌面上（BUG-023）
      hideSettingsWindow();
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

/** 在光标附近弹出：优先贴着角色（不是窗口）放，避开遮挡，并跟随角色移动 */
export function openQuickPanel(point: Point): void {
  rememberPetBounds();
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

/** 角色本体（160×160，贴窗口底部居中）的屏幕矩形；拿不到窗口时返回 null */
function getPetVisualBounds(): Rect | null {
  const win = getPetWindow();
  if (!win || win.isDestroyed()) return null;
  const bounds = win.getBounds();
  return {
    x: bounds.x + (bounds.width - PET_SIZE) / 2,
    y: bounds.y + bounds.height - PET_SIZE,
    width: PET_SIZE,
    height: PET_SIZE,
  };
}

function rememberPetBounds(): void {
  const win = getPetWindow();
  lastPetBounds = win && !win.isDestroyed() ? win.getBounds() : null;
}

function computePosition(point: Point): { x: number; y: number } {
  const display = screen.getDisplayNearestPoint({ x: point.x, y: point.y });
  const area = display.workArea;
  const pet = getPetVisualBounds();

  const clampX = (x: number): number =>
    Math.min(Math.max(x, area.x), area.x + area.width - PANEL_WIDTH);
  const clampY = (y: number): number =>
    Math.min(Math.max(y, area.y), area.y + area.height - PANEL_HEIGHT);

  // 拿不到桌宠位置（窗口已销毁）：退回光标右上方
  if (!pet) {
    return { x: Math.round(clampX(point.x + CURSOR_GAP)), y: Math.round(clampY(point.y - PANEL_HEIGHT - CURSOR_GAP)) };
  }

  // 以**角色本体**（160×160）为参照，不是 320×340 的透明窗口——
  // 按窗口算会空出角色两侧各 80px，看起来"离得很远"。
  // 上 → 左 → 右 → 下，第一个"完整在屏内且不相交"的胜出
  const make = (x: number, y: number): Rect => ({ x, y, width: PANEL_WIDTH, height: PANEL_HEIGHT });
  const candidates: Rect[] = [
    make(clampX(point.x - PANEL_WIDTH / 2), pet.y - PANEL_HEIGHT - CURSOR_GAP),
    make(pet.x - PANEL_WIDTH - CURSOR_GAP, clampY(point.y - PANEL_HEIGHT / 2)),
    make(pet.x + pet.width + CURSOR_GAP, clampY(point.y - PANEL_HEIGHT / 2)),
    make(clampX(point.x - PANEL_WIDTH / 2), pet.y + pet.height + CURSOR_GAP),
  ];

  for (const candidate of candidates) {
    if (!fitsInArea(candidate, area)) continue;
    if (intersects(candidate, pet)) continue;
    return { x: Math.round(candidate.x), y: Math.round(candidate.y) };
  }

  // 桌宠几乎占满屏幕：退到"离桌宠远的那一侧"，仍然夹进工作区
  const petCenterX = pet.x + pet.width / 2;
  const preferLeft = point.x > petCenterX;
  const fallback = {
    x: clampX(preferLeft ? pet.x - PANEL_WIDTH - CURSOR_GAP : pet.x + pet.width + CURSOR_GAP),
    y: clampY(point.y - PANEL_HEIGHT / 2),
  };
  return { x: Math.round(fallback.x), y: Math.round(fallback.y) };
}

function fitsInArea(rect: Rect, area: Rect): boolean {
  return (
    rect.x >= area.x &&
    rect.y >= area.y &&
    rect.x + rect.width <= area.x + area.width &&
    rect.y + rect.height <= area.y + area.height
  );
}

function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
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
      if (win.isDestroyed() || win.isFocused()) return;
      // 用户去抓桌宠了（很可能是要拖）：先别关，拖完再把焦点收回来
      if (isDragging()) return;
      win.hide();
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
