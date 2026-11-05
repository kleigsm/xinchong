import type { AnimationName, AnimationSpec, PetPack } from "../../shared/pet-pack";
import type { PersonalityId } from "../../shared/personalities";

import shySheet from "../assets/pet-shy.png";
import cheerfulSheet from "../assets/pet-cheerful.png";
import tsundereSheet from "../assets/pet-tsundere.png";

/**
 * 内置角色包：三套统一使用 9 行布局（36 帧，含四个性格动作）。
 * 布局与帧号定义见 src/main/sheet-layout.ts。
 */

const LAYOUT_9 = { frameWidth: 128, frameHeight: 128, columns: 4, rows: 9 } as const;

const ANIMATIONS_9: Partial<Record<AnimationName, AnimationSpec>> = {
  idle: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 4, loop: true },
  click: { frames: [8, 9, 10, 11], fps: 5, loop: false },
  drag: { frames: [12, 13, 14, 15], fps: 4, loop: true },
  sleep: { frames: [16, 17, 18, 19], fps: 1.5, loop: true },
  wave: { frames: [20, 21, 22, 23], fps: 6, loop: false },
  stretch: { frames: [24, 25, 26, 27], fps: 4, loop: false },
  pat: { frames: [28, 29, 30, 31], fps: 6, loop: false },
  angry: { frames: [32, 33, 34, 35], fps: 8, loop: false },
};

export const PACKS: Record<PersonalityId, PetPack> = {
  shy: {
    id: "shy",
    name: "害羞",
    sprite: { image: shySheet, ...LAYOUT_9 },
    animations: ANIMATIONS_9,
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
    sprite: { image: cheerfulSheet, ...LAYOUT_9 },
    animations: ANIMATIONS_9,
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
    sprite: { image: tsundereSheet, ...LAYOUT_9 },
    animations: ANIMATIONS_9,
    lines: {
      click: ["哼，才不是想理你", "干、干嘛啦", "无聊", "就这一次哦", "别得寸进尺"],
      drag: ["放、放我下来！", "喂！", "别乱拎！"],
      idleLong: ["……才没有在等你", "哼，爱答不理", "忙着呢，别烦"],
      sleep: ["哼……", "才没有睡着"],
    },
  },
};
