import { BUBBLE_DURATION_MS } from "../shared/constants";

/**
 * 台词气泡。
 *
 * 行为：
 * - 显示一句话，停留 durationMs 后自动淡出
 * - 期间再次调用 show() 会直接替换文本并重置计时
 * - 不做打字机效果（会拉长停留时间，且对性能不友好）
 */
export class SpeechBubble {
  private el: HTMLElement;
  private hideTimer: number | null = null;

  constructor(el: HTMLElement) {
    this.el = el;
  }

  show(text: string, durationMs = BUBBLE_DURATION_MS): void {
    if (!text) return;

    this.el.textContent = text;
    this.el.classList.add("visible");

    if (this.hideTimer !== null) window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => this.hide(), durationMs);
  }

  hide(): void {
    this.el.classList.remove("visible");
    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  destroy(): void {
    this.hide();
  }
}
