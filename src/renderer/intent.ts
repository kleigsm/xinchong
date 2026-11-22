import type { Scene } from "../shared/lines";

/**
 * 本地意图识别（P2-7 7c）。
 *
 * 目的：常见的话（打招呼、晚安、夸它、骂它、说累）没必要花一次 API 调用——
 * 又慢又费钱。这里用纯规则先接住，命中就直接用本地台词库回。
 *
 * 三条约束：
 * 1. 规则只放在这一个文件里，不要把正则散到 main.ts
 * 2. 纯函数，不碰 window / DOM，可单测
 * 3. **宁可漏判，不要错判**：命中错了会答非所问，漏判只是多花一次 API
 */

export type Intent = "tired" | "insult" | "praise" | "goodnight" | "farewell" | "greeting";

/** detectIntent 的返回值；none = 交给真正的聊天（API） */
export type DetectedIntent = Intent | "none";

/** 意图 → 用哪个场景的台词回应；null 表示用固定安慰句 */
export const INTENT_SCENE: Record<Intent, Scene | null> = {
  tired: null,
  insult: "angry",
  praise: "pat",
  goodnight: "sleep",
  farewell: "wave",
  greeting: "click",
};

/** 说累时的固定安慰句（不花 API） */
export const COMFORT_LINES = [
  "那先歇会儿吧",
  "累了就靠一会儿",
  "别硬撑啦",
  "摸鱼也是正经事",
  "先喝口水，我等你",
] as const;

interface Rule {
  intent: Intent;
  pattern: RegExp;
}

/**
 * 规则表。**顺序 = 优先级**，越具体的放越前面：
 * - 「你好烦」要先算骂它，不能算问候
 * - 「困了要睡」要先算说累，不能算晚安
 */
const RULES: Rule[] = [
  { intent: "tired", pattern: /(累|困|不想干活|不想上班|不想写|不想动|顶不住|撑不住|没力气|好烦啊)/ },
  { intent: "insult", pattern: /(讨厌|烦死|烦人|烦|笨蛋|傻瓜|傻子|坏蛋|闭嘴|滚蛋)/ },
  { intent: "praise", pattern: /(可爱|好看|喜欢你|爱你|好棒|真棒|厉害|好萌|萌死)/ },
  { intent: "goodnight", pattern: /(晚安|睡了|去睡|先睡|要睡|睡觉了)/ },
  { intent: "farewell", pattern: /(再见|拜拜|我走了|先走了|下线|回头见|byebye|bye)/i },
  { intent: "greeting", pattern: /^(你好|您好|在吗|在不在|早上好|早安|哈喽|嗨|hello|hi\b)/i },
];

/** 识别一句话的意图；识别不出返回 "none"（照旧走 API） */
export function detectIntent(text: string): DetectedIntent {
  const value = text.trim();
  if (!value) return "none";

  for (const rule of RULES) {
    if (rule.pattern.test(value)) return rule.intent;
  }
  return "none";
}

/** 说累时挑一句安慰；注入 random 方便测试 */
export function pickComfort(random: () => number = Math.random): string {
  return COMFORT_LINES[Math.floor(random() * COMFORT_LINES.length)];
}
