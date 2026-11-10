/**
 * 通用动作小特效：click / pat / angry。
 *
 * 只用 DOM + CSS transform/opacity，不碰 Canvas、filter、逐帧重绘。
 * 每次触发最多 3 个节点，animationend 自动移除。
 */

type FxKind = "click" | "pat" | "angry";

const CHARS: Record<FxKind, string> = {
  click: "✦",
  pat: "♥",
  angry: "💢",
};

const BASE_MS: Record<FxKind, number> = {
  click: 380,
  pat: 650,
  angry: 480,
};

interface Particle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  rot: number;
  size: number;
  delay: number;
}

function particles(kind: FxKind, width: number, height: number): Particle[] {
  if (kind === "click") {
    return [0, 1, 2].map((i) => ({
      x: width * (0.32 + i * 0.18),
      y: height * (0.42 + (i % 2) * 0.08),
      dx: (i - 1) * 26,
      dy: -34 - (i % 2) * 10,
      rot: (i - 1) * 45,
      size: 13 + (i % 2) * 3,
      delay: i * 30,
    }));
  }
  if (kind === "pat") {
    return [0, 1].map((i) => ({
      x: width * (0.42 + i * 0.16),
      y: height * 0.22,
      dx: (i - 0.5) * 26,
      dy: -62,
      rot: (i - 0.5) * 18,
      size: 17 + i * 3,
      delay: i * 90,
    }));
  }
  return [
    {
      x: width * 0.76,
      y: height * 0.16,
      dx: 6,
      dy: -10,
      rot: 8,
      size: 22,
      delay: 0,
    },
  ];
}

export function playFx(
  layer: HTMLElement,
  petEl: HTMLElement,
  kind: FxKind,
  speed = 1,
): void {
  const petRect = petEl.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();
  const ox = petRect.left - layerRect.left;
  const oy = petRect.top - layerRect.top;
  const duration = BASE_MS[kind] / Math.max(0.5, Math.min(2, speed));

  for (const p of particles(kind, petRect.width, petRect.height)) {
    const el = document.createElement("span");
    el.className = `fx fx-${kind}`;
    el.textContent = CHARS[kind];
    el.style.left = `${ox + p.x}px`;
    el.style.top = `${oy + p.y}px`;
    el.style.fontSize = `${p.size}px`;
    el.style.animationDuration = `${Math.round(duration)}ms`;
    el.style.animationDelay = `${p.delay}ms`;
    el.style.setProperty("--fx-dx", `${p.dx}px`);
    el.style.setProperty("--fx-dy", `${p.dy}px`);
    el.style.setProperty("--fx-rot", `${p.rot}deg`);
    el.addEventListener("animationend", () => el.remove(), { once: true });
    layer.appendChild(el);
    // 兜底：animationend 被合成器跳过时也清掉
    window.setTimeout(() => el.remove(), duration + p.delay + 200);
  }
}
