import type { BrowserWindow } from "electron";

/**
 * 聊天输入条的焦点处理。
 *
 * 桌宠窗口为了「不抢焦点」被创建成 `focusable: false`，
 * 但这导致它**收不到键盘输入**——聊天框打不了字。
 *
 * 解决办法：只在输入条打开期间临时允许焦点，关闭后立刻恢复。
 * 这样既不影响"不打扰"的原则，又能正常打字。
 *
 * ⚠️ 踩过的坑：
 * 第一次能打字、第二次打不了字。原因是 `win.focus()` 之后立刻 send 事件，
 * 此时窗口还没真正拿到键盘焦点，渲染层的 input.focus() 落空。
 * 现在改成 setFocusable → show → focus → webContents.focus，
 * 再**延迟一点**发事件，让渲染层在窗口已经激活后再聚焦输入框。
 */

export function openChatInput(win: BrowserWindow): void {
  if (win.isDestroyed()) return;

  win.setFocusable(true);
  win.show();
  win.focus();
  // 关键：让 webContents 也拿到焦点，否则 input 收不到键盘事件
  win.webContents.focus();

  setTimeout(() => {
    if (win.isDestroyed()) return;
    win.webContents.send("pet:chat-input");
  }, 60);

  console.log("[chat] 打开输入条");
}

export function closeChatInput(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  win.setFocusable(false);
  console.log("[chat] 关闭输入条，恢复不可聚焦");
}
