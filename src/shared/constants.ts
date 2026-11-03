/** 窗口与交互的全局常量，主进程和渲染进程共用 */

/** 窗口边长（px） */
export const WINDOW_SIZE = 220;

/** 桌宠圆形直径 */
export const PET_DIAMETER = 160;

/** 命中检测半径（略大于直径的一半，留容差） */
export const HIT_RADIUS = 82;

/** 光标轮询间隔（ms） */
export const POLL_INTERVAL_MS = 50;

/** 呼吸动画帧率上限（P0-1 实测：60fps 常量动画会吃掉 25% 单核） */
export const ANIMATION_FPS = 12;

/** 拖动时至少保留多少像素在屏幕内，防止宠物被拖丢 */
export const MIN_VISIBLE_PX = 60;
