// 通过 contextBridge 只暴露必要的方法，渲染进程拿不到 Node
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pet", {
  /** true = 整窗穿透（点得到桌面），false = 可交互 */
  ignore: (value) => ipcRenderer.send("ignore", value),
  dragStart: (point) => ipcRenderer.send("drag-start", point),
  dragMove: (point) => ipcRenderer.send("drag-move", point),
  dragEnd: () => ipcRenderer.send("drag-end"),
});
