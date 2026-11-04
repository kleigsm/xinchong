# 接管须知

> 给接手的 AI 助手和新成员。**读完这页再动手，不要先翻代码。**

## 1. 按顺序读这四份

| 顺序 | 文件 | 解决什么 |
|---|---|---|
| 1 | [`docs/STATUS.md`](docs/STATUS.md) | 现在做到哪了，一页看完 |
| 2 | [`docs/BACKLOG.md`](docs/BACKLOG.md) | 有哪些任务、谁来领、怎么算做完 |
| 3 | [`docs/log/`](docs/log/) 最近 3 篇 | 上次做了什么、踩了什么坑 |
| 4 | [`docs/DECISIONS.md`](docs/DECISIONS.md) | 已定的决策，不要重新推翻 |

如果你是被"子窗口"派来做一个具体任务的，先看 [`docs/HANDOFF.md`](docs/HANDOFF.md) 里的收尾要求。需要背景时再读 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)（技术选型与实现方案）、[`docs/ROADMAP.md`](docs/ROADMAP.md)（周计划）和根目录 [`README.md`](README.md)（产品定位与调研结论）。

## 2. 项目是什么

**芯宠**：Windows 桌面 AI 互动桌宠。上传图片生成专属外观，开朗 / 傲娇 / 害羞三种性格一键切换，点击或拖拽时以动作、表情、声音回应。

**明确不做**：聊天机器人、养成系统、主动打扰。

## 3. 当前阶段

**Phase 1 —— MVP 已完成（F1–F4）。当前阶段是交付：打包与设置面板。**

代码在 `src/`（`main` / `preload` / `renderer` / `shared`），`pnpm start` 可运行。
下一步优先级见 `docs/STATUS.md` 的「待办」。

## 4. 硬约束（违反就是返工）

| 约束 | 来源 |
|---|---|
| 目标平台 Windows 10/11 x64，先做单平台 | 问卷 90.38% 用 Windows |
| 不能卡顿 | 73.08% 用户因卡顿弃用，这是红线不是加分项 |
| 上传图片只在本地处理，不上传云端 | 53.85% 用户的首要隐私顾虑 |
| 默认静音、默认不主动搭话、开机自启默认关 | 两类用户的共同诉求 |
| 不做 F8 养成、F9 深度对话 | 已列入 Won't，见 BACKLOG |

## 5. 干活规矩

- **一个任务 = 一个分支 = 一个 PR**，分支名 `feat/<任务号>-<短描述>`，如 `feat/p1-3-personality`
- 改代码的 PR **必须同时更新** `docs/STATUS.md` 和一篇 `docs/log/YYYY-MM-DD-<任务号>.md`
- **日志按任务建文件，不按天合并** —— 两个人同一天做不同任务时不会改同一个文件，也就不会冲突
- 提交信息用中文，一句话说清做了什么
- 不提交 `node_modules/`、`.next/`、安装包、`.env*`
- 不确定的事写进 `docs/DECISIONS.md` 提问，不要在代码里自行发明

## 6. 环境

- Node 24 + pnpm 10
- 仓库根目录即客户端工程根目录（不是 monorepo，不建 `client/` 子目录）
- 门户网站在另一个仓库：[kleigsm/xinchong-site](https://github.com/kleigsm/xinchong-site)
