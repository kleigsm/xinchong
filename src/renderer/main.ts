import { PetView } from "./pet-view";
import { PACKS } from "./pets";
import { PetStateMachine } from "./state-machine";
import { LinePicker, SpeechBubble } from "./bubble";
import { DEFAULT_PERSONALITY, isPersonalityId } from "../shared/personalities";
import type { Point, Settings } from "../shared/types";

// 注意：不能叫 pet，否则和 preload 暴露的 window.pet 冲突（P0-1 踩过的坑）
const petEl = document.getElementById("pet") as HTMLElement;
const bubbleEl = document.getElementById("bubble") as HTMLElement;

/** 超过这个位移（px）才算拖拽，否则算点击 */
const DRAG_THRESHOLD = 4;

let currentPackId = DEFAULT_PERSONALITY;

const view = new PetView(petEl, PACKS[currentPackId]);
const bubble = new SpeechBubble(bubbleEl);

// 台词挑选器随性格切换而重建
let clickLines = new LinePicker(PACKS[currentPackId].lines.click);
let dragLines = new LinePicker(PACKS[currentPackId].lines.drag);

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

/** 换性格：整个角色包（图 + 台词）一起换 */
function switchPersonality(id: string): void {
  const nextId = isPersonalityId(id) ? id : DEFAULT_PERSONALITY;
  if (nextId === currentPackId) return;

  currentPackId = nextId;
  const pack = PACKS[nextId];

  clickLines = new LinePicker(pack.lines.click);
  dragLines = new LinePicker(pack.lines.drag);

  view.setPack(pack);
  machine.start(); // 重新进入待机，重置睡眠计时

  bubble.show(`我是${pack.name}版哦`);
  console.log(`[personality] switched to ${nextId}`);
}

/** 设置变化：性格、静音、勿扰 */
function applySettings(settings: Settings): void {
  if (settings.personality) switchPersonality(settings.personality);

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
