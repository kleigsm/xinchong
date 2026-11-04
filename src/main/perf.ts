import { app } from "electron";
import type { BrowserWindow } from "electron";
import { dialog } from "electron";

/**
 * 性能采样（P1-10）。
 *
 * - 常驻采样：每 5 秒读一次 app.getAppMetrics()，设置 XINCHONG_PERF=1 时打到日志
 * - 手动查看：托盘菜单「性能信息」弹窗，显示 CPU / 内存 / 进程数
 */

interface PerfSnapshot {
  cpuPercent: number;
  memoryMB: number;
  processes: number;
}

const SAMPLE_INTERVAL_MS = 5000;

export function readPerfSnapshot(): PerfSnapshot {
  const metrics = app.getAppMetrics();

  // cpu.percentCPUUsage 是"占一个核的百分比"，累加得到总占用
  const cpuPercent = metrics.reduce((sum, m) => sum + (m.cpu?.percentCPUUsage ?? 0), 0);
  // workingSetSize 单位是 KB
  const memoryMB = metrics.reduce((sum, m) => sum + (m.memory?.workingSetSize ?? 0), 0) / 1024;

  return {
    cpuPercent: Math.round(cpuPercent * 10) / 10,
    memoryMB: Math.round(memoryMB),
    processes: metrics.length,
  };
}

/** 开始常驻采样，返回停止函数；仅当设置了 XINCHONG_PERF 才打日志 */
export function startPerfSampling(_win: BrowserWindow): () => void {
  const verbose = process.env.XINCHONG_PERF === "1";

  const timer = setInterval(() => {
    if (!verbose) return;
    const s = readPerfSnapshot();
    console.log(`[perf] cpu=${s.cpuPercent}% mem=${s.memoryMB}MB procs=${s.processes}`);
  }, SAMPLE_INTERVAL_MS);

  return () => clearInterval(timer);
}

/** 弹窗展示当前性能数值（托盘菜单调用） */
export async function showPerfDialog(): Promise<void> {
  const s = readPerfSnapshot();
  await dialog.showMessageBox({
    type: "info",
    title: "芯宠 · 性能信息",
    message: "当前资源占用",
    detail: [
      `CPU：${s.cpuPercent}%（占单核百分比）`,
      `内存：${s.memoryMB} MB`,
      `进程数：${s.processes}`,
      "",
      "目标：空闲 CPU < 5%、内存 < 400 MB",
    ].join("\n"),
    buttons: ["知道了"],
  });
}
