import type { SoundName } from "../shared/pet-pack";
import type { SoundTheme } from "../shared/sound-themes";

/**
 * 萌宠语音包（C2 交付，胡汇兴）。
 *
 * 每个包 5 种音效、每种 2 个变体（-1 / -2）。播放时随机取一个，
 * 避免同一个动作每次听起来一模一样。
 *
 * 和「性格音效」的区别：
 * - 性格音效跟随角色（害羞/开朗/傲娇各自的音色）
 * - 语音包是**可选主题**，用户可以在设置里换（狗/猫/鸟/猪）
 */

import dogAppear1 from "./assets/sounds/packs/dog/appear-1.ogg";
import dogAppear2 from "./assets/sounds/packs/dog/appear-2.ogg";
import dogClick1 from "./assets/sounds/packs/dog/click-1.ogg";
import dogClick2 from "./assets/sounds/packs/dog/click-2.ogg";
import dogConfirm1 from "./assets/sounds/packs/dog/confirm-1.ogg";
import dogConfirm2 from "./assets/sounds/packs/dog/confirm-2.ogg";
import dogDrag1 from "./assets/sounds/packs/dog/drag-1.ogg";
import dogDrag2 from "./assets/sounds/packs/dog/drag-2.ogg";
import dogSleep1 from "./assets/sounds/packs/dog/sleep-1.ogg";
import dogSleep2 from "./assets/sounds/packs/dog/sleep-2.ogg";

import catAppear1 from "./assets/sounds/packs/cat/appear-1.ogg";
import catAppear2 from "./assets/sounds/packs/cat/appear-2.ogg";
import catClick1 from "./assets/sounds/packs/cat/click-1.ogg";
import catClick2 from "./assets/sounds/packs/cat/click-2.ogg";
import catConfirm1 from "./assets/sounds/packs/cat/confirm-1.ogg";
import catConfirm2 from "./assets/sounds/packs/cat/confirm-2.ogg";
import catDrag1 from "./assets/sounds/packs/cat/drag-1.ogg";
import catDrag2 from "./assets/sounds/packs/cat/drag-2.ogg";
import catSleep1 from "./assets/sounds/packs/cat/sleep-1.ogg";
import catSleep2 from "./assets/sounds/packs/cat/sleep-2.ogg";

import birdAppear1 from "./assets/sounds/packs/bird/appear-1.ogg";
import birdAppear2 from "./assets/sounds/packs/bird/appear-2.ogg";
import birdClick1 from "./assets/sounds/packs/bird/click-1.ogg";
import birdClick2 from "./assets/sounds/packs/bird/click-2.ogg";
import birdConfirm1 from "./assets/sounds/packs/bird/confirm-1.ogg";
import birdConfirm2 from "./assets/sounds/packs/bird/confirm-2.ogg";
import birdDrag1 from "./assets/sounds/packs/bird/drag-1.ogg";
import birdDrag2 from "./assets/sounds/packs/bird/drag-2.ogg";
import birdSleep1 from "./assets/sounds/packs/bird/sleep-1.ogg";
import birdSleep2 from "./assets/sounds/packs/bird/sleep-2.ogg";

import pigAppear1 from "./assets/sounds/packs/pig/appear-1.ogg";
import pigAppear2 from "./assets/sounds/packs/pig/appear-2.ogg";
import pigClick1 from "./assets/sounds/packs/pig/click-1.ogg";
import pigClick2 from "./assets/sounds/packs/pig/click-2.ogg";
import pigConfirm1 from "./assets/sounds/packs/pig/confirm-1.ogg";
import pigConfirm2 from "./assets/sounds/packs/pig/confirm-2.ogg";
import pigDrag1 from "./assets/sounds/packs/pig/drag-1.ogg";
import pigDrag2 from "./assets/sounds/packs/pig/drag-2.ogg";
import pigSleep1 from "./assets/sounds/packs/pig/sleep-1.ogg";
import pigSleep2 from "./assets/sounds/packs/pig/sleep-2.ogg";

// id 与显示名放在 shared，设置面板可以只引它（不拉音频文件）
export { SOUND_THEMES } from "../shared/sound-themes";
export type { SoundTheme } from "../shared/sound-themes";

/** 每种音效 2 个变体；没交付的 kind 留空，由播放器回落到性格音效/合成音 */
type ThemePool = Partial<Record<SoundName, string[]>>;

export const SOUND_PACKS: Record<Exclude<SoundTheme, "personality">, ThemePool> = {
  dog: {
    appear: [dogAppear1, dogAppear2],
    click: [dogClick1, dogClick2],
    confirm: [dogConfirm1, dogConfirm2],
    drag: [dogDrag1, dogDrag2],
    sleep: [dogSleep1, dogSleep2],
  },
  cat: {
    appear: [catAppear1, catAppear2],
    click: [catClick1, catClick2],
    confirm: [catConfirm1, catConfirm2],
    drag: [catDrag1, catDrag2],
    sleep: [catSleep1, catSleep2],
  },
  bird: {
    appear: [birdAppear1, birdAppear2],
    click: [birdClick1, birdClick2],
    confirm: [birdConfirm1, birdConfirm2],
    drag: [birdDrag1, birdDrag2],
    sleep: [birdSleep1, birdSleep2],
  },
  pig: {
    appear: [pigAppear1, pigAppear2],
    click: [pigClick1, pigClick2],
    confirm: [pigConfirm1, pigConfirm2],
    drag: [pigDrag1, pigDrag2],
    sleep: [pigSleep1, pigSleep2],
  },
};
