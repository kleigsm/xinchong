// P0-1 技术选型 spike：透明置顶窗 + 点击穿透 + 拖拽
// 说明：这是验证用的一次性代码，P0-2 会重构为 src/ 结构 + TypeScript

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const T0 = Date.now();
let win = null;
let dragOffset = null;
let readyLogged = false;

function createWindow() {
  win = new BrowserWindow({
    width: 220,
    height: 220,
    transparent: true, // 窗口背景透明
    frame: false, // 去掉标题栏
    alwaysOnTop: true, // 永远在最前
    skipTaskbar: true, // 不占任务栏
    focusable: false, // 点它不抢焦点
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // screen-saver 层级，保证盖住普通窗口
  win.setAlwaysOnTop(true, "screen-saver");

  // 默认整窗穿透，但把鼠标移动事件转发给页面（forward）
  win.setIgnoreMouseEvents(true, { forward: true });

  win.loadFile(path.join(__dirname, "index.html"));

  win.webContents.on("did-finish-load", () => {
    if (!readyLogged) {
      readyLogged = true;
      const [w, h] = win.getSize();
      console.log(`[spike] window ready in ${Date.now() - T0}ms, size=${w}x${h}`);
    }
  });
}

/** 页面请求切换穿透状态 */
ipcMain.on("ignore", (_e, ignore) => {
  if (!win) return;
  win.setIgnoreMouseEvents(ignore, { forward: true });
  console.log(`[spike] t=${Date.now() - T0}ms ignoreMouseEvents=${ignore}`);
});

/** 开始拖拽：记录鼠标与窗口左上角的偏移 */
ipcMain.on("drag-start", (_e, { x, y }) => {
  if (!win) return;
  const [wx, wy] = win.getPosition();
  dragOffset = { dx: x - wx, dy: y - wy };
  console.log(`[spike] drag start at (${x},${y}) offset=(${dragOffset.dx},${dragOffset.dy})`);
});

/** 拖拽中：按屏幕坐标移动窗口 */
ipcMain.on("drag-move", (_e, { x, y }) => {
  if (!win || !dragOffset) return;
  win.setPosition(Math.round(x - dragOffset.dx), Math.round(y - dragOffset.dy));
});

ipcMain.on("drag-end", () => {
  if (!win) return;
  dragOffset = null;
  const [x, y] = win.getPosition();
  console.log(`[spike] drag end, window at (${x},${y})`);
});

app.whenReady().then(() => {
  console.log(`[spike] app ready in ${Date.now() - T0}ms`);
  createWindow();
});

app.on("window-all-closed", () => app.quit());
