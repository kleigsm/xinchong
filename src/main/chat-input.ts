import type { BrowserWindow } from "electron";

/**
 * 聊天输入条的焦点处理。
 *
 * 桌宠窗口为了「不抢焦点」被创建成 `focusable: false`，
 * 但这导致它**收不到键盘输入**——聊天框打不了字。
 *
 * 解决办法：只在输入条打开期间临时允许焦点，关闭后立刻恢复。
 * 这样既不影响"不打扰"的原则，又能正常打字。
 */

export function openChatInput(win: BrowserWindow): void {
  if (win.isDestroyed()) return;

  win.setFocusable(true);
  win.show();
  win.focus();
  win.webContents.send("pet:chat-input");
  console.log("[chat] 打开输入条");
}

export function closeChatInput(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  win.setFocusable(false);
  console.log("[chat] 关闭输入条，恢复不可聚焦");
}
