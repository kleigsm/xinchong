import { app, dialog, ipcMain, nativeImage, shell } from "electron";
import type { BrowserWindow } from "electron";
import { join } from "node:path";
import type { Settings } from "../shared/types";
import { PERSONALITIES } from "../shared/personalities";
import { getSettings, updateSettings } from "./store";
import { listPetIds, readPet, removePet, writePet } from "./pet-store";
import { useStoredPet } from "./pet-switch";
import { readPerfSnapshot } from "./perf";
import { importFromPath, runImportFlow, type ImportMode } from "./import-flow";
import { exportTemplate } from "./template";

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

export function registerSettingsApi(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle("api:settings:get", () => getSettings());

  ipcMain.handle("api:settings:patch", (_event, patch: Partial<Settings>) => {
    const next = updateSettings(patch);
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
    updateSettings({ muted: false, dnd: false, volume: 0.6, personality: "shy", activePetId: null });
    const next = getSettings();
    const win = getWindow();
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
}
