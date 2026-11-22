import { describe, expect, it } from "vitest";
import { COMFORT_LINES, INTENT_SCENE, detectIntent, pickComfort } from "./intent";

/**
 * P2-7 7c 单测。
 *
 * 重点不是「能认出多少」，而是**别认错**：
 * 认错了会答非所问（用户说「你好烦」它回「你好呀」），比多花一次 API 更糟。
 */

describe("detectIntent", () => {
  it("问候", () => {
    expect(detectIntent("你好")).toBe("greeting");
    expect(detectIntent("在吗")).toBe("greeting");
    expect(detectIntent("早上好！")).toBe("greeting");
    expect(detectIntent("哈喽")).toBe("greeting");
  });

  it("告别", () => {
    expect(detectIntent("拜拜")).toBe("farewell");
    expect(detectIntent("我先走了")).toBe("farewell");
    expect(detectIntent("Bye")).toBe("farewell");
  });

  it("晚安", () => {
    expect(detectIntent("晚安")).toBe("goodnight");
    expect(detectIntent("我去睡了")).toBe("goodnight");
  });

  it("夸它", () => {
    expect(detectIntent("你好可爱")).toBe("praise");
    expect(detectIntent("今天这身好看")).toBe("praise");
    expect(detectIntent("喜欢你")).toBe("praise");
  });

  it("骂它", () => {
    expect(detectIntent("你好烦")).toBe("insult");
    expect(detectIntent("笨蛋")).toBe("insult");
    expect(detectIntent("讨厌鬼")).toBe("insult");
  });

  it("说累", () => {
    expect(detectIntent("今天好累")).toBe("tired");
    expect(detectIntent("困死了")).toBe("tired");
    expect(detectIntent("不想上班")).toBe("tired");
  });

  it("优先级：「你好烦」算骂它，不算问候", () => {
    expect(detectIntent("你好烦")).not.toBe("greeting");
    expect(detectIntent("你好烦")).toBe("insult");
  });

  it("优先级：「困了要睡」算说累，不算晚安", () => {
    expect(detectIntent("困了要睡")).toBe("tired");
  });

  it("认不出来就给 none（照旧走 API）", () => {
    expect(detectIntent("帮我写个 Python 脚本")).toBe("none");
    expect(detectIntent("今天三号线好挤")).toBe("none");
  });

  it("空字符串 / 只有空白 → none", () => {
    expect(detectIntent("")).toBe("none");
    expect(detectIntent("   ")).toBe("none");
  });
});

describe("INTENT_SCENE", () => {
  it("每个意图都有明确的回应方式（场景或固定安慰句）", () => {
    expect(INTENT_SCENE.greeting).toBe("click");
    expect(INTENT_SCENE.farewell).toBe("wave");
    expect(INTENT_SCENE.goodnight).toBe("sleep");
    expect(INTENT_SCENE.praise).toBe("pat");
    expect(INTENT_SCENE.insult).toBe("angry");
    // 说累没有对应场景，用固定安慰句
    expect(INTENT_SCENE.tired).toBe(null);
  });
});

describe("pickComfort", () => {
  it("注入 random 后可以稳定取到某一句", () => {
    expect(pickComfort(() => 0)).toBe(COMFORT_LINES[0]);
    expect(pickComfort(() => 0.99)).toBe(COMFORT_LINES[COMFORT_LINES.length - 1]);
  });

  it("随便取也在库内", () => {
    expect(COMFORT_LINES).toContain(pickComfort(() => 0.5));
  });
});
