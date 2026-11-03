import type { BrowserWindow } from "electron";
import { screen } from "electron";
import { HIT_RADIUS, POLL_INTERVAL_MS } from "../shared/constants";

/**
 * 光标命中检测：定时查询光标位置，判断是否落在角色圆形范围内，
 * 据此切换窗口的鼠标穿透状态。
 *
 * 为什么不用 setIgnoreMouseEvents(..., { forward: true })？
 * P0-1 实测：在该窗口配置下转发事件不触发，页面收不到 mousemove。
 * 轮询方案稳定且开销极低（50ms 一次坐标比较）。
 */
export function startHitTesting(
  win: BrowserWindow,
  isDragging: () => boolean,
): () => void {
  let lastInside: boolean | null = null;

  const timer = setInterval(() => {
    if (win.isDestroyed()) return;
    // 被托盘隐藏时不做检测
    if (!win.isVisible()) return;
    // 拖拽中不要改动穿透状态，否则拖到一半会丢失鼠标捕获
    if (isDragging()) return;

    const inside = isCursorOnPet(win);
    if (inside === lastInside) return;
    lastInside = inside;

    win.setIgnoreMouseEvents(!inside, { forward: true });
    console.log(`[hit] cursor ${inside ? "on" : "off"} pet → ignore=${!inside}`);
  }, POLL_INTERVAL_MS);

  return () => clearInterval(timer);
}

function isCursorOnPet(win: BrowserWindow): boolean {
  const cursor = screen.getCursorScreenPoint();
  const bounds = win.getBounds();
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const dx = cursor.x - cx;
  const dy = cursor.y - cy;
  return dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS;
}
