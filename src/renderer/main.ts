import { PetView } from "./pet-view";
import { PACKS } from "./pets";
import { PetStateMachine } from "./state-machine";
import { SpeechBubble } from "./bubble";
import { LineEngine } from "./line-engine";
import { SoundPlayer } from "./audio";
import { DEFAULT_PERSONALITY, isPersonalityId } from "../shared/personalities";
import type { Point, Settings } from "../shared/types";

// 注意：不能叫 pet，否则和 preload 暴露的 window.pet 冲突（P0-1 踩过的坑）
const petEl = document.getElementById("pet") as HTMLElement;
const bubbleEl = document.getElementById("bubble") as HTMLElement;
const chatBox = document.getElementById("chat-box") as HTMLElement;
const chatInput = document.getElementById("chat-input") as HTMLInputElement;

/** 超过这个位移（px）才算拖拽，否则算点击 */
const DRAG_THRESHOLD = 4;

let currentPackId = DEFAULT_PERSONALITY;
/** 是否正在使用用户导入的角色（此时不再跟随性格设置切换） */
let usingUserPet = false;

const view = new PetView(petEl, PACKS[currentPackId]);
const bubble = new SpeechBubble(bubbleEl);
const sound = new SoundPlayer(PACKS[currentPackId]);

// 话术引擎：按「性格 × 场景」挑台词，换角色时 setBank 整体替换
let lineEngine = new LineEngine(PACKS[currentPackId].lines);

/** 当前设置快照：勿扰时不出声、不冒台词 */
let currentSettings: Settings | null = null;
const isDoNotDisturb = (): boolean => currentSettings?.dnd === true;

const machine = new PetStateMachine(view, {
  idleToSleepMs: 30_000,
  onStateChange: (_from, to) => {
    if (isDoNotDisturb()) return;

    if (to === "click") {
      sound.play("click");
      // 深夜有 30% 概率说"夜里的话"。白天 pick("night") 返回 null，会自动跳过。
      const nightLine = Math.random() < 0.3 ? lineEngine.pick("night") : null;
      const line = nightLine ?? lineEngine.pick("click");
      if (line) bubble.show(line);
    }

    // 入睡时说一句晚安（场景 sleep）
    if (to === "sleep") {
      const line = lineEngine.pick("sleep");
      if (line) bubble.show(line, 4000);
    }

    // 四个性格动作：招手 / 伸懒腰 / 摸头 / 生气
    // 场景名和动作名一一对应，引擎挑不到就自动回退到 click 池
    if (to === "wave" || to === "stretch" || to === "pat" || to === "angry") {
      sound.play(to);
      const line = lineEngine.pick(to);
      if (line) bubble.show(line, 2500);
    }
  },
});
machine.start();

let pressOrigin: Point | null = null;
let dragging = false;
let patTimer: number | null = null;
let patTriggered = false;
let lastClickAt = 0;
let rapidCount = 0;

function clearPatTimer(): void {
  if (patTimer !== null) {
    window.clearTimeout(patTimer);
    patTimer = null;
  }
}

window.addEventListener("mousedown", (event: MouseEvent) => {
  // 只响应左键，右键留给菜单
  if (event.button !== 0) return;
  pressOrigin = { x: event.screenX, y: event.screenY };
  dragging = false;
  patTriggered = false;
  clearPatTimer();
  // 长按 1.2 秒 = 摸头。
  // 之所以不用更短的 0.65s：用户按住想拖、手抖停顿一下就会被判定成摸头，
  // 而且旧实现里摸头之后会锁住拖拽，体验很糟。
  patTimer = window.setTimeout(() => {
    if (currentSettings?.gesturePat === false) return;
    if (pressOrigin && !dragging && !patTriggered) {
      patTriggered = true;
      machine.playPat();
    }
  }, 1200);
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
      clearPatTimer();
      // 摸头之后用户又想拖：允许。摸头动画会被拖拽打断，这是符合直觉的。
      patTriggered = false;
      dragging = true;
      petEl.classList.add("dragging");
      machine.onDragStart();
      if (!isDoNotDisturb()) {
        sound.play("drag");
        const line = lineEngine.pick("drag");
        if (line) bubble.show(line);
      }
      window.pet.dragStart({ x: event.screenX, y: event.screenY });
    }
    return;
  }

  window.pet.dragMove({ x: event.screenX, y: event.screenY });
});

function endDrag(): void {
  clearPatTimer();
  window.pet.dragEnd();
  petEl.classList.remove("dragging");
  machine.onDragEnd();
  pressOrigin = null;
  dragging = false;
}

window.addEventListener("mouseup", () => {
  if (!pressOrigin) return;
  clearPatTimer();

  // 长按已经触发摸头，松手不要再补一次点击
  if (patTriggered) {
    patTriggered = false;
    pressOrigin = null;
    dragging = false;
    return;
  }

  if (dragging) {
    endDrag();
  } else {
    const now = performance.now();
    rapidCount = now - lastClickAt < 1200 ? rapidCount + 1 : 1;
    lastClickAt = now;

    if (rapidCount >= 3 && currentSettings?.gestureAngry !== false) {
      rapidCount = 0;
      machine.playAngry();
    } else if (rapidCount === 2 && currentSettings?.gestureWave !== false) {
      machine.playWave();
    } else {
      machine.onPetClick();
    }

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

  lineEngine.setBank(pack.lines);

  view.setPack(pack);
  sound.setPack(pack);
  machine.start(); // 重新进入待机，重置睡眠计时
  sound.play("appear");

  bubble.show(`我是${pack.name}版哦`);
  console.log(`[personality] switched to ${nextId}`);
}

/** 设置变化：性格、静音、勿扰、音量、行为 */
function applySettings(settings: Settings): void {
  currentSettings = settings;
  sound.setMuted(settings.muted);
  sound.setVolume(settings.volume ?? 0.6);
  machine.setIdleTimeout(settings.idleToSleepMs ?? 30_000);

  if (!usingUserPet && settings.personality) switchPersonality(settings.personality);

  if (settings.dnd) {
    bubble.show("勿扰中，先不打扰你啦", 2000);
  } else if (settings.muted) {
    bubble.show("好，我安静一会儿", 2000);
  }
}

window.pet.onSettings(applySettings);

// 托盘 / 右键菜单里的「动作」主动触发
window.pet.onPlayAction((name) => {
  if (name === "wave") machine.playWave();
  else if (name === "stretch") machine.playStretch();
  else if (name === "pat") machine.playPat();
  else if (name === "angry") machine.playAngry();
});

// 用户导入角色成功后，立即换上（不重启程序）
window.pet.onUsePet((payload) => {
  usingUserPet = true;

  lineEngine.setBank(payload.pack.lines);

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

/** 显示聊天输入条 */
function openChatInput(): void {
  chatBox.hidden = false;
  chatInput.value = "";
  chatInput.focus();
}

function closeChatInput(): void {
  if (chatBox.hidden) return;
  chatBox.hidden = true;
  chatInput.blur();
  window.pet.chatInputClosed();
}

/** 发一句话给桌宠；失败就回落到内置台词，绝不让它"哑火" */
async function sendChat(): Promise<void> {
  const text = chatInput.value.trim();
  closeChatInput();
  if (!text) return;

  bubble.show("……", 20000);

  const result = await window.api.chatSend(text);
  if (result.ok) {
    bubble.show(result.reply, 12000);
    return;
  }

  // 失败回落：用引擎挑一句，保证它还是会说话
  console.log(`[chat] 失败(${result.reason}): ${result.message}`);
  const fallback = lineEngine.pick("click");
  bubble.show(fallback ?? "嗯……", 4000);
}

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void sendChat();
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeChatInput();
  }
});

window.pet.onShowChatInput(() => openChatInput());