import { startBreathing } from "./animator";
import type { Point } from "../shared/types";

// 注意：不能叫 pet，否则和 preload 暴露的 window.pet 冲突（P0-1 踩过的坑）
const petEl = document.getElementById("pet") as HTMLElement;

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

const stopBreathing = startBreathing(petEl);
window.addEventListener("beforeunload", stopBreathing);

console.log("[renderer] ready");
