import { PetView } from "./pet-view";
import { placeholderPack } from "./pets/placeholder";
import { PetStateMachine } from "./state-machine";
import { LinePicker, SpeechBubble } from "./bubble";
import type { Point, Settings } from "../shared/types";

// 注意：不能叫 pet，否则和 preload 暴露的 window.pet 冲突（P0-1 踩过的坑）
const petEl = document.getElementById("pet") as HTMLElement;
const bubbleEl = document.getElementById("bubble") as HTMLElement;

/** 超过这个位移（px）才算拖拽，否则算点击 */
const DRAG_THRESHOLD = 4;

const view = new PetView(petEl, placeholderPack);
const bubble = new SpeechBubble(bubbleEl);

// 每个场景一个挑选器，避免连续重复同一句
const clickLines = new LinePicker(placeholderPack.lines.click);
const dragLines = new LinePicker(placeholderPack.lines.drag);

const machine = new PetStateMachine(view, {
  idleToSleepMs: 30_000,
  onStateChange: (_from, to) => {
    if (to === "click") {
      const line = clickLines.next();
      if (line) bubble.show(line);
    }
  },
});
machine.start();

let pressOrigin: Point | null = null;
let dragging = false;

window.addEventListener("mousedown", (event: MouseEvent) => {
  // 只响应左键，右键留给菜单
  if (event.button !== 0) return;
  pressOrigin = { x: event.screenX, y: event.screenY };
  dragging = false;
});

window.addEventListener("mousemove", (event: MouseEvent) => {
  if (!pressOrigin) return;

  if (!dragging) {
    const dx = event.screenX - pressOrigin.x;
    const dy = event.screenY - pressOrigin.y;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      dragging = true;
      petEl.classList.add("dragging");
      machine.onDragStart();
      const line = dragLines.next();
      if (line) bubble.show(line);
      window.pet.dragStart({ x: event.screenX, y: event.screenY });
    }
    return;
  }

  window.pet.dragMove({ x: event.screenX, y: event.screenY });
});

window.addEventListener("mouseup", () => {
  if (!pressOrigin) return;

  if (dragging) {
    window.pet.dragEnd();
    petEl.classList.remove("dragging");
    machine.onDragEnd();
  } else {
    machine.onPetClick();
  }

  pressOrigin = null;
  dragging = false;
});

// 右键：弹出与托盘一致的菜单
window.addEventListener("contextmenu", (event: MouseEvent) => {
  event.preventDefault();
  window.pet.showMenu();
});

/** 设置变化：用气泡给出反馈（替代原来底部的提示文字） */
function applySettings(settings: Settings): void {
  if (settings.dnd) {
    bubble.show("勿扰中，先不打扰你啦", 2000);
  } else if (settings.muted) {
    bubble.show("好，我安静一会儿", 2000);
  }
}

window.pet.onSettings(applySettings);

window.addEventListener("beforeunload", () => {
  machine.destroy();
  bubble.destroy();
});

console.log("[renderer] ready");
