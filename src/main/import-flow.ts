import { basename, extname } from "node:path";
import type { BrowserWindow } from "electron";
import { dialog } from "electron";
import { DEFAULT_IMPORTED_LINES } from "../shared/default-lines";
import { importSpriteSheet } from "./importer";
import { sanitizePetId, writePet } from "./pet-store";
import { updateSettings } from "./store";

/**
 * 「导入角色」的两个入口：
 *
 * - runImportFlow()  ：弹文件对话框，给用户用
 * - importFromPath() ：直接按路径导入，给自动化测试用
 */

const DEFAULT_LINES = DEFAULT_IMPORTED_LINES;

/** 按路径导入：校验 → 落盘 → 通知渲染层立即换上 */
export async function importFromPath(
  win: BrowserWindow,
  filePath: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const displayName = basename(filePath, extname(filePath));
  const id = sanitizePetId(displayName);

  const result = importSpriteSheet(filePath, id, displayName, DEFAULT_LINES);

  if (!result.ok) {
    console.warn(`[import] 校验失败: ${result.error}`);
    await dialog.showMessageBox(win, {
      type: "warning",
      title: "导入失败",
      message: "这张图不符合要求",
      detail: result.error,
      buttons: ["知道了"],
    });
    return { ok: false, error: result.error };
  }

  try {
    writePet(id, result.pack, result.sprite);
  } catch (error) {
    console.error(`[import] 保存失败: ${String(error)}`);
    await dialog.showMessageBox(win, {
      type: "error",
      title: "导入失败",
      message: "保存角色时出错",
      detail: String(error),
      buttons: ["知道了"],
    });
    return { ok: false, error: String(error) };
  }

  console.log(
    `[import] 成功: ${id}（每格 ${result.pack.sprite.frameWidth}px，警告 ${result.warnings.length} 条）`,
  );

  if (result.warnings.length > 0) {
    await dialog.showMessageBox(win, {
      type: "info",
      title: "导入成功（有提示）",
      message: `已导入「${displayName}」`,
      detail: result.warnings.join("\n"),
      buttons: ["知道了"],
    });
  }

  // 记住这个角色，下次启动直接用它
  updateSettings({ activePetId: id });

  // 通知渲染层立即换上这个角色
  win.webContents.send("pet:use", {
    id,
    name: displayName,
    pack: {
      ...result.pack,
      sprite: {
        ...result.pack.sprite,
        image: `data:image/png;base64,${result.sprite.toString("base64")}`,
      },
    },
  });

  return { ok: true, id };
}

/** 给用户用：先弹文件对话框 */
export async function runImportFlow(win: BrowserWindow): Promise<void> {
  const picked = await dialog.showOpenDialog(win, {
    title: "选择角色雪碧图",
    buttonLabel: "导入",
    filters: [{ name: "图片", extensions: ["png"] }],
    properties: ["openFile"],
  });

  if (picked.canceled || picked.filePaths.length === 0) return;
  await importFromPath(win, picked.filePaths[0]);
}
