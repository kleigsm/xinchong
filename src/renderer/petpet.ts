import hand0 from "./assets/petpet/hand-0.webp";
import hand1 from "./assets/petpet/hand-1.webp";
import hand2 from "./assets/petpet/hand-2.webp";
import hand3 from "./assets/petpet/hand-3.webp";
import hand4 from "./assets/petpet/hand-4.webp";
import cartoon0 from "./assets/petpet/cartoon-0.png";
import cartoon1 from "./assets/petpet/cartoon-1.png";
import cartoon2 from "./assets/petpet/cartoon-2.png";
import cartoon3 from "./assets/petpet/cartoon-3.png";
import cartoon4 from "./assets/petpet/cartoon-4.png";

/**
 * petpet 摸头效果（运行时，所有形象通用）。
 *
 * 参数来自 petpet 原始实现：
 * - 10 帧一个循环，5 张手图，每张连用 2 帧
 * - 宽度 0.85 → 0.925，高度 0.85 → 0.675（原版更扁，这里收一点，避免"突然变小"）
 * - 每帧 30ms，一次摸头播 2 个循环（600ms）
 *
 * ⚠️ 不要用 requestAnimationFrame：透明窗口失焦时 rAF 会被节流到 1fps，
 * 表现为手掌只闪一下。setTimeout 与雪碧图播放器同源，实测稳定。
 */

const REAL = [hand0, hand1, hand2, hand3, hand4];
const CARTOON = [cartoon0, cartoon1, cartoon2, cartoon3, cartoon4];
const STEPS = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1];
const STEP_MS = 30;
const LOOPS = 2;
const SIZE = 160;

// 预加载所有手图，避免每 30ms 换 src 时解码空白
for (const src of [...REAL, ...CARTOON]) {
  const img = new Image();
  img.src = src;
}

let timer: number | null = null;
let easeTimer: number | null = null;
let running = false;

function cleanup(petEl: HTMLElement, handEl: HTMLImageElement, keepHand: boolean): void {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
  if (easeTimer !== null) {
    window.clearTimeout(easeTimer);
    easeTimer = null;
  }
  petEl.style.transform = "";
  petEl.style.transformOrigin = "";
  petEl.style.transition = "";
  petEl.classList.remove("petpet-playing");
  if (!keepHand) {
    handEl.hidden = true;
    handEl.removeAttribute("src");
  }
}

export function stopPetpet(petEl: HTMLElement, handEl: HTMLImageElement): void {
  running = false;
  cleanup(petEl, handEl, false);
}

export function playPetpet(
  petEl: HTMLElement,
  handEl: HTMLImageElement,
  style: "real" | "cartoon" = "cartoon",
): void {
  // 连按/重复触发：从头开始
  if (running) stopPetpet(petEl, handEl);

  const hands = style === "real" ? REAL : CARTOON;
  running = true;
  petEl.classList.add("petpet-playing");
  petEl.style.transformOrigin = "0 0";
  // 第一下不要"跳"地缩下去，用 90ms 过渡进入压扁状态
  petEl.style.transition = "transform 90ms ease-out";
  easeTimer = window.setTimeout(() => {
    petEl.style.transition = "";
    easeTimer = null;
  }, 110);

  handEl.hidden = false;
  handEl.classList.toggle("hand-real", style === "real");
  handEl.classList.toggle("hand-cartoon", style === "cartoon");

  console.log("[petpet] start", style);
  const start = performance.now();
  const total = STEPS.length * LOOPS;

  const finish = (): void => {
    console.log("[petpet] end", Math.round(performance.now() - start));
    running = false;
    cleanup(petEl, handEl, false);
  };

  const tick = (): void => {
    if (!running) return;
    const step = Math.floor((performance.now() - start) / STEP_MS);
    if (step >= total) {
      finish();
      return;
    }
    const i = step % STEPS.length;
    const s = STEPS[i];

    const widthScale = 0.85 + s * 0.015;
    const heightScale = 0.85 - s * 0.035;
    const offsetX = ((1 - widthScale) * 0.5 + 0.1) * SIZE;
    const offsetY = ((1 - heightScale) - 0.08) * SIZE;

    petEl.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${widthScale}, ${heightScale})`;
    handEl.src = hands[Math.floor(i / 2)];

    timer = window.setTimeout(tick, STEP_MS);
  };

  tick();
}
