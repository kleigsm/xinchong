import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } from "electron";
import { join } from "node:path";
import type { Settings } from "../shared/types";
import { PERSONALITIES } from "../shared/personalities";
import { getSettings, updateSettings } from "./store";
import { listPetIds, readPet, removePet, writePet } from "./pet-store";
import { useStoredPet } from "./pet-switch";
import { readPerfSnapshot } from "./perf";
import { importFromPath, runImportFlow, type ImportMode } from "./import-flow";
import { exportTemplate } from "./template";
import { clearChatKey, isEncryptionAvailable, loadChatKey, maskChatKey, saveChatKey } from "./chat-key";
import { sendChatMessage } from "./chat";
import { clearChats, listChatSummaries } from "./chat-store";
import { characterKeyOf } from "../shared/chat-archive";
import { applyAlwaysOnTop } from "./window";
import { setLogWriteEnabled } from "./logging";
import { clearPrivacyData, collectPrivacyReport } from "./privacy";
import type { PrivacyClearTarget } from "../shared/privacy";
import {
  cancelSoundPack,
  commitSoundPack,
  findSoundPack,
  isSafePackId,
  listSoundPacks,
  prepareSoundPack,
  readSoundFile,
  removeSoundPack,
} from "./sound-store";

/**
 * 设置窗口用的 IPC 接口（invoke/handle 模式）。
 *
 * 和桌宠窗口的 send 通道分开：
 * - send：主 → 渲染的单向广播（settings-changed、pet:use）
 * - invoke：渲染 → 主的请求-响应（查列表、读版本、改设置）
 */

export interface PetListItem {
  id: string;
  name: string;
  kind: "l2" | "l3";
  thumb: string | null;
  active: boolean;
}

export interface SystemInfo {
  version: string;
  electron: string;
  userDataPath: string;
  cpuPercent: number;
  memoryMB: number;
  processes: number;
}

/** 从雪碧图裁第一格做缩略图 */
function makeThumb(id: string): string | null {
  const stored = readPet(id);
  if (!stored) return null;

  const image = nativeImage.createFromBuffer(stored.sprite);
  if (image.isEmpty()) return null;

  const { frameWidth, frameHeight, columns, rows } = stored.pack.sprite;
  const cropped =
    columns === 1 && rows === 1
      ? image
      : image.crop({ x: 0, y: 0, width: frameWidth, height: frameHeight });

  return cropped.resize({ width: 72, height: 72, quality: "best" }).toDataURL();
}

/** 广播设置变化：桌宠窗口 + 设置窗口（音效主题切换要立刻生效，不用重启） */
function broadcastSettings(): void {
  const next = getSettings();
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send("settings-changed", next);
  }
}

export function registerSettingsApi(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle("api:settings:get", () => getSettings());

  ipcMain.handle("api:settings:patch", (_event, patch: Partial<Settings>) => {
    const next = updateSettings(patch);
    // 置顶是窗口属性，不是渲染层的样式：必须在主进程立即应用
    if (patch.alwaysOnTop !== undefined) {
      const win = getWindow();
      if (win) applyAlwaysOnTop(win, next.alwaysOnTop);
    }
    // 日志开关同理：改设置的同时立刻生效，不用重启
    if (patch.privacyLogs !== undefined) {
      setLogWriteEnabled(next.privacyLogs !== false);
    }
    // 广播给所有窗口（桌宠窗口要实时响应）
    for (const win of [getWindow()]) {
      win?.webContents.send("settings-changed", next);
    }
    return next;
  });

  ipcMain.handle("api:pets:list", (): PetListItem[] => {
    const activeId = getSettings().activePetId;
    return listPetIds().map((id) => {
      const stored = readPet(id);
      const isStatic = stored ? stored.pack.sprite.columns === 1 : false;
      return {
        id,
        name: stored?.pack.name ?? id,
        kind: isStatic ? ("l2" as const) : ("l3" as const),
        thumb: makeThumb(id),
        active: id === activeId,
      };
    });
  });

  ipcMain.handle("api:pets:use", (_event, id: string) => {
    const win = getWindow();
    if (!win) return false;
    return useStoredPet(win, id);
  });

  ipcMain.handle("api:pets:remove", (_event, id: string) => {
    const win = getWindow();
    if (!win) return false;
    const removed = removePet(id);
    if (removed && getSettings().activePetId === id) {
      updateSettings({ activePetId: null });
      win.webContents.send("pet:builtin", getSettings().personality);
    }
    return removed;
  });

  ipcMain.handle("api:pets:rename", (_event, id: string, name: string) => {
    const stored = readPet(id);
    if (!stored) return false;
    const trimmed = name.trim().slice(0, 24);
    if (!trimmed) return false;
    writePet(id, { ...stored.pack, name: trimmed }, stored.sprite);
    return true;
  });

  ipcMain.handle("api:pets:import", async (_event, mode: ImportMode) => {
    const win = getWindow();
    if (!win) return { ok: false };
    await runImportFlow(win, mode);
    return { ok: true };
  });

  ipcMain.handle("api:pets:importPath", async (_event, path: string, mode: ImportMode) => {
    const win = getWindow();
    if (!win) return { ok: false };
    return importFromPath(win, path, mode);
  });

  ipcMain.handle("api:pets:useBuiltin", (_event, personalityId: string) => {
    const win = getWindow();
    if (!win) return false;
    updateSettings({ activePetId: null, personality: personalityId });
    win.webContents.send("pet:builtin", personalityId);
    for (const w of [win]) w.webContents.send("settings-changed", getSettings());
    return true;
  });

  ipcMain.handle("api:system:info", (): SystemInfo => {
    const perf = readPerfSnapshot();
    return {
      version: app.getVersion(),
      electron: process.versions.electron,
      userDataPath: app.getPath("userData"),
      cpuPercent: perf.cpuPercent,
      memoryMB: perf.memoryMB,
      processes: perf.processes,
    };
  });

  ipcMain.handle("api:system:openUserData", async () => {
    await shell.openPath(app.getPath("userData"));
  });

  ipcMain.handle("api:system:resetSettings", async () => {
    updateSettings({
      muted: false,
      dnd: false,
      volume: 0.6,
      personality: "shy",
      activePetId: null,
      petOpacity: 1,
      animationSpeed: 1,
      alwaysOnTop: true,
      privacyLogs: true,
    });
    setLogWriteEnabled(true);
    const next = getSettings();
    const win = getWindow();
    if (win) applyAlwaysOnTop(win, next.alwaysOnTop);
    win?.webContents.send("settings-changed", next);
    win?.webContents.send("pet:builtin", next.personality);
    return next;
  });

  ipcMain.handle("api:personalities", () => PERSONALITIES);

  ipcMain.handle("api:template:export", async () => {
    const win = getWindow();
    if (!win) return null;
    return exportTemplate(win);
  });

  ipcMain.handle("api:system:openLogFolder", async () => {
    const path = join(app.getPath("userData"), "main.log");
    await shell.showItemInFolder(path);
  });

  ipcMain.handle("api:system:confirm", async (_event, message: string, detail: string) => {
    const win = getWindow();
    if (!win) return false;
    const result = await dialog.showMessageBox(win, {
      type: "question",
      title: "确认",
      message,
      detail,
      buttons: ["取消", "确定"],
      defaultId: 1,
      cancelId: 0,
    });
    return result.response === 1;
  });

  // ---------------- 聊天（P2-6）----------------

  ipcMain.handle("api:chat:status", () => {
    const key = loadChatKey();
    return {
      hasKey: key !== null,
      encryptionAvailable: isEncryptionAvailable(),
      masked: key ? maskChatKey(key) : null,
    };
  });

  ipcMain.handle("api:chat:saveKey", (_event, key: string) => saveChatKey(key));

  ipcMain.handle("api:chat:clearKey", () => clearChatKey());

  ipcMain.handle("api:chat:send", async (_event, text: string) => {
    const settings = getSettings();
    // P2-10：按"当前是哪个形象"取上下文——内置角色用性格，自定义角色用 petId
    const characterKey = characterKeyOf(settings.personality, settings.activePetId);
    return sendChatMessage(text, settings.personality, characterKey);
  });

  // ---------------- 对话记录（P2-10）----------------

  ipcMain.handle("api:chat:history", () => listChatSummaries());

  ipcMain.handle("api:chat:history:clear", (_event, key?: string) => {
    clearChats(key);
    console.log(`[chat] 清空对话记录 ${key ?? "(全部)"}`);
    return listChatSummaries();
  });

  ipcMain.handle("api:chat:hasKey", () => loadChatKey() !== null);
  ipcMain.handle("api:chat:test", async (_event, rawKey?: string) => {
    const key = rawKey?.trim() || loadChatKey();
    if (!key) return { ok: false, message: "还没有填 Key" };

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 4,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) return { ok: true, message: "连接正常，Key 可用" };
      if (response.status === 401) return { ok: false, message: "Key 无效或已过期" };
      if (response.status === 402) return { ok: false, message: "账户余额不足" };
      if (response.status === 429) return { ok: false, message: "请求太频繁，稍后再试" };
      return { ok: false, message: `服务返回 ${response.status}` };
    } catch (error) {
      const text = String(error);
      if (text.includes("TimeoutError") || text.includes("timed out")) {
        return { ok: false, message: "连接超时，检查网络或代理" };
      }
      return { ok: false, message: `网络错误：${text.slice(0, 120)}` };
    }
  });

  // ---------------- 自定义音效包（P2-11）----------------

  ipcMain.handle("api:sounds:packs", () => listSoundPacks());

  // 不传 sourceDir 时弹文件夹选择；传了就直接校验（测试 / 开发用）
  ipcMain.handle("api:sounds:import", async (_event, sourceDir?: string) => {
    if (typeof sourceDir === "string" && sourceDir) return prepareSoundPack(sourceDir);

    const win = getWindow();
    const options = {
      title: "选择音效包文件夹",
      buttonLabel: "导入",
      properties: ["openDirectory" as const],
    };
    const picked = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    const dir = picked.filePaths[0];
    if (picked.canceled || !dir) return { ok: false as const, error: "已取消" };
    return prepareSoundPack(dir);
  });

  ipcMain.handle("api:sounds:import:commit", (_event, token: string) => {
    if (typeof token !== "string") return { ok: false as const, error: "参数不对" };

    const result = commitSoundPack(token);
    if (result.ok) {
      // 导入成功就直接用上（音频文件复制在同一块磁盘，rename 很快）
      updateSettings({ soundTheme: `user:${result.id}` });
      broadcastSettings();
    }
    return result;
  });

  ipcMain.handle("api:sounds:import:cancel", (_event, token: string) => {
    if (typeof token === "string") cancelSoundPack(token);
  });

  ipcMain.handle("api:sounds:remove", (_event, id: string) => {
    if (!isSafePackId(id)) return listSoundPacks();

    const packs = removeSoundPack(id);
    // 删掉的正是当前主题：切回「跟随性格」，别让设置指向不存在的包
    if (getSettings().soundTheme === `user:${id}`) {
      updateSettings({ soundTheme: "personality" });
      broadcastSettings();
      console.log(`[sounds] 当前音效包被删除，已切回跟随性格`);
    }
    return packs;
  });

  ipcMain.handle("api:sounds:pack", (_event, id: string) => {
    if (!isSafePackId(id)) return null;
    return findSoundPack(id)?.sounds ?? null;
  });

  ipcMain.handle("api:sounds:file", (_event, id: string, file: string) => {
    if (!isSafePackId(id) || typeof file !== "string") return null;
    return readSoundFile(id, file);
  });

  // ---------------- 隐私（P1-13）----------------

  ipcMain.handle("api:privacy:report", () => collectPrivacyReport());

  ipcMain.handle("api:privacy:clear", (_event, target: PrivacyClearTarget) => {
    const result = clearPrivacyData(target);
    const next = getSettings();
    const win = getWindow();

    // 清完要把新状态推出去：角色被删了要换回内置，设置被清了要刷新托盘勾选
    win?.webContents.send("settings-changed", next);
    if (result.cleared.includes("pets") || result.cleared.includes("settings")) {
      win?.webContents.send("pet:builtin", next.personality);
    }
    if (result.cleared.includes("settings")) {
      setLogWriteEnabled(next.privacyLogs !== false);
      if (win) applyAlwaysOnTop(win, next.alwaysOnTop);
    }

    return result;
  });
}

