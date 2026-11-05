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
  /** L2 单帧立绘的驱动定时器 */
  private staticTimer: number | null = null;

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

  /** 是否为「单帧立绘」（L2）：用 CSS transform 动画，不逐帧重绘 */
  get isStatic(): boolean {
    return this.pack.sprite.columns === 1 && this.pack.sprite.rows === 1;
  }

  /** 播放某段动画；非循环动画播完后调用 onFinish */
  play(name: AnimationName, onFinish?: () => void): void {
    const spec = this.pack.animations[name];
    if (!spec || spec.frames.length === 0) return;

    if (this.isStatic) {
      this.playStatic(name, onFinish);
      return;
    }

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

  /**
   * L2 单帧立绘：整张图定死，动作全靠 transform。
   *
   * 为什么不直接用 CSS 关键帧：
   * CSS 动画跑 60fps，透明窗口每帧合成一次，实测 GPU 20%+、CPU 25%。
   * 改成和雪碧图同频（8fps）的 JS 驱动后，开销降到和 L3 一个量级。
   * 呼吸这种慢动作 8fps 完全够顺。
   */
  private playStatic(name: AnimationName, onFinish?: () => void): void {
    this.stop();
    this.current = name;

    const started = performance.now();
    const duration = name === "click" ? 420 : 0;

    const tick = (): void => {
      const elapsed = performance.now() - started;
      this.renderStatic(name, elapsed);

      if (name === "click" && elapsed >= duration) {
        this.clearStaticTimer();
        onFinish?.();
      }
    };

    tick();
    console.log(`[pet-view] play ${name} (static)`);
    this.staticTimer = window.setInterval(tick, 1000 / 8);
  }

  /** 按时间和动作算出当前 transform */
  private renderStatic(name: AnimationName, elapsed: number): void {
    let transform = "scale(1, 1)";

    if (name === "idle") {
      const phase = (elapsed % 3200) / 3200;
      const wave = Math.sin(phase * Math.PI * 2);
      transform = `scale(${1 + wave * 0.012}, ${1 + wave * 0.022})`;
    } else if (name === "drag") {
      const phase = (elapsed % 1100) / 1100;
      transform = `rotate(${Math.sin(phase * Math.PI * 2) * 4}deg)`;
    } else if (name === "sleep") {
      const phase = (elapsed % 4000) / 4000;
      const wave = Math.sin(phase * Math.PI * 2);
      transform = `scale(${0.97 + wave * 0.008}, ${0.96 + wave * 0.012})`;
      this.el.style.opacity = "0.94";
    } else if (name === "click") {
      // 0.42s 的弹跳：先压扁起跳，再回弹
      const t = Math.min(elapsed / 420, 1);
      const lift = Math.sin(t * Math.PI) * 10;
      const squash = 1 - Math.sin(t * Math.PI) * 0.04;
      transform = `translateY(${-lift}px) scale(${1 + (1 - squash) * 0.6}, ${squash})`;
    }

    if (name !== "sleep") this.el.style.opacity = "1";
    this.el.style.transform = transform;
  }

  private clearStaticTimer(): void {
    if (this.staticTimer !== null) {
      window.clearInterval(this.staticTimer);
      this.staticTimer = null;
    }
  }

  stop(): void {
    this.clearTimer();
    this.clearStaticTimer();
    this.current = null;
    this.spec = null;
    this.el.style.transform = "";
    this.el.style.opacity = "1";
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
