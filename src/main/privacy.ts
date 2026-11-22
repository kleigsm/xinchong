import { app } from "electron";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import type { Dirent } from "node:fs";
import { join } from "node:path";
import type {
  PrivacyClearResult,
  PrivacyClearTarget,
  PrivacyItem,
  PrivacyItemId,
  PrivacyReport,
} from "../shared/privacy";
import { sumBytes } from "../shared/privacy";
import { clearChatKey, hasChatKey, isEncryptionAvailable } from "./chat-key";
import { clearChats } from "./chat-store";
import { listPetIds, removePet } from "./pet-store";
import { getSettings, resetAllSettings, updateSettings } from "./store";

/**
 * 隐私页的数据清点与清除（P1-13）。
 *
 * 设计原则：**清单必须来自真实文件系统**，不能是写死的文案。
 * 用户在设置里看到的每一项，都是刚刚 scan 出来的；
 * 点了「清除」之后重新 scan，数字会真的变小——这样"隐私承诺"才是可验证的。
 *
 * 只读不写，除了 clearPrivacyData 里的删除。
 */

/** 能解释的条目；不在这张表里的顶层文件/目录统一归到「其它运行时文件」 */
const KNOWN_ENTRIES = new Set(["settings.json", "pets", "chat-key.bin", "chats.json", "main.log"]);

const MAX_DEPTH = 8;
/**
 * 单个目录最多数这么多文件。
 *
 * ⚠️ 踩过的坑：第一版把整棵 userData 树递归数了一遍（包括 Electron 的 Cache/GPUCache），
 * 真实机器上几万个文件 + 同步 fs，主进程直接卡死，连设置窗口都不响应。
 * 产品红线是「不能卡顿」，所以现在只精算用户数据，缓存目录一概不深扫。
 */
const MAX_FILES = 2000;

/** 统计一个文件或目录占多少字节、多少个文件（读不到就跳过，不抛错） */
function measure(target: string, maxFiles = MAX_FILES): { bytes: number; files: number } {
  if (!existsSync(target)) return { bytes: 0, files: 0 };

  let bytes = 0;
  let files = 0;
  let stopped = false;

  const visit = (current: string, depth: number): void => {
    if (stopped || depth > MAX_DEPTH) return;

    let entries: Dirent[];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files >= maxFiles) {
        stopped = true;
        return;
      }
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        visit(full, depth + 1);
      } else if (entry.isFile()) {
        try {
          bytes += statSync(full).size;
          files += 1;
        } catch {
          // 文件刚好被删/被占用：跳过，不影响清点
        }
      }
    }
  };

  try {
    const info = statSync(target);
    if (info.isFile()) return { bytes: info.size, files: 1 };
  } catch {
    return { bytes: 0, files: 0 };
  }

  visit(target, 0);
  return { bytes, files };
}

/**
 * userData 里除已知条目之外还有几项（Electron 自己的缓存目录）。
 *
 * 只数顶层、不往下走，理由见 MAX_FILES 的注释：深扫会卡住主进程。
 * 隐私页对这项不显示大小，只显示「由 Electron 管理」。
 */
function countRuntimeEntries(userData: string): number {
  try {
    return readdirSync(userData, { withFileTypes: true }).filter(
      (entry) => !KNOWN_ENTRIES.has(entry.name),
    ).length;
  } catch {
    return 0;
  }
}

function item(
  userData: string,
  id: PrivacyItemId,
  label: string,
  what: string,
  relativePath: string,
  clearable: boolean,
): PrivacyItem {
  // 运行时缓存只数顶层项目，不统计大小（深扫会卡住主进程）
  if (relativePath === ".") {
    const count = countRuntimeEntries(userData);
    return {
      id,
      label,
      what,
      path: relativePath,
      exists: count > 0,
      bytes: 0,
      files: count,
      clearable,
    };
  }

  const target = join(userData, relativePath);
  const { bytes, files } = measure(target);

  return {
    id,
    label,
    what,
    path: relativePath,
    exists: existsSync(target),
    bytes,
    files,
    clearable,
  };
}

/** 清点当前本机数据，供隐私页展示 */
export function collectPrivacyReport(): PrivacyReport {
  const userData = app.getPath("userData");
  const settings = getSettings();

  const items: PrivacyItem[] = [
    item(
      userData,
      "settings",
      "设置",
      "性格、音量、外观、行为、勿扰等开关；不含聊天 Key",
      "settings.json",
      false,
    ),
    item(
      userData,
      "pets",
      "我导入的角色",
      "你导入的立绘 / 雪碧图和角色配置，只在本地读取",
      "pets",
      true,
    ),
    item(
      userData,
      "chat-key",
      "聊天 API Key",
      "你自己填的 DeepSeek Key，用 Windows 系统加密（DPAPI）保存",
      "chat-key.bin",
      true,
    ),
    item(
      userData,
      "chats",
      "对话记录",
      "你和桌宠聊过的内容，按形象分开保存在本地；可在「聊天」页清空",
      "chats.json",
      true,
    ),
    item(
      userData,
      "logs",
      "运行日志",
      "排错用；可能包含本机路径，不含对话内容",
      "main.log",
      true,
    ),
    item(
      userData,
      "runtime",
      "其它运行时文件",
      "Electron 自带的缓存（字体、GPU、会话等），不含你的内容；不统计大小",
      ".",
      false,
    ),
  ];

  return {
    appName: "芯宠",
    userDataPath: userData,
    totalBytes: sumBytes(items),
    items,
    hasKey: hasChatKey(),
    encryptionAvailable: isEncryptionAvailable(),
    logsEnabled: settings.privacyLogs !== false,
    packaged: app.isPackaged,
  };
}

function removeLogs(userData: string): void {
  for (const name of ["main.log", "main.log.1"]) {
    try {
      rmSync(join(userData, name), { force: true });
    } catch (error) {
      console.warn(`[privacy] 删除 ${name} 失败: ${String(error)}`);
    }
  }
}

function removeAllPets(): void {
  for (const id of listPetIds()) {
    removePet(id);
  }
  // 角色文件没了，别让下次启动还去找那个 id
  if (getSettings().activePetId) updateSettings({ activePetId: null });
}

/**
 * 清除本机数据。
 *
 * all = 聊天 Key + 导入的角色 + 运行日志 + 设置（恢复出厂）。
 * Electron 自己的缓存不在这里删：运行中删缓存目录不安全，界面上已如实标注。
 */
export function clearPrivacyData(target: PrivacyClearTarget): PrivacyClearResult {
  const userData = app.getPath("userData");
  const cleared: PrivacyItemId[] = [];

  if (target === "chat-key" || target === "all") {
    if (clearChatKey()) cleared.push("chat-key");
  }

  // 对话记录也属于"聊天"这一块：一键清除要一起带走（P2-10）
  if (target === "chats" || target === "all") {
    clearChats();
    cleared.push("chats");
  }

  if (target === "pets" || target === "all") {
    removeAllPets();
    cleared.push("pets");
  }

  if (target === "logs" || target === "all") {
    removeLogs(userData);
    cleared.push("logs");
  }

  if (target === "all") {
    resetAllSettings();
    cleared.push("settings");
  }

  console.log(`[privacy] 已清除 ${cleared.join(", ") || "(没有可删的)"}`);

  return {
    ok: true,
    cleared,
    leftoverBytes: collectPrivacyReport().totalBytes,
  };
}
