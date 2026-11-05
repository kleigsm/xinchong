/**
 * 角色包（PetPack）：桌宠的全部数据契约。
 *
 * 美术交付、用户自定义素材、程序播放，三者都以这个结构为准。
 * 详细规格见 docs/ARCHITECTURE.md 第 6 节。
 */

import type { LineBank } from "./lines";

/** 动画名：4/5 行布局只提供前四个，9 行布局提供全部八个 */
export type AnimationName =
  | "idle"
  | "click"
  | "drag"
  | "sleep"
  | "wave"
  | "stretch"
  | "pat"
  | "angry";

/** 一段动画 */
export interface AnimationSpec {
  /** 帧在雪碧图中的格子序号（从 0 开始，按行优先） */
  frames: number[];
  /** 播放帧率 */
  fps: number;
  /** 是否循环；false 时播完触发完成回调 */
  loop: boolean;
}

/** 雪碧图布局 */
export interface SpriteSpec {
  /** 图片地址（构建后由 Vite 生成） */
  image: string;
  /** 单帧宽高（像素） */
  frameWidth: number;
  frameHeight: number;
  /** 雪碧图列数 */
  columns: number;
  /** 雪碧图行数 */
  rows: number;
}

// 台词库类型已迁移到 ./lines（6 场景，新增场景可选）。这里保留再导出，
// 兼容仍从 ./pet-pack 引 LineBank 的旧导入（如 default-lines.ts）。
export type { LineBank };

/** 一个完整的角色包 */
export interface PetPack {
  id: string;
  /** 显示名，如「害羞」「开朗」 */
  name: string;
  sprite: SpriteSpec;
  animations: Partial<Record<AnimationName, AnimationSpec>>;
  lines: LineBank;
  /** 音效文件（可选，暂未接入） */
  sounds?: Partial<Record<AnimationName, string>>;
}
