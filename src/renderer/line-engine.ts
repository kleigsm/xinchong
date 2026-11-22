import type { LineBank, Scene } from "../shared/lines";

/**
 * 引擎可注入的依赖（规则 5：纯函数可测）。
 * 随机源和「当前时间」都靠构造参数注入，不碰 window / DOM / 全局时间。
 */
export interface LineEngineOptions {
  /** 同一场景里，最近多少条不重复。默认 20（大于 12 条 click 池，保证先轮完再重复） */
  historySize?: number;
  /**
   * 跨场景冷却（毫秒）：同一句台词在这段时间内不再出现。0 = 关闭。
   * P2-7 加的：以前只按场景去重，「点一下」和「拖一下」可能挑到同一句话。
   */
  cooldownMs?: number;
  /** 注入随机源，方便测试。默认 Math.random */
  random?: () => number;
  /** 注入"当前时间"，方便测试深夜台词与冷却。默认 () => new Date() */
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
  private cooldownMs: number;
  private readonly random: () => number;
  private readonly now: () => Date;
  /** 每个场景最近取过的下标（滑动窗口，长度 ≤ 有效 historySize） */
  private readonly recent = new Map<Scene, number[]>();
  /** 全局冷却：台词 → 上次出现的时间戳（跨场景共用，P2-7） */
  private readonly lastSeenAt = new Map<string, number>();

  constructor(bank: LineBank, options: LineEngineOptions = {}) {
    this.bank = bank;
    this.historySize = options.historySize ?? 20;
    this.cooldownMs = Math.max(0, options.cooldownMs ?? 0);
    this.random = options.random ?? Math.random;
    this.now = options.now ?? (() => new Date());
  }

  /** 取一句；无可取时返回 null（调用方静默处理） */
  pick(scene: Scene): string | null {
    // 时间门禁：只有 night 受限制，白天直接 null（硬门禁优先于回退，不回退）
    if (scene === "night" && !this.isNight(this.now())) return null;

    const source = this.resolveSource(scene);
    if (source === null) return null;

    const nowMs = this.now().getTime();
    const picked = this.pickFrom(source, this.bank[source] ?? [], nowMs);
    if (picked !== null) this.lastSeenAt.set(picked, nowMs);
    return picked;
  }

  /** 换角色时整体换库（同时清空历史与冷却） */
  setBank(bank: LineBank): void {
    this.bank = bank;
    this.recent.clear();
    this.lastSeenAt.clear();
  }

  /** 改冷却时长（设置页保存「台词冷却」时调用）；0 = 关闭 */
  setCooldownMs(ms: number): void {
    this.cooldownMs = Math.max(0, ms);
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

  private pickFrom(source: Scene, pool: string[], nowMs: number): string | null {
    if (pool.length === 0) return null;

    // 有效历史长度 = min(historySize, 库长-1)：库小时退化成「轮换」（规则 1/2）
    const cap = Math.max(0, Math.min(this.historySize, pool.length - 1));
    const history = this.recent.get(source) ?? [];

    const indices = pool.map((_, index) => index);

    // P2-7：先按本场景历史过滤，再按全局冷却过滤
    let available = indices.filter((index) => !history.includes(index) && this.isCooled(index, pool, nowMs));

    // 冷却把库锁死时（库很小 / 刚说完一轮）放宽冷却：宁可重复，也不能哑掉
    if (available.length === 0) {
      available = indices.filter((index) => !history.includes(index));
    }
    // 库只有一条：也只能说它
    if (available.length === 0) available = indices;

    const picked = available[Math.floor(this.random() * available.length)];

    history.push(picked);
    while (history.length > cap) history.shift();
    this.recent.set(source, history);

    return pool[picked];
  }

  /** 这句台词是否已经过了冷却期（冷却关闭时恒为 true） */
  private isCooled(index: number, pool: string[], nowMs: number): boolean {
    if (this.cooldownMs <= 0) return true;

    const seen = this.lastSeenAt.get(pool[index]);
    return seen === undefined || nowMs - seen >= this.cooldownMs;
  }
}
