import type { BrowserWindow } from "electron";
import { ipcMain, screen } from "electron";
import type { Point } from "../shared/types";
import { buildMenu } from "./tray";
import { clampToVisibleArea } from "./window";

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

const DRAG_INTERVAL_MS = 16;

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
  ipcMain.on("drag-start", () => {
    if (win.isDestroyed()) return;

    const cursor = screen.getCursorScreenPoint();
    const [wx, wy] = win.getPosition();
    dragOffset = { dx: cursor.x - wx, dy: cursor.y - wy };

    stopDragLoop();
    dragTimer = setInterval(() => {
      if (win.isDestroyed() || !dragOffset) return;
      const current = screen.getCursorScreenPoint();
      win.setPosition(
        Math.round(current.x - dragOffset.dx),
        Math.round(current.y - dragOffset.dy),
      );
    }, DRAG_INTERVAL_MS);

    console.log(
      `[drag] start cursor=(${cursor.x},${cursor.y}) window=(${wx},${wy}) offset=(${dragOffset.dx},${dragOffset.dy})`,
    );
  });

  // 保留该通道以兼容旧调用；实际位置由上面的定时器驱动
  ipcMain.on("drag-move", (_event, _point: Point) => {
    // no-op
  });

  ipcMain.on("drag-end", () => {
    if (win.isDestroyed()) return;
    stopDragLoop();
    dragOffset = null;
    // 松手时兜底：保证宠物没有拖出屏幕
    clampToVisibleArea(win);
    const [x, y] = win.getPosition();
    console.log(`[drag] end, window at (${x},${y})`);
  });

  // 宠物身上右键 → 弹出与托盘一致的菜单
  ipcMain.on("show-context-menu", () => {
    if (win.isDestroyed()) return;
    buildMenu(win).popup({ window: win });
  });
}
