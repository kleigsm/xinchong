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
  chatInputClosed: () => ipcRenderer.send("chat-input-closed"),
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
  onShowChatInput: (callback: () => void) => {
    const listener = (): void => callback();
    ipcRenderer.on("pet:chat-input", listener);
    return () => {
      ipcRenderer.removeListener("pet:chat-input", listener);
    };
  },
  onUsePet: (callback: (payload: UserPetPayload) => void) => {
    const listener = (_event: unknown, payload: UserPetPayload): void => callback(payload);
    ipcRenderer.on("pet:use", listener);
    return () => {
      ipcRenderer.removeListener("pet:use", listener);
    };
  },
  onPlayAction: (callback: (name: string) => void) => {
    const listener = (_event: unknown, name: string): void => callback(name);
    ipcRenderer.on("play-action", listener);
    return () => {
      ipcRenderer.removeListener("play-action", listener);
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
  exportTemplate: () => ipcRenderer.invoke("api:template:export"),
  chatStatus: () => ipcRenderer.invoke("api:chat:status"),
  chatSaveKey: (key: string) => ipcRenderer.invoke("api:chat:saveKey", key),
  chatClearKey: () => ipcRenderer.invoke("api:chat:clearKey"),
  chatTest: (key?: string) => ipcRenderer.invoke("api:chat:test", key),
  chatSend: (text: string) => ipcRenderer.invoke("api:chat:send", text),
  chatHasKey: () => ipcRenderer.invoke("api:chat:hasKey"),
  getSystemInfo: () => ipcRenderer.invoke("api:system:info"),
  openUserData: () => ipcRenderer.invoke("api:system:openUserData"),
  openLogFolder: () => ipcRenderer.invoke("api:system:openLogFolder"),
  resetSettings: () => ipcRenderer.invoke("api:system:resetSettings"),
  confirm: (message: string, detail: string) =>
    ipcRenderer.invoke("api:system:confirm", message, detail),
};

contextBridge.exposeInMainWorld("pet", api);
contextBridge.exposeInMainWorld("api", settingsApi);
