// 通过 contextBridge 只暴露必要的方法，渲染进程拿不到 Node
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pet", {
  dragStart: (point) => ipcRenderer.send("drag-start", point),
  dragMove: (point) => ipcRenderer.send("drag-move", point),
  dragEnd: () => ipcRenderer.send("drag-end"),
});
