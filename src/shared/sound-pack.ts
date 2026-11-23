/**
 * 自定义音效包的格式与校验（P2-11）。
 *
 * 全是**纯函数**：manifest 解析、文件名安全、大小限制。
 * 不碰 fs、不碰 Electron——这样「坏路径 / 超长 / 缺文件」这些分支能用单测覆盖，
 * 真正的读写和复制在 `src/main/sound-store.ts`。
 *
 * 格式见 docs/specs/sounds/custom-sound-integration.md。
 */

import type { SoundName } from "./pet-pack";

/** 一个包里可能出现的所有音效类型 */
export const SOUND_KINDS: SoundName[] = [
  "appear",
  "click",
  "drag",
  "sleep",
  "wave",
  "stretch",
  "pat",
  "angry",
  "confirm",
];

/** 必须齐的 5 种（其余可以缺，缺了回落到内置/合成音） */
export const REQUIRED_SOUND_KINDS: SoundName[] = ["appear", "click", "drag", "sleep", "confirm"];

export const MAX_SOUND_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_SOUND_PACK_BYTES = 20 * 1024 * 1024;
export const MAX_SOUND_DURATION_SEC = 2;

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,38}$/;
const AUDIO_EXTENSION = /\.(ogg|wav|mp3)$/i;

export interface SoundPackManifest {
  /** 小写字母/数字/短横线，导入后当目录名 */
  id: string;
  /** 显示名 */
  name: string;
  version: number;
  license?: string;
  /** 每种音效一个或多个文件（多个 = 随机变体） */
  sounds: Partial<Record<SoundName, string[]>>;
}

export type ManifestResult =
  | { ok: true; manifest: SoundPackManifest }
  | { ok: false; error: string };

/** 文件名必须是「纯文件名」：相对、无 `..`、只能是音频扩展名 */
export function checkSoundFileName(name: unknown): string | null {
  if (typeof name !== "string" || !name.trim()) return "文件名不能为空";
  const file = name.trim();

  if (file.includes("..")) return `文件路径不能包含 ..：${file}`;
  if (file.startsWith("/") || file.startsWith("\\") || /^[a-zA-Z]:/.test(file)) {
    return `必须是相对路径：${file}`;
  }
  if (file.includes("/") || file.includes("\\")) return `只能放在包目录根下：${file}`;
  if (!AUDIO_EXTENSION.test(file)) return `只支持 .ogg / .wav / .mp3：${file}`;
  if (file.length > 128) return `文件名太长：${file.slice(0, 20)}…`;

  return null;
}

/**
 * 解析 manifest.json。
 *
 * 报错文案要具体到「哪一项、哪个文件」——用户拿到的是一句能照做的话，
 * 而不是「解析失败」。
 */
export function parseSoundManifest(raw: string): ManifestResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    return { ok: false, error: "manifest.json 读不出来（不是合法 JSON）" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "manifest.json 必须是对象" };
  }

  const root = parsed as Record<string, unknown>;
  const id = typeof root.id === "string" ? root.id.trim() : "";
  if (!id) return { ok: false, error: "manifest.json 缺少 id" };
  if (!ID_PATTERN.test(id)) {
    return { ok: false, error: "id 只能用小写字母、数字和短横线（最长 39 个字符）" };
  }

  const name = typeof root.name === "string" ? root.name.trim() : "";
  if (!name) return { ok: false, error: "manifest.json 缺少 name" };
  if (name.length > 40) return { ok: false, error: "name 太长（最多 40 个字）" };

  const version = typeof root.version === "number" ? root.version : 1;

  if (!root.sounds || typeof root.sounds !== "object") {
    return { ok: false, error: "manifest.json 缺少 sounds" };
  }

  const sounds: Partial<Record<SoundName, string[]>> = {};
  for (const [key, value] of Object.entries(root.sounds as Record<string, unknown>)) {
    if (!SOUND_KINDS.includes(key as SoundName)) {
      return { ok: false, error: `不认识的音效类型：${key}（可用：${SOUND_KINDS.join(" / ")}）` };
    }

    const files = Array.isArray(value) ? value : typeof value === "string" ? [value] : null;
    if (!files || files.length === 0) {
      return { ok: false, error: `${key} 至少要有一个音频文件` };
    }
    if (files.length > 8) {
      return { ok: false, error: `${key} 的变体太多（最多 8 个）` };
    }

    for (const file of files) {
      const problem = checkSoundFileName(file);
      if (problem) return { ok: false, error: problem };
    }

    sounds[key as SoundName] = files.map((file) => String(file).trim());
  }

  for (const kind of REQUIRED_SOUND_KINDS) {
    if (!sounds[kind]) return { ok: false, error: `缺少 ${kind} 音效（必需：${REQUIRED_SOUND_KINDS.join(" / ")}）` };
  }

  return {
    ok: true,
    manifest: {
      id,
      name,
      version,
      license: typeof root.license === "string" ? root.license : undefined,
      sounds,
    },
  };
}

/** 包里所有文件名（去重） */
export function manifestFiles(manifest: SoundPackManifest): string[] {
  const files = new Set<string>();
  for (const list of Object.values(manifest.sounds)) {
    for (const file of list ?? []) files.add(file);
  }
  return [...files];
}

/** 总大小是否超标（只在复制前做一次粗筛，真正的逐文件检查在 store 里） */
export function checkPackBytes(totalBytes: number): string | null {
  if (totalBytes > MAX_SOUND_PACK_BYTES) {
    return `音效包太大（${(totalBytes / 1024 / 1024).toFixed(1)} MB，上限 20 MB）`;
  }
  return null;
}
