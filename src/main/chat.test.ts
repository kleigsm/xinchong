import { beforeEach, describe, expect, it, vi } from "vitest";

const loadChatKey = vi.fn<() => string | null>();
const getChatContext = vi.fn<() => Array<{ role: "user" | "assistant"; content: string }>>();
const appendConversation = vi.fn<(key: string, user: string, reply: string) => void>();

vi.mock("./chat-key", () => ({ loadChatKey: () => loadChatKey() }));
vi.mock("./chat-store", () => ({
  getChatContext: () => getChatContext(),
  appendConversation: (...args: [string, string, string]) => appendConversation(...args),
}));

const { sendChatMessage } = await import("./chat");

function reply(content: string, status = 200): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("sendChatMessage（P2-10 上下文来源）", () => {
  beforeEach(() => {
    loadChatKey.mockReset();
    getChatContext.mockReset();
    appendConversation.mockReset();
    vi.unstubAllGlobals();
  });

  it("没有 Key 时不发请求", async () => {
    loadChatKey.mockReturnValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendChatMessage("在吗", "shy", "builtin:shy");

    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("只带这个角色的上下文，成功后写回同一个 key", async () => {
    loadChatKey.mockReturnValue("sk-test");
    getChatContext.mockReturnValue([{ role: "user", content: "我叫小明" }]);
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => reply("记住啦"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendChatMessage("在吗", "shy", "builtin:shy");

    expect(result).toEqual({ ok: true, reply: "记住啦" });
    expect(getChatContext).toHaveBeenCalledTimes(1);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.messages[0].role).toBe("system");
    expect(body.messages).toContainEqual({ role: "user", content: "我叫小明" });
    expect(body.messages.at(-1)).toEqual({ role: "user", content: "在吗" });
    expect(appendConversation).toHaveBeenCalledWith("builtin:shy", "在吗", "记住啦");
  });

  it("失败不写历史（401）", async () => {
    loadChatKey.mockReturnValue("sk-test");
    getChatContext.mockReturnValue([]);
    vi.stubGlobal("fetch", vi.fn(async () => reply("", 401)));

    const result = await sendChatMessage("在吗", "shy", "builtin:shy");

    expect(result.ok).toBe(false);
    expect(appendConversation).not.toHaveBeenCalled();
  });
});
