import { PetView } from "./pet-view";
import { placeholderPack } from "./pets/placeholder";
import type { Point, Settings } from "../shared/types";

// 注意：不能叫 pet，否则和 preload 暴露的 window.pet 冲突（P0-1 踩过的坑）
const petEl = document.getElementById("pet") as HTMLElement;
const hintEl = document.getElementById("hint") as HTMLElement;

const DEFAULT_HINT = "拖动我 / 透明区可穿透";

/** 超过这个位移（px）才算拖拽，否则算点击 */
const DRAG_THRESHOLD = 4;

const view = new PetView(petEl, placeholderPack);
view.play("idle");

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
      view.play("drag");
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
    view.play("idle");
  } else {
    // 没怎么移动 → 视为点击
    view.play("click", () => view.play("idle"));
  }

  pressOrigin = null;
  dragging = false;
});

// 右键：弹出与托盘一致的菜单
window.addEventListener("contextmenu", (event: MouseEvent) => {
  event.preventDefault();
  window.pet.showMenu();
});

/** 设置变化时更新界面提示（等音效接入后，这里还要控制静音） */
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

console.log("[renderer] ready");
