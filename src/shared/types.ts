/** 屏幕坐标点（DIP） */
export interface Point {
  x: number;
  y: number;
}

/** preload 通过 contextBridge 暴露给渲染进程的 API */
export interface PetApi {
  dragStart(point: Point): void;
  dragMove(point: Point): void;
  dragEnd(): void;
}
