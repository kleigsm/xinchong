/** 窗口与交互的全局常量，主进程和渲染进程共用 */

/**
 * 窗口尺寸。
 * 高度 = 气泡区 + 角色区；角色贴底，气泡在上方展示。
 */
export const WINDOW_WIDTH = 320;
export const WINDOW_HEIGHT = 340;

/** 角色方形尺寸（雪碧图单帧的显示大小） */
export const PET_SIZE = 160;

/** 命中检测半径（略大于 160 的一半，留容差） */
export const HIT_RADIUS = 82;

/** 光标轮询间隔（ms） */
export const POLL_INTERVAL_MS = 80;

/** 拖动时至少保留多少像素在屏幕内，防止宠物被拖丢 */
export const MIN_VISIBLE_PX = 60;

/** 台词气泡默认停留时长（ms） */
export const BUBBLE_DURATION_MS = 3000;
