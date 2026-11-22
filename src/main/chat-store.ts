import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  appendTurns,
  contextMessages,
  emptyArchive,
  MAX_CONTEXT_MESSAGES,
  parseArchive,
  type ChatArchive,
} from "../shared/chat-archive";
import type { ChatHistorySummary } from "../shared/settings-api";
import { PERSONALITIES } from "../shared/personalities";
import { readPet } from "./pet-store";

/**
 * 对话存档（P2-10）。
 *
 * 三个设计点：
 * 1. **按角色分库**：`builtin:shy` / `custom:<id>`，切角色不串味
 * 2. **防抖写盘**：每轮结束 500ms 才写，连续快聊不会频繁 IO；退出前 flush
 * 3. **原子写**：先写 `.tmp` 再 rename，避免断电/崩溃留下半个 JSON
 *
 * 存档坏了不抛错：解析失败会先备份成 `chats.json.<时间>.bak`，然后按空历史继续跑。
 */

const SAVE_DEBOUNCE_MS = 500;

let cache: ChatArchive | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;

export function chatsPath(): string {
  return join(app.getPath("userData"), "chats.json");
}

function backupBroken(file: string): void {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const target = `${file}.${stamp}.bak`;
    renameSync(file, target);
    console.warn(`[chat-store] 存档无法解析，已备份为 ${target}`);
  } catch (error) {
    console.warn(`[chat-store] 备份损坏存档失败: ${String(error)}`);
  }
}

function load(): ChatArchive {
  if (cache) return cache;

  const file = chatsPath();
  if (!existsSync(file)) {
    cache = emptyArchive();
    return cache;
  }

  let raw = "";
  try {
    // 去掉 BOM：用记事本/PowerShell 编辑过 JSON 时会带（settings.json 踩过同样的坑）
    raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  } catch (error) {
    console.warn(`[chat-store] 读取失败，按空历史处理: ${String(error)}`);
    cache = emptyArchive();
    return cache;
  }

  const { archive, recovered } = parseArchive(raw);
  if (recovered) backupBroken(file);
  cache = archive;
  return cache;
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveNow();
  }, SAVE_DEBOUNCE_MS);
}

/** 立即落盘（幂等：没有改动就什么都不做） */
export function saveNow(): void {
  if (!dirty || !cache) return;

  const file = chatsPath();
  try {
    mkdirSync(dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify(cache, null, 2), "utf8");
    renameSync(tmp, file);
    dirty = false;
  } catch (error) {
    console.error(`[chat-store] 写盘失败: ${String(error)}`);
  }
}

/** 退出前调用：把还在防抖窗口里的改动写掉 */
export function flushChats(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  saveNow();
}

/** 发给 API 的上下文（只取这一个角色的最近 6 轮） */
export function getChatContext(key: string): Array<{ role: "user" | "assistant"; content: string }> {
  const turns = load().characters[key]?.turns ?? [];
  return contextMessages(turns, MAX_CONTEXT_MESSAGES);
}

/** 记一轮问答，500ms 后落盘 */
export function appendConversation(key: string, userText: string, reply: string): void {
  cache = appendTurns(load(), key, userText, reply, Date.now());
  dirty = true;
  scheduleSave();
}

function labelOf(key: string): string {
  if (key.startsWith("builtin:")) {
    const id = key.slice("builtin:".length);
    return PERSONALITIES.find((p) => p.id === id)?.label ?? id;
  }
  const id = key.slice("custom:".length);
  return readPet(id)?.pack.name ?? `自定义角色（${id}）`;
}

/** 设置页用：每个角色有多少条对话 */
export function listChatSummaries(): ChatHistorySummary[] {
  const { characters } = load();

  const builtin: ChatHistorySummary[] = PERSONALITIES.map((p) => {
    const key = `builtin:${p.id}`;
    const character = characters[key];
    return {
      key,
      label: p.label,
      turns: character?.turns.length ?? 0,
      updatedAt: character?.updatedAt ?? 0,
    };
  });

  const custom = Object.entries(characters)
    .filter(([key]) => key.startsWith("custom:"))
    .map(([key, character]) => ({
      key,
      label: labelOf(key),
      turns: character.turns.length,
      updatedAt: character.updatedAt,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return [...builtin, ...custom];
}

/**
 * 清空对话。
 *
 * - 传 key：只清这个角色
 * - 不传：清空所有（直接删文件，不是写一个空对象）
 */
export function clearChats(key?: string): void {
  if (key) {
    if (!cache) load();
    if (cache?.characters[key]) {
      delete cache.characters[key];
      dirty = true;
      scheduleSave();
    }
    return;
  }

  cache = emptyArchive();
  dirty = false;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    rmSync(chatsPath(), { force: true });
    rmSync(`${chatsPath()}.tmp`, { force: true });
  } catch (error) {
    console.warn(`[chat-store] 删除存档失败: ${String(error)}`);
  }
}
