import { Menu, Tray, dialog, nativeImage } from "electron";
import type { BrowserWindow } from "electron";
import { PERSONALITIES } from "../shared/personalities";
import { runImportFlow } from "./import-flow";
import { openSettingsWindow } from "./settings-window";
import { loadChatKey } from "./chat-key";
import { openChatInput } from "./chat-input";
import { listPetSummaries } from "./pet-payload";
import { deleteStoredPet, useStoredPet } from "./pet-switch";
import { showPerfDialog } from "./perf";
import { applyAutoStart } from "./autostart";
import { getSettings, updateSettings } from "./store";

/**
 * 32x32 的粉色圆形图标，内嵌 base64。
 * 好处：不依赖资源路径，开发与打包都能用。
 */
const TRAY_ICON_PNG = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAARLSURBVFhH7ZbLU9tWFMazzJIlyyy7ZMmSPyFLlt20IZ3QOG2ToUwpbgLGvGIgLjYYW0AMfoFlgx9gG4TDq2mTdFoaXgGL2NjyE2GbGS+/jkQwkihgMNn1m7kjLTT3d853zj26t279r2uKJakqlqRqWBu3/DWsdbZK+s2NChR1+8i19GVuatGUdQQLWZLC4eQ8WGsAB2YfMuOzyBi9SI94yDgxVccSZIV0j2sr516qy7uXmfz0InLOIM6Fj3qQGnYhaZhCXOdk41pSRhPEbel+JYul/qw48q6sHrmXcRV4YsiJ+CAJRjuJWL91g9GY7kj3vlQF7+qdI88yfQZup5B1LSEX+B25+Tf8M+t/jUPvCjK2AJKGaQHchpjaimifmY2oTDVSxrniM/8PeNa9hKOlv3go63wFdmIOB9Y5ZCx+pC0+HEy9Ajv7G5LjM0I49nvGEek2snQX8YWUdUZ8s0ltdwaRp94gv/AWrC1woe3cSk3OIU0uIPar7Rj+3IhI10uEO0ZoWkVc3Jx5z4pMCueyzrqXS6z5ceZxvRMp+zz2X5hP4PioJLDXalBJmUVx2Uu7ncv8qvAT22PaCSRtgVO4woBQi65ANxOVUjYv/rhJas7Zfh34ie3M8DRiQyQPp1uGEHqqw45c2yZl88pPL3qF3c5Zf1nNL4LzmbcPI2Hx4WPnCA/flQ9gp6l/Q8rmRmuFcMJxtuf8r8uDf7J9XzuB/UH7MfxnDXZ+6sfmj33iE5F1UtXCIZOb+wOsI1g2nLN9r2MUjNFThH9oVHMB3BUFwJLUXeGEywXf4YA732XCedt/GUTc6ivCtxv6sPlEJRMFcGgL1AnHaz74DpmxmfLhn2yPW/1F+NaTHmx9r5KLAsiYA7XCbs9Rb5E2em8EzmUet/hO4T+osC7rahAFwJr8NcKGO5xZRdrsuxE4V4Lo8FQRvvldN9YfddaKAkhYXZXChsvYKWTIhbLhnO00943aXIRvyDqxXq+sFgXAKTXqXj2peXLYBXZmFcyAvSw4Z3tYY8PuM90p/FslI2XzShHTcmHNU1Y/khZfWfBQmx5htUUAb8f7eiUhZfNKEK7KhM5RKNqumUDGGQSjI68F3258gX29A1uPe07hD5T455uW8++PCZ1dJax5TDuJtINCVG25MjwyMImdZo0YXqcgpUyREmprZbTfxghtj2ps/D+e0TtKgu+2DvGZS+Fr9xWFv79uvfxSEuk1V0d7zQWR7Z2jYAxOxMdnEFFbQCsMIvhOkwYhJYFwv5VfZ2y/r8DaV0/FR+8ihXvGaiPPjQWp7WHVGKJ6Jz9Y4hMBfsJx7zGjhweHWvXihjuB33smnnylKNL5sibcPsKWYrtwyEhtv1LmUtEdROWewmC6DpxruJJqXoro5sGqXfkA8aFJw1wIr1ey7x+0mdbutZV+Db+qtht7qzcbemVbj1Vy7q+28ahbvv6wQ7bx8DNCP5f+Baum4ZZBGkdmAAAAAElFTkSuQmCC";

let tray: Tray | null = null;

export function createTray(win: BrowserWindow): Tray {
  const image = nativeImage.createFromDataURL("data:image/png;base64," + TRAY_ICON_PNG);
  tray = new Tray(image);
  tray.setToolTip("芯宠");
  tray.setContextMenu(buildMenu(win));
  tray.on("click", () => toggleWindow(win));
  console.log("[tray] created");
  return tray;
}

/** 菜单状态变化后重新挂载，保证勾选状态是最新的 */
export function refreshMenu(win: BrowserWindow): void {
  tray?.setContextMenu(buildMenu(win));
}

/** 把最新设置推给渲染进程 */
export function notifySettings(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  win.webContents.send("settings-changed", getSettings());
}

/** 托盘菜单与宠物右键菜单共用 */
export function buildMenu(win: BrowserWindow): Menu {
  const settings = getSettings();
  const myPets = listPetSummaries();

  const petItems: Electron.MenuItemConstructorOptions[] = myPets.map((pet) => ({
    label: pet.name,
    type: "radio" as const,
    checked: settings.activePetId === pet.id,
    click: () => {
      useStoredPet(win, pet.id);
      refreshMenu(win);
      notifySettings(win);
    },
  }));

  if (petItems.length > 0) {
    petItems.push({ type: "separator" });
  }
  petItems.push({
    label: "导入立绘（单张，自动动画）…",
    click: () => {
      void runImportFlow(win, "l2");
    },
  });
  petItems.push({
    label: "导入雪碧图（多帧）…",
    click: () => {
      void runImportFlow(win, "l3");
    },
  });
  if (settings.activePetId) {
    petItems.push({
      label: "删除当前角色",
      click: () => {
        deleteStoredPet(win, settings.activePetId as string, settings.activePetId);
        refreshMenu(win);
        notifySettings(win);
      },
    });
  }

  return Menu.buildFromTemplate([
    {
      label: "显示 / 隐藏",
      click: () => toggleWindow(win),
    },
    { type: "separator" },
    {
      label: "说句话…",
      click: () => {
        if (!loadChatKey()) {
          void dialog.showMessageBox(win, {
            type: "info",
            title: "还没有配置",
            message: "要先填一个 API Key 才能聊天",
            detail:
              "打开「设置…」→「聊天」，填入你自己的 DeepSeek Key。\n不填也没关系，桌宠会继续说内置台词。",
            buttons: ["知道了"],
          });
          return;
        }
        openChatInput(win);
      },
    },
    {
      label: "我的角色",
      submenu: petItems,
    },
    {
      label: "性格",
      submenu: PERSONALITIES.map((personality) => ({
        label: personality.label,
        type: "radio" as const,
        checked: settings.personality === personality.id,
        click: () => {
          updateSettings({ personality: personality.id });
          refreshMenu(win);
          notifySettings(win);
        },
      })),
    },
    {
      label: "动作",
      submenu: [
        { label: "招手", click: () => win.webContents.send("play-action", "wave") },
        { label: "伸懒腰", click: () => win.webContents.send("play-action", "stretch") },
        { label: "摸头", click: () => win.webContents.send("play-action", "pat") },
        { label: "生气", click: () => win.webContents.send("play-action", "angry") },
      ],
    },
    {
      label: "静音",
      type: "checkbox",
      checked: settings.muted,
      click: (item) => {
        updateSettings({ muted: item.checked });
        refreshMenu(win);
        notifySettings(win);
      },
    },
    {
      label: "勿扰模式",
      type: "checkbox",
      checked: settings.dnd,
      click: (item) => {
        updateSettings({ dnd: item.checked });
        refreshMenu(win);
        notifySettings(win);
      },
    },
    {
      label: "音量",
      submenu: [0, 0.25, 0.5, 0.75, 1].map((level) => ({
        label: `${Math.round(level * 100)}%`,
        type: "radio" as const,
        checked: Math.abs(settings.volume - level) < 0.01,
        click: () => {
          updateSettings({ volume: level });
          refreshMenu(win);
          notifySettings(win);
        },
      })),
    },
    {
      label: "开机自启",
      type: "checkbox",
      checked: settings.autoStart,
      click: (item) => {
        applyAutoStart(item.checked);
        refreshMenu(win);
        notifySettings(win);
      },
    },
    { type: "separator" },
    {
      label: "性能信息",
      click: () => {
        void showPerfDialog();
      },
    },
    { type: "separator" },
    {
      label: "设置…",
      click: () => {
        openSettingsWindow();
      },
    },
    { type: "separator" },
    {
      label: "退出芯宠",
      click: () => {
        tray?.destroy();
        tray = null;
        win.destroy();
      },
    },
  ]);
}

function toggleWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) return;

  if (win.isVisible()) {
    win.hide();
    console.log("[tray] window hidden");
    return;
  }

  win.show();
  win.setAlwaysOnTop(true, "screen-saver");
  win.moveTop();
  console.log("[tray] window shown");
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}