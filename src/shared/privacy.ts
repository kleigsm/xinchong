/**
 * 隐私页的共享契约与纯函数（P1-13）。
 *
 * 分工：
 * - 主进程（main/privacy.ts）：**清点本机实际存了什么**、执行删除
 * - 渲染层（settings.ts）：**展示和解释**
 *
 * 类型与纯函数放这里，保证「存了什么 / 会不会出网」的判断只有一份实现，
 * 两边不会说不一样的话。
 */

/** 本机数据项（一行 = userData 下一个可解释的东西） */
export type PrivacyItemId = "settings" | "pets" | "chat-key" | "logs" | "runtime";

export interface PrivacyItem {
  id: PrivacyItemId;
  /** 给人看的名称 */
  label: string;
  /** 里面到底是什么数据 */
  what: string;
  /** 相对 userData 的路径（"." 表示整个目录） */
  path: string;
  exists: boolean;
  bytes: number;
  files: number;
  /** 能不能在这一页直接删掉 */
  clearable: boolean;
}

export interface PrivacyReport {
  /** 产品名，用于标题 */
  appName: string;
  /** userData 绝对路径，界面里给用户看 */
  userDataPath: string;
  /** 全部数据合计 */
  totalBytes: number;
  items: PrivacyItem[];
  /** 是否已配置聊天 Key */
  hasKey: boolean;
  /** 系统加密是否可用（不可用时 Key 存不下来） */
  encryptionAvailable: boolean;
  /** 是否在写运行日志 */
  logsEnabled: boolean;
  /** 只有打包版才写日志文件；开发版只走控制台 */
  packaged: boolean;
}

/** 能一键清除的目标 */
export type PrivacyClearTarget = "chat-key" | "pets" | "logs" | "all";

export interface PrivacyClearResult {
  ok: boolean;
  /** 实际清掉的项 */
  cleared: PrivacyItemId[];
  /** 清完之后的剩余字节（可能还有 Electron 自带缓存） */
  leftoverBytes: number;
}

/**
 * 字节数 → 人话。
 * 0 和异常值统一显示 0 B，避免界面上出现 NaN / -1 B。
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  // 字节不显示小数；KB 以上保留一位（和资源管理器的习惯一致）
  return unit === 0 ? `${Math.round(value)} B` : `${value.toFixed(1)} ${units[unit]}`;
}

/**
 * 当前会不会出网。
 *
 * 全项目唯一的出网点是聊天（api.deepseek.com），
 * 而聊天只有在用户自己填了 Key、并且主动说话时才会发生。
 */
export function networkStatus(hasKey: boolean): {
  online: boolean;
  title: string;
  detail: string;
} {
  return hasKey
    ? {
        online: true,
        title: "可能出网（仅在你主动说话时）",
        detail: "你配置了聊天 Key。只有你在输入条里发那句话时，才会连接 api.deepseek.com。",
      }
    : {
        online: false,
        title: "完全离线",
        detail: "没有配置聊天 Key，芯宠不会发出任何网络请求。",
      };
}

/** 清点结果的合计；主进程返回异常数据时不至于把界面算成 NaN */
export function sumBytes(items: Array<{ bytes: number }>): number {
  return items.reduce(
    (total, item) => total + (Number.isFinite(item.bytes) ? Math.max(0, item.bytes) : 0),
    0,
  );
}
