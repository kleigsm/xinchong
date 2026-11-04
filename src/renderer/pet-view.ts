import type { AnimationName, AnimationSpec, PetPack } from "../shared/pet-pack";

/** 降帧下限：再低就不像"动"了 */
const MIN_FPS = 4;
/** 连续多少个慢帧判定为掉帧 */
const SLOW_TICK_THRESHOLD = 12;
/** 慢帧判定：实际间隔超过预期的多少倍 */
const SLOW_FACTOR = 2.5;

/**
 * 雪碧图动画播放器。
 *
 * 为什么用 background-position 而不是 Canvas：
 * - 能用 CSS transform（L2 自动动画直接复用）
 * - 调试直观，不闪
 * - 代码量少
 *
 * 内置「卡顿自动降帧」：如果定时器持续被拖延（说明渲染跟不上），
 * 每次把帧率降到 75%，最低 4fps —— 宁可慢一点，也不要堆积卡死。
 */
export class PetView {
  private el: HTMLElement;
  private pack: PetPack;
  private timer: number | null = null;
  private frameIndex = 0;
  private current: AnimationName | null = null;
  private onFinish: (() => void) | null = null;

  private spec: AnimationSpec | null = null;
  private effectiveFps = 0;
  private lastTickAt = 0;
  private slowTicks = 0;

  constructor(el: HTMLElement, pack: PetPack) {
    this.el = el;
    this.pack = pack;
    validatePack(pack);
    this.applySprite();
  }

  /** 换角色包（换性格时用） */
  setPack(pack: PetPack): void {
    this.stop();
    this.pack = pack;
    validatePack(pack);
    this.applySprite();
    this.play("idle");
  }

  get currentAnimation(): AnimationName | null {
    return this.current;
  }

  get fps(): number {
    return this.effectiveFps;
  }

  /** 播放某段动画；非循环动画播完后调用 onFinish */
  play(name: AnimationName, onFinish?: () => void): void {
    const spec = this.pack.animations[name];
    if (!spec || spec.frames.length === 0) return;

    this.stop();
    this.current = name;
    this.spec = spec;
    this.onFinish = onFinish ?? null;
    this.frameIndex = 0;
    this.effectiveFps = spec.fps;
    this.slowTicks = 0;

    console.log(`[pet-view] play ${name}`);
    this.renderFrame(spec.frames[0]);
    this.startTimer();
  }

  stop(): void {
    this.clearTimer();
    this.current = null;
    this.spec = null;
  }

  private startTimer(): void {
    this.clearTimer();
    this.lastTickAt = performance.now();
    const interval = 1000 / this.effectiveFps;
    this.timer = window.setInterval(() => this.onTick(interval), interval);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private onTick(interval: number): void {
    const now = performance.now();
    const delta = now - this.lastTickAt;
    this.lastTickAt = now;

    // 定时器被拖延，说明这一帧渲染跟不上
    if (delta > interval * SLOW_FACTOR) {
      this.slowTicks += 1;
    } else if (this.slowTicks > 0) {
      this.slowTicks -= 1;
    }

    if (this.slowTicks >= SLOW_TICK_THRESHOLD && this.effectiveFps > MIN_FPS) {
      const next = Math.max(MIN_FPS, Math.round(this.effectiveFps * 0.75));
      if (next < this.effectiveFps) {
        console.log(`[pet-view] 检测到掉帧，降帧 ${this.effectiveFps} → ${next} fps`);
        this.effectiveFps = next;
        this.slowTicks = 0;
        this.startTimer();
        return;
      }
    }

    this.advanceFrame();
  }

  private advanceFrame(): void {
    const spec = this.spec;
    if (!spec) return;

    this.frameIndex += 1;

    if (this.frameIndex >= spec.frames.length) {
      if (spec.loop) {
        this.frameIndex = 0;
      } else {
        this.clearTimer();
        this.spec = null;
        this.current = null;
        const done = this.onFinish;
        this.onFinish = null;
        done?.();
        return;
      }
    }

    this.renderFrame(spec.frames[this.frameIndex]);
  }

  /** 设置雪碧图与尺寸，只需在换包时调用一次 */
  private applySprite(): void {
    const { image, columns, rows } = this.pack.sprite;
    this.el.style.backgroundImage = `url("${image}")`;
    this.el.style.backgroundSize = `${columns * 100}% ${rows * 100}%`;
    this.el.style.backgroundRepeat = "no-repeat";
  }

  /** 把「格子序号」换算成 background-position 百分比 */
  private renderFrame(cellIndex: number): void {
    const { columns, rows } = this.pack.sprite;
    const col = cellIndex % columns;
    const row = Math.floor(cellIndex / columns);

    const x = columns > 1 ? (col / (columns - 1)) * 100 : 0;
    const y = rows > 1 ? (row / (rows - 1)) * 100 : 0;

    this.el.style.backgroundPosition = `${x}% ${y}%`;
  }
}

/**
 * 启动时校验角色包，尽早暴露"帧号越界"这类配置错误。
 *
 * 背景：P1-2 调试时把睡觉动画错写成雪碧图的空白格，
 * 表现为「一睡觉就变透明」，排查花了不少时间。
 */
function validatePack(pack: PetPack): void {
  const { columns, rows } = pack.sprite;
  const totalCells = columns * rows;

  for (const [name, spec] of Object.entries(pack.animations)) {
    if (spec.frames.length === 0) {
      console.warn(`[pet-view] 动画 ${name} 没有帧`);
      continue;
    }
    const outOfRange = spec.frames.filter((f) => f < 0 || f >= totalCells);
    if (outOfRange.length > 0) {
      console.warn(
        `[pet-view] 动画 ${name} 有越界帧 ${outOfRange.join(",")}（雪碧图共 ${totalCells} 格）`,
      );
    }
  }
}
