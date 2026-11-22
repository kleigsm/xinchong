import { describe, expect, it } from "vitest";
import {
  appendTurns,
  characterKeyOf,
  contextMessages,
  emptyArchive,
  MAX_CONTEXT_MESSAGES,
  MAX_STORED_TURNS,
  parseArchive,
  trimTurns,
  type StoredTurn,
} from "./chat-archive";

function turns(count: number): StoredTurn[] {
  return Array.from({ length: count }, (_, index) => ({
    role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
    content: `第 ${index} 条`,
    at: 1000 + index,
  }));
}

describe("parseArchive", () => {
  it("空文本按空存档处理，不算损坏", () => {
    const result = parseArchive("   ");
    expect(result.recovered).toBe(false);
    expect(result.archive.characters).toEqual({});
  });

  it("JSON 坏了不抛错，标记为 recovered", () => {
    const result = parseArchive("{ 这不是 json");
    expect(result.recovered).toBe(true);
    expect(result.archive).toEqual(emptyArchive());
  });

  it("版本不认识时重置并标记 recovered", () => {
    const result = parseArchive(JSON.stringify({ version: 99, characters: {} }));
    expect(result.recovered).toBe(true);
    expect(result.archive.version).toBe(1);
  });

  it("正常存档能读回来", () => {
    const archive = emptyArchive();
    const next = appendTurns(archive, "builtin:shy", "在吗", "在的", 2000);
    const result = parseArchive(JSON.stringify(next));
    expect(result.recovered).toBe(false);
    expect(result.archive.characters["builtin:shy"]?.turns).toHaveLength(2);
  });

  it("单个角色结构坏了只丢它，其余保留", () => {
    const raw = JSON.stringify({
      version: 1,
      characters: {
        "builtin:shy": { updatedAt: 1, turns: [{ role: "user", content: "在吗", at: 1 }] },
        "builtin:cheerful": { updatedAt: 1, turns: "not-an-array" },
      },
    });
    const result = parseArchive(raw);
    expect(result.recovered).toBe(true);
    expect(result.archive.characters["builtin:shy"]?.turns).toHaveLength(1);
    expect(result.archive.characters["builtin:cheerful"]).toBeUndefined();
  });

  it("超过上限的存档读回来会被裁剪", () => {
    const raw = JSON.stringify({
      version: 1,
      characters: { "builtin:shy": { updatedAt: 1, turns: turns(MAX_STORED_TURNS + 30) } },
    });
    const result = parseArchive(raw);
    expect(result.archive.characters["builtin:shy"]?.turns).toHaveLength(MAX_STORED_TURNS);
  });
});

describe("trimTurns", () => {
  it("只保留最近 MAX_STORED_TURNS 条", () => {
    const kept = trimTurns(turns(MAX_STORED_TURNS + 10));
    expect(kept).toHaveLength(MAX_STORED_TURNS);
    expect(kept[kept.length - 1]?.content).toBe(`第 ${MAX_STORED_TURNS + 9} 条`);
  });
});

describe("appendTurns", () => {
  it("追加一轮问答且不改原对象", () => {
    const archive = emptyArchive();
    const next = appendTurns(archive, "builtin:shy", "你好", "你好呀", 5000);

    expect(archive.characters["builtin:shy"]).toBeUndefined();
    expect(next.characters["builtin:shy"]?.turns).toEqual([
      { role: "user", content: "你好", at: 5000 },
      { role: "assistant", content: "你好呀", at: 5001 },
    ]);
    expect(next.characters["builtin:shy"]?.updatedAt).toBe(5001);
  });

  it("不同角色互不影响", () => {
    const first = appendTurns(emptyArchive(), "builtin:shy", "我叫小明", "嗯", 1);
    const second = appendTurns(first, "builtin:cheerful", "在吗", "在的", 2);
    expect(second.characters["builtin:shy"]?.turns).toHaveLength(2);
    expect(second.characters["builtin:cheerful"]?.turns).toHaveLength(2);
  });
});

describe("contextMessages", () => {
  it("只取最近 MAX_CONTEXT_MESSAGES 条，并去掉 at", () => {
    const messages = contextMessages(turns(MAX_STORED_TURNS));
    expect(messages).toHaveLength(MAX_CONTEXT_MESSAGES);
    expect(messages[0]).toEqual({ role: "user", content: `第 ${MAX_STORED_TURNS - MAX_CONTEXT_MESSAGES} 条` });
    expect("at" in (messages[0] ?? {})).toBe(false);
  });
});

describe("characterKeyOf", () => {
  it("内置角色用性格，自定义角色用 petId", () => {
    expect(characterKeyOf("shy", null)).toBe("builtin:shy");
    expect(characterKeyOf("cheerful", "cat-01")).toBe("custom:cat-01");
  });
});
