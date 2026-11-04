import type { PetPack } from "../../shared/pet-pack";
import sheetUrl from "../assets/placeholder-sheet.png";

/**
 * 占位角色包（程序生成，非美术交付）。
 *
 * 用途：在 C 线素材到位前，让渲染层和状态机可以先跑通。
 * 素材到位后：把 sheetUrl 换成真实图片，调一下 frameWidth/columns 即可，代码不用改。
 *
 * 雪碧图布局（512×512，4×4 格，每格 128×128）：
 *   行 0：待机（4 帧，最后一帧眨眼）
 *   行 1：点击（4 帧，压扁弹起 + 开心眼 + 张嘴）
 *   行 2：拖拽（2 帧，左右倾斜）
 *   行 3：睡觉（2 帧，闭眼）
 */
export const placeholderPack: PetPack = {
  id: "placeholder",
  name: "占位角色",

  sprite: {
    image: sheetUrl,
    frameWidth: 128,
    frameHeight: 128,
    columns: 4,
    rows: 4,
  },

  animations: {
    idle: { frames: [0, 1, 2, 3], fps: 8, loop: true },
    click: { frames: [4, 5, 6, 7], fps: 12, loop: false },
    drag: { frames: [8, 9], fps: 6, loop: true },
    sleep: { frames: [10, 11], fps: 2, loop: true },
  },

  lines: {
    click: ["……诶？", "别、别突然戳我啦", "（脸红）", "嗯？", "今天也很闲嘛"],
    drag: ["要掉下去了……！", "喂喂喂——", "轻、轻一点"],
    idleLong: ["……你在忙吗", "（发呆）", "好无聊啊"],
    sleep: ["呼……呼……"],
  },
};
