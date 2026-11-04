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

/**
 * 台词挑选器：随机取，但避开最近出现过的几条，避免连续重复。
 */
export class LinePicker {
  private lines: string[];
  private recent: number[] = [];
  private historySize: number;

  constructor(lines: string[], historySize = 10) {
    this.lines = lines.filter((line) => line.trim().length > 0);
    this.historySize = historySize;
  }

  /** 取下一句；台词库为空时返回 null */
  next(): string | null {
    if (this.lines.length === 0) return null;

    const available = this.lines
      .map((_, index) => index)
      .filter((index) => !this.recent.includes(index));

    // 可选的都被用过了（台词太少），清空历史重新开始
    const pool = available.length > 0
      ? available
      : this.lines.map((_, index) => index);

    if (available.length === 0) this.recent = [];

    const picked = pool[Math.floor(Math.random() * pool.length)];
    this.recent.push(picked);
    if (this.recent.length > this.historySize) this.recent.shift();

    return this.lines[picked];
  }
}
