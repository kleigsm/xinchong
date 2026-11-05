import type { PetView } from "./pet-view";

/** 桌宠的行为状态 */
export type PetState =
  | "idle"
  | "click"
  | "drag"
  | "sleep"
  | "wave"
  | "stretch"
  | "pat"
  | "angry";

/** 播一次就回待机的动作（连点要能重播） */
const ONE_SHOT: ReadonlySet<PetState> = new Set(["click", "wave", "stretch", "pat", "angry"]);

export interface StateMachineOptions {
  /** 空闲多久进入睡觉（毫秒），默认 30 秒 */
  idleToSleepMs?: number;
  /** 状态变化回调，供气泡 / 音效订阅 */
  onStateChange?: (from: PetState | null, to: PetState) => void;
}

/**
 * 行为状态机。
 *
 *   ┌──────── 点击 ────────┐
 *   ▼                      │
 *  click ──(播完)──> idle ──┘
 *                     │
 *                     │ 30 秒无互动
 *                     ▼
 *                   sleep ──(点击)──> click
 *
 * 拖拽优先级最高：进入 drag 后，点击动画一律不播。
 */
export class PetStateMachine {
  private view: PetView;
  private state: PetState | null = null;
  private sleepTimer: number | null = null;
  private idleToSleepMs: number;
  private onStateChange?: (from: PetState | null, to: PetState) => void;

  constructor(view: PetView, options: StateMachineOptions = {}) {
    this.view = view;
    this.idleToSleepMs = options.idleToSleepMs ?? 30_000;
    this.onStateChange = options.onStateChange;
  }

  /** 启动：进入待机。首次必须强制，否则会被"同状态"判断挡掉 */
  start(): void {
    this.enter("idle", true);
  }

  get current(): PetState {
    return this.state ?? "idle";
  }

  /** 用户点击（鼠标按下并松开且未拖动） */
  onPetClick(): void {
    // 拖拽中不响应点击，避免拖到一半突然播反应动画
    if (this.state === "drag") return;
    // 睡醒先伸个懒腰，再回待机
    if (this.state === "sleep") {
      this.enter("stretch");
      return;
    }
    this.enter("click");
  }

  /** 双击：招手 */
  playWave(): void {
    if (this.state === "drag") return;
    this.enter("wave", true);
  }

  /** 睡醒 / 手动：伸懒腰 */
  playStretch(): void {
    if (this.state === "drag") return;
    this.enter("stretch", true);
  }

  /** 长按：摸头 */
  playPat(): void {
    if (this.state === "drag") return;
    this.enter("pat", true);
  }

  /** 连点：生气 */
  playAngry(): void {
    if (this.state === "drag") return;
    this.enter("angry", true);
  }

  /** 开始拖拽 */
  onDragStart(): void {
    if (this.state === "drag") return;
    this.enter("drag");
  }

  /** 结束拖拽 */
  onDragEnd(): void {
    if (this.state !== "drag") return;
    this.enter("idle");
  }

  /** 销毁：清掉所有定时器 */
  destroy(): void {
    this.clearSleepTimer();
    this.view.stop();
  }

  private enter(next: PetState, force = false): void {
    const from = this.state;
    // 同一状态重复进入没意义；但一次性动作例外（连点/连按要能重播）
    if (!force && from === next && !ONE_SHOT.has(next)) return;

    this.state = next;
    this.clearSleepTimer();

    console.log(`[state] t=${Math.round(performance.now())}ms ${from ?? "init"} → ${next}`);
    this.onStateChange?.(from, next);

    switch (next) {
      case "idle":
        this.view.play("idle");
        this.scheduleSleep();
        break;

      case "click":
        // 非循环动画，播完自动回待机
        this.view.play("click", () => {
          // 期间如果被拖拽打断，就不要强行回 idle
          if (this.state === "click") this.enter("idle");
        });
        break;

      case "drag":
        this.view.play("drag");
        break;

      case "sleep":
        this.view.play("sleep");
        break;

      case "wave":
      case "stretch":
      case "pat":
      case "angry":
        this.view.play(next, () => {
          if (this.state === next) this.enter("idle");
        });
        break;
    }
  }

  /** 重置"多久没互动"的计时 */
  private scheduleSleep(): void {
    this.clearSleepTimer();
    this.sleepTimer = window.setTimeout(() => {
      if (this.state === "idle") this.enter("sleep");
    }, this.idleToSleepMs);
  }

  private clearSleepTimer(): void {
    if (this.sleepTimer !== null) {
      window.clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
    }
  }
}
