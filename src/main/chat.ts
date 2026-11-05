import { loadChatKey } from "./chat-key";

/**
 * 可选的聊天调用（P2-6）。
 *
 * 设计原则（来自 D-007）：
 * - **没有 Key 时完全不影响使用**——调用方拿到 no-key 就静默回落到内置台词
 * - **任何失败都回落**，不要让桌宠"卡住不说话"
 * - 只发送用户这几句话 + 性格设定，不发任何本地数据
 */

export type ChatResult =
  | { ok: true; reply: string }
  | {
      ok: false;
      reason: "no-key" | "unauthorized" | "rate-limit" | "timeout" | "network" | "empty";
      message: string;
    };

interface Turn {
  role: "user" | "assistant";
  content: string;
}

/** 最近几轮对话（只放内存，不落盘） */
const history: Turn[] = [];
const MAX_HISTORY_TURNS = 6; // 3 问 3 答

/** 每套性格的语气设定 + 两个示例（示例比形容词更能约束风格） */
const PERSONA: Record<string, string> = {
  shy: `你叫「芯宠」，是用户桌面上的小宠物。性格：害羞、容易脸红、说话小声。
示例：
用户：在吗 → 在、在的……怎么啦
用户：你好 → 你、你好呀（脸红）`,
  cheerful: `你叫「芯宠」，是用户桌面上的小宠物。性格：开朗、话多、爱玩。
示例：
用户：在吗 → 在的在的！等你半天啦
用户：好累 → 那摸会儿鱼吧！我陪你`,
  tsundere: `你叫「芯宠」，是用户桌面上的小宠物。性格：傲娇、嘴硬心软。
示例：
用户：在吗 → 哼，才不是在等你
用户：陪我玩 → ……就一会儿哦`,
};

const DEFAULT_PERSONA = PERSONA.shy;

/** 所有性格共用的硬规则 */
const COMMON_RULES = `
回复要求：
1. 只说一句话，不超过 18 个字
2. 像朋友闲聊，不要解释、不要列点、不要说教
3. 不要用句号结尾
4. 绝对不要说"作为一个AI""我是模型"之类的话
5. 不知道就老实说"不知道诶"，不要编`;

function systemPrompt(personality: string): string {
  return `${PERSONA[personality] ?? DEFAULT_PERSONA}\n${COMMON_RULES}`;
}

/** 记一轮对话，超长就丢掉最早的 */
function remember(userText: string, reply: string): void {
  history.push({ role: "user", content: userText }, { role: "assistant", content: reply });
  while (history.length > MAX_HISTORY_TURNS) history.shift();
}

/** 换性格/换角色时清空上下文，免得串味 */
export function resetChatHistory(): void {
  history.length = 0;
}

/** 和桌宠说一句话；失败时返回原因，由调用方决定怎么回落 */
export async function sendChatMessage(text: string, personality: string): Promise<ChatResult> {
  const key = loadChatKey();
  if (!key) return { ok: false, reason: "no-key", message: "还没有配置 API Key" };

  const trimmed = text.trim().slice(0, 200);
  if (!trimmed) return { ok: false, reason: "empty", message: "没有内容" };

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt(personality) },
          // 带上最近几轮，回复才不会"失忆"
          ...history,
          { role: "user", content: trimmed },
        ],
        max_tokens: 80,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (response.status === 401) {
      return { ok: false, reason: "unauthorized", message: "Key 无效或已过期" };
    }
    if (response.status === 429) {
      return { ok: false, reason: "rate-limit", message: "请求太频繁" };
    }
    if (!response.ok) {
      return { ok: false, reason: "network", message: `服务返回 ${response.status}` };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return { ok: false, reason: "empty", message: "回复是空的" };

    // 压成一行，气泡里更整齐
    const cleaned = reply.replace(/\s+/g, " ").slice(0, 60);
    remember(trimmed, cleaned);
    return { ok: true, reply: cleaned };
  } catch (error) {
    const text = String(error);
    if (text.includes("TimeoutError") || text.includes("timed out")) {
      return { ok: false, reason: "timeout", message: "连接超时" };
    }
    return { ok: false, reason: "network", message: text.slice(0, 100) };
  }
}
