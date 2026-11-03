import { contextBridge, ipcRenderer } from "electron";
import type { PetApi, Point } from "../shared/types";

/**
 * 只暴露必要的方法，渲染进程拿不到 Node。
 * 注意：这里挂到 window 上的名字（pet）不能被渲染脚本用 const 重复声明，
 * 否则会 SyntaxError 导致整个脚本不执行（P0-1 踩过的坑）。
 */
const api: PetApi = {
  dragStart: (point: Point) => ipcRenderer.send("drag-start", point),
  dragMove: (point: Point) => ipcRenderer.send("drag-move", point),
  dragEnd: () => ipcRenderer.send("drag-end"),
};

contextBridge.exposeInMainWorld("pet", api);
