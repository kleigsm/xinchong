import { BrowserWindow, screen } from "electron";
import { join } from "node:path";
import { MIN_VISIBLE_PX, WINDOW_SIZE } from "../shared/constants";

/**
 * 创建桌宠主窗口：透明、无边框、置顶、不占任务栏、不抢焦点。
 * 默认整窗穿透，由 hit-test 在光标进入角色范围时关闭。
 */
export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: WINDOW_SIZE,
    height: WINDOW_SIZE,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // 桌宠的定时器不能被 Chromium 后台节流，否则「30 秒入睡」会失准
      backgroundThrottling: false,
    },
  });

  // screen-saver 层级，保证盖住普通窗口
  win.setAlwaysOnTop(true, "screen-saver");
  win.setIgnoreMouseEvents(true, { forward: true });

  win.once("ready-to-show", () => {
    placeAtDefaultPosition(win);
    win.show();
    // show() 之后再声明一次置顶，否则可能被其他窗口盖住
    win.setAlwaysOnTop(true, "screen-saver");
    win.moveTop();
    console.log(`[window] shown visible=${win.isVisible()} onTop=${win.isAlwaysOnTop()}`);
  });

  // 开发模式走 dev server（支持 HMR），生产模式加载打包后的文件
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return win;
}

/** 首次出现时放在当前显示器右下角附近 */
function placeAtDefaultPosition(win: BrowserWindow): void {
  const { workArea } = screen.getPrimaryDisplay();
  // 放在右下角偏内，避免贴着屏幕边缘被任务栏或其他窗口遮挡
  const x = workArea.x + workArea.width - WINDOW_SIZE - 120;
  const y = workArea.y + workArea.height - WINDOW_SIZE - 160;
  win.setPosition(Math.round(x), Math.round(y));
  console.log(`[window] default position (${Math.round(x)},${Math.round(y)}) in workArea ${workArea.width}x${workArea.height}`);
}

/**
 * 保证窗口至少有 MIN_VISIBLE_PX 留在某个显示器的工作区内。
 * 用于处理：拖出屏幕边缘、显示器被拔掉、分辨率变化。
 */
export function clampToVisibleArea(win: BrowserWindow): void {
  if (win.isDestroyed()) return;

  const bounds = win.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;

  const minX = area.x - bounds.width + MIN_VISIBLE_PX;
  const maxX = area.x + area.width - MIN_VISIBLE_PX;
  const minY = area.y - bounds.height + MIN_VISIBLE_PX;
  const maxY = area.y + area.height - MIN_VISIBLE_PX;

  const x = clamp(bounds.x, minX, maxX);
  const y = clamp(bounds.y, minY, maxY);

  if (x !== bounds.x || y !== bounds.y) {
    win.setPosition(Math.round(x), Math.round(y));
    console.log(`[window] clamped from (${bounds.x},${bounds.y}) to (${x},${y})`);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
