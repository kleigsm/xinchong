import type { PetPack } from "./pet-pack";

/** 屏幕坐标点（DIP） */
export interface Point {
  x: number;
  y: number;
}

/** 可持久化的用户设置 */
export interface Settings {
  /** 静音：不播放音效 */
  muted: boolean;
  /** 勿扰：不主动说话、不发声、不弹气泡 */
  dnd: boolean;
  /** 开机自启（默认关闭） */
  autoStart: boolean;
  /** 当前性格 id（见 shared/personalities.ts） */
  personality: string;
  /** 当前使用的自定义角色 id；null 表示用内置性格角色 */
  activePetId: string | null;
  /** 音量 0–1 */
  volume: number;
  /** 多久没互动进入睡觉（毫秒）；0 = 不自动睡 */
  idleToSleepMs: number;
  /** 双击招手 */
  gestureWave: boolean;
  /** 长按摸头 */
  gesturePat: boolean;
  /** 连点生气 */
  gestureAngry: boolean;
}

/** preload 通过 contextBridge 暴露给渲染进程的 API */
export interface PetApi {
  dragStart(point: Point): void;
  dragMove(point: Point): void;
  dragEnd(): void;
  /** 弹出右键菜单（与托盘菜单一致） */
  showMenu(): void;
  /** 订阅设置变化，返回取消订阅函数 */
  onSettings(callback: (settings: Settings) => void): () => void;
  /** 渲染层初始化完成，通知主进程可以派发事件了 */
  ready(): void;
  /** 订阅「要用户说话」事件（右键菜单里点「说句话…」） */
  onShowChatInput(callback: () => void): () => void;
  /** 告诉主进程：输入条关了，恢复不可聚焦 */
  chatInputClosed(): void;
  /** 订阅「换回内置角色」事件 */
  onUseBuiltin(callback: (personalityId: string) => void): () => void;
  /** 订阅「导入后立即换上」事件 */
  onUsePet(callback: (payload: UserPetPayload) => void): () => void;
  /** 订阅右键/托盘菜单里的「动作」触发 */
  onPlayAction(callback: (name: string) => void): () => void;
}

/** 主进程告知渲染层：换上这个角色（雪碧图已转成 data URL） */
export interface UserPetPayload {
  id: string;
  name: string;
  pack: PetPack;
}
