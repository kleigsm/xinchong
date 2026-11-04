import type { PetPack } from "../shared/pet-pack";

export type SoundKind = "click" | "drag" | "sleep" | "appear";

/**
 * 音效播放器。
 *
 * 设计：角色包里有音效文件就用文件，没有就**用 Web Audio 合成**一个短音。
 * 好处：素材没到位时也能验证"静音开关 / 音量控制"这条链路，
 *       之后往 assets/sounds 里丢文件、改配置即可升级，代码不用动。
 */
export class SoundPlayer {
  private ctx: AudioContext | null = null;
  private pack: PetPack;
  private volume = 0.6;
  private muted = false;
  /** 文件音效缓存，避免每次点击都重新加载 */
  private audioCache = new Map<string, HTMLAudioElement>();

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

  play(kind: SoundKind): void {
    if (this.muted || this.volume <= 0.001) {
      console.log(`[audio] skip ${kind} (muted=${this.muted}, volume=${this.volume})`);
      return;
    }

    const file = (this.pack.sounds as Record<string, string | undefined> | undefined)?.[kind];
    if (file) {
      console.log(`[audio] play ${kind} (file)`);
      this.playFile(file);
      return;
    }
    console.log(`[audio] play ${kind} (synth, base=${this.baseFrequency()}Hz)`);
    this.synthesize(kind);
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
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
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
