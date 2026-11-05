import { loadChatKey } from "./chat-key";

/**
 * 可选的聊天调用（P2-6）。
 *
 * 设计原则（来自 D-007）：
 * - **没有 Key 时完全不影响使用**——调用方拿到 no-key 就静默回落到内置台词
 * - **任何失败都回落**，不要让桌宠"卡住不说话"
 * - 只发送用户这一句话 + 一句性格设定，不发任何本地数据
 */

export type ChatResult =
  | { ok: true; reply: string }
  | { ok: false; reason: "no-key" | "unauthorized" | "rate-limit" | "timeout" | "network" | "empty"; message: string };

/** 每套性格对应的说话风格，直接拼进 system prompt */
const PERSONA: Record<string, string> = {
  shy: "你是一只害羞的桌宠，说话小声、容易脸红，句子很短，偶尔带省略号。",
  cheerful: "你是一只开朗的桌宠，说话热情、爱用感叹号，喜欢约用户一起摸鱼。",
  tsundere: "你是一只傲娇的桌宠，嘴硬心软，说话带点嫌弃但其实很在意对方。",
};

const DEFAULT_PERSONA = PERSONA.shy;

/** 和桌宠说一句话；失败时返回原因，由调用方决定怎么回落 */
export async function sendChatMessage(text: string, personality: string): Promise<ChatResult> {
  const key = loadChatKey();
  if (!key) return { ok: false, reason: "no-key", message: "还没有配置 API Key" };

  const trimmed = text.trim().slice(0, 200);
  if (!trimmed) return { ok: false, reason: "empty", message: "没有内容" };

  const persona = PERSONA[personality] ?? DEFAULT_PERSONA;

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
          {
            role: "system",
            content: `${persona}
你现在是桌宠，回复必须满足：
1. 只用一句话，不超过 20 个字
2. 不用句号结尾
3. 不要解释你是 AI，不要提"模型""训练"这些词`,
          },
          { role: "user", content: trimmed },
        ],
        max_tokens: 60,
        temperature: 0.9,
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

    // 兜底：把可能的换行压成空格，气泡只有一行更整齐
    return { ok: true, reply: reply.replace(/\s+/g, " ").slice(0, 60) };
  } catch (error) {
    const text = String(error);
    if (text.includes("TimeoutError") || text.includes("timed out")) {
      return { ok: false, reason: "timeout", message: "连接超时" };
    }
    return { ok: false, reason: "network", message: text.slice(0, 100) };
  }
}
