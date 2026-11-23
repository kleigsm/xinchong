import type { Settings } from "./types";
import type { PrivacyClearResult, PrivacyClearTarget, PrivacyReport } from "./privacy";

/** 设置窗口与主进程之间的接口定义（preload 暴露为 window.api） */

export interface PetListItem {
  id: string;
  name: string;
  /** l2 = 单张立绘自动动画；l3 = 多帧雪碧图 */
  kind: "l2" | "l3";
  /** 缩略图 data URL */
  thumb: string | null;
  active: boolean;
}

export interface PersonalityInfo {
  id: string;
  label: string;
}

export interface SystemInfo {
  version: string;
  electron: string;
  userDataPath: string;
  cpuPercent: number;
  memoryMB: number;
  processes: number;
}

export interface SettingsApi {
  getSettings(): Promise<Settings>;
  patchSettings(patch: Partial<Settings>): Promise<Settings>;
  listPets(): Promise<PetListItem[]>;
  usePet(id: string): Promise<boolean>;
  removePet(id: string): Promise<boolean>;
  renamePet(id: string, name: string): Promise<boolean>;
  importPet(mode: "l2" | "l3"): Promise<{ ok: boolean }>;
  useBuiltin(personalityId: string): Promise<boolean>;
  getPersonalities(): Promise<PersonalityInfo[]>;
  exportTemplate(): Promise<string | null>;
  chatStatus(): Promise<ChatStatus>;
  chatSaveKey(key: string): Promise<{ ok: boolean; error?: string }>;
  chatClearKey(): Promise<boolean>;
  chatTest(key?: string): Promise<ChatTestResult>;
  chatSend(text: string): Promise<ChatResult>;
  chatHasKey(): Promise<boolean>;
  /** 声音页：已导入的音效包（P2-11） */
  soundPacks(): Promise<SoundPackInfo[]>;
  /** 声音页：选文件夹并做静态校验，返回待校验的文件（data URL） */
  soundImport(dir?: string): Promise<SoundImportPrepared>;
  /** 声音页：时长校验通过后转正 */
  soundImportCommit(token: string): Promise<SoundImportCommitted>;
  /** 声音页：取消导入，清掉 staging */
  soundImportCancel(token: string): Promise<void>;
  /** 声音页：删除音效包（正在使用会自动切回内置） */
  soundRemove(id: string): Promise<SoundPackInfo[]>;
  /** 播放器：音效包的文件清单 */
  soundPackFiles(id: string): Promise<Record<string, string[]> | null>;
  /** 播放器：读某个音频的 data URL */
  soundFile(id: string, file: string): Promise<string | null>;
  /** 让桌宠试播一声（换主题后给即时反馈） */
  soundTrial(): Promise<void>;
  /** 聊天页：每个角色有多少条对话（P2-10） */
  chatHistory(): Promise<ChatHistorySummary[]>;
  /** 聊天页：清空某个角色的对话；不传 key 就是全部清空 */
  chatClearHistory(key?: string): Promise<ChatHistorySummary[]>;
  /** 隐私页：清点本机实际存了什么（读文件系统，不是写死的文案） */
  privacyReport(): Promise<PrivacyReport>;
  /** 隐私页：清除本机数据 */
  privacyClear(target: PrivacyClearTarget): Promise<PrivacyClearResult>;
  getSystemInfo(): Promise<SystemInfo>;
  openUserData(): Promise<void>;
  openLogFolder(): Promise<void>;
  resetSettings(): Promise<Settings>;
  confirm(message: string, detail: string): Promise<boolean>;
}

export interface ChatStatus {
  hasKey: boolean;
  encryptionAvailable: boolean;
  masked: string | null;
}

export interface ChatTestResult {
  ok: boolean;
  message: string;
}
export type ChatResult =
  | { ok: true; reply: string }
  | { ok: false; reason: string; message: string };
/** 对话存档的一个角色（P2-10） */
export interface ChatHistorySummary {
  /** builtin:shy / custom:<petId> */
  key: string;
  /** 给人看的名字 */
  label: string;
  /** 存了多少条消息（一问一答 = 2 条） */
  turns: number;
  /** 最后更新时间戳 */
  updatedAt: number;
}
/** 用户导入的音效包（P2-11） */
export interface SoundPackInfo {
  id: string;
  name: string;
  license?: string;
  /** 包内音频总大小（字节） */
  bytes: number;
  /** 每种音效的文件列表（相对文件名） */
  sounds: Record<string, string[]>;
}

/** 导入第一步的结果：已复制到 staging，等渲染层按时长校验 */
export interface SoundImportPreview {
  token: string;
  manifest: { id: string; name: string };
  files: Array<{ kind: string; name: string; dataUrl: string; bytes: number }>;
}

export type SoundImportPrepared = { ok: true; preview: SoundImportPreview } | { ok: false; error: string };
export type SoundImportCommitted =
  | { ok: true; id: string; packs: SoundPackInfo[] }
  | { ok: false; error: string };