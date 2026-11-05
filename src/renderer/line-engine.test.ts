import { describe, expect, it } from "vitest";
import type { LineBank } from "../shared/lines";
import { LineEngine } from "./line-engine";

/** 任务书 5.2 的测试库 */
const bank: LineBank = {
  click: ["a", "b", "c", "d", "e"],
  drag: [],          // 故意空
  idleLong: [],
  sleep: [],
  morning: [],
  night: ["还没睡？"],
};

describe("LineEngine", () => {
  // —— 任务书 5.2 的 6 条验收用例 ——

  it("1. 不重复：连取 5 次，5 条各不相同", () => {
    const engine = new LineEngine(bank);
    const picked = new Set(Array.from({ length: 5 }, () => engine.pick("click")));
    expect(picked.size).toBe(5);
  });

  it("2. 空场景回退：drag 为空 → 返回 click 池里的某句（不是 null）", () => {
    const engine = new LineEngine(bank);
    expect(bank.click).toContain(engine.pick("drag"));
  });

  it("3. 深夜有内容", () => {
    const at2am = new LineEngine(bank, { now: () => new Date("2026-01-01T02:00:00") });
    expect(at2am.pick("night")).toBe("还没睡？");
  });

  it("4. 白天返回 null（硬门禁，不回退）", () => {
    const atNoon = new LineEngine(bank, { now: () => new Date("2026-01-01T12:00:00") });
    expect(atNoon.pick("night")).toBe(null);
  });

  it("5. 全空：返回 null，不抛异常", () => {
    const empty = new LineEngine({ click: [], drag: [], idleLong: [], sleep: [], morning: [], night: [] });
    expect(empty.pick("click")).toBe(null);
  });

  it("6. 换库清历史：换库后能立刻取到之前取过的那句", () => {
    const e2 = new LineEngine({ click: ["x"], drag: [], idleLong: [], sleep: [], morning: [], night: [] });
    expect(e2.pick("click")).toBe("x");
    e2.setBank({ click: ["x"], drag: [], idleLong: [], sleep: [], morning: [], night: [] });
    expect(e2.pick("click")).toBe("x");
  });

  // —— 对规则 2 / 4 / 6 与 hasScene 的补充覆盖（同一条规则，不新增）——

  it("库不够时降级：只有 3 条 → 轮换，不报错", () => {
    const small = new LineEngine({ click: ["a", "b", "c"], drag: [], idleLong: [], sleep: [], morning: [], night: [] });
    const seen = new Set([small.pick("click"), small.pick("click"), small.pick("click")]);
    expect(seen.size).toBe(3);
  });

  it("换库清历史：注入随机源验证确实清空（不清空第二次会取到下一句）", () => {
    const three: LineBank = { click: ["a", "b", "c"], drag: [], idleLong: [], sleep: [], morning: [], night: [] };
    const engine = new LineEngine(three, { random: () => 0 });
    expect(engine.pick("click")).toBe("a");
    engine.setBank(three);
    expect(engine.pick("click")).toBe("a");
  });

  it("hasScene：有内容才返回 true", () => {
    const engine = new LineEngine(bank);
    expect(engine.hasScene("click")).toBe(true);
    expect(engine.hasScene("drag")).toBe(false);
  });

  it("缺失的场景（旧 4 场景库）也能回退到 click", () => {
    const legacy = new LineEngine(
      { click: ["hi"], drag: [], idleLong: [], sleep: [] },
      { now: () => new Date("2026-01-01T02:00:00") },
    );
    expect(legacy.pick("night")).toBe("hi");
  });
});
