import { app } from "electron";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * 打包版的日志落盘（原本写在 main/index.ts 里，P1-13 抽出来给隐私页控制）。
 *
 * 背景：打包后的应用没有控制台，stdout 是断开的管道，
 * 此时任何 console.log 都会抛 EPIPE 并弹「JavaScript error occurred in the main process」。
 * 所以打包模式下把日志写到 userData/main.log。
 *
 * 隐私考虑：日志里会有本机路径和设置项（不含对话内容、不含 Key），
 * 所以隐私页提供了「记录运行日志」开关和「清除日志」按钮。
 * 关掉后 console 变成空操作，main.log 不再增长（文件本身不删，要删点按钮）。
 */

/** 是否允许写日志文件；隐私页开关通过 setLogWriteEnabled 改它 */
let writeEnabled = true;

export function setLogWriteEnabled(enabled: boolean): void {
  writeEnabled = enabled;
}

export function isLogWriteEnabled(): boolean {
  return writeEnabled;
}

export function setupLogging(): void {
  // 开发模式有控制台，继续走 stdout，不落盘
  if (!app.isPackaged) return;

  const write = (level: string, args: unknown[]): void => {
    if (!writeEnabled) return;

    try {
      const dir = app.getPath("userData");
      mkdirSync(dir, { recursive: true });
      const line = `${new Date().toISOString()} [${level}] ${args.map(String).join(" ")}\n`;
      appendFileSync(join(dir, "main.log"), line);
    } catch {
      // 日志失败不能影响主流程
    }
  };

  console.log = (...args: unknown[]) => write("log", args);
  console.info = (...args: unknown[]) => write("info", args);
  console.warn = (...args: unknown[]) => write("warn", args);
  console.error = (...args: unknown[]) => write("error", args);
}
