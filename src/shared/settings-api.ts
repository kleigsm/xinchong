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