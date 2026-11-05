import type { LineBank, Scene } from "../shared/lines";

/**
 * 引擎可注入的依赖（规则 5：纯函数可测）。
 * 随机源和「当前时间」都靠构造参数注入，不碰 window / DOM / 全局时间。
 */
export interface LineEngineOptions {
  /** 同一场景里，最近多少条不重复。默认 10 */
  historySize?: number;
  /** 注入随机源，方便测试。默认 Math.random */
  random?: () => number;
  /** 注入"当前时间"，方便测试深夜台词。默认 () => new Date() */
  now?: () => Date;
}

/** night 场景的门禁窗口：22:00（含）到次日 05:00（不含），跨午夜 */
const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 5;

/**
 * 话术引擎：按「性格 × 场景」从台词库挑一句。
 *
 * 规则见 docs/tasks/p2-5-line-engine.md 第四节。
 */
export class LineEngine {
  private bank: LineBank;
  private readonly historySize: number;
  private readonly random: () => number;
  private readonly now: () => Date;
  /** 每个场景最近取过的下标（滑动窗口，长度 ≤ 有效 historySize） */
  private readonly recent = new Map<Scene, number[]>();

  constructor(bank: LineBank, options: LineEngineOptions = {}) {
    this.bank = bank;
    this.historySize = options.historySize ?? 10;
    this.random = options.random ?? Math.random;
    this.now = options.now ?? (() => new Date());
  }

  /** 取一句；无可取时返回 null（调用方静默处理） */
  pick(scene: Scene): string | null {
    // 时间门禁：只有 night 受限制，白天直接 null（硬门禁优先于回退，不回退）
    if (scene === "night" && !this.isNight(this.now())) return null;

    const source = this.resolveSource(scene);
    if (source === null) return null;

    return this.pickFrom(source, this.bank[source] ?? []);
  }

  /** 换角色时整体换库（同时清空历史） */
  setBank(bank: LineBank): void {
    this.bank = bank;
    this.recent.clear();
  }

  /** 某场景是否有内容（供调用方决定要不要触发） */
  hasScene(scene: Scene): boolean {
    const pool = this.bank[scene];
    return Array.isArray(pool) && pool.length > 0;
  }

  /** 深夜窗口：22:00–05:00（跨午夜） */
  private isNight(date: Date): boolean {
    const hour = date.getHours();
    return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
  }

  /**
   * 回退优先级（任务书 5.1）：
   * 1. 时间门禁（只有 night）——已在上层 pick 处理，白天直接 null
   * 2. 该场景库非空 → 用它
   * 3. 库空 → 回退到 click 池
   * 4. click 也空 → null
   */
  private resolveSource(scene: Scene): Scene | null {
    if (this.hasScene(scene)) return scene;
    if (scene === "click") return null;
    return this.hasScene("click") ? "click" : null;
  }

  private pickFrom(source: Scene, pool: string[]): string {
    // 有效历史长度 = min(historySize, 库长-1)：库小时退化成「轮换」（规则 1/2）
    const cap = Math.max(0, Math.min(this.historySize, pool.length - 1));
    const history = this.recent.get(source) ?? [];

    const available = pool
      .map((_, index) => index)
      .filter((index) => !history.includes(index));

    // cap ≤ 库长-1，所以 available 至少剩 1 个，不会取空
    const picked = available[Math.floor(this.random() * available.length)];

    history.push(picked);
    while (history.length > cap) history.shift();
    this.recent.set(source, history);

    return pool[picked];
  }
}
