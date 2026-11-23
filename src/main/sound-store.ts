import { app } from "electron";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, extname, join } from "node:path";
import type { SoundName } from "../shared/pet-pack";
import {
  checkPackBytes,
  manifestFiles,
  MAX_SOUND_FILE_BYTES,
  parseSoundManifest,
  type SoundPackManifest,
} from "../shared/sound-pack";
import type { SoundImportPreview, SoundPackInfo } from "../shared/settings-api";

/**
 * 用户导入的音效包（P2-11）。
 *
 * 目录：`%APPDATA%/xinchong/sounds/<包id>/`
 * 导入分两步：
 *   1. `prepareSoundPack` 复制到 `.staging-<token>/` 并做静态校验（manifest / 文件存在 / 大小）
 *   2. 渲染层用 Web Audio 解码校验时长（主进程没有解码器），通过后 `commitSoundPack`
 *
 * 为什么把时长放到渲染层：不想为了 2 秒的限制引入音频解码依赖。
 * 渲染层本来就跑在 Chromium 里，解码是现成的。
 */

const MANIFEST_FILE = "manifest.json";
const STAGING_PREFIX = ".staging-";

export function soundsDir(): string {
  return join(app.getPath("userData"), "sounds");
}

function stagingDir(token: string): string {
  return join(soundsDir(), `${STAGING_PREFIX}${token}`);
}

function mimeOf(file: string): string {
  switch (extname(file).toLowerCase()) {
    case ".wav":
      return "audio/wav";
    case ".mp3":
      return "audio/mpeg";
    default:
      return "audio/ogg";
  }
}

function readManifestAt(dir: string): SoundPackManifest | null {
  const file = join(dir, MANIFEST_FILE);
  if (!existsSync(file)) return null;
  try {
    const result = parseSoundManifest(readFileSync(file, "utf8"));
    return result.ok ? result.manifest : null;
  } catch {
    return null;
  }
}

function packBytes(manifest: SoundPackManifest): number {
  let total = 0;
  for (const file of manifestFiles(manifest)) {
    try {
      total += statSync(join(soundsDir(), manifest.id, file)).size;
    } catch {
      // 文件没了就不算，列表不因此失败
    }
  }
  return total;
}

export function listSoundPacks(): SoundPackInfo[] {
  const dir = soundsDir();
  if (!existsSync(dir)) return [];

  const packs: SoundPackInfo[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(STAGING_PREFIX)) continue;

    const manifest = readManifestAt(join(dir, entry.name));
    if (!manifest || manifest.id !== entry.name) continue;

    packs.push({
      id: manifest.id,
      name: manifest.name,
      license: manifest.license,
      bytes: packBytes(manifest),
      sounds: manifest.sounds as Record<string, string[]>,
    });
  }

  return packs.sort((a, b) => a.name.localeCompare(b.name, "zh"));
}

export function findSoundPack(id: string): SoundPackInfo | null {
  return listSoundPacks().find((pack) => pack.id === id) ?? null;
}

/** 包内某个文件的 data URL（只允许 manifest 里列出的文件） */
export function readSoundFile(id: string, file: string): string | null {
  const pack = findSoundPack(id);
  if (!pack) return null;

  const allowed = Object.values(pack.sounds).flat();
  if (!allowed.includes(file)) return null;

  try {
    const data = readFileSync(join(soundsDir(), id, file));
    return `data:${mimeOf(file)};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

export type PrepareResult = { ok: true; preview: SoundImportPreview } | { ok: false; error: string };

/**
 * 第一步：读 manifest、检查每个文件、复制到 staging。
 *
 * 返回 data URL 列表，渲染层据此校验时长；验证不通过时调 `cancelSoundPack` 丢掉。
 */
export function prepareSoundPack(sourceDir: string): PrepareResult {
  if (!existsSync(sourceDir)) return { ok: false, error: "这个文件夹不存在" };

  const manifestFile = join(sourceDir, MANIFEST_FILE);
  if (!existsSync(manifestFile)) {
    return { ok: false, error: "文件夹里没有 manifest.json（音效包说明文件）" };
  }

  let parsed;
  try {
    parsed = parseSoundManifest(readFileSync(manifestFile, "utf8"));
  } catch (error) {
    return { ok: false, error: `manifest.json 读不出来：${String(error).slice(0, 80)}` };
  }
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const manifest = parsed.manifest;
  const files = manifestFiles(manifest);

  // 逐个文件：必须存在、是文件、不超过 2MB
  let total = 0;
  const sizes = new Map<string, number>();
  for (const file of files) {
    const full = join(sourceDir, file);
    let size = 0;
    try {
      const info = statSync(full);
      if (!info.isFile()) return { ok: false, error: `${file} 不是文件` };
      size = info.size;
    } catch {
      return { ok: false, error: `找不到音频文件：${file}` };
    }
    if (size === 0) return { ok: false, error: `${file} 是空文件` };
    if (size > MAX_SOUND_FILE_BYTES) {
      return { ok: false, error: `${file} 超过 2 MB（${(size / 1024 / 1024).toFixed(1)} MB）` };
    }
    total += size;
    sizes.set(file, size);
  }

  const tooBig = checkPackBytes(total);
  if (tooBig) return { ok: false, error: tooBig };

  const token = randomUUID();
  const staging = stagingDir(token);
  try {
    mkdirSync(staging, { recursive: true });
    for (const file of files) cpSync(join(sourceDir, file), join(staging, file));
    cpSync(manifestFile, join(staging, MANIFEST_FILE));
    const license = join(sourceDir, "LICENSE.md");
    if (existsSync(license)) cpSync(license, join(staging, "LICENSE.md"));
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    return { ok: false, error: `复制失败：${String(error).slice(0, 80)}` };
  }

  const previewFiles: SoundImportPreview["files"] = [];
  for (const [kind, list] of Object.entries(manifest.sounds)) {
    for (const file of list ?? []) {
      let dataUrl = "";
      try {
        const bytes = readFileSync(join(staging, file));
        dataUrl = `data:${mimeOf(file)};base64,${bytes.toString("base64")}`;
      } catch {
        // 读不出来就交给渲染层的时长校验报错（空字符串 = 无法校验）
      }
      previewFiles.push({ kind: kind as SoundName, name: file, dataUrl, bytes: sizes.get(file) ?? 0 });
    }
  }

  return {
    ok: true,
    preview: {
      token,
      manifest: { id: manifest.id, name: manifest.name },
      files: previewFiles,
    },
  };
}

export type CommitResult = { ok: true; id: string; packs: SoundPackInfo[] } | { ok: false; error: string };

/** 第二步：时长校验通过后，把 staging 转正 */
export function commitSoundPack(token: string): CommitResult {
  const staging = stagingDir(token);
  const manifest = existsSync(staging) ? readManifestAt(staging) : null;
  if (!manifest) {
    rmSync(staging, { recursive: true, force: true });
    return { ok: false, error: "导入已过期，请重新选择文件夹" };
  }

  const target = join(soundsDir(), manifest.id);
  if (existsSync(target)) {
    rmSync(staging, { recursive: true, force: true });
    return { ok: false, error: `已经有同名的音效包（${manifest.id}），先删掉再导入` };
  }

  try {
    renameSync(staging, target);
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    return { ok: false, error: `保存失败：${String(error).slice(0, 80)}` };
  }

  console.log(`[sounds] 已导入音效包 ${manifest.id}（${filesText(manifest)}）`);
  return { ok: true, id: manifest.id, packs: listSoundPacks() };
}

function filesText(manifest: SoundPackManifest): string {
  return manifestFiles(manifest).length + " 个文件";
}

export function cancelSoundPack(token: string): void {
  rmSync(stagingDir(token), { recursive: true, force: true });
}

export function removeSoundPack(id: string): SoundPackInfo[] {
  const dir = join(soundsDir(), id);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
    console.log(`[sounds] 已删除音效包 ${id}`);
  }
  return listSoundPacks();
}

/** 目录名是否安全（IPC 参数不可信） */
export function isSafePackId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,38}$/.test(id) && basename(id) === id;
}
