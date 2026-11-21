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
 *
 * ⚠️ 第二个坑（2026-11-08）：输入框打得开、打不了字。
 * 输入条画在角色**上方**，而窗口的点击穿透只认角色那个命中圆，
 * 光标一挪到输入框上，整窗就变回穿透——点输入框点不着，IME 也拿不到。
 * 现在打开期间强制 `setIgnoreMouseEvents(false)`，并由 hit-test 额外放行输入条矩形。
 */

let chatOpen = false;
/** 失焦收起用；关输入条时要摘掉，避免越挂越多 */
let blurHandler: (() => void) | null = null;

/** 命中检测用它判断"输入条是不是开着" */
export function isChatInputOpen(): boolean {
  return chatOpen;
}

export function openChatInput(win: BrowserWindow): void {
  if (win.isDestroyed()) return;

  chatOpen = true;
  win.setFocusable(true);
  // 输入条不在角色的命中圆里，先解除穿透，否则第一下点击会漏到后面的窗口
  win.setIgnoreMouseEvents(false);
  win.show();
  win.focus();
  // 关键：让 webContents 也拿到焦点，否则 input 收不到键盘事件
  win.webContents.focus();

  // 点别处（别的窗口）时自动收起：以前只有回车 / Esc 两个出口，输入条会一直挂着（BUG-010）
  detachBlur(win);
  blurHandler = () => {
    if (!chatOpen) return;
    console.log("[chat] 窗口失焦，自动收起输入条");
    closeChatInput(win);
    if (!win.isDestroyed()) win.webContents.send("pet:chat-close");
  };
  win.on("blur", blurHandler);

  setTimeout(() => {
    if (win.isDestroyed()) return;
    win.webContents.send("pet:chat-input");
  }, 60);

  console.log("[chat] 打开输入条");
}

export function closeChatInput(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  detachBlur(win);
  chatOpen = false;
  win.setFocusable(false);
  console.log("[chat] 关闭输入条，恢复不可聚焦");
}

function detachBlur(win: BrowserWindow): void {
  if (!blurHandler) return;
  win.removeListener("blur", blurHandler);
  blurHandler = null;
}
