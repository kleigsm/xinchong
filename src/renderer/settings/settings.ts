import type { Settings } from "../../shared/types";
import type { PetListItem, PersonalityInfo, SettingsApi, SystemInfo } from "../../shared/settings-api";
import { SOUND_THEMES } from "../../shared/sound-themes";
import type { PrivacyClearTarget } from "../../shared/privacy";
import { formatBytes, networkStatus } from "../../shared/privacy";

declare global {
  interface Window {
    api: SettingsApi;
  }
}

type Page =
  | "pets"
  | "personality"
  | "appearance"
  | "sound"
  | "behavior"
  | "chat"
  | "system"
  | "privacy"
  | "help"
  | "about";

let settings: Settings;
let pets: PetListItem[] = [];
let personalities: PersonalityInfo[] = [];
let systemInfo: SystemInfo | null = null;
let currentPage: Page = "pets";

const content = document.getElementById("content") as HTMLElement;
const navVersion = document.getElementById("nav-version") as HTMLElement;

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

const SLEEP_OPTIONS: Array<{ label: string; value: number }> = [
  { label: "30 秒", value: 30_000 },
  { label: "1 分钟", value: 60_000 },
  { label: "5 分钟", value: 300_000 },
  { label: "不睡", value: 0 },
];

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

function setChatResult(text: string, ok: boolean): void {
  const el = document.getElementById("chat-result");
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? "#3f8f5f" : "#c4342a";
}

async function refresh(): Promise<void> {
  [settings, pets, personalities] = await Promise.all([
    window.api.getSettings(),
    window.api.listPets(),
    window.api.getPersonalities(),
  ]);
}

/* ---------------- 组件 ---------------- */

function card(title: string, icon: string, body: string): string {
  return `
    <section class="card">
      <div class="card-title"><span class="icon">${icon}</span>${esc(title)}</div>
      ${body}
    </section>`;
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

function toggle(key: keyof Settings, on: boolean): string {
  return `<button class="switch ${on ? "on" : ""}" data-action="toggle" data-key="${String(key)}" aria-pressed="${on}"></button>`;
}

function segmented(
  key: keyof Settings,
  options: Array<{ label: string; value: string | number }>,
  current: string | number,
): string {
  const items = options
    .map(
      (opt) =>
        `<button data-action="segment" data-key="${String(key)}" data-value="${opt.value}"
           class="${opt.value === current ? "active" : ""}">${esc(opt.label)}</button>`,
    )
    .join("");
  return `<div class="segmented">${items}</div>`;
}

/* ---------------- 页面 ---------------- */

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
    : `<div class="empty">还没有导入自己的角色<br />用一张画就能做出一只专属桌宠</div>`;

  return `
    <h2 class="page-title">角色</h2>
    <p class="page-sub">图片只在本地处理，不会上传。</p>

    ${card("我的角色", "★", cards)}

    ${card(
      "导入新角色",
      "＋",
      row(
        "导入立绘（单张）",
        `<button class="btn primary" data-action="import-l2">选择图片…</button>`,
        "一张透明背景的 PNG，自动生成呼吸、弹跳、摆动",
      ) +
        row(
          "导入雪碧图（多帧）",
          `<button class="btn" data-action="import-l3">选择图片…</button>`,
          "4 列，4 / 5 / 9 行，每格 128px",
        ) +
        row(
          "素材包模板",
          `<button class="btn" data-action="export-template">下载模板…</button>`,
          "含示例图、配置示例和绘制说明",
        ),
    )}`;
}

function pagePersonality(): string {
  const activeId = settings.activePetId ? "" : settings.personality;
  const cards = personalities
    .map(
      (p) => `
      <button class="pet-card ${activeId === p.id ? "active" : ""}" data-action="use-builtin" data-id="${p.id}"
        style="cursor:pointer;text-align:center">
        <div class="name" style="font-size:14px;font-weight:600">${esc(PERSONALITY_NAMES[p.id] ?? p.label)}</div>
        <div class="hint" style="font-size:12px;color:#8a8a90;white-space:normal">${esc(PERSONALITY_DESC[p.id] ?? "")}</div>
      </button>`,
    )
    .join("");

  return `
    <h2 class="page-title">性格</h2>
    <p class="page-sub">换性格会同时换掉形象、台词和音色。</p>
    ${card("内置角色", "☺", `<div class="pet-grid">${cards}</div>`)}
    ${
      settings.activePetId
        ? `<p class="page-sub">当前使用的是自定义角色，选上面任意一个即可换回内置角色。</p>`
        : ""
    }`;
}

const SPEED_OPTIONS: Array<{ label: string; value: number }> = [
  { label: "0.5×", value: 0.5 },
  { label: "1×", value: 1 },
  { label: "2×", value: 2 },
];

function pageAppearance(): string {
  const percent = Math.round((settings.petOpacity ?? 1) * 100);
  const speed = SPEED_OPTIONS.some((o) => o.value === settings.animationSpeed)
    ? settings.animationSpeed
    : 1;

  const opacityRow = `
    <div class="row">
      <div>
        <div class="label">透明度</div>
        <div class="hint">调低会变淡，但不会消失；最低 50%</div>
      </div>
      <div class="control">
        <input type="range" min="50" max="100" step="5" value="${percent}" data-action="opacity" />
        <span class="range-value" id="opacity-value">${percent}%</span>
      </div>
    </div>`;

  return `
    <h2 class="page-title">外观</h2>
    <p class="page-sub">让它淡一点、快一点，或者不再挡在所有窗口前面。</p>

    ${card(
      "显示",
      "◐",
      opacityRow +
        row(
          "动画速度",
          segmented("animationSpeed", SPEED_OPTIONS, speed),
          "0.5× 更安静，2× 更活泼；速度越高 CPU 占用越高",
        ) +
        row(
          "始终置顶",
          toggle("alwaysOnTop", settings.alwaysOnTop),
          "关掉后其它窗口会盖住它；这是预期行为，随时可以再打开",
        ),
    )}

    ${card(
      "摸头手掌",
      "✋",
      row(
        "手掌样式",
        segmented(
          "patHand",
          [
            { label: "写实手", value: "real" },
            { label: "卡通手", value: "cartoon" },
          ],
          settings.patHand,
        ),
        "只在摸头时出现，随手势一起下压",
      ),
    )}

    ${card(
      "说明",
      "?",
      `<div class="note">
        · <strong>透明度</strong>最低 50%：再淡的话，浅色桌面上就真的找不到它了。<br />
        · <strong>动画速度</strong>只影响动作播放快慢，点击响应不受影响。<br />
        · <strong>关闭置顶</strong>后，从托盘重新显示也不会再强制浮到最上面。
      </div>`,
    )}`;
}

function pageSound(): string {
  const percent = Math.round(settings.volume * 100);
  return `
    <h2 class="page-title">声音</h2>
    <p class="page-sub">默认静音关闭；勿扰模式下不出声也不冒台词。</p>

    ${card(
      "音量",
      "♪",
      `<div class="row">
         <div>
           <div class="label">音效音量</div>
           <div class="hint">点击、拖拽、动作时的响度</div>
         </div>
         <div class="control">
           <input type="range" min="0" max="100" step="5" value="${percent}" data-action="volume" />
           <span class="range-value" id="volume-value">${percent}%</span>
         </div>
       </div>`,
    )}

    ${card(
      "音效主题",
      "◇",
      row(
        "用哪套音效",
        `<div class="segmented">${SOUND_THEMES.map(
          (t) =>
            `<button data-action="segment-text" data-key="soundTheme" data-value="${t.id}"
               class="${settings.soundTheme === t.id ? "active" : ""}">${esc(t.label)}</button>`,
        ).join("")}</div>`,
        "「跟随性格」是三套角色的原生音色；其余是萌宠语音包，每种音效有 2 个变体随机播放",
      ),
    )}

    ${card(
      "安静模式",
      "☾",
      row("静音", toggle("muted", settings.muted), "关掉一切音效") +
        row("勿扰模式", toggle("dnd", settings.dnd), "不冒台词、不出声，动画照常"),
    )}`;
}

function pageBehavior(): string {
  const sleepValue = SLEEP_OPTIONS.some((o) => o.value === settings.idleToSleepMs)
    ? settings.idleToSleepMs
    : 30_000;

  return `
    <h2 class="page-title">行为</h2>
    <p class="page-sub">它什么时候睡、哪些手势生效。</p>

    ${card(
      "作息",
      "◷",
      `<div class="row">
         <div>
           <div class="label">多久没互动就睡觉</div>
           <div class="hint">睡着后点一下就醒，醒来会伸个懒腰</div>
         </div>
         <div class="control">${segmented("idleToSleepMs", SLEEP_OPTIONS, sleepValue)}</div>
       </div>`,
    )}

    ${card(
      "手势",
      "✋",
      row(
        "双击动作",
        segmented(
          "doubleClickAction",
          [
            { label: "招手", value: "wave" },
            { label: "摸头", value: "pat" },
          ],
          settings.doubleClickAction,
        ),
        "连点两下 → 挥手或摸头",
      ) +
        row("长按摸头", toggle("gesturePat", settings.gesturePat), "按住 1.2 秒 → 被摸头") +
        row("连点生气", toggle("gestureAngry", settings.gestureAngry), "1.2 秒内点三下 → 生气"),
    )}`;
}

async function pageChat(): Promise<string> {
  const status = await window.api.chatStatus();

  const keyBlock = status.hasKey
    ? `<div class="row">
         <div>
           <div class="label">已保存的 Key</div>
           <div class="hint">加密保存在本机，只有当前 Windows 账户能解开</div>
         </div>
         <div class="control">
           <span class="mono">${esc(status.masked ?? "")}</span>
           <button class="btn small" data-action="chat-test">测试连接</button>
           <button class="btn small danger" data-action="chat-clear">清除</button>
         </div>
       </div>`
    : `<div class="row">
         <div>
           <div class="label">DeepSeek API Key</div>
           <div class="hint">在 platform.deepseek.com 申请。留空就继续用内置台词</div>
         </div>
         <div class="control">
           <input type="password" id="chat-key-input" placeholder="sk-..."
             style="width:200px;padding:8px 11px;border:1px solid #ececef;border-radius:11px;outline:none;font-size:13px" />
           <button class="btn primary" data-action="chat-save">保存</button>
           <button class="btn" data-action="chat-test">测试</button>
         </div>
       </div>`;

  return `
    <h2 class="page-title">聊天</h2>
    <p class="page-sub">可选功能：自带 DeepSeek API Key，让桌宠能接你的话。</p>

    ${status.encryptionAvailable ? "" : `<div class="note warn">这台机器的系统加密不可用，Key 无法安全保存。</div>`}

    ${card("API Key", "◆", keyBlock + `<div id="chat-result"></div>`)}

    ${card(
      "隐私",
      "🔒",
      row(
        "完整隐私说明",
        `<button class="btn small" data-action="goto-privacy">打开隐私页</button>`,
        "Key 用 Windows DPAPI 加密保存在本机，不会上传；只有你主动说话时才连 api.deepseek.com",
      ),
    )}

    ${card(
      "怎么用",
      "？",
      `<div class="note">
        右键桌宠 → <strong>说句话…</strong> → 输入框会出现在它头顶。<br />
        回车发送，Esc 取消。失败或断网时会自动回落到内置台词。
      </div>`,
    )}`;
}


/** 一行「操作 → 效果」 */
function kvRow(label: string, value: string): string {
  return `
    <div class="row">
      <div class="label">${esc(label)}</div>
      <div class="control" style="color:#8a8a90;font-size:13px">${esc(value)}</div>
    </div>`;
}

function pageHelp(): string {
  return `
    <h2 class="page-title">怎么玩</h2>
    <p class="page-sub">它会的所有小动作，都是点一下、按一下就能发现的。</p>

    ${card(
      "基本交互",
      "✋",
      kvRow("单击", "说话 + 换表情") +
        kvRow("双击", "招手 / 摸头（可在设置里切换）") +
        kvRow("长按 1.2 秒", "被摸头，会脸红") +
        kvRow("1.2 秒内点三下", "生气，别戳太多") +
        kvRow("按住拖动", "拎起来，会喊「要掉下去了」"),
    )}

    ${card(
      "自己待着的时候",
      "◷",
      kvRow("一直没互动", "会睡着，闭眼打呼") +
        kvRow("睡着后点一下", "伸个懒腰醒来") +
        kvRow("深夜（22:00 后）", "偶尔会说夜里的话"),
    )}

    ${card(
      "右键菜单",
      "▤",
      kvRow("说句话…", "和它聊天（需先填 API Key）") +
        kvRow("我的角色", "切换 / 导入 / 删除自己导入的角色") +
        kvRow("性格", "换形象、换台词、换音色") +
        kvRow("动作", "手动播放招手 / 摸头 / 生气") +
        kvRow("设置…", "打开这个窗口"),
    )}

    ${card(
      "换个样子",
      "★",
      `<div class="note">
        在「角色」页里：<br />
        · <strong>导入立绘（单张）</strong>：一张透明背景的画，程序自动做呼吸和弹跳<br />
        · <strong>导入雪碧图（多帧）</strong>：自己画一整套动作<br />
        · <strong>素材包模板</strong>：下载一个能照着改的包<br /><br />
        图片只在本机处理，不会上传。
      </div>`,
    )}

    ${card(
      "觉得它太闹？",
      "☾",
      `<div class="note">
        三个地方都能让它安静下来：<br />
        · <strong>声音 → 静音</strong>：只关掉音效<br />
        · <strong>声音 → 勿扰模式</strong>：不出声也不冒台词，动画照常<br />
        · <strong>行为 → 多久没互动就睡觉 → 不睡</strong>：它就一直醒着（也可以调长时间）<br /><br />
        另外「行为」里可以关掉双击 / 长按 / 连点这些手势。
      </div>`,
    )}`;
}
/* ---------------- 隐私（P1-13）---------------- */

/** 数据项的相对路径：绝对路径在表头统一给一次，行内只给相对部分 */
function privacyPathLabel(relative: string): string {
  if (relative === ".") return "（Electron 自管的多个缓存目录）";
  return relative.replace(/\//g, "\\");
}

async function pagePrivacy(): Promise<string> {
  // 清单来自主进程的实时扫描，不是写死的文案：删完再打开，数字会真的变小
  const report = await window.api.privacyReport();
  const network = networkStatus(report.hasKey);

  const badges = `
    <div class="pbadges">
      <span class="pbadge">图片不上传</span>
      <span class="pbadge">聊天默认关闭</span>
      <span class="pbadge">无账号 / 无遥测</span>
      <span class="pbadge ${network.online ? "warn" : "safe"}">${network.online ? "可能出网" : "完全离线"}</span>
    </div>`;

  const inventory = report.items
    .map((item) => {
      const size = item.exists && item.bytes > 0 ? formatBytes(item.bytes) : "—";
      const canClear = item.clearable && item.exists;
      return `
        <div class="row">
          <div>
            <div class="label">${esc(item.label)}</div>
            <div class="hint">${esc(item.what)}</div>
            <div class="hint mono">${esc(privacyPathLabel(item.path))}</div>
          </div>
          <div class="control">
            <span class="size-tag">${size}</span>
            ${canClear ? `<button class="btn small danger" data-action="privacy-clear" data-target="${item.id}">清除</button>` : ""}
          </div>
        </div>`;
    })
    .join("");

  const sendList = [
    "你那句话（最多 200 字）",
    "当前性格设定（害羞 / 开朗 / 傲娇）",
    "最近 3 轮对话（只在内存里，不落盘）",
    "点「测试连接」时的一个 ping",
  ]
    .map((text) => `<li><span class="tick">✓</span>${esc(text)}</li>`)
    .join("");

  const noSendList = [
    "导入的立绘 / 雪碧图",
    "麦克风、摄像头、屏幕截图",
    "角色名、设置项、文件路径",
    "使用统计、崩溃上报、设备信息",
  ]
    .map((text) => `<li><span class="cross">✕</span>${esc(text)}</li>`)
    .join("");

  const clearAllButton = `
    <div class="privacy-actions">
      <button class="btn small danger" data-action="privacy-clear" data-target="all">清除全部并恢复出厂</button>
    </div>`;

  return `
    <h2 class="page-title">隐私</h2>
    <p class="page-sub">这一页回答三个问题：存了什么、什么时候会出网、怎么删掉。数字是刚刚扫出来的。</p>

    ${card(
      "一句话",
      "🔒",
      `<div class="note">
        芯宠没有账号、没有云同步、没有数据上报。图片、角色、设置只待在这台电脑上，
        聊天 Key 用 Windows 系统加密保存。<strong>整份代码开源</strong>，可以自己审计。
      </div>
      ${badges}
      <div class="privacy-net ${network.online ? "warn" : "safe"}">
        <strong>${esc(network.title)}</strong><br />${esc(network.detail)}
      </div>`,
    )}

    ${card(
      "本机数据清单",
      "▤",
      `<div class="privacy-total">
        <div>
          <div class="label">你的数据合计 ${formatBytes(report.totalBytes)}</div>
          <div class="hint mono">${esc(report.userDataPath)}</div>
        </div>
        <button class="btn small" data-action="open-userdata">打开目录</button>
      </div>
      ${inventory}
      <p class="privacy-foot">
        每一项都是刚刚从磁盘扫出来的，删完再看数字会变小。
      </p>`,
    )}

    ${card(
      "聊天时会发送什么",
      "◇",
      `<div class="privacy-cols">
        <div class="pcol">
          <div class="pcol-title">会发送（仅当你主动说话）</div>
          <ul>${sendList}</ul>
        </div>
        <div class="pcol">
          <div class="pcol-title">不会发送</div>
          <ul>${noSendList}</ul>
        </div>
      </div>
      <p class="privacy-foot">
        请求发给 <span class="mono">api.deepseek.com</span>（你自己配置的服务商），受它的隐私政策约束。
        不填 Key 就完全没有这条路径。
      </p>`,
    )}

    ${card(
      "运行日志",
      "◷",
      row(
        "记录运行日志",
        toggle("privacyLogs", report.logsEnabled),
        report.packaged
          ? "写在 main.log，排错用；关掉后不再增长（已写的要手动清）"
          : "开发版只输出到控制台、不写文件；这个开关对打包版生效",
      ),
    )}

    ${card(
      "清除数据",
      "⌫",
      `<div class="note">
        清单里每一项右侧的「清除」只删那一项；下面这个按钮会把聊天 Key、导入的角色、运行日志和所有设置一起清掉。
      </div>
      <div id="privacy-result" class="privacy-result"></div>
      ${clearAllButton}
      <p class="privacy-foot">
        「其它运行时文件」是 Electron 自己的缓存，运行中删不安全，所以这一页不碰它；
        想彻底清空，退出芯宠后直接删掉整个 <span class="mono">%APPDATA%\\xinchong</span> 目录即可。
      </p>`,
    )}

    ${card(
      "我们的承诺",
      "✦",
      `<ul class="promise-list">
        <li><strong>数据最小化</strong>：只留功能必需的东西，不要账号、手机号、设备指纹。</li>
        <li><strong>本地优先</strong>：图片只在内存里播放，从不离开这台电脑。</li>
        <li><strong>加密存储</strong>：聊天 Key 走 Windows DPAPI，只有当前 Windows 账户能解开。</li>
        <li><strong>可撤回</strong>：任何一项都能在上面删掉，不需要卸载重装。</li>
        <li><strong>可审计</strong>：出网点只有 <span class="mono">api.deepseek.com</span> 一处，源码在 GitHub 上。</li>
      </ul>`,
    )}`;
}

async function pageSystem(): Promise<string> {
  if (!systemInfo) systemInfo = await window.api.getSystemInfo();

  return `
    <h2 class="page-title">系统</h2>
    <p class="page-sub">启动方式、资源占用和数据位置。</p>

    ${card("启动", "⏻", row("开机自启", toggle("autoStart", settings.autoStart), "登录 Windows 后自动启动芯宠"))}

    ${card(
      "资源占用",
      "▤",
      row("CPU", `<span class="mono">${systemInfo.cpuPercent}%</span>`, "占单核百分比") +
        row("内存", `<span class="mono">${systemInfo.memoryMB} MB</span>`, `共 ${systemInfo.processes} 个进程`),
    )}

    ${card(
      "数据",
      "▤",
      row("配置与角色目录", `<button class="btn small" data-action="open-userdata">打开</button>`, systemInfo.userDataPath) +
        row("运行日志", `<button class="btn small" data-action="open-log">打开</button>`, "反馈问题时附上最后几行"),
    )}

    ${card(
      "危险操作",
      "!",
      row(
        "恢复默认设置",
        `<button class="btn small danger" data-action="reset">重置</button>`,
        "会清除外观、音量、性格、行为等设置，不删除导入的角色",
      ),
    )}`;
}

function pageAbout(): string {
  return `
    <h2 class="page-title">关于</h2>
    <p class="page-sub">芯宠 —— 轻量化桌面情感陪伴小伙伴</p>

    <div class="about-card">
      <h3>芯宠 XinChong</h3>
      <div style="color:#8a8a90;font-size:13px">一个会待在桌面角落的小家伙</div>
      <div class="kv">
        <span class="k">版本</span><span>v${esc(systemInfo?.version ?? "—")}</span>
        <span class="k">Electron</span><span>${esc(systemInfo?.electron ?? "—")}</span>
        <span class="k">角色美术</span><span>胡汇兴</span>
        <span class="k">项目性质</span><span>集美大学《人机交互与设计心理学》课程项目</span>
      </div>
    </div>

    ${card(
      "隐私",
      "🔒",
      `<div class="note">
        你导入的所有图片、设置、角色数据都只保存在本机（<span class="mono">%APPDATA%\\xinchong</span>），
        不会上传到任何服务器。
      </div>
      <div class="privacy-actions">
        <button class="btn small" data-action="goto-privacy">查看隐私设置</button>
      </div>`,
    )}`;
}

/* ---------------- 渲染与事件 ---------------- */

const renderers: Record<Page, () => string | Promise<string>> = {
  pets: pagePets,
  personality: pagePersonality,
  appearance: pageAppearance,
  sound: pageSound,
  behavior: pageBehavior,
  chat: pageChat,
  system: pageSystem,
  privacy: pagePrivacy,
  help: pageHelp,
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

/* ---------------- 隐私页的清除流程 ---------------- */

const CLEAR_LABELS: Record<string, string> = {
  settings: "设置",
  pets: "角色",
  "chat-key": "聊天 Key",
  logs: "运行日志",
  runtime: "运行时文件",
};

function setPrivacyResult(text: string, ok: boolean): void {
  const el = document.getElementById("privacy-result");
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? "#3f8f5f" : "#c4342a";
}

/**
 * 清除本机数据：先问一遍（全部清除问两遍），再让主进程删，最后重新扫描。
 * 「删完数字会变小」是这一页的核心承诺，所以 clear 之后必须 reload，让用户看到结果。
 */
async function clearPrivacy(target: PrivacyClearTarget): Promise<void> {
  const messages: Record<PrivacyClearTarget, { title: string; detail: string }> = {
    "chat-key": {
      title: "清除聊天 Key？",
      detail: "桌宠会改回内置台词，聊天功能随之关闭；之后可以重新填。",
    },
    pets: {
      title: `删除全部导入的角色（${pets.length} 个）？`,
      detail: "角色图片和配置会从本机删除，无法恢复。",
    },
    logs: {
      title: "清除运行日志？",
      detail: "只删本机的 main.log，不影响其它设置和角色。",
    },
    all: {
      title: "清除全部本机数据？",
      detail: "聊天 Key、导入的角色、运行日志、所有设置都会被删除，无法恢复。",
    },
  };

  const asked = messages[target];
  if (!(await window.api.confirm(asked.title, asked.detail))) return;

  if (target === "all") {
    const again = await window.api.confirm(
      "再确认一次：全部删除？",
      "删完就回到刚装好的样子，需要重新导入角色、重新调设置。",
    );
    if (!again) return;
  }

  const result = await window.api.privacyClear(target);
  await reload();

  const names = result.cleared.map((id) => CLEAR_LABELS[id] ?? id);
  const summary = names.length
    ? `已清除：${names.join("、")}。剩余 ${formatBytes(result.leftoverBytes)}`
    : `没有可清除的内容。剩余 ${formatBytes(result.leftoverBytes)}`;
  setPrivacyResult(summary, true);
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
      const key = el.dataset.key as keyof Settings;
      const next = !settings[key];
      void window.api.patchSettings({ [key]: next }).then((s) => {
        settings = s;
        el.classList.toggle("on", next);
        el.setAttribute("aria-pressed", String(next));
      });
    }

    if (action === "segment") {
      const key = el.dataset.key as keyof Settings;
      const raw = el.dataset.value ?? "";
      const value = raw !== "" && !Number.isNaN(Number(raw)) ? Number(raw) : raw;
      void window.api.patchSettings({ [key]: value }).then((s) => {
        settings = s;
        for (const btn of el.parentElement?.querySelectorAll("button") ?? []) {
          btn.classList.toggle("active", btn === el);
        }
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

    if (action === "rename-pet") startRename(id);

    if (action === "import-l2" || action === "import-l3") {
      const mode = action === "import-l2" ? "l2" : "l3";
      void window.api.importPet(mode).then(() => reload());
    }

    if (action === "export-template") void window.api.exportTemplate();
    if (action === "open-userdata") void window.api.openUserData();
    if (action === "open-log") void window.api.openLogFolder();

    if (action === "chat-save") {
      const input = document.getElementById("chat-key-input") as HTMLInputElement | null;
      const value = input?.value.trim() ?? "";
      void window.api.chatSaveKey(value).then((res) => {
        if (res.ok) void reload();
        else setChatResult(res.error ?? "保存失败", false);
      });
    }

    if (action === "chat-test") {
      const input = document.getElementById("chat-key-input") as HTMLInputElement | null;
      setChatResult("正在测试…", true);
      void window.api.chatTest(input?.value.trim() || undefined).then((res) => {
        setChatResult(res.message, res.ok);
      });
    }

    if (action === "chat-clear") {
      void window.api.confirm("清除已保存的 Key？", "清除后桌宠会改回内置台词。").then((yes) => {
        if (!yes) return;
        void window.api.chatClearKey().then(() => reload());
      });
    }

    if (action === "goto-privacy") void render("privacy");

    if (action === "privacy-clear") {
      void clearPrivacy((el.dataset.target ?? "all") as PrivacyClearTarget);
    }

    if (action === "reset") {
      void window.api
        .confirm("恢复默认设置？", "音量、性格、行为会回到初始值，导入的角色不受影响。")
        .then((yes) => (yes ? window.api.resetSettings() : null))
        .then((s) => {
          if (s) void reload();
        });
    }
  });

  content.addEventListener("input", (event) => {
    const el = event.target as HTMLInputElement;

    if (el.dataset.action === "volume") {
      const percent = Number(el.value);
      const label = document.getElementById("volume-value");
      if (label) label.textContent = `${percent}%`;
      void window.api.patchSettings({ volume: percent / 100 });
      return;
    }

    if (el.dataset.action === "opacity") {
      const percent = Number(el.value);
      const label = document.getElementById("opacity-value");
      if (label) label.textContent = `${percent}%`;
      void window.api.patchSettings({ petOpacity: percent / 100 });
    }
  });
}

/** 就地改名 */
function startRename(id: string): void {
  const cardEl = content.querySelector<HTMLElement>(`[data-pet="${id}"]`);
  const nameEl = cardEl?.querySelector<HTMLElement>(".name");
  if (!cardEl || !nameEl) return;

  const input = document.createElement("input");
  input.value = nameEl.textContent ?? "";
  input.maxLength = 24;
  input.style.cssText =
    "width:100%;font-size:13px;padding:4px 7px;border:1px solid #f0603c;border-radius:8px;outline:none";
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
