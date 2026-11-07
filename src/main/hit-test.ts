import type { BrowserWindow } from "electron";
import { screen } from "electron";
import {
  CHAT_BOX_BOTTOM,
  CHAT_BOX_HEIGHT,
  CHAT_BOX_WIDTH,
  HIT_MARGIN,
  HIT_RADIUS,
  PET_SIZE,
  POLL_INTERVAL_MS,
} from "../shared/constants";
import { isChatInputOpen } from "./chat-input";

/**
 * 光标命中检测：定时查询光标位置，判断是否落在角色圆形范围内，
 * 据此切换窗口的鼠标穿透状态。
 *
 * 为什么不用 setIgnoreMouseEvents(..., { forward: true })？
 * P0-1 实测：在该窗口配置下转发事件不触发，页面收不到 mousemove。
 * 轮询方案稳定且开销极低（50ms 一次坐标比较）。
 *
 * ⚠️ 聊天输入条例外：它画在角色**上方**，不在命中圆里。
 * 如果只认角色，光标一挪到输入框上窗口就变穿透，输入框点不动（2026-11-08 的 bug）。
 * 所以输入条打开期间，额外放行它那块矩形。
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

    const inside = isCursorOnPet(win) || (isChatInputOpen() && isCursorOnChatBox(win));
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
  // 角色贴在窗口底部：水平居中，垂直取底部 PET_SIZE 区域的中点
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height - PET_SIZE / 2;
  const dx = cursor.x - cx;
  const dy = cursor.y - cy;
  return dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS;
}

/** 聊天输入条那块矩形（含少量余量，贴边点击时不至于突然变穿透） */
function isCursorOnChatBox(win: BrowserWindow): boolean {
  const cursor = screen.getCursorScreenPoint();
  const bounds = win.getBounds();

  const left = bounds.x + (bounds.width - CHAT_BOX_WIDTH) / 2 - HIT_MARGIN;
  const right = left + CHAT_BOX_WIDTH + HIT_MARGIN * 2;
  const bottom = bounds.y + bounds.height - CHAT_BOX_BOTTOM + HIT_MARGIN;
  const top = bottom - CHAT_BOX_HEIGHT - HIT_MARGIN;

  return cursor.x >= left && cursor.x <= right && cursor.y >= top && cursor.y <= bottom;
}
