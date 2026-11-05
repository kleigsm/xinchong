import { contextBridge, ipcRenderer } from "electron";
import type { PetApi, Point, Settings, UserPetPayload } from "../shared/types";

/**
 * 只暴露必要的方法，渲染进程拿不到 Node。
 * 注意：这里挂到 window 上的名字（pet）不能被渲染脚本用 const 重复声明，
 * 否则会 SyntaxError 导致整个脚本不执行（P0-1 踩过的坑）。
 */
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

contextBridge.exposeInMainWorld("pet", api);
