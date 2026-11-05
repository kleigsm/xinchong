import type { AnimationName, AnimationSpec } from "../shared/pet-pack";

/**
 * 雪碧图的三种布局。
 *
 * v1（4 行）：每行一个动作，后两行只用前 2 格
 *   idle 0-3 / click 4-7 / drag 8,9 / sleep 12,13
 *
 * v1.1（5 行）：待机给 8 帧（两行），其余动作各 4 帧
 *   idle 0-7 / click 8-11 / drag 12-15 / sleep 16-19
 *
 * v2（9 行）：在 5 行基础上追加四个性格动作
 *   idle 0-7 / click 8-11 / drag 12-15 / sleep 16-19
 *   wave 20-23 / stretch 24-27 / pat 28-31 / angry 32-35
 */

export type SheetLayout = "4-row" | "5-row" | "9-row";

export function detectLayout(rows: number): SheetLayout | null {
  if (rows === 4) return "4-row";
  if (rows === 5) return "5-row";
  if (rows === 9) return "9-row";
  return null;
}

export function buildAnimations(layout: SheetLayout): Partial<Record<AnimationName, AnimationSpec>> {
  if (layout === "9-row") {
    return {
      idle: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 4, loop: true },
      click: { frames: [8, 9, 10, 11], fps: 5, loop: false },
      drag: { frames: [12, 13, 14, 15], fps: 4, loop: true },
      sleep: { frames: [16, 17, 18, 19], fps: 1.5, loop: true },
      wave: { frames: [20, 21, 22, 23], fps: 6, loop: false },
      stretch: { frames: [24, 25, 26, 27], fps: 4, loop: false },
      pat: { frames: [28, 29, 30, 31], fps: 6, loop: false },
      angry: { frames: [32, 33, 34, 35], fps: 8, loop: false },
    };
  }

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
  const core = [
    { index: map.idle?.frames[0] ?? 0, label: "待机（第 1 行第 1 格）" },
    { index: map.click?.frames[0] ?? 0, label: "点击（第 3 行第 1 格）" },
    { index: map.drag?.frames[0] ?? 0, label: "拖拽（第 4 行第 1 格）" },
    { index: map.sleep?.frames[0] ?? 0, label: "睡觉（第 5 行第 1 格）" },
  ];
  if (layout !== "9-row") return core;

  return [
    ...core,
    { index: map.wave?.frames[0] ?? 0, label: "招手（第 6 行第 1 格）" },
    { index: map.stretch?.frames[0] ?? 0, label: "伸懒腰（第 7 行第 1 格）" },
    { index: map.pat?.frames[0] ?? 0, label: "摸头（第 8 行第 1 格）" },
    { index: map.angry?.frames[0] ?? 0, label: "生气（第 9 行第 1 格）" },
  ];
}
