// P0-1 技术选型 spike：透明置顶窗 + 点击穿透 + 拖拽
// 说明：这是验证用的一次性代码，P0-2 会重构为 src/ 结构 + TypeScript
//
// 穿透策略：主进程定时查询光标位置，自己判断是否在角色范围内。
// 不依赖 renderer 的 mousemove 转发（实测 forward:true 在该配置下不触发）。

const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");

const T0 = Date.now();

// 窗口尺寸与角色半径（圆形直径 160，留一点容差）
const WIN_SIZE = 220;
const PET_RADIUS = 82;
const POLL_MS = 50;

let win = null;
let dragOffset = null;
let ignoring = true;
let readyLogged = false;
let pollTimer = null;
let lastInside = null;

function createWindow() {
  win = new BrowserWindow({
    width: WIN_SIZE,
    height: WIN_SIZE,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, "screen-saver");
  win.setIgnoreMouseEvents(true, { forward: true });

  win.loadFile(path.join(__dirname, "index.html"));
// ---- 诊断：转发渲染层日志与错误 ----
win.webContents.on("console-message", (event, level, message) => {
  const text = typeof message === "string" ? message : event?.message;
  console.log("[renderer]", text);
});
win.webContents.on("preload-error", (_e, preloadPath, error) => {
  console.log("[preload-error]", preloadPath, error && error.message);
});
win.webContents.on("did-fail-load", (_e, code, desc) => {
  console.log("[did-fail-load]", code, desc);
});

  win.webContents.on("did-finish-load", () => {
    if (readyLogged) return;
    readyLogged = true;
    console.log(`[spike] window ready in ${Date.now() - T0}ms`);
    startPolling();
  });
}

/** 光标是否落在角色圆形范围内 */
function isCursorOnPet() {
  if (!win) return false;
  const cursor = screen.getCursorScreenPoint();
  const b = win.getBounds();
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const dx = cursor.x - cx;
  const dy = cursor.y - cy;
  return dx * dx + dy * dy <= PET_RADIUS * PET_RADIUS;
}

/** 定时轮询：光标进出角色范围时切换穿透 */
function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    if (!win || win.isDestroyed()) return;
    if (dragOffset) return; // 拖拽中不改穿透

    const inside = isCursorOnPet();
    if (inside === lastInside) return;
    lastInside = inside;

    // 在角色上 → 关闭穿透（可点击）；否则开启穿透
    win.setIgnoreMouseEvents(!inside, { forward: true });
    ignoring = !inside;
    console.log(`[spike] t=${Date.now() - T0}ms cursor ${inside ? "on pet" : "off pet"} → ignore=${ignoring}`);
  }, POLL_MS);
}

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


// ---- 转发渲染层 console 到主进程 ----
app.on("window-all-closed", () => app.quit());
