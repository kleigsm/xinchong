import { app, safeStorage } from "electron";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * DeepSeek API Key 的安全存储（P2-6）。
 *
 * 两条硬要求：
 * 1. **绝不明文落盘**——用 Electron 的 safeStorage（Windows 下走 DPAPI，
 *    密文只能被当前 Windows 用户解开）
 * 2. **不放进 settings.json**——那个文件是给用户看的，容易被截图发出去
 *
 * 所以 Key 单独存成 userData/chat-key.bin，内容是加密后的二进制。
 */

const KEY_FILE = "chat-key.bin";

function keyPath(): string {
  return join(app.getPath("userData"), KEY_FILE);
}

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function hasChatKey(): boolean {
  return existsSync(keyPath());
}

/** 保存 Key（加密）。返回是否成功 */
export function saveChatKey(rawKey: string): { ok: boolean; error?: string } {
  const key = rawKey.trim();
  if (!key) return { ok: false, error: "Key 不能为空" };

  if (!isEncryptionAvailable()) {
    return { ok: false, error: "系统加密不可用，无法安全保存 Key（请检查 Windows 账户设置）" };
  }

  try {
    const encrypted = safeStorage.encryptString(key);
    const dir = app.getPath("userData");
    mkdirSync(dir, { recursive: true });
    writeFileSync(keyPath(), encrypted);
    console.log("[chat] Key 已加密保存");
    return { ok: true };
  } catch (error) {
    console.error(`[chat] 保存 Key 失败: ${String(error)}`);
    return { ok: false, error: String(error) };
  }
}

/** 读取 Key（解密）；没有或解不开返回 null */
export function loadChatKey(): string | null {
  if (!existsSync(keyPath())) return null;

  try {
    const encrypted = readFileSync(keyPath());
    return safeStorage.decryptString(encrypted);
  } catch (error) {
    console.warn(`[chat] 解密失败（可能是换了 Windows 账户）: ${String(error)}`);
    return null;
  }
}

/** 删除 Key；返回是否删掉了东西 */
export function clearChatKey(): boolean {
  if (!existsSync(keyPath())) return false;
  rmSync(keyPath(), { force: true });
  console.log("[chat] Key 已清除");
  return true;
}

/** 只显示尾部几位，用于界面上确认"填的是哪把 Key" */
export function maskChatKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 3)}…${key.slice(-4)}`;
}
