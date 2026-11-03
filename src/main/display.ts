import type { BrowserWindow } from "electron";
import { screen } from "electron";
import { clampToVisibleArea } from "./window";

/**
 * 监听显示器变化（插拔、分辨率、缩放调整），把窗口拉回可见区域。
 * 这是 P0-3 的核心：多显示器与 DPI 场景下不让宠物跑丢。
 */
export function watchDisplays(win: BrowserWindow): () => void {
  const handler = (): void => {
    if (win.isDestroyed()) return;
    console.log(`[display] changed → ${describeDisplays()}`);
    clampToVisibleArea(win);
  };

  screen.on("display-added", handler);
  screen.on("display-removed", handler);
  screen.on("display-metrics-changed", handler);

  return () => {
    screen.off("display-added", handler);
    screen.off("display-removed", handler);
    screen.off("display-metrics-changed", handler);
  };
}

/** 打印当前所有显示器的尺寸与缩放，便于排查 DPI 问题 */
export function describeDisplays(): string {
  return screen
    .getAllDisplays()
    .map((d) => {
      const { x, y, width, height } = d.bounds;
      return `#${d.id} ${width}x${height}@(${x},${y}) scale=${d.scaleFactor}x`;
    })
    .join(" | ");
}
