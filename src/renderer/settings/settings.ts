import type { Settings } from "../../shared/types";
import type { PetListItem, PersonalityInfo, SettingsApi, SystemInfo } from "../../shared/settings-api";

declare global {
  interface Window {
    api: SettingsApi;
  }
}

type Page = "pets" | "personality" | "sound" | "chat" | "system" | "about";

let settings: Settings;
let pets: PetListItem[] = [];
let personalities: PersonalityInfo[] = [];
let systemInfo: SystemInfo | null = null;
let currentPage: Page = "pets";

const content = document.getElementById("content") as HTMLElement;
const navVersion = document.getElementById("nav-version") as HTMLElement;

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[ch];
  });
}

const PERSONALITY_NAMES: Record<string, string> = {
  shy: "害羞",
  cheerful: "开朗",
  tsundere: "傲娇",
};

const PERSONALITY_DESC: Record<string, string> = {
  shy: "小声、容易脸红，被戳到会害羞",
  cheerful: "热情话多，最喜欢一起摸鱼",
  tsundere: "嘴硬心软，明明在意却装作无所谓",
};

async function refresh(): Promise<void> {
  [settings, pets, personalities] = await Promise.all([
    window.api.getSettings(),
    window.api.listPets(),
    window.api.getPersonalities(),
  ]);
}

function row(label: string, controlHtml: string, hint = ""): string {
  return `
    <div class="row">
      <div>
        <div class="label">${esc(label)}</div>
        ${hint ? `<div class="hint">${esc(hint)}</div>` : ""}
      </div>
      <div class="control">${controlHtml}</div>
    </div>`;
}

function toggle(key: "muted" | "dnd" | "autoStart", on: boolean): string {
  return `<button class="switch ${on ? "on" : ""}" data-action="toggle" data-key="${key}" aria-pressed="${on}"></button>`;
}

/* ---------------- 各页面 ---------------- */

function pagePets(): string {
  const cards = pets.length
    ? `<div class="pet-grid">${pets
        .map(
          (pet) => `
        <div class="pet-card ${pet.active ? "active" : ""}" data-pet="${esc(pet.id)}">
          <span class="badge">${pet.kind === "l2" ? "单图" : "多帧"}</span>
          ${pet.thumb ? `<img src="${pet.thumb}" alt="" />` : `<div style="width:72px;height:72px"></div>`}
          <div class="name" title="${esc(pet.name)}">${esc(pet.name)}</div>
          <div class="actions">
            <button class="btn small" data-action="use-pet" data-id="${esc(pet.id)}">使用</button>
            <button class="btn small" data-action="rename-pet" data-id="${esc(pet.id)}">改名</button>
            <button class="btn small danger" data-action="remove-pet" data-id="${esc(pet.id)}">删除</button>
          </div>
        </div>`,
        )
        .join("")}</div>`
    : `<div class="empty">还没有导入自己的角色<br />点下面的按钮试试</div>`;

  return `
    <h2>角色</h2>
    <p class="sub">用你自己的图片做一只专属桌宠。图片只在本地处理，不会上传。</p>

    <div class="group">
      <div class="group-title">我的角色</div>
      ${cards}
    </div>

    <div class="group">
      <div class="group-title">导入新角色</div>
      ${row(
        "导入立绘（单张）",
        `<button class="btn primary" data-action="import-l2">选择图片…</button>`,
        "一张透明背景的 PNG，程序自动做呼吸、点击弹跳、拖拽摆动",
      )}
      ${row(
        "导入雪碧图（多帧）",
        `<button class="btn" data-action="import-l3">选择图片…</button>`,
        "4 列 × 4/5 行，每格 128px，待机/点击/拖拽/睡觉",
      )}
    </div>`;
}

function pagePersonality(): string {
  const activeId = settings.activePetId ? "" : settings.personality;
  const cards = personalities
    .map(
      (p) => `
      <button class="pet-card ${activeId === p.id ? "active" : ""}" data-action="use-builtin" data-id="${p.id}"
        style="cursor:pointer;text-align:center">
        <div class="name" style="font-size:14px;font-weight:600">${esc(PERSONALITY_NAMES[p.id] ?? p.label)}</div>
        <div class="hint" style="font-size:12px;color:#a99a9e">${esc(PERSONALITY_DESC[p.id] ?? "")}</div>
      </button>`,
    )
    .join("");

  return `
    <h2>性格</h2>
    <p class="sub">换性格会同时换掉形象、台词和音色。</p>
    <div class="group">
      <div class="group-title">内置角色</div>
      <div class="pet-grid">${cards}</div>
      ${settings.activePetId ? `<p class="sub" style="margin-top:12px">当前使用的是自定义角色，选择上面任意一个即可换回内置角色。</p>` : ""}
    </div>`;
}

function pageSound(): string {
  const percent = Math.round(settings.volume * 100);
  return `
    <h2>声音</h2>
    <p class="sub">默认静音关闭；勿扰模式下不出声也不冒台词。</p>

    <div class="row">
      <div>
        <div class="label">音量</div>
        <div class="hint">点击、拖拽、切换角色时的音效响度</div>
      </div>
      <div class="control">
        <input type="range" min="0" max="100" step="5" value="${percent}" data-action="volume" />
        <span class="volume-value" id="volume-value">${percent}%</span>
      </div>
    </div>

    ${row("静音", toggle("muted", settings.muted), "关掉一切音效")}
    ${row("勿扰模式", toggle("dnd", settings.dnd), "不冒台词、不出声，动画照常")}
  `;
}

function pageChat(): string {
  return `
    <h2>聊天</h2>
    <p class="sub">可选功能：自带 DeepSeek API Key，让桌宠能接你的话。</p>
    <div class="placeholder">
      📝 开发中<br /><br />
      计划支持：填入自己的 API Key（加密保存在本地）、可开关的聊天入口、
      断网或失败时自动回落到内置台词库。<br /><br />
      <strong>不填也能用</strong>：桌宠会继续说内置台词，功能完全不受影响。
    </div>`;
}

async function pageSystem(): Promise<string> {
  if (!systemInfo) systemInfo = await window.api.getSystemInfo();

  return `
    <h2>系统</h2>
    <p class="sub">启动方式、资源占用和数据位置。</p>

    <div class="group">
      <div class="group-title">启动</div>
      ${row("开机自启", toggle("autoStart", settings.autoStart), "登录 Windows 后自动启动芯宠")}
    </div>

    <div class="group">
      <div class="group-title">资源占用</div>
      ${row("CPU", `<span class="mono">${systemInfo.cpuPercent}%</span>`, "占单核百分比")}
      ${row("内存", `<span class="mono">${systemInfo.memoryMB} MB</span>`, `共 ${systemInfo.processes} 个进程`)}
    </div>

    <div class="group">
      <div class="group-title">数据</div>
      ${row(
        "配置与角色目录",
        `<button class="btn small" data-action="open-userdata">打开</button>`,
        systemInfo.userDataPath,
      )}
      ${row("运行日志", `<button class="btn small" data-action="open-log">打开</button>`, "反馈问题时请附上最后几行")}
    </div>

    <div class="group">
      <div class="group-title">危险操作</div>
      ${row(
        "恢复默认设置",
        `<button class="btn small danger" data-action="reset">重置</button>`,
        "会清除音量、性格、自启等设置，不会删除导入的角色",
      )}
    </div>`;
}

function pageAbout(): string {
  return `
    <h2>关于</h2>
    <p class="sub">芯宠 —— 轻量化桌面情感陪伴小伙伴</p>

    <div class="about-card">
      <h3>芯宠 XinChong</h3>
      <div style="color:#9a8a8e;font-size:13px">一个会待在桌面角落的小家伙</div>
      <div class="kv">
        <span class="k">版本</span><span>v${esc(systemInfo?.version ?? "—")}</span>
        <span class="k">Electron</span><span>${esc(systemInfo?.electron ?? "—")}</span>
        <span class="k">角色美术</span><span>感谢美术同学的三套角色</span>
        <span class="k">项目性质</span><span>集美大学《人机交互与设计心理学》课程项目</span>
      </div>
    </div>

    <div class="group" style="margin-top:20px">
      <div class="group-title">隐私</div>
      <div class="placeholder">
        你导入的所有图片、设置、角色数据都只保存在本机（<span class="mono">%APPDATA%\\xinchong</span>），
        不会上传到任何服务器。
      </div>
    </div>`;
}

/* ---------------- 渲染与事件 ---------------- */

const renderers: Record<Page, () => string | Promise<string>> = {
  pets: pagePets,
  personality: pagePersonality,
  sound: pageSound,
  chat: pageChat,
  system: pageSystem,
  about: pageAbout,
};

async function render(page: Page): Promise<void> {
  currentPage = page;
  for (const btn of document.querySelectorAll<HTMLElement>("#nav .nav-item")) {
    btn.classList.toggle("active", btn.dataset.page === page);
  }
  content.innerHTML = await renderers[page]();
}

async function reload(): Promise<void> {
  await refresh();
  await render(currentPage);
}

function bindEvents(): void {
  document.getElementById("nav")?.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>(".nav-item");
    if (!target?.dataset.page) return;
    void render(target.dataset.page as Page);
  });

  content.addEventListener("click", (event) => {
    const el = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    const id = el.dataset.id ?? "";

    if (action === "toggle") {
      const key = el.dataset.key as "muted" | "dnd" | "autoStart";
      const next = !settings[key];
      void window.api.patchSettings({ [key]: next }).then((s) => {
        settings = s;
        el.classList.toggle("on", next);
        el.setAttribute("aria-pressed", String(next));
      });
    }

    if (action === "use-pet") {
      void window.api.usePet(id).then((ok) => {
        if (ok) void reload();
      });
    }

    if (action === "use-builtin") {
      void window.api.useBuiltin(id).then((ok) => {
        if (ok) void reload();
      });
    }

    if (action === "remove-pet") {
      void window.api
        .confirm(`删除角色「${id}」？`, "文件会从本机删除，无法恢复。")
        .then((yes) => (yes ? window.api.removePet(id) : false))
        .then((removed) => {
          if (removed) void reload();
        });
    }

    if (action === "rename-pet") {
      startRename(id);
    }

    if (action === "import-l2" || action === "import-l3") {
      const mode = action === "import-l2" ? "l2" : "l3";
      void window.api.importPet(mode).then(() => reload());
    }

    if (action === "open-userdata") void window.api.openUserData();
    if (action === "open-log") void window.api.openLogFolder();

    if (action === "reset") {
      void window.api
        .confirm("恢复默认设置？", "音量、性格、自启会回到初始值，导入的角色不受影响。")
        .then((yes) => (yes ? window.api.resetSettings() : null))
        .then((s) => {
          if (s) void reload();
        });
    }
  });

  content.addEventListener("input", (event) => {
    const el = event.target as HTMLInputElement;
    if (el.dataset.action !== "volume") return;
    const percent = Number(el.value);
    const label = document.getElementById("volume-value");
    if (label) label.textContent = `${percent}%`;
    void window.api.patchSettings({ volume: percent / 100 });
  });
}

/** 就地改名：把名字换成输入框 */
function startRename(id: string): void {
  const card = content.querySelector<HTMLElement>(`[data-pet="${id}"]`);
  const nameEl = card?.querySelector<HTMLElement>(".name");
  if (!card || !nameEl) return;

  const input = document.createElement("input");
  input.value = nameEl.textContent ?? "";
  input.maxLength = 24;
  input.style.cssText =
    "width:100%;font-size:13px;padding:3px 6px;border:1px solid #ef7d97;border-radius:6px;outline:none";
  nameEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = (): void => {
    const value = input.value.trim();
    if (!value) {
      void reload();
      return;
    }
    void window.api.renamePet(id, value).then(() => reload());
  };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") commit();
    if (event.key === "Escape") void reload();
  });
  input.addEventListener("blur", commit);
}

async function main(): Promise<void> {
  bindEvents();
  await refresh();
  systemInfo = await window.api.getSystemInfo();
  navVersion.textContent = systemInfo.version;
  await render("pets");
  console.log("[settings] ready");
}

void main();
