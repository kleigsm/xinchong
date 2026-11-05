import { BrowserWindow, screen } from "electron";
import { join } from "node:path";
import { MIN_VISIBLE_PX, WINDOW_HEIGHT, WINDOW_WIDTH } from "../shared/constants";

/**
 * 创建桌宠主窗口：透明、无边框、置顶、不占任务栏、不抢焦点。
 * 默认整窗穿透，由 hit-test 在光标进入角色范围时关闭。
 */
export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
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
  const x = workArea.x + workArea.width - WINDOW_WIDTH - 120;
  const y = workArea.y + workArea.height - WINDOW_HEIGHT - 60;
  win.setPosition(Math.round(x), Math.round(y));
  console.log(`[window] default position (${Math.round(x)},${Math.round(y)}) in workArea ${workArea.width}x${workArea.height}`);
}

/**
 * 把目标位置夹到「至少有 MIN_VISIBLE_PX 留在工作区内」。
 *
 * 拖拽过程中每帧都要调用：即使松手事件丢失（光标已在窗口外），
 * 宠物也不会被拖到完全看不见的地方。
 */
export function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const display = screen.getDisplayMatching({ x, y, width, height });
  const area = display.workArea;

  const minX = area.x - width + MIN_VISIBLE_PX;
  const maxX = area.x + area.width - MIN_VISIBLE_PX;
  const minY = area.y - height + MIN_VISIBLE_PX;
  const maxY = area.y + area.height - MIN_VISIBLE_PX;

  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
  };
}

/**
 * 保证窗口至少有 MIN_VISIBLE_PX 留在某个显示器的工作区内。
 * 用于处理：拖出屏幕边缘、显示器被拔掉、分辨率变化。
 */
export function clampToVisibleArea(win: BrowserWindow): void {
  if (win.isDestroyed()) return;

  const bounds = win.getBounds();
  const target = clampPosition(bounds.x, bounds.y, bounds.width, bounds.height);

  if (target.x !== bounds.x || target.y !== bounds.y) {
    win.setPosition(Math.round(target.x), Math.round(target.y));
    console.log(`[window] clamped from (${bounds.x},${bounds.y}) to (${target.x},${target.y})`);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
