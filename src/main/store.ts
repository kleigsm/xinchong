import { app } from "electron";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Settings } from "../shared/types";

/**
 * 极简配置存储：一个 JSON 文件放在 userData 目录。
 *
 * 没用 electron-store：它的最新版是纯 ESM，在主进程打包时容易踩模块格式的坑；
 * 而我们的需求只有「读写一个小对象」，几十行足够了。
 */

const DEFAULTS: Settings = {
  muted: false,
  dnd: false,
  autoStart: false,
  personality: "shy",
  activePetId: null,
  volume: 0.6,
  idleToSleepMs: 30_000,
  gestureWave: true,
  gesturePat: true,
  gestureAngry: true,
  hasSeenGuide: false,
};

let cache: Settings | null = null;

function settingsPath(): string {
  return join(app.getPath("userData"), "settings.json");
}

/** 读取设置（首次读取会尝试加载磁盘文件，失败则用默认值） */
export function getSettings(): Settings {
  if (cache) return cache;

  try {
    // 去掉 BOM：用户用记事本 / PowerShell 编辑过 JSON 时可能带 BOM，
    // 而 JSON.parse 遇到 BOM 会直接抛错，表现为"设置被静默重置"。
    const raw = readFileSync(settingsPath(), "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw) as Partial<Settings>;
    cache = { ...DEFAULTS, ...parsed };
    console.log(`[store] loaded ${settingsPath()}`);
  } catch (error) {
    cache = { ...DEFAULTS };
    console.log(`[store] no settings yet, using defaults (${String(error)})`);
  }

  return cache;
}

/** 合并更新并落盘，返回最新设置 */
export function updateSettings(patch: Partial<Settings>): Settings {
  const next: Settings = { ...getSettings(), ...patch };
  cache = next;

  try {
    mkdirSync(dirname(settingsPath()), { recursive: true });
    writeFileSync(settingsPath(), JSON.stringify(next, null, 2), "utf8");
    console.log(`[store] saved ${JSON.stringify(next)}`);
  } catch (error) {
    console.error(`[store] save failed: ${String(error)}`);
  }

  return next;
}
