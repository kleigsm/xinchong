import { app } from "electron";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { PetPack } from "../shared/pet-pack";

/**
 * 用户角色素材的存储层。
 *
 * 目录结构（放在 userData 下，重装不丢、不污染程序目录）：
 *
 *   %APPDATA%\xinchong\pets\
 *     <id>\
 *       pack.json     ← 角色包（sprite.image 存相对路径）
 *       sprite.png    ← 雪碧图
 */

const PACK_FILE = "pack.json";
const SPRITE_FILE = "sprite.png";

export function petsDir(): string {
  return join(app.getPath("userData"), "pets");
}

/** 把用户输入的名字变成安全的目录名 */
export function sanitizePetId(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return cleaned || `pet-${Date.now().toString(36)}`;
}

/** 防止目录穿越：id 只允许小写字母、数字、连字符 */
export function isPetIdSafe(id: string): boolean {
  return /^[a-z0-9-]{1,32}$/.test(id);
}

function petDir(id: string): string {
  return join(petsDir(), id);
}

/** 写入一个角色包（覆盖同名） */
export function writePet(id: string, pack: PetPack, sprite: Buffer): void {
  if (!isPetIdSafe(id)) throw new Error(`非法角色 id: ${id}`);

  const dir = petDir(id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, SPRITE_FILE), sprite);
  // 存的是文件名而不是绝对路径：换机器 / 换用户名也能用
  writeFileSync(
    join(dir, PACK_FILE),
    JSON.stringify({ ...pack, sprite: { ...pack.sprite, image: SPRITE_FILE } }, null, 2),
    "utf8",
  );
}

/** 列出所有已存角色（只返回 id，读取内容用 readPet） */
export function listPetIds(): string[] {
  const root = petsDir();
  if (!existsSync(root)) return [];

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && isPetIdSafe(entry.name))
    .filter((entry) => existsSync(join(root, entry.name, PACK_FILE)))
    .map((entry) => entry.name);
}

export interface StoredPet {
  id: string;
  pack: PetPack;
  /** 雪碧图内容，渲染层用 data URL 显示 */
  sprite: Buffer;
}

export function readPet(id: string): StoredPet | null {
  if (!isPetIdSafe(id)) return null;

  const dir = petDir(id);
  const packPath = join(dir, PACK_FILE);
  const spritePath = join(dir, SPRITE_FILE);
  if (!existsSync(packPath) || !existsSync(spritePath)) return null;

  try {
    const pack = JSON.parse(readFileSync(packPath, "utf8")) as PetPack;
    const sprite = readFileSync(spritePath);
    return { id, pack, sprite };
  } catch (error) {
    console.warn(`[pets] 读取 ${id} 失败: ${String(error)}`);
    return null;
  }
}

export function removePet(id: string): boolean {
  if (!isPetIdSafe(id)) return false;

  const dir = petDir(id);
  if (!existsSync(dir)) return false;

  rmSync(dir, { recursive: true, force: true });
  return true;
}
