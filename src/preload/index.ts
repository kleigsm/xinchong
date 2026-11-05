import { contextBridge, ipcRenderer } from "electron";
import type { PetApi, Point, Settings, UserPetPayload } from "../shared/types";

/**
 * 只暴露必要的方法，渲染进程拿不到 Node。
 * 注意：这里挂到 window 上的名字（pet / api）不能被渲染脚本用 const 重复声明，
 * 否则会 SyntaxError 导致整个脚本不执行（P0-1 踩过的坑）。
 */

/** 桌宠窗口用：轻量、点对点 */
const api: PetApi = {
  dragStart: (point: Point) => ipcRenderer.send("drag-start", point),
  dragMove: (point: Point) => ipcRenderer.send("drag-move", point),
  dragEnd: () => ipcRenderer.send("drag-end"),
  showMenu: () => ipcRenderer.send("show-context-menu"),
  ready: () => ipcRenderer.send("renderer-ready"),
  onSettings: (callback: (settings: Settings) => void) => {
    const listener = (_event: unknown, settings: Settings): void => callback(settings);
    ipcRenderer.on("settings-changed", listener);
    return () => {
      ipcRenderer.removeListener("settings-changed", listener);
    };
  },
  onUseBuiltin: (callback: (personalityId: string) => void) => {
    const listener = (_event: unknown, personalityId: string): void => callback(personalityId);
    ipcRenderer.on("pet:builtin", listener);
    return () => {
      ipcRenderer.removeListener("pet:builtin", listener);
    };
  },
  onUsePet: (callback: (payload: UserPetPayload) => void) => {
    const listener = (_event: unknown, payload: UserPetPayload): void => callback(payload);
    ipcRenderer.on("pet:use", listener);
    return () => {
      ipcRenderer.removeListener("pet:use", listener);
    };
  },
};

/** 设置窗口用：请求-响应 */
const settingsApi = {
  getSettings: () => ipcRenderer.invoke("api:settings:get"),
  patchSettings: (patch: Partial<Settings>) => ipcRenderer.invoke("api:settings:patch", patch),
  listPets: () => ipcRenderer.invoke("api:pets:list"),
  usePet: (id: string) => ipcRenderer.invoke("api:pets:use", id),
  removePet: (id: string) => ipcRenderer.invoke("api:pets:remove", id),
  renamePet: (id: string, name: string) => ipcRenderer.invoke("api:pets:rename", id, name),
  importPet: (mode: "l2" | "l3") => ipcRenderer.invoke("api:pets:import", mode),
  useBuiltin: (personalityId: string) => ipcRenderer.invoke("api:pets:useBuiltin", personalityId),
  getPersonalities: () => ipcRenderer.invoke("api:personalities"),
  getSystemInfo: () => ipcRenderer.invoke("api:system:info"),
  openUserData: () => ipcRenderer.invoke("api:system:openUserData"),
  openLogFolder: () => ipcRenderer.invoke("api:system:openLogFolder"),
  resetSettings: () => ipcRenderer.invoke("api:system:resetSettings"),
  confirm: (message: string, detail: string) =>
    ipcRenderer.invoke("api:system:confirm", message, detail),
};

contextBridge.exposeInMainWorld("pet", api);
contextBridge.exposeInMainWorld("api", settingsApi);
