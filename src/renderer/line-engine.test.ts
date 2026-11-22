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

  it("12 条 click 连取 12 次，全部不重复", () => {
    const twelve: LineBank = {
      click: Array.from({ length: 12 }, (_, i) => `line-${i}`),
      drag: [],
      idleLong: [],
      sleep: [],
      morning: [],
      night: [],
    };
    const engine = new LineEngine(twelve);
    const seen = new Set(Array.from({ length: 12 }, () => engine.pick("click")));
    expect(seen.size).toBe(12);
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

/**
 * P2-7 7b：跨场景全局冷却。
 *
 * 老实现只按「场景」去重，点一下挑到「诶？」，拖一下还能再挑到「诶？」。
 * 现在同一句话在冷却期内不允许跨场景重复。
 */
describe("LineEngine 跨场景冷却（P2-7 7b）", () => {
  const COOLDOWN = 5 * 60_000;
  let clock = new Date("2026-01-01T12:00:00");

  const fresh = (): LineBank => ({
    click: ["甲", "乙", "丙"],
    drag: ["甲", "乙", "丙"],
    // 故意留空：用来验证「空场景回退到 click 池」时冷却依然生效
    idleLong: [],
    sleep: [],
    morning: [],
    night: [],
  });

  it("同一句台词不会在别的场景里接着出现", () => {
    clock = new Date("2026-01-01T12:00:00");
    const engine = new LineEngine(fresh(), {
      random: () => 0,
      now: () => clock,
      cooldownMs: COOLDOWN,
    });

    expect(engine.pick("click")).toBe("甲");
    // 拖拽池里「甲」已冷却 → 只能给「乙」
    expect(engine.pick("drag")).toBe("乙");
    // idleLong 只有「甲」，冷却后回退到 click 池，丙还没出现过
    expect(engine.pick("idleLong")).toBe("丙");
  });

  it("冷却过期后可以再用", () => {
    clock = new Date("2026-01-01T12:00:00");
    const engine = new LineEngine(fresh(), {
      random: () => 0,
      now: () => clock,
      cooldownMs: COOLDOWN,
    });

    expect(engine.pick("click")).toBe("甲");

    // 没过冷却时：拖拽只会给「乙」/「丙」
    expect(engine.pick("drag")).not.toBe("甲");

    // 过了 6 分钟：「甲」重新可用，random=0 又会挑回它
    clock = new Date(clock.getTime() + 6 * 60_000);
    expect(engine.pick("drag")).toBe("甲");
  });

  it("冷却把库锁死时仍然说话（库只有一句）", () => {
    clock = new Date("2026-01-01T12:00:00");
    const tiny: LineBank = { click: ["只有这一句"], drag: ["只有这一句"], idleLong: [] };
    const engine = new LineEngine(tiny, { random: () => 0, now: () => clock, cooldownMs: COOLDOWN });

    expect(engine.pick("click")).toBe("只有这一句");
    // 宁可重复，也不能哑掉
    expect(engine.pick("drag")).toBe("只有这一句");
  });

  it("冷却设为 0 时回到老行为（允许跨场景重复）", () => {
    clock = new Date("2026-01-01T12:00:00");
    const engine = new LineEngine(fresh(), { random: () => 0, now: () => clock, cooldownMs: 0 });

    expect(engine.pick("click")).toBe("甲");
    expect(engine.pick("drag")).toBe("甲");
  });

  it("setCooldownMs 能即时关掉冷却", () => {
    clock = new Date("2026-01-01T12:00:00");
    const engine = new LineEngine(fresh(), {
      random: () => 0,
      now: () => clock,
      cooldownMs: COOLDOWN,
    });

    expect(engine.pick("click")).toBe("甲");
    engine.setCooldownMs(0);
    expect(engine.pick("drag")).toBe("甲");
  });
});
