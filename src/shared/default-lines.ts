import type { LineBank } from "./pet-pack";

/**
 * 用户导入的角色默认用这套台词——中性、不挑性格。
 * 内置三套性格各有自己的台词，导入的角色没有，就用这一份兜底。
 */
export const DEFAULT_IMPORTED_LINES: LineBank = {
  click: ["诶？", "你好呀", "点我干嘛", "在的在的", "嗯？"],
  drag: ["要掉下去了！", "轻一点啦", "喂喂——"],
  idleLong: ["你在忙吗", "发会儿呆", "好无聊呀"],
  sleep: ["呼……呼……"],
};
