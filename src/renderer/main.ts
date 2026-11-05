import { PetView } from "./pet-view";
import { PACKS } from "./pets";
import { PetStateMachine } from "./state-machine";
import { LinePicker, SpeechBubble } from "./bubble";
import { SoundPlayer } from "./audio";
import { DEFAULT_PERSONALITY, isPersonalityId } from "../shared/personalities";
import type { Point, Settings } from "../shared/types";

// 注意：不能叫 pet，否则和 preload 暴露的 window.pet 冲突（P0-1 踩过的坑）
const petEl = document.getElementById("pet") as HTMLElement;
const bubbleEl = document.getElementById("bubble") as HTMLElement;

/** 超过这个位移（px）才算拖拽，否则算点击 */
const DRAG_THRESHOLD = 4;

let currentPackId = DEFAULT_PERSONALITY;
/** 是否正在使用用户导入的角色（此时不再跟随性格设置切换） */
let usingUserPet = false;

const view = new PetView(petEl, PACKS[currentPackId]);
const bubble = new SpeechBubble(bubbleEl);
const sound = new SoundPlayer(PACKS[currentPackId]);

// 台词挑选器随性格切换而重建
let clickLines = new LinePicker(PACKS[currentPackId].lines.click);
let dragLines = new LinePicker(PACKS[currentPackId].lines.drag);

/** 当前设置快照：勿扰时不出声、不冒台词 */
let currentSettings: Settings | null = null;
const isDoNotDisturb = (): boolean => currentSettings?.dnd === true;

const machine = new PetStateMachine(view, {
  idleToSleepMs: 30_000,
  onStateChange: (_from, to) => {
    if (to === "click" && !isDoNotDisturb()) {
      sound.play("click");
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

  // 松手事件可能丢失（光标已经移出窗口，例如拖到屏幕边缘时），
  // 用 buttons 状态兜底：拖动中却没有按键按下，说明早就松手了。
  if (dragging && event.buttons === 0) {
    endDrag();
    return;
  }

  if (!dragging) {
    const dx = event.screenX - pressOrigin.x;
    const dy = event.screenY - pressOrigin.y;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      dragging = true;
      petEl.classList.add("dragging");
      machine.onDragStart();
      if (!isDoNotDisturb()) {
        sound.play("drag");
        const line = dragLines.next();
        if (line) bubble.show(line);
      }
      window.pet.dragStart({ x: event.screenX, y: event.screenY });
    }
    return;
  }

  window.pet.dragMove({ x: event.screenX, y: event.screenY });
});

function endDrag(): void {
  window.pet.dragEnd();
  petEl.classList.remove("dragging");
  machine.onDragEnd();
  pressOrigin = null;
  dragging = false;
}

window.addEventListener("mouseup", () => {
  if (!pressOrigin) return;

  if (dragging) {
    endDrag();
  } else {
    machine.onPetClick();
    pressOrigin = null;
    dragging = false;
  }
});

// 右键：弹出与托盘一致的菜单
window.addEventListener("contextmenu", (event: MouseEvent) => {
  event.preventDefault();
  window.pet.showMenu();
});

/** 换性格：整个角色包（图 + 台词）一起换 */
function switchPersonality(id: string): void {
  const nextId = isPersonalityId(id) ? id : DEFAULT_PERSONALITY;
  // 正在用用户角色时，即使目标内置角色和上次相同也要真的换回来
  if (nextId === currentPackId && !usingUserPet) return;

  usingUserPet = false;
  currentPackId = nextId;
  const pack = PACKS[nextId];

  clickLines = new LinePicker(pack.lines.click);
  dragLines = new LinePicker(pack.lines.drag);

  view.setPack(pack);
  sound.setPack(pack);
  machine.start(); // 重新进入待机，重置睡眠计时
  sound.play("appear");

  bubble.show(`我是${pack.name}版哦`);
  console.log(`[personality] switched to ${nextId}`);
}

/** 设置变化：性格、静音、勿扰、音量 */
function applySettings(settings: Settings): void {
  currentSettings = settings;
  sound.setMuted(settings.muted);
  sound.setVolume(settings.volume ?? 0.6);

  if (!usingUserPet && settings.personality) switchPersonality(settings.personality);

  if (settings.dnd) {
    bubble.show("勿扰中，先不打扰你啦", 2000);
  } else if (settings.muted) {
    bubble.show("好，我安静一会儿", 2000);
  }
}

window.pet.onSettings(applySettings);

// 用户导入角色成功后，立即换上（不重启程序）
window.pet.onUsePet((payload) => {
  usingUserPet = true;

  clickLines = new LinePicker(payload.pack.lines.click);
  dragLines = new LinePicker(payload.pack.lines.drag);

  view.setPack(payload.pack);
  sound.setPack(payload.pack);
  machine.start();

  bubble.show(`换上了「${payload.name}」`, 2500);
  console.log(`[pet] 切换到用户角色 ${payload.id}`);
});

// 换回内置性格角色
window.pet.onUseBuiltin((personalityId) => {
  switchPersonality(personalityId);
  bubble.show("换回内置角色啦", 2000);
  console.log(`[pet] 换回内置角色 ${personalityId}`);
});

window.addEventListener("beforeunload", () => {
  machine.destroy();
  bubble.destroy();
});

console.log("[renderer] ready");
// 告诉主进程：监听器都已注册，可以派发事件了
window.pet.ready();

// 窗口被托盘隐藏时停止动画，避免后台空转烧 CPU
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    view.stop();
  } else {
    machine.start();
  }
});