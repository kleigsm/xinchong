import type { AnimationName, AnimationSpec } from "../shared/pet-pack";

/**
 * 雪碧图的两种布局。
 *
 * v1（4 行）：每行一个动作，后两行只用前 2 格
 *   idle 0-3 / click 4-7 / drag 8,9 / sleep 12,13
 *
 * v1.1（5 行）：待机给 8 帧（两行），其余动作各 4 帧
 *   idle 0-7 / click 8-11 / drag 12-15 / sleep 16-19
 *
 * 美术实际交付的是 5 行版本，两种都支持。
 */

export type SheetLayout = "4-row" | "5-row";

export function detectLayout(rows: number): SheetLayout | null {
  if (rows === 4) return "4-row";
  if (rows === 5) return "5-row";
  return null;
}

export function buildAnimations(layout: SheetLayout): Record<AnimationName, AnimationSpec> {
  if (layout === "5-row") {
    return {
      idle: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 8, loop: true },
      click: { frames: [8, 9, 10, 11], fps: 12, loop: false },
      drag: { frames: [12, 13, 14, 15], fps: 6, loop: true },
      sleep: { frames: [16, 17, 18, 19], fps: 2, loop: true },
    };
  }

  return {
    idle: { frames: [0, 1, 2, 3], fps: 8, loop: true },
    click: { frames: [4, 5, 6, 7], fps: 12, loop: false },
    drag: { frames: [8, 9], fps: 6, loop: true },
    sleep: { frames: [12, 13], fps: 2, loop: true },
  };
}

/** 每个动作的起始帧，用于校验「必需动作的首帧不能是空的」 */
export function requiredStartFrames(layout: SheetLayout): Array<{ index: number; label: string }> {
  const map = buildAnimations(layout);
  return [
    { index: map.idle.frames[0], label: "待机（第 1 行第 1 格）" },
    { index: map.click.frames[0], label: "点击（第 3 行第 1 格）" },
    { index: map.drag.frames[0], label: "拖拽（第 4 行第 1 格）" },
    { index: map.sleep.frames[0], label: "睡觉（第 5 行第 1 格）" },
  ];
}
