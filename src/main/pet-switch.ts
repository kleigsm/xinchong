import type { BrowserWindow } from "electron";
import { updateSettings } from "./store";
import { buildPetPayload } from "./pet-payload";
import { removePet } from "./pet-store";
import { DEFAULT_PERSONALITY } from "../shared/personalities";

/**
 * 切换「当前穿哪只」的收口逻辑。
 *
 * 三个入口共用：托盘菜单、导入成功后、启动恢复。
 * 统一在这里改设置 + 通知渲染层，避免各处写得不一样。
 */

/** 换到某个自定义角色；返回是否成功 */
export function useStoredPet(win: BrowserWindow, id: string): boolean {
  const payload = buildPetPayload(id);
  if (!payload) {
    console.warn(`[pet] 切换失败，读不到 ${id}`);
    return false;
  }

  updateSettings({ activePetId: id });
  win.webContents.send("pet:use", payload);
  console.log(`[pet] 换到自定义角色 ${id}`);
  return true;
}

/** 换回内置性格角色 */
export function useBuiltInPet(win: BrowserWindow, personalityId = DEFAULT_PERSONALITY): void {
  updateSettings({ activePetId: null, personality: personalityId });
  win.webContents.send("pet:builtin", personalityId);
  console.log(`[pet] 换回内置角色 ${personalityId}`);
}

/** 删除一个自定义角色；如果删的正是当前使用的，就退回内置角色 */
export function deleteStoredPet(win: BrowserWindow, id: string, currentId: string | null): boolean {
  const removed = removePet(id);
  if (!removed) return false;

  if (currentId === id) {
    useBuiltInPet(win);
  }
  console.log(`[pet] 已删除自定义角色 ${id}`);
  return true;
}
