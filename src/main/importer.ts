import { nativeImage } from "electron";
import type { AnimationName, PetPack } from "../shared/pet-pack";
import { buildAnimations, detectLayout, requiredStartFrames } from "./sheet-layout";

/**
 * 角色雪碧图导入与校验（L3）。
 *
 * 校验全部在主进程完成：用户传进来的文件必须先过这一关，
 * 绝不能把坏图直接丢给渲染层（会白屏、会卡死）。
 *
 * 错误信息一律说人话——用户看不懂"frameWidth 不整除"，
 * 但看得懂"整图尺寸应该是 512×512，你的是 600×600"。
 */

/** 固定 4 列（规格 v1），行数只能是 4 或 5 */
const COLUMNS = 4;
const MIN_CELL = 64;
const MAX_CELL = 256;

export type ImportResult =
  | { ok: true; pack: PetPack; sprite: Buffer; warnings: string[] }
  | { ok: false; error: string };

interface CellStats {
  /** 不透明像素占比（0–1） */
  opaqueRatio: number;
}

/** 采样统计每个格子的不透明像素占比 */
function analyzeCells(
  bitmap: Buffer,
  width: number,
  cellSize: number,
  rows: number,
): CellStats[] {
  const stats: CellStats[] = [];
  const step = 4; // 每 4 像素采一次，够用且快

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      let opaque = 0;
      let total = 0;

      const x0 = col * cellSize;
      const y0 = row * cellSize;

      for (let y = y0; y < y0 + cellSize; y += step) {
        for (let x = x0; x < x0 + cellSize; x += step) {
          const offset = (y * width + x) * 4;
          // nativeImage.toBitmap() 返回 BGRA，alpha 在第 4 个字节
          const alpha = bitmap[offset + 3];
          total += 1;
          if (alpha > 10) opaque += 1;
        }
      }

      stats.push({ opaqueRatio: total > 0 ? opaque / total : 0 });
    }
  }

  return stats;
}

/**
 * 校验并解析一张角色雪碧图。
 *
 * @param filePath 用户选择的文件
 * @param idName   角色 id（已 sanitize）
 * @param displayName 显示名
 * @param lines    台词（v1 先沿用内置的一套）
 */
export function importSpriteSheet(
  filePath: string,
  idName: string,
  displayName: string,
  lines: PetPack["lines"],
): ImportResult {
  const image = nativeImage.createFromPath(filePath);
  if (image.isEmpty()) {
    return { ok: false, error: "这个文件读不出来。请确认它是 PNG 图片，而不是改了后缀名的其它格式。" };
  }

  const { width, height } = image.getSize();

  if (width % COLUMNS !== 0) {
    return {
      ok: false,
      error: `图片宽度 ${width} 不能被 ${COLUMNS} 整除。整图应该正好是 ${COLUMNS} 列等宽的格子。`,
    };
  }

  const cellSize = width / COLUMNS;

  if (height % cellSize !== 0) {
    return {
      ok: false,
      error: `图片高度 ${height} 不是每格高度 ${cellSize} 的整数倍。每格应该是正方形，整图高度 = 格高 × 行数。`,
    };
  }

  const rows = height / cellSize;
  const layout = detectLayout(rows);

  if (!layout) {
    return {
      ok: false,
      error: `图片有 ${rows} 行，但只支持 4 行或 5 行。4 行 = 每行一个动作；5 行 = 待机占前两行（8 帧）。`,
    };
  }

  if (cellSize < MIN_CELL || cellSize > MAX_CELL) {
    return {
      ok: false,
      error: `每格是 ${cellSize}×${cellSize}，超出允许范围（${MIN_CELL}–${MAX_CELL}）。建议用 128×128。`,
    };
  }

  const bitmap = image.toBitmap();
  const cells = analyzeCells(bitmap, width, cellSize, rows);

  // 背景检查：如果几乎全不透明，说明没有透明背景
  const transparentRatio = 1 - cells.reduce((sum, c) => sum + c.opaqueRatio, 0) / cells.length;
  if (transparentRatio < 0.2) {
    return {
      ok: false,
      error: "图片几乎没有透明区域，看起来是不透明背景（比如白底）。导出时请勾选「透明背景 / Alpha 通道」。",
    };
  }

  // 必需动作的首帧必须有内容
  for (const item of requiredStartFrames(layout)) {
    if (cells[item.index] && cells[item.index].opaqueRatio < 0.03) {
      return {
        ok: false,
        error: `第 ${item.index} 格（${item.label}）是空的，但它是必需动作的起始帧。`,
      };
    }
  }

  // 非致命提醒：4 行布局下，拖拽/睡觉只用前 2 格，后两格若有内容不会播
  const warnings: string[] = [];
  if (layout === "4-row") {
    const unusedPairs: Array<{ indexes: number[]; label: string }> = [
      { indexes: [10, 11], label: "拖拽" },
      { indexes: [14, 15], label: "睡觉" },
    ];
    for (const pair of unusedPairs) {
      const hasContent = pair.indexes.some((i) => cells[i].opaqueRatio > 0.03);
      if (hasContent) {
        warnings.push(
          `第 ${pair.indexes.join("、")} 格有内容，但 4 行布局只用每行前 2 格（${pair.label}）。用 5 行布局才能播到剩余帧。`,
        );
      }
    }
  }

  const pack: PetPack = {
    id: idName,
    name: displayName,
    sprite: {
      image: "sprite.png",
      frameWidth: cellSize,
      frameHeight: cellSize,
      columns: COLUMNS,
      rows,
    },
    animations: buildAnimations(layout) as Record<AnimationName, PetPack["animations"][AnimationName]>,
    lines,
  };

  return { ok: true, pack, sprite: image.toPNG(), warnings };
}
/**
 * L2：导入单张立绘，程序自动生成动作。
 *
 * 要求比 L3 宽松得多——用户随手一张图就能用：
 * - 接近正方形（比例 0.7–1.4）
 * - 边长 128–1024
 * - 有透明背景
 */
const L2_STATIC_ANIMATIONS: PetPack["animations"] = {
  idle: { frames: [0], fps: 1, loop: true },
  click: { frames: [0], fps: 1, loop: false },
  drag: { frames: [0], fps: 1, loop: true },
  sleep: { frames: [0], fps: 1, loop: true },
};

export function importSingleImage(
  filePath: string,
  idName: string,
  displayName: string,
  lines: PetPack["lines"],
): ImportResult {
  const image = nativeImage.createFromPath(filePath);
  if (image.isEmpty()) {
    return { ok: false, error: "这个文件读不出来。请确认它是 PNG 图片。" };
  }

  const { width, height } = image.getSize();
  const ratio = width / height;

  if (ratio < 0.7 || ratio > 1.4) {
    return {
      ok: false,
      error: `立绘应该接近正方形，你这张是 ${width}×${height}。横躺或竖长的人物放进去会被拉伸。`,
    };
  }

  const side = Math.min(width, height);
  if (side < 128) {
    return { ok: false, error: `图片太小了（${width}×${height}），边长至少 128。` };
  }
  if (side > 1024) {
    return { ok: false, error: `图片太大了（${width}×${height}），边长最多 1024。` };
  }

  const bitmap = image.toBitmap();
  let transparent = 0;
  let total = 0;
  for (let y = 0; y < height; y += 8) {
    for (let x = 0; x < width; x += 8) {
      const alpha = bitmap[(y * width + x) * 4 + 3];
      total += 1;
      if (alpha < 200) transparent += 1;
    }
  }
  if (transparent / total < 0.15) {
    return {
      ok: false,
      error: "图片几乎没有透明区域，看起来是白底或实心背景。请导出带 Alpha 通道的 PNG。",
    };
  }

  const pack: PetPack = {
    id: idName,
    name: displayName,
    sprite: {
      image: "sprite.png",
      frameWidth: width,
      frameHeight: height,
      columns: 1,
      rows: 1,
    },
    animations: L2_STATIC_ANIMATIONS,
    lines,
  };

  return { ok: true, pack, sprite: image.toPNG(), warnings: [] };
}