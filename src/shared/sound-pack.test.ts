import { describe, expect, it } from "vitest";
import {
  checkPackBytes,
  checkSoundFileName,
  manifestFiles,
  MAX_SOUND_PACK_BYTES,
  parseSoundManifest,
} from "./sound-pack";

function manifest(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: "my-pack",
    name: "我的音效包",
    version: 1,
    sounds: {
      appear: ["appear-1.wav"],
      click: ["click-1.wav", "click-2.wav"],
      drag: ["drag-1.wav"],
      sleep: ["sleep-1.wav"],
      confirm: ["confirm-1.wav"],
    },
    ...overrides,
  });
}

describe("parseSoundManifest", () => {
  it("合法 manifest 能解析", () => {
    const result = parseSoundManifest(manifest());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.id).toBe("my-pack");
      expect(result.manifest.sounds.click).toHaveLength(2);
      expect(manifestFiles(result.manifest)).toHaveLength(6);
    }
  });

  it("不是 JSON 时给出可读的提示", () => {
    const result = parseSoundManifest("{ 坏了");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("manifest.json");
  });

  it("缺必需音效时点名缺哪个", () => {
    const raw = manifest({
      sounds: { appear: ["a.wav"], drag: ["d.wav"], sleep: ["s.wav"], confirm: ["c.wav"] },
    });
    const result = parseSoundManifest(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("click");
  });

  it("不认识的音效类型会被拒绝", () => {
    const raw = manifest({
      sounds: {
        appear: ["a.wav"],
        click: ["c.wav"],
        drag: ["d.wav"],
        sleep: ["s.wav"],
        confirm: ["c2.wav"],
        laugh: ["l.wav"],
      },
    });
    const result = parseSoundManifest(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("laugh");
  });

  it("id 不合规会被拒绝", () => {
    const result = parseSoundManifest(manifest({ id: "我的包" }));
    expect(result.ok).toBe(false);
  });

  it("允许用单个字符串代替数组", () => {
    const raw = manifest({ sounds: { appear: "a.wav", click: "c.wav", drag: "d.wav", sleep: "s.wav", confirm: "cc.wav" } });
    const result = parseSoundManifest(raw);
    expect(result.ok).toBe(true);
  });
});

describe("checkSoundFileName", () => {
  it("拒绝 .. 路径", () => {
    expect(checkSoundFileName("../click.wav")).toContain("..");
  });

  it("拒绝绝对路径", () => {
    expect(checkSoundFileName("C:\\click.wav")).toContain("相对路径");
    expect(checkSoundFileName("/click.wav")).toContain("相对路径");
  });

  it("拒绝子目录", () => {
    expect(checkSoundFileName("sub/click.wav")).toContain("根下");
  });

  it("拒绝非音频扩展名", () => {
    expect(checkSoundFileName("click.exe")).toContain("只支持");
    expect(checkSoundFileName("click.mp4")).toContain("只支持");
  });

  it("接受三种音频格式", () => {
    expect(checkSoundFileName("click.ogg")).toBeNull();
    expect(checkSoundFileName("click.wav")).toBeNull();
    expect(checkSoundFileName("click.mp3")).toBeNull();
  });
});

describe("checkPackBytes", () => {
  it("超过 20MB 拒绝", () => {
    expect(checkPackBytes(MAX_SOUND_PACK_BYTES + 1)).toContain("20 MB");
    expect(checkPackBytes(1024)).toBeNull();
  });
});
