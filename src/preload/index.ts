import { contextBridge, ipcRenderer } from "electron";
import type { PetApi, Point, QuickPanelApi, Settings, UserPetPayload } from "../shared/types";
import type { PrivacyClearTarget } from "../shared/privacy";

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
  onChatClose: (callback: () => void) => {
    const listener = (): void => callback();
    ipcRenderer.on("pet:chat-close", listener);
    return () => {
      ipcRenderer.removeListener("pet:chat-close", listener);
    };
  },
  onUsePet: (callback: (payload: UserPetPayload) => void) => {
    const listener = (_event: unknown, payload: UserPetPayload): void => callback(payload);
    ipcRenderer.on("pet:use", listener);
    return () => {
      ipcRenderer.removeListener("pet:use", listener);
    };
  },
  openQuickPanel: () => ipcRenderer.send("quick-panel:open"),
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
  privacyReport: () => ipcRenderer.invoke("api:privacy:report"),
  privacyClear: (target: PrivacyClearTarget) => ipcRenderer.invoke("api:privacy:clear", target),
  getSystemInfo: () => ipcRenderer.invoke("api:system:info"),
  openUserData: () => ipcRenderer.invoke("api:system:openUserData"),
  openLogFolder: () => ipcRenderer.invoke("api:system:openLogFolder"),
  resetSettings: () => ipcRenderer.invoke("api:system:resetSettings"),
  confirm: (message: string, detail: string) =>
    ipcRenderer.invoke("api:system:confirm", message, detail),
};

/** 快捷面板用：窗口内只做动作与设置，不碰文件 */
const quickPanel: QuickPanelApi = {
  getState: () => ipcRenderer.invoke("quick-panel:state"),
  patchSettings: (patch: Partial<Settings>) => ipcRenderer.invoke("quick-panel:settings", patch),
  setPersonality: (id: string) => ipcRenderer.invoke("quick-panel:personality", id),
  action: (name) => ipcRenderer.send("quick-panel:action", name),
  openSettings: () => ipcRenderer.send("quick-panel:open-settings"),
  close: () => ipcRenderer.send("quick-panel:close"),
  quit: () => ipcRenderer.send("quick-panel:quit"),
};

contextBridge.exposeInMainWorld("pet", api);
contextBridge.exposeInMainWorld("quickPanel", quickPanel);
contextBridge.exposeInMainWorld("api", settingsApi);
