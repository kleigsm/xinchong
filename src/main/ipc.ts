import type { BrowserWindow } from "electron";
import { ipcMain, screen } from "electron";
import type { Point } from "../shared/types";
import { clampPosition, clampToVisibleArea } from "./window";

/**
 * 拖拽实现说明：
 *
 * 不用渲染层传来的 screenX/screenY 来定位。在 125% / 150% 缩放的屏幕上，
 * 渲染层坐标与主进程 setPosition 的坐标系可能不一致，导致「越拖越偏」。
 *
 * 改为：主进程按住期间每 16ms 读一次系统光标位置（screen.getCursorScreenPoint，
 * 与 setPosition 同为 DIP），窗口位置 = 光标 - 按下时的偏移。
 * 好处：1) 与缩放无关；2) 鼠标移出小窗口时依然跟随，不会卡住。
 */

// 8ms ≈ 125Hz：拖动跟手度明显好于 16ms，只在按住期间跑，CPU 可以忽略
const DRAG_INTERVAL_MS = 8;

let dragOffset: { dx: number; dy: number } | null = null;
let dragTimer: NodeJS.Timeout | null = null;

/** 是否正在拖拽（hit-test 用它暂停穿透切换） */
export function isDragging(): boolean {
  return dragOffset !== null;
}

function stopDragLoop(): void {
  if (dragTimer) {
    clearInterval(dragTimer);
    dragTimer = null;
  }
}

/** 注册拖拽与右键菜单相关的 IPC */
export function registerIpc(win: BrowserWindow): void {
  ipcMain.on("drag-start", (_event, point?: Point) => {
    if (win.isDestroyed()) return;

    const [wx, wy] = win.getPosition();
    // 锚点用"按下那一刻"的位置（渲染层传过来），而不是此刻的鼠标位置：
    // 从 mousedown 到 drag-start 之间光标可能已经挪了几十像素，
    // 那段距离会被永久算成偏移，表现为"宠物总比鼠标超前/落后一截"（BUG-021）。
    const anchor =
      point && Number.isFinite(point.x) && Number.isFinite(point.y)
        ? point
        : screen.getCursorScreenPoint();

    dragOffset = { dx: anchor.x - wx, dy: anchor.y - wy };

    stopDragLoop();
    dragTimer = setInterval(() => {
      if (win.isDestroyed() || !dragOffset) return;
      const current = screen.getCursorScreenPoint();
      const bounds = win.getBounds();
      // 每帧都夹到屏幕内：即使松手事件丢失，宠物也不会被拖到看不见的地方
      const target = clampPosition(
        current.x - dragOffset.dx,
        current.y - dragOffset.dy,
        bounds.width,
        bounds.height,
      );
      win.setPosition(Math.round(target.x), Math.round(target.y));
    }, DRAG_INTERVAL_MS);

    console.log(
      `[drag] start anchor=(${anchor.x},${anchor.y}) window=(${wx},${wy}) offset=(${dragOffset.dx},${dragOffset.dy})`,
    );
  });

  // 保留该通道以兼容旧调用；实际位置由上面的定时器驱动
  ipcMain.on("drag-move", (_event, _point: Point) => {
    // no-op
  });

  ipcMain.on("drag-end", () => {
    if (win.isDestroyed()) return;
    stopDragLoop();

    // 松手时按"当前光标"补最后一次位置。
    // 16ms 的定时器可能还停在上一帧，不补的话宠物会停在离光标几十像素的地方，
    // 表现为"松手了还在往回追"或者"总是差一截"（BUG-021 的尾巴）。
    if (dragOffset) {
      const cursor = screen.getCursorScreenPoint();
      const bounds = win.getBounds();
      const target = clampPosition(
        cursor.x - dragOffset.dx,
        cursor.y - dragOffset.dy,
        bounds.width,
        bounds.height,
      );
      win.setPosition(Math.round(target.x), Math.round(target.y));
    }

    dragOffset = null;
    // 松手时兜底：保证宠物没有拖出屏幕
    clampToVisibleArea(win);
    const [x, y] = win.getPosition();
    console.log(`[drag] end, window at (${x},${y})`);
  });
}
