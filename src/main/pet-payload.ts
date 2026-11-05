import type { UserPetPayload } from "../shared/types";
import { readPet, listPetIds } from "./pet-store";

/**
 * 把磁盘上的角色转成渲染层能直接用的 payload（雪碧图 → data URL）。
 *
 * 渲染层跑在 contextIsolation 里，读不到文件系统，
 * 所以图片必须由主进程读出来、转成 data URL 传过去。
 */
export function buildPetPayload(id: string): UserPetPayload | null {
  const stored = readPet(id);
  if (!stored) return null;

  return {
    id: stored.id,
    name: stored.pack.name || stored.id,
    pack: {
      ...stored.pack,
      sprite: {
        ...stored.pack.sprite,
        image: `data:image/png;base64,${stored.sprite.toString("base64")}`,
      },
    },
  };
}

/** 列出所有已保存的角色（给菜单用） */
export function listPetSummaries(): Array<{ id: string; name: string }> {
  return listPetIds()
    .map((id) => {
      const stored = readPet(id);
      return stored ? { id, name: stored.pack.name || id } : null;
    })
    .filter((item): item is { id: string; name: string } => item !== null);
}
