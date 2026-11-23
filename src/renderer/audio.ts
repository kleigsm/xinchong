import type { PetPack, SoundName } from "../shared/pet-pack";
import type { BuiltinSoundTheme } from "../shared/sound-themes";
import { isUserSoundTheme, userSoundId } from "../shared/sound-themes";
import { SOUND_PACKS, type SoundTheme } from "./sound-packs";

/** 音效名统一在 shared/pet-pack.ts 定义，这里再导出方便渲染层引用 */
export type SoundKind = SoundName;

/**
 * 音效播放器。
 *
 * 设计：角色包里有音效文件就用文件，没有就**用 Web Audio 合成**一个短音。
 * 好处：素材没到位时也能验证"静音开关 / 音量控制"这条链路，
 *       之后往 assets/sounds 里丢文件、改配置即可升级，代码不用动。
 *
 * P2-11：多了用户导入的音效包（`user:<id>`）。文件不在打包产物里，
 * 而是通过 IPC 从 userData 读成 data URL，按需加载并缓存。
 */
export class SoundPlayer {
  private ctx: AudioContext | null = null;
  private pack: PetPack;
  private volume = 0.6;
  private muted = false;
  /** 音效主题：personality = 跟随角色；其它 = 萌宠语音包 / 用户导入的包 */
  private theme: SoundTheme = "personality";
  /** 文件音效缓存，避免每次点击都重新加载 */
  private audioCache = new Map<string, HTMLAudioElement>();

  /** 用户音效包：id + 每种音效的文件名 */
  private userPackId: string | null = null;
  private userPack: { sounds: Record<string, string[]> } | null = null;
  /** data URL 缓存（文件名 → URL） */
  private userCache = new Map<string, string>();
  private userLoading = new Set<string>();

  constructor(pack: PetPack) {
    this.pack = pack;
  }

  setPack(pack: PetPack): void {
    this.pack = pack;
  }

  setVolume(volume: number): void {
    this.volume = Math.min(Math.max(volume, 0), 1);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /** 切换音效主题（设置里改，立即生效） */
  setTheme(theme: SoundTheme): void {
    this.theme = theme;

    const id = userSoundId(theme);
    if (!id) {
      this.userPackId = null;
      this.userPack = null;
      this.userCache.clear();
      return;
    }
    if (id === this.userPackId && this.userPack) return;

    this.userPackId = id;
    this.userPack = null;
    this.userCache.clear();
    void this.loadUserPack(id);
  }

  play(kind: SoundKind): void {
    if (this.muted || this.volume <= 0.001) {
      console.log(`[audio] skip ${kind} (muted=${this.muted}, volume=${this.volume})`);
      return;
    }

    // 0) 用户导入的音效包：文件是懒加载的，加载中先不出声（避免和内置音叠在一起）
    if (isUserSoundTheme(this.theme)) {
      const state = this.playUser(kind);
      if (state === "played") return;
      if (state === "loading" || !this.userPack) return;
    }

    // 1) 萌宠语音包（内置主题）：每种音效有 2 个变体，随机取一个
    if (this.theme !== "personality" && !isUserSoundTheme(this.theme)) {
      const pool = SOUND_PACKS[this.theme as Exclude<BuiltinSoundTheme, "personality">][kind];
      if (pool && pool.length > 0) {
        const url = pool[Math.floor(Math.random() * pool.length)];
        console.log(`[audio] play ${kind} (pack=${this.theme})`);
        this.playFile(url);
        return;
      }
    }

    // 2) 角色自带音效（跟随性格）
    const file = this.pack.sounds?.[kind];
    if (file) {
      console.log(`[audio] play ${kind} (file)`);
      this.playFile(file);
      return;
    }

    // 3) 兜底：Web Audio 合成
    console.log(`[audio] play ${kind} (synth, base=${this.baseFrequency()}Hz)`);
    this.synthesize(kind);
  }

  /* ---------------- 用户音效包 ---------------- */

  private async loadUserPack(id: string): Promise<void> {
    try {
      const sounds = await window.api.soundPackFiles(id);
      if (this.userPackId !== id) return; // 期间又切主题了
      // 包被删掉时给个空对象：playUser 会返回 fallback，继续走内置/合成音
      this.userPack = { sounds: sounds ?? {} };
      this.preloadUserFiles();
    } catch (error) {
      console.warn(`[audio] 读取音效包 ${id} 失败: ${String(error)}`);
      this.userPack = { sounds: {} };
    }
  }

  private playUser(kind: SoundKind): "played" | "loading" | "fallback" {
    const files = this.userPack?.sounds[kind];
    if (!files || files.length === 0) return "fallback";

    const file = files[Math.floor(Math.random() * files.length)];
    const cached = this.userCache.get(file);
    if (cached) {
      console.log(`[audio] play ${kind} (user=${this.userPackId})`);
      this.playFile(cached);
      return "played";
    }

    void this.loadUserFile(file).then((url) => {
      if (url) this.playFile(url);
    });
    return "loading";
  }

  private async loadUserFile(file: string): Promise<string | null> {
    const id = this.userPackId;
    if (!id) return null;

    const cached = this.userCache.get(file);
    if (cached) return cached;
    if (this.userLoading.has(file)) return null;

    this.userLoading.add(file);
    try {
      const url = await window.api.soundFile(id, file);
      if (url && this.userPackId === id) this.userCache.set(file, url);
      return url;
    } catch {
      return null;
    } finally {
      this.userLoading.delete(file);
    }
  }

  /** 切到用户包时先预加载常用的 5 种，第一次点击才不卡 */
  private preloadUserFiles(): void {
    for (const kind of ["appear", "click", "drag", "confirm", "sleep"] as SoundKind[]) {
      const files = this.userPack?.sounds[kind];
      if (files?.[0]) void this.loadUserFile(files[0]);
    }
  }

  /** 不同性格用不同音高，听感上能区分 */
  private baseFrequency(): number {
    switch (this.pack.id) {
      case "cheerful":
        return 880;
      case "tsundere":
        return 520;
      default:
        return 660; // shy
    }
  }

  private playFile(url: string): void {
    let audio = this.audioCache.get(url);
    if (!audio) {
      audio = new Audio(url);
      audio.preload = "auto";
      this.audioCache.set(url, audio);
    }
    audio.volume = this.volume;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // 自动播放被拦截等情况：静默失败，不影响交互
    });
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    // 浏览器策略：首次用户手势后才允许播放
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private synthesize(kind: SoundKind): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const base = this.baseFrequency();

    if (kind === "appear") {
      // 上扬的两连音
      this.blip(ctx, now, base, 0.09, "sine");
      this.blip(ctx, now + 0.1, base * 1.5, 0.12, "sine");
      return;
    }

    switch (kind) {
      case "click":
        this.blip(ctx, now, base, 0.11, "sine");
        break;
      case "drag":
        // 下滑音，像"被拎起来"
        this.slide(ctx, now, base * 1.25, base * 0.75, 0.18);
        break;
      case "sleep":
        // 很轻的低音，别吵
        this.blip(ctx, now, base * 0.5, 0.35, "sine", 0.35);
        break;
      case "wave":
        // 轻快的两连音，像"拜拜"
        this.blip(ctx, now, base * 1.1, 0.09, "sine");
        this.blip(ctx, now + 0.11, base * 1.4, 0.1, "sine");
        break;
      case "stretch":
        // 缓缓上扬，像打哈欠
        this.slide(ctx, now, base * 0.7, base * 1.05, 0.5);
        break;
      case "pat":
        // 两声很轻的"噗哟"
        this.blip(ctx, now, base * 1.3, 0.07, "triangle", 0.6);
        this.blip(ctx, now + 0.09, base * 1.5, 0.08, "triangle", 0.5);
        break;
      case "angry":
        // 短促的下滑方波，像"哼"
        this.slide(ctx, now, base * 0.9, base * 0.55, 0.16, "square");
        break;
      case "confirm":
        // 轻快的两声上扬，用于"操作成功"
        this.blip(ctx, now, base * 1.2, 0.07, "sine");
        this.blip(ctx, now + 0.08, base * 1.6, 0.1, "sine");
        break;
    }
  }

  /** 单音：快起快落，避免爆音 */
  private blip(
    ctx: AudioContext,
    at: number,
    frequency: number,
    duration: number,
    type: OscillatorType,
    volumeScale = 1,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, at);

    const peak = Math.max(this.volume * 0.22 * volumeScale, 0.0001);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }

  /** 滑音：频率从 from 平滑到 to */
  private slide(
    ctx: AudioContext,
    at: number,
    from: number,
    to: number,
    duration: number,
    type: OscillatorType = "sine",
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(to, at + duration);

    const peak = Math.max(this.volume * 0.2, 0.0001);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }
}
