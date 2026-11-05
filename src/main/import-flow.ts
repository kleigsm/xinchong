import { basename, extname } from "node:path";
import type { BrowserWindow } from "electron";
import { dialog } from "electron";
import { DEFAULT_IMPORTED_LINES } from "../shared/default-lines";
import { importSingleImage, importSpriteSheet, type ImportResult } from "./importer";
import { sanitizePetId, writePet } from "./pet-store";
import { updateSettings } from "./store";

/**
 * 「导入角色」的入口。
 *
 * 两种模式：
 * - l3：雪碧图（多帧，用户自己画的完整动作）
 * - l2：单张立绘（程序自动做呼吸/眨眼/抖动）
 *
 * 另有 importFromPath() 供自动化测试直接调用，跳过文件对话框。
 */

export type ImportMode = "l3" | "l2";

const DEFAULT_LINES = DEFAULT_IMPORTED_LINES;

/** 按路径导入：校验 → 落盘 → 通知渲染层立即换上 */
export async function importFromPath(
  win: BrowserWindow,
  filePath: string,
  mode: ImportMode = "l3",
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const displayName = basename(filePath, extname(filePath));
  const id = sanitizePetId(displayName);

  const result: ImportResult =
    mode === "l2"
      ? importSingleImage(filePath, id, displayName, DEFAULT_LINES)
      : importSpriteSheet(filePath, id, displayName, DEFAULT_LINES);

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
    `[import] 成功(${mode}): ${id}（${result.pack.sprite.columns}×${result.pack.sprite.rows} 格，警告 ${result.warnings.length} 条）`,
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
export async function runImportFlow(win: BrowserWindow, mode: ImportMode = "l3"): Promise<void> {
  const picked = await dialog.showOpenDialog(win, {
    title: mode === "l2" ? "选择一张立绘（自动生成动作）" : "选择角色雪碧图（多帧）",
    buttonLabel: "导入",
    filters: [{ name: "图片", extensions: ["png"] }],
    properties: ["openFile"],
  });

  if (picked.canceled || picked.filePaths.length === 0) return;
  await importFromPath(win, picked.filePaths[0], mode);
}
