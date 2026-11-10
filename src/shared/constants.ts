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

/**
 * 聊天输入条（渲染层 #chat-box）在窗口内的位置。
 *
 * 它悬在角色上方，**不在角色那个命中圆里**——而窗口默认整窗穿透，
 * 光标一离开角色就变成"点击穿过去"，于是输入框点不动、打不了字。
 * 命中检测在输入条打开期间要额外放行这块矩形。
 */
export const CHAT_BOX_WIDTH = 280;
/** 输入条底边距窗口底部 */
export const CHAT_BOX_BOTTOM = 168;
/** 输入条高度（含内边距，实测 49px，留 3px 容差） */
export const CHAT_BOX_HEIGHT = 52;

/** 放宽命中区域的像素余量：贴边点击时不要突然变回穿透 */
export const HIT_MARGIN = 6;

/** 光标轮询间隔（ms） */
export const POLL_INTERVAL_MS = 80;

/**
 * 拖动/贴边时，**角色中心**距离工作区边缘至少要留多少像素。
 *
 * 以前用的是"窗口至少露 60px"，但角色贴在窗口底部，
 * 窗口露 60px 时角色已经几乎看不见了（BUG-011）。
 * 现在按角色中心算：留 24px ≈ 角色还有 65% 在屏幕内。
 */
export const PET_EDGE_MARGIN = 24;

/** 台词气泡默认停留时长（ms） */
export const BUBBLE_DURATION_MS = 3000;
