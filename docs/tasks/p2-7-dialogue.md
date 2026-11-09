# 任务书 · P2-7 话术逻辑增强

**负责人**：林予炫
**分支**：`feat/p2-7-dialogue`
**估时**：1 天
**性质**：代码任务（话术/对话逻辑）

---

## 一、背景

P2-5 的话术引擎已经上线并在用（深夜台词、入睡台词都生效了）。
但用了两周，暴露出四个缺口：

| # | 缺口 | 表现 |
|---|---|---|
| 1 | `morning` / `idleLong` 场景**定义了但没接入** | 引擎能挑，但没有任何地方触发 |
| 2 | 只在**单场景内**去重 | 刚点完说了"……诶？"，拖一下又说"……诶？" |
| 3 | 聊天**全靠 API** | 用户说"晚安"也要花一次调用，慢且花钱 |
| 4 | 聊天回复**长度没约束** | `max_tokens: 80`，中文可能到 40+ 字，气泡一行放不下 |

---

## 二、四个子任务

### 7a · 接入 morning 与 idleLong

| 场景 | 触发条件 | 说明 |
|---|---|---|
| `morning` | **当天第一次**与桌宠交互 | 需要记录"上次交互日期"，跨天重置 |
| `idleLong` | 超过 N 分钟没互动（**且没睡着**） | 主动说一句。**必须受设置开关控制，默认关** |

⚠️ 硬约束（来自 AGENTS.md）：**默认不主动搭话**。
`idleLong` 必须默认关闭，在「设置 → 行为」里加一个开关「久未互动时主动说话」。

### 7b · 跨场景冷却

现在的去重是"每个场景各自记最近 N 条"。问题：同一句话在不同场景会被重复选中。

要求：**全局冷却**——同一句台词在 X 分钟内不再出现（X 建议 5 分钟，可配置）。

实现提示：可以在 `LineEngine` 里维护一个 `Map<string, number>`（台词 → 上次出现时间），
而不是只按场景记历史数组。

### 7c · 本地意图识别（省 API）

用户发消息时，先用**本地规则**匹配常见意图，命中就不调 API：

| 意图 | 匹配（示例） | 回复来源 |
|---|---|---|
| 问候 | 你好/在吗/早上好 | 台词库 `click` |
| 告别 | 再见/拜拜/我走了 | `wave` |
| 晚安 | 晚安/睡了 | `sleep` 或 `night` |
| 夸它 | 可爱/好看/喜欢你 | `pat` |
| 骂它 | 讨厌/烦/笨蛋 | `angry` |
| 说累 | 累/困/不想干活 | 固定安慰句 |

**要求**：规则写在独立文件里（如 `src/renderer/intent.ts`），**可单测**，不要把正则散在 `main.ts`。

### 7d · 回复长度器

聊天回复超过 **20 个字符**时，截到最近的标点（，。！？）或直接截断 + 省略号。

现在的实现是 `slice(0, 60)`，会切在半个词上。

---

## 三、要改的文件

| 文件 | 改什么 |
|---|---|
| `src/renderer/line-engine.ts` | 7b 全局冷却（保留现有单场景去重的语义） |
| `src/renderer/intent.ts` | **新建**，7c 的规则 |
| `src/main/chat.ts` | 7d 长度器；7c 命中时不请求 |
| `src/renderer/main.ts` | 7a 的接入点（morning / idleLong 触发） |
| `src/shared/types.ts` + `store.ts` | 新增设置：`proactiveTalk: boolean`（默认 false）、`sceneCooldownMin: number`（默认 5） |
| `src/renderer/settings/settings.ts` | 行为页加一个开关 |
| `src/renderer/line-engine.test.ts` | 补 7b 的测试 |
| 新增 `src/renderer/intent.test.ts` | 7c 的测试 |

---

## 四、验收

- [ ] 改系统日期到"明天"，第一次点击说 `morning` 台词
- [ ] 连续点击 15 次 + 拖拽 5 次，**没有一句话重复出现**（含跨场景）
- [ ] 说「晚安」→ 日志里**没有** API 请求，直接回台词
- [ ] 说「你好」→ 同上
- [ ] 说「今天好累」→ 回安慰句
- [ ] 聊天回复超过 20 字时被截断，且不切在半个词上
- [ ] 「久未互动主动说话」默认关闭；打开后 5 分钟没互动会说一句
- [ ] **空闲 CPU 不上升**（idleLong 用定时器要注意别高频轮询）
- [ ] `pnpm typecheck` / `pnpm test` / `pnpm build` 全过

---

## 五、边界

```
✅ 允许：src/renderer/line-engine.ts、intent.ts、main.ts、src/main/chat.ts、
        src/shared/{types,lines}.ts、src/main/store.ts、settings 相关
❌ 禁止：src/main/hit-test.ts、window.ts、tray.ts（这些是 P1-11 的地盘，同时在做会冲突）
```

**动 `main.ts` 前先看有没有别人在改**——那是公共文件。如果同时有 P1-11 的任务在跑，
用 `git worktree` 各开一个目录，别在同一个工作区里切分支。

---

## 六、提交规矩

1. 分支 `feat/p2-7-dialogue`
2. PR 标题 `[P2-7] 话术逻辑增强：早晚场景、跨场景冷却、本地意图`
3. 更新 `docs/STATUS.md` + 新增 `docs/log/2026-11-XX-p2-7.md`
4. 测试要贴实际输出（`pnpm test` 的结果截图或文本）

---

## 七、第一步

```
[ ] 读 src/renderer/line-engine.ts（你自己写的，回顾一下历史数组的逻辑）
[ ] 读 src/renderer/line-engine.test.ts（现有 10 个用例）
[ ] 读 docs/log/2026-11-05-p2-5-line-engine.md（当时的决策）
[ ] 先实现 7b（改动最小、最好测）
[ ] 再 7c（新建文件，独立可测）
[ ] 最后 7a（要改 main.ts，风险最高）
[ ] 7d 顺手收尾
```
