import type { AnimationName, AnimationSpec, PetPack } from "../../shared/pet-pack";
import type { PersonalityId } from "../../shared/personalities";

import shySheet from "../assets/pet-shy.png";
import cheerfulSheet from "../assets/pet-cheerful.png";
import tsundereSheet from "../assets/pet-tsundere.png";

// 音效（C2）。缺哪个 kind 就由 SoundPlayer 用合成音兜底。
import shyAppear from "../assets/sounds/shy/appear.wav";
import shyClick from "../assets/sounds/shy/click.wav";
import shyConfirm from "../assets/sounds/shy/confirm.wav";
import shyDrag from "../assets/sounds/shy/drag.wav";
import shySleep from "../assets/sounds/shy/sleep.wav";

import cheerfulAppear from "../assets/sounds/cheerful/appear.wav";
import cheerfulClick from "../assets/sounds/cheerful/click.wav";
import cheerfulConfirm from "../assets/sounds/cheerful/confirm.wav";
import cheerfulDrag from "../assets/sounds/cheerful/drag.wav";
import cheerfulSleep from "../assets/sounds/cheerful/sleep.wav";

import tsundereAppear from "../assets/sounds/tsundere/appear.wav";
import tsundereClick from "../assets/sounds/tsundere/click.wav";
import tsundereConfirm from "../assets/sounds/tsundere/confirm.wav";
import tsundereDrag from "../assets/sounds/tsundere/drag.wav";
import tsundereSleep from "../assets/sounds/tsundere/sleep.wav";

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
      click: [
        "……诶？",
        "别、别突然戳我啦",
        "（脸红）",
        "那个…有事吗",
        "呜…吓我一跳",
        "你、你轻一点",
        "我在这里啦",
        "……还要戳吗",
        "别一直盯着我",
        "（往旁边挪了挪）",
        "我、我没躲",
        "戳坏了怎么办",
      ],
      drag: [
        "要、要掉下去了",
        "轻一点…拜托",
        "（抓紧你的手）",
        "放我下来啦",
        "好高…好可怕",
        "别把我扔出去",
      ],
      idleLong: [
        "你在忙吗",
        "……我等你很久了",
        "不理我也没关系",
        "（偷偷看你）",
        "要不要休息一下",
        "我就在这儿",
      ],
      sleep: [
        "呼……呼……",
        "晚安…",
        "（蜷成一团）",
        "困了…先睡了",
      ],
      wave: [
        "……拜拜？",
        "你、你要走了吗",
        "（小幅度挥手）",
        "早点回来",
        "我会等你的",
      ],
      stretch: [
        "唔…睡得好香",
        "（伸了个懒腰）",
        "早、早上好",
        "睡饱了…",
        "你也刚醒吗",
      ],
      pat: [
        "诶诶…",
        "别、别摸头啦",
        "（脸更红了）",
        "……就一下下",
        "好、好舒服",
      ],
      angry: [
        "唔…不理你了",
        "你戳太多次了",
        "（鼓起脸）",
        "再戳我就躲起来",
        "我、我生气了哦",
      ],
      night: [
        "这么晚了还不睡吗",
        "明天会起不来的",
        "（打了个哈欠）",
        "我陪你…快睡吧",
        "夜里凉…盖好被子",
        "再不睡我要睡了",
      ],
      morning: [
        "早…又见面了",
        "昨晚睡得好吗",
        "（揉了揉眼睛）",
        "今天也一起吧",
      ],
    },
    sounds: {
      appear: shyAppear,
      click: shyClick,
      confirm: shyConfirm,
      drag: shyDrag,
      sleep: shySleep,
    },
  },

  cheerful: {
    id: "cheerful",
    name: "开朗",
    sprite: { image: cheerfulSheet, ...LAYOUT_9 },
    animations: ANIMATIONS_9,
    lines: {
      click: [
        "哇！",
        "来玩吗来玩吗！",
        "一起摸鱼吧！",
        "戳我干嘛呀",
        "嘿嘿，好痒",
        "今天也超有精神！",
        "再点一下嘛！",
        "你终于来啦！",
        "我等你半天了！",
        "要不要出去走走！",
        "点我等于想我！",
        "（原地转了个圈）",
      ],
      drag: [
        "哇——飞起来啦！",
        "再高一点再高一点！",
        "我要当风筝！",
        "（张开手臂）",
        "别松手呀！",
        "带我去兜风吗！",
      ],
      idleLong: [
        "好无聊呀！",
        "你忙完没呀",
        "陪我玩五分钟嘛",
        "（在你旁边转圈）",
        "我快长蘑菇了！",
        "理理我嘛！",
      ],
      sleep: [
        "呼…呼…",
        "晚安啦！",
        "（抱着小毯子）",
        "明天继续玩！",
      ],
      wave: [
        "拜拜拜拜！",
        "明天见！",
        "不许忘了我！",
        "（用力挥手）",
        "早点回来玩！",
      ],
      stretch: [
        "啊——睡饱啦！",
        "新的一天！",
        "（伸到最高）",
        "今天去哪玩！",
        "我准备好了！",
      ],
      pat: [
        "嘿嘿～",
        "再摸一下！",
        "好舒服呀",
        "（眯起眼睛）",
        "摸头最棒了！",
      ],
      angry: [
        "哼！不理你三秒！",
        "戳太多啦！",
        "我生气咯！",
        "（气鼓鼓）",
        "我要记小本本！",
      ],
      night: [
        "这么晚还不睡！",
        "明天要没精神啦！",
        "（哈欠）陪你到这儿",
        "快睡快睡！",
        "梦里也要玩！",
        "晚安好梦！",
      ],
      morning: [
        "早上好！",
        "今天也元气满满！",
        "（蹦了两下）",
        "出发出发！",
      ],
    },
    sounds: {
      appear: cheerfulAppear,
      click: cheerfulClick,
      confirm: cheerfulConfirm,
      drag: cheerfulDrag,
      sleep: cheerfulSleep,
    },
  },

  tsundere: {
    id: "tsundere",
    name: "傲娇",
    sprite: { image: tsundereSheet, ...LAYOUT_9 },
    animations: ANIMATIONS_9,
    lines: {
      click: [
        "哼，才不是想理你",
        "别得寸进尺",
        "又戳…烦不烦",
        "（别过头）",
        "就、就一下哦",
        "我才没在等你",
        "你手很闲吗",
        "哼，知道了啦",
        "（偷偷看你）",
        "别以为我高兴",
        "戳够了没有",
        "…也不是不能陪你",
      ],
      drag: [
        "放我下来！",
        "谁准你拎我的",
        "（抓紧你）",
        "摔了要你好看",
        "哼，我自己会走",
        "轻点…笨蛋",
      ],
      idleLong: [
        "喂，还在吗",
        "才没有想你",
        "（假装看风景）",
        "忙完记得回来",
        "哼，随便你",
        "…我等着呢",
      ],
      sleep: [
        "哼…先睡了",
        "别吵我",
        "（背对着你）",
        "晚安…就一句",
      ],
      wave: [
        "走了别回来",
        "哼，慢走",
        "（别过头挥手）",
        "记得回来就行",
        "我才没舍不得",
      ],
      stretch: [
        "…睡醒了",
        "伸个懒腰而已",
        "别、别看我",
        "（头发翘起来了）",
        "哼，早上好",
      ],
      pat: [
        "谁、谁准你摸了",
        "……就这一次",
        "别碰我啦",
        "（耳朵红了）",
        "哼，还行吧",
      ],
      angry: [
        "过分了！",
        "再也不理你了",
        "哼！！",
        "（抱臂背对你）",
        "道歉也没用…才怪",
      ],
      night: [
        "这么晚还醒着",
        "明天起不来别怪我",
        "（把被子往你那边推）",
        "快去睡",
        "我才没担心你",
        "晚安…笨蛋",
      ],
      morning: [
        "…早",
        "醒了就起来",
        "（递给你一杯水）",
        "今天也别太勉强",
      ],
    },
    sounds: {
      appear: tsundereAppear,
      click: tsundereClick,
      confirm: tsundereConfirm,
      drag: tsundereDrag,
      sleep: tsundereSleep,
    },
  },

};
