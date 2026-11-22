import type { QuickPanelApi, QuickPanelState, Settings } from "../../shared/types";

declare global {
  interface Window {
    quickPanel: QuickPanelApi;
  }
}

const el = {
  name: document.getElementById("name") as HTMLElement,
  status: document.getElementById("status") as HTMLElement,
  dot: document.getElementById("dot") as HTMLElement,
  personality: document.getElementById("personality") as HTMLElement,
  volume: document.getElementById("volume") as HTMLInputElement,
  volumeValue: document.getElementById("volume-value") as HTMLElement,
  mute: document.getElementById("mute") as HTMLButtonElement,
  dnd: document.getElementById("dnd") as HTMLButtonElement,
};

let state: QuickPanelState;
let settings: Settings;

const PERSONALITY_NAME: Record<string, string> = {
  shy: "害羞",
  cheerful: "开朗",
  tsundere: "傲娇",
};

function renderPersonality(): void {
  el.personality.innerHTML = "";
  for (const p of state.personalities) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = p.label;
    btn.className = settings.personality === p.id && !settings.activePetId ? "active" : "";
    btn.addEventListener("click", () => {
      void window.quickPanel.setPersonality(p.id);
    });
    el.personality.appendChild(btn);
  }
}

function renderStatus(): void {
  const badge = settings.activePetId
    ? "自定义角色"
    : PERSONALITY_NAME[settings.personality] ?? "使用中";
  const flags = [settings.muted ? "静音" : "", settings.dnd ? "勿扰" : ""].filter(Boolean);
  el.status.textContent = flags.length ? `${badge} · ${flags.join(" · ")}` : badge;
  el.dot.classList.toggle("muted", settings.muted || settings.dnd);
  el.name.textContent = settings.activePetId ? "我的角色" : "小芯";
}

function renderControls(): void {
  const percent = Math.round(settings.volume * 100);
  el.volume.value = String(percent);
  el.volumeValue.textContent = `${percent}%`;
  el.mute.setAttribute("aria-pressed", String(settings.muted));
  el.dnd.setAttribute("aria-pressed", String(settings.dnd));
}

/** 统一走一次 patch，并把返回的设置合并回本地 */
async function patch(patch: Partial<Settings>): Promise<void> {
  settings = await window.quickPanel.patchSettings(patch);
  renderStatus();
  renderControls();
}

function bind(): void {
  document.querySelectorAll<HTMLButtonElement>(".tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      const action = tile.dataset.action as "wave" | "pat" | "stretch" | "hide";
      window.quickPanel.action(action);
    });
  });

  el.volume.addEventListener("input", () => {
    const percent = Number(el.volume.value);
    el.volumeValue.textContent = `${percent}%`;
    void patch({ volume: percent / 100 });
  });

  el.mute.addEventListener("click", () => {
    void patch({ muted: !settings.muted });
  });

  el.dnd.addEventListener("click", () => {
    void patch({ dnd: !settings.dnd });
  });

  document.getElementById("open-settings")?.addEventListener("click", () => {
    window.quickPanel.openSettings();
  });

  document.getElementById("quit")?.addEventListener("click", () => {
    window.quickPanel.quit();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      window.quickPanel.close();
    }
  });

  // 面板被隐藏时（失焦关闭）什么都不用清，下次打开会重新拉状态
  window.addEventListener("focus", () => {
    void refresh();
  });
}

async function refresh(): Promise<void> {
  state = await window.quickPanel.getState();
  settings = state.settings;
  renderPersonality();
  renderStatus();
  renderControls();
}

void refresh();
bind();
console.log("[quick-panel] ready");
