import type { AnimationName, PetPack } from "../shared/pet-pack";

/**
 * 雪碧图动画播放器。
 *
 * 为什么用 background-position 而不是 Canvas：
 * - 能用 CSS transform（L2 自动动画直接复用）
 * - 调试直观，不闪
 * - 代码量少
 *
 * 用法：
 *   const view = new PetView(el, pack);
 *   view.play("idle");
 *   view.play("click", () => view.play("idle"));
 */
export class PetView {
  private el: HTMLElement;
  private pack: PetPack;
  private timer: number | null = null;
  private frameIndex = 0;
  private current: AnimationName | null = null;
  private onFinish: (() => void) | null = null;

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
    this.applySprite();
    this.play("idle");
  }

  get currentAnimation(): AnimationName | null {
    return this.current;
  }

  /** 播放某段动画；非循环动画播完后调用 onFinish */
  play(name: AnimationName, onFinish?: () => void): void {
    const spec = this.pack.animations[name];
    if (!spec || spec.frames.length === 0) return;

    this.stop();
    this.current = name;
    console.log(`[pet-view] play ${name}`);
    this.onFinish = onFinish ?? null;
    this.frameIndex = 0;
    this.renderFrame(spec.frames[0]);

    const interval = 1000 / spec.fps;
    this.timer = window.setInterval(() => {
      this.frameIndex += 1;

      if (this.frameIndex >= spec.frames.length) {
        if (spec.loop) {
          this.frameIndex = 0;
        } else {
          this.stop();
          const done = this.onFinish;
          this.onFinish = null;
          done?.();
          return;
        }
      }

      this.renderFrame(spec.frames[this.frameIndex]);
    }, interval);
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.current = null;
  }

  /** 设置雪碧图与尺寸，只需在换包时调用一次 */
  private applySprite(): void {
    const { image, columns, rows } = this.pack.sprite;
    this.el.style.backgroundImage = `url("${image}")`;
    // 每格按元素大小缩放：4 列 → 400%
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