import type { BrowserWindow } from "electron";
import { ipcMain } from "electron";
import type { Point } from "../shared/types";
import { buildMenu } from "./tray";
import { clampToVisibleArea } from "./window";

let dragOffset: { dx: number; dy: number } | null = null;

/** 是否正在拖拽（hit-test 用它暂停穿透切换） */
export function isDragging(): boolean {
  return dragOffset !== null;
}

/** 注册拖拽与右键菜单相关的 IPC */
export function registerIpc(win: BrowserWindow): void {
  ipcMain.on("drag-start", (_event, point: Point) => {
    if (win.isDestroyed()) return;
    const [wx, wy] = win.getPosition();
    dragOffset = { dx: point.x - wx, dy: point.y - wy };
    console.log(`[drag] start at (${point.x},${point.y}) offset=(${dragOffset.dx},${dragOffset.dy})`);
  });

  ipcMain.on("drag-move", (_event, point: Point) => {
    if (win.isDestroyed() || !dragOffset) return;
    win.setPosition(Math.round(point.x - dragOffset.dx), Math.round(point.y - dragOffset.dy));
  });

  ipcMain.on("drag-end", () => {
    if (win.isDestroyed()) return;
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
