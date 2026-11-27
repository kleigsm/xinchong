import { app } from "electron";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  soundTheme: "personality",
  idleToSleepMs: 30_000,
  gestureWave: true,
  gesturePat: true,
  gestureAngry: true,
  doubleClickAction: "pat",
  patHand: "cartoon",
  hasSeenGuide: false,
  lastActiveDate: "",
  petOpacity: 1,
  animationSpeed: 1,
  alwaysOnTop: true,
  glowEnabled: true,
  glowFollow: true,
  glowColor: "#F06C8A",
  glowIntensity: 0.55,
  // 默认不主动说话（AGENTS 硬约束）
  proactiveTalk: false,
  // 跨场景冷却 5 分钟
  sceneCooldownMin: 5,
  /** 在 userData 里写运行日志（隐私页可关；关掉不删已有文件） */
  privacyLogs: true,
};

let cache: Settings | null = null;

function settingsPath(): string {
  return join(app.getPath("userData"), "settings.json");
}

/**
 * BUG-015 的根因：`settings.json` 里 `volume` 可能是 `null` / 字符串（旧版本或手改导致）。
 * 直接 `{...DEFAULTS, ...parsed}` 之后：
 * - 设置页 `Math.round(null * 100)` → 显示 **0%**
 * - 音频侧 `settings.volume ?? 0.6` → `null` 是 nullish → 用 **0.6** 出声
 * 于是出现「显示 0% 却有声音」。读盘时统一收敛成 0–1 的数字。
 */
function readVolume(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULTS.volume;
  return Math.min(1, Math.max(0, value));
}

/** 读取设置（首次读取会尝试加载磁盘文件，失败则用默认值） */
export function getSettings(): Settings {
  if (cache) return cache;

  try {
    // 去掉 BOM：用户用记事本 / PowerShell 编辑过 JSON 时可能带 BOM，
    // 而 JSON.parse 遇到 BOM 会直接抛错，表现为"设置被静默重置"。
    const raw = readFileSync(settingsPath(), "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw) as Partial<Settings>;
    cache = { ...DEFAULTS, ...parsed, volume: readVolume(parsed.volume) };
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

/**
 * 恢复出厂：直接删掉 settings.json 并把内存缓存重置为默认值。
 *
 * 和「恢复默认设置」（只把几个开关改回默认值）不同：
 * 这个是隐私页「清除全部本机数据」用的，目标是真的不留文件。
 */
export function resetAllSettings(): Settings {
  try {
    rmSync(settingsPath(), { force: true });
    console.log("[store] 已删除 settings.json（恢复出厂）");
  } catch (error) {
    console.error(`[store] 删除 settings.json 失败: ${String(error)}`);
  }

  cache = { ...DEFAULTS };
  return cache;
}
