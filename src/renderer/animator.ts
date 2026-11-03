import { ANIMATION_FPS } from "../shared/constants";

/**
 * 呼吸动画。
 *
 * P0-1 实测：CSS 关键帧（60fps）会让空闲 CPU 吃掉 25.5% 单核；
 * 改为 12fps 的 JS 驱动后应显著下降。
 * 页面不可见时直接跳过计算。
 */
export function startBreathing(element: HTMLElement): () => void {
  const periodMs = 3000;
  const amplitude = 0.02;
  const frameInterval = 1000 / ANIMATION_FPS;

  const timer = window.setInterval(() => {
    if (document.hidden) return;
    const phase = (performance.now() % periodMs) / periodMs;
    const scale = 1 + amplitude * Math.sin(phase * Math.PI * 2);
    element.style.transform = `scale(${scale.toFixed(4)})`;
  }, frameInterval);

  return () => window.clearInterval(timer);
}
