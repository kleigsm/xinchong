import { describe, expect, it } from "vitest";
import { REPLY_MAX_CHARS, clipReply } from "./chat-text";

/**
 * P2-7 7d 单测：气泡里的回复限长。
 * 验收要求「超过 20 字被截断，且不切在半个词上」。
 */
describe("clipReply", () => {
  it("短的保持原样", () => {
    expect(clipReply("在的呀")).toBe("在的呀");
  });

  it("正好 20 字不截断", () => {
    const exact = "一".repeat(REPLY_MAX_CHARS);
    expect(clipReply(exact)).toBe(exact);
  });

  it("超长且中间有标点：切在最近的标点后面，保留标点", () => {
    const text = "今天也要一起加油哦，不过你也别太累了，真的";
    const out = clipReply(text);
    expect(out.length).toBeLessThanOrEqual(REPLY_MAX_CHARS);
    // 切在最近的逗号后面，不留半截词，也不加省略号
    expect(out.endsWith("，")).toBe(true);
    expect(out).toBe("今天也要一起加油哦，不过你也别太累了，");
  });

  it("超长且没有标点：硬切到 20 字 + 省略号", () => {
    const text = "一".repeat(30);
    const out = clipReply(text);
    expect(out).toBe(`${"一".repeat(REPLY_MAX_CHARS)}…`);
    expect(out.length).toBe(REPLY_MAX_CHARS + 1);
  });

  it("标点太靠前（只剩一两个字）时不切标点，改硬切", () => {
    const text = "好，然后就是很长很长很长很长很长很长很长的一句话";
    const out = clipReply(text);
    expect(out.endsWith("…")).toBe(true);
    expect(out.startsWith("好，")).toBe(true);
  });

  it("换行 / 连续空白先压成一个空格", () => {
    expect(clipReply("在的\n\n呀   怎么啦")).toBe("在的 呀 怎么啦");
  });

  it("空字符串安全返回", () => {
    expect(clipReply("")).toBe("");
    expect(clipReply("   ")).toBe("");
  });

  it("max 可调（测试与未来复用）", () => {
    expect(clipReply("一二三四五六", 4)).toBe("一二三四…");
  });
});
