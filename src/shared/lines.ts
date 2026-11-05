/**
 * 台词库数据结构（P2-5 话术引擎）。
 *
 * 「场景」是引擎挑台词的一个维度：程序知道「现在发生了什么」，
 * 再按角色性格从对应场景的池子里挑一句。
 */

/** 场景：程序知道"现在发生了什么" */
export type Scene =
  | "click"      // 被点了一下
  | "drag"       // 被拖起来
  | "idleLong"   // 很久没互动
  | "sleep"      // 进入睡眠
  | "morning"    // 早上第一次见
  | "night"      // 深夜（22:00–05:00）
  | "wave"       // 招手（双击）
  | "stretch"    // 伸懒腰（睡醒）
  | "pat"        // 摸头（长按）
  | "angry";     // 生气（连点三下）

/**
 * 台词库：按场景分组。
 *
 * click / drag / idleLong 是历史版本必有的核心场景；
 * 其余为可选——旧角色包只有前 4 个场景，
 * 缺省时引擎按「空场景」处理（回退到 click 池，见 line-engine.ts）。
 */
export type LineBank = {
  click: string[];
  drag: string[];
  idleLong: string[];
  sleep?: string[];
  morning?: string[];
  night?: string[];
  wave?: string[];
  stretch?: string[];
  pat?: string[];
  angry?: string[];
};
