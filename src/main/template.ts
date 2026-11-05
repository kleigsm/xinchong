import { app, dialog, shell } from "electron";
import type { BrowserWindow } from "electron";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * 素材包模板的导出（P2-2）。
 *
 * 模板文件放在 resources/pet-pack-template，打包后由 electron-builder 复制到
 * resources/template，所以开发态和打包态路径不同，要分开判断。
 */

function templateDir(): string {
  const packaged = join(process.resourcesPath, "template");
  if (app.isPackaged && existsSync(packaged)) return packaged;
  return join(app.getAppPath(), "resources", "pet-pack-template");
}

export function templateExists(): boolean {
  return existsSync(templateDir());
}

/** 让用户选保存位置，把模板压成 zip，并打开所在文件夹 */
export async function exportTemplate(win: BrowserWindow): Promise<string | null> {
  const source = templateDir();
  if (!existsSync(source)) {
    console.warn(`[template] 模板目录不存在: ${source}`);
    return null;
  }

  const picked = await dialog.showSaveDialog(win, {
    title: "保存素材包模板",
    defaultPath: "芯宠素材包模板.zip",
    filters: [{ name: "ZIP 压缩包", extensions: ["zip"] }],
  });

  if (picked.canceled || !picked.filePath) return null;

  // 用 PowerShell 的 Compress-Archive：Windows 自带，零依赖
  const safeSource = source.replace(/'/g, "''");
  const safeTarget = picked.filePath.replace(/'/g, "''");
  const script = `Compress-Archive -Path '${safeSource}\\*' -DestinationPath '${safeTarget}' -Force`;

  try {
    await execFileAsync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script]);
    console.log(`[template] 已导出 ${picked.filePath}`);
    shell.showItemInFolder(picked.filePath);
    return picked.filePath;
  } catch (error) {
    console.error(`[template] 压缩失败: ${String(error)}`);
    await dialog.showMessageBox(win, {
      type: "error",
      title: "导出失败",
      message: "没能生成压缩包",
      detail: String(error),
      buttons: ["知道了"],
    });
    return null;
  }
}
