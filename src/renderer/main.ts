import { startBreathing } from "./animator";
import type { Point, Settings } from "../shared/types";

// 注意：不能叫 pet，否则和 preload 暴露的 window.pet 冲突（P0-1 踩过的坑）
const petEl = document.getElementById("pet") as HTMLElement;
const hintEl = document.getElementById("hint") as HTMLElement;

const DEFAULT_HINT = "拖动我 / 透明区可穿透";

let dragging = false;

window.addEventListener("mousedown", (event: MouseEvent) => {
  // 只响应左键，右键留给菜单
  if (event.button !== 0) return;
  if (dragging) return;
  dragging = true;
  petEl.classList.add("dragging");
  const point: Point = { x: event.screenX, y: event.screenY };
  window.pet.dragStart(point);
});

window.addEventListener("mousemove", (event: MouseEvent) => {
  if (!dragging) return;
  const point: Point = { x: event.screenX, y: event.screenY };
  window.pet.dragMove(point);
});

window.addEventListener("mouseup", () => {
  if (!dragging) return;
  dragging = false;
  petEl.classList.remove("dragging");
  window.pet.dragEnd();
});

// 右键：弹出与托盘一致的菜单
window.addEventListener("contextmenu", (event: MouseEvent) => {
  event.preventDefault();
  window.pet.showMenu();
});

/** 设置变化时更新界面提示（等 P1-6 有音效后，这里还要控制静音） */
function applySettings(settings: Settings): void {
  if (settings.dnd) {
    hintEl.textContent = "勿扰中";
  } else if (settings.muted) {
    hintEl.textContent = "已静音";
  } else {
    hintEl.textContent = DEFAULT_HINT;
  }
}

window.pet.onSettings(applySettings);

const stopBreathing = startBreathing(petEl);
window.addEventListener("beforeunload", stopBreathing);

console.log("[renderer] ready");
