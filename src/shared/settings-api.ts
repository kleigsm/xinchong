import type { Settings } from "./types";

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