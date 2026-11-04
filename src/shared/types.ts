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
  /** 音量 0–1 */
  volume: number;
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
}
