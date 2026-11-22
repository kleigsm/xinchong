import { describe, expect, it } from "vitest";
import { formatBytes, networkStatus, sumBytes } from "./privacy";

/**
 * 隐私页的纯函数单测（P1-13）。
 *
 * 只测"容易悄悄错、错了用户会看见"的部分：
 * 大小格式化（界面上一堆数字都走它）、出网判断、合计。
 */

describe("formatBytes", () => {
  it("0 和异常值都显示 0 B，不出现 NaN / 负数", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-100)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe("0 B");
  });

  it("字节级不带小数", () => {
    expect(formatBytes(1)).toBe("1 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("KB / MB / GB 保留一位小数", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe("2.5 GB");
  });
});

describe("networkStatus", () => {
  it("没填 Key 时明确说完全离线", () => {
    const status = networkStatus(false);
    expect(status.online).toBe(false);
    expect(status.title).toContain("离线");
    // 离线时必须点名"不会有任何网络请求"，这句话是给用户/老师看的承诺
    expect(status.detail).toContain("不会发出任何网络请求");
  });

  it("填了 Key 也只承认「主动说话时」才出网", () => {
    const status = networkStatus(true);
    expect(status.online).toBe(true);
    expect(status.title).toContain("主动");
    expect(status.detail).toContain("api.deepseek.com");
  });
});

describe("sumBytes", () => {
  it("正常累加", () => {
    expect(sumBytes([{ bytes: 1 }, { bytes: 2 }, { bytes: 3 }])).toBe(6);
  });

  it("忽略负数与 NaN，不让界面算崩", () => {
    expect(sumBytes([{ bytes: 10 }, { bytes: -5 }, { bytes: Number.NaN }])).toBe(10);
  });

  it("空列表是 0", () => {
    expect(sumBytes([])).toBe(0);
  });
});
