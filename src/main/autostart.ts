import { app } from "electron";
import { getSettings, updateSettings } from "./store";

/**
 * 开机自启（P1-7）。
 *
 * Windows 下 Electron 的 setLoginItemSettings 会写
 * HKCU\Software\Microsoft\Windows\CurrentVersion\Run
 *
 * 注意：开发模式下 process.execPath 是 electron.exe，
 * 注册表写进去会导致开机启动一个空的 Electron，所以开发环境只记录偏好、不落注册表。
 */
export function applyAutoStart(enabled: boolean): void {
  updateSettings({ autoStart: enabled });

  if (!app.isPackaged) {
    console.log(`[autostart] dev mode, preference saved but registry untouched (autoStart=${enabled})`);
    return;
  }

  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath,
  });
  console.log(`[autostart] ${enabled ? "enabled" : "disabled"} path=${process.execPath}`);
}

/** 启动时把配置同步到注册表，避免用户在系统设置里改过之后状态不一致 */
export function initAutoStart(): void {
  const { autoStart } = getSettings();
  if (!app.isPackaged) {
    console.log(`[autostart] dev mode, skip sync (autoStart=${autoStart})`);
    return;
  }

  app.setLoginItemSettings({ openAtLogin: autoStart, path: process.execPath });
  console.log(`[autostart] synced autoStart=${autoStart}`);
}
