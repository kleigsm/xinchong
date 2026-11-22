/**
 * 对话存档的**纯逻辑**（P2-10）。
 *
 * 这里不碰 fs、不碰 Electron：解析 / 裁剪 / 拼上下文都是纯函数，
 * 方便单测覆盖「文件坏了怎么办」这类最容易出错的分支。
 * 真正的读写和防抖在 `src/main/chat-store.ts`。
 */

export type ChatRole = "user" | "assistant";

export interface StoredTurn {
  role: ChatRole;
  content: string;
  at: number;
}

export interface CharacterChat {
  updatedAt: number;
  turns: StoredTurn[];
}

export interface ChatArchive {
  version: number;
  characters: Record<string, CharacterChat>;
}

/** 结构版本：以后改字段时用它做迁移 */
export const ARCHIVE_VERSION = 1;
/** 存档保留最近 20 轮 = 40 条消息 */
export const MAX_STORED_TURNS = 40;
/** 发给 API 的最多 6 轮 = 12 条消息 */
export const MAX_CONTEXT_MESSAGES = 12;

export function emptyArchive(): ChatArchive {
  return { version: ARCHIVE_VERSION, characters: {} };
}

/** 内置性格 / 用户导入角色的存档键 */
export function characterKeyOf(personality: string, activePetId: string | null): string {
  return activePetId ? `custom:${activePetId}` : `builtin:${personality}`;
}

export function isCharacterKey(key: string): boolean {
  return key.startsWith("builtin:") || key.startsWith("custom:");
}

function isTurn(value: unknown): value is StoredTurn {
  if (!value || typeof value !== "object") return false;
  const turn = value as Record<string, unknown>;
  return (
    (turn.role === "user" || turn.role === "assistant") &&
    typeof turn.content === "string" &&
    typeof turn.at === "number"
  );
}

function normalizeCharacter(value: unknown): CharacterChat | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.turns)) return null;

  const turns = raw.turns.filter(isTurn);
  if (turns.length !== raw.turns.length) return null;

  return {
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
    turns,
  };
}

/**
 * 解析存档文本。
 *
 * - 空文件 / 只有空白 → 当作空存档，不算"损坏"
 * - JSON 坏了、结构不对、版本不认识 → `recovered: true`，调用方会先备份再重置
 */
export function parseArchive(raw: string): { archive: ChatArchive; recovered: boolean } {
  const text = raw.trim();
  if (!text) return { archive: emptyArchive(), recovered: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { archive: emptyArchive(), recovered: true };
  }

  if (!parsed || typeof parsed !== "object") {
    return { archive: emptyArchive(), recovered: true };
  }

  const root = parsed as Record<string, unknown>;
  if (typeof root.version !== "number" || root.version !== ARCHIVE_VERSION) {
    // 未知版本：不猜、不迁移，直接当新存档（调用方负责备份旧文件）
    return { archive: emptyArchive(), recovered: true };
  }
  if (!root.characters || typeof root.characters !== "object") {
    return { archive: emptyArchive(), recovered: true };
  }

  const characters: Record<string, CharacterChat> = {};
  let recovered = false;

  for (const [key, value] of Object.entries(root.characters as Record<string, unknown>)) {
    if (!isCharacterKey(key)) {
      recovered = true;
      continue;
    }
    const character = normalizeCharacter(value);
    if (!character) {
      recovered = true;
      continue;
    }
    characters[key] = { updatedAt: character.updatedAt, turns: trimTurns(character.turns) };
  }

  return { archive: { version: ARCHIVE_VERSION, characters }, recovered };
}

/** 只留最近 MAX_STORED_TURNS 条（丢最早） */
export function trimTurns(turns: StoredTurn[]): StoredTurn[] {
  if (turns.length <= MAX_STORED_TURNS) return turns;
  return turns.slice(turns.length - MAX_STORED_TURNS);
}

/** 追一轮问答，返回新存档（不修改入参） */
export function appendTurns(
  archive: ChatArchive,
  key: string,
  userText: string,
  reply: string,
  at: number,
): ChatArchive {
  const previous = archive.characters[key];
  const turns = trimTurns([
    ...(previous?.turns ?? []),
    { role: "user", content: userText, at },
    { role: "assistant", content: reply, at: at + 1 },
  ]);

  return {
    version: ARCHIVE_VERSION,
    characters: {
      ...archive.characters,
      [key]: { updatedAt: at + 1, turns },
    },
  };
}

/** 取发给 API 的最近几条（不带 at / 不带其它角色） */
export function contextMessages(
  turns: StoredTurn[],
  limit = MAX_CONTEXT_MESSAGES,
): Array<{ role: ChatRole; content: string }> {
  const slice = turns.length <= limit ? turns : turns.slice(turns.length - limit);
  return slice.map((turn) => ({ role: turn.role, content: turn.content }));
}
