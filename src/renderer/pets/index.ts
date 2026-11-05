import type { AnimationName, AnimationSpec, PetPack } from "../../shared/pet-pack";
import type { PersonalityId } from "../../shared/personalities";

import shySheet from "../assets/pet-shy.png";
import cheerfulSheet from "../assets/pet-cheerful.png";
import tsundereSheet from "../assets/pet-tsundere.png";

/**
 * 内置角色包。
 *
 * 两种雪碧图布局并存（见 src/main/sheet-layout.ts）：
 * - 4 行：每行一个动作，后两行只用前 2 格（害羞套是这种）
 * - 5 行：待机 8 帧占两行，其余动作各 4 帧（开朗 / 傲娇是这种）
 */

const LAYOUT_4 = { frameWidth: 128, frameHeight: 128, columns: 4, rows: 4 } as const;
const LAYOUT_5 = { frameWidth: 128, frameHeight: 128, columns: 4, rows: 5 } as const;

const ANIMATIONS_4: Record<AnimationName, AnimationSpec> = {
  idle: { frames: [0, 1, 2, 3], fps: 8, loop: true },
  click: { frames: [4, 5, 6, 7], fps: 12, loop: false },
  drag: { frames: [8, 9], fps: 6, loop: true },
  sleep: { frames: [12, 13], fps: 2, loop: true },
};

const ANIMATIONS_5: Record<AnimationName, AnimationSpec> = {
  idle: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 8, loop: true },
  click: { frames: [8, 9, 10, 11], fps: 12, loop: false },
  drag: { frames: [12, 13, 14, 15], fps: 6, loop: true },
  sleep: { frames: [16, 17, 18, 19], fps: 2, loop: true },
};

export const PACKS: Record<PersonalityId, PetPack> = {
  shy: {
    id: "shy",
    name: "害羞",
    sprite: { image: shySheet, ...LAYOUT_4 },
    animations: ANIMATIONS_4,
    lines: {
      click: ["……诶？", "别、别突然戳我啦", "（脸红）", "嗯？", "那个……有事吗"],
      drag: ["要掉下去了……！", "喂喂喂——", "轻、轻一点"],
      idleLong: ["……你在忙吗", "（发呆）", "好无聊啊"],
      sleep: ["呼……呼……"],
    },
  },

  cheerful: {
    id: "cheerful",
    name: "开朗",
    sprite: { image: cheerfulSheet, ...LAYOUT_5 },
    animations: ANIMATIONS_5,
    lines: {
      click: ["哇！", "嘿，戳我干嘛呀", "来玩吗来玩吗！", "今天心情超好！", "一起摸鱼吧！"],
      drag: ["飞起来啦——", "哇啊啊", "带我去哪儿？"],
      idleLong: ["好无聊呀，陪我玩嘛", "今天也要加油哦", "喂——在吗？"],
      sleep: ["呼……呼……", "梦里也在玩……"],
    },
  },

  tsundere: {
    id: "tsundere",
    name: "傲娇",
    sprite: { image: tsundereSheet, ...LAYOUT_5 },
    animations: ANIMATIONS_5,
    lines: {
      click: ["哼，才不是想理你", "干、干嘛啦", "无聊", "就这一次哦", "别得寸进尺"],
      drag: ["放、放我下来！", "喂！", "别乱拎！"],
      idleLong: ["……才没有在等你", "哼，爱答不理", "忙着呢，别烦"],
      sleep: ["哼……", "才没有睡着"],
    },
  },
};
