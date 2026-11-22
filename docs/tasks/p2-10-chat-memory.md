# 任务书 · P2-10 对话上下文本地存档 + 按形象隔离

**负责人**：子对话（待派）
**分支**：`feat/p2-10-chat-memory`
**估时**：a+b 半天，c 再加半天
**性质**：代码任务

---

## 一、为什么要做（三个已存在的 bug）

现在 `src/main/chat.ts` 是这样：

```ts
const history: Turn[] = [];            // 一个全局数组，所有形象共用
const MAX_HISTORY_TURNS = 6;           // 3 问 3 答

export function resetChatHistory(): void { history.length = 0; }
// ↑ 定义了，但**从来没有人调用**
```

| 问题 | 表现 |
|---|---|
| **① 跨形象串味** | 跟害羞聊完切到傲娇，傲娇能看到害羞说过的「我叫小明」 |
| **② 重启失忆** | 只在内存，关掉程序全忘 |
| **③ 记性太短** | 只带 3 问 3 答，聊 5 轮就接不上前面 |

**这不是新功能，是修 bug。**

---

## 二、目标（分三档，a/b 必做，c 可选）

### a. 本地存档 + 按形象分库（必做）

**存储位置**：`%APPDATA%\xinchong\chats.json`

**结构**：

```json
{
  "version": 1,
  "characters": {
    "builtin:shy": {
      "updatedAt": 1735000000000,
      "turns": [
        { "role": "user", "content": "在吗", "at": 1735000001000 },
        { "role": "assistant", "content": "在、在的……怎么啦", "at": 1735000002000 }
      ]
    },
    "custom:example-shy": { "updatedAt": 0, "turns": [] }
  }
}
```

**角色键规则**：

| 当前角色 | 键 |
|---|---|
| 内置害羞/开朗/傲娇 | `builtin:shy` / `builtin:cheerful` / `builtin:tsundere` |
| 用户导入的角色 | `custom:<petId>` |

**发送策略**：存档保留最近 **20 轮**，发给 API 只用最近 **6 轮**（省 token）。

**写入策略**：每轮结束后延迟 500ms 写盘（防抖），程序退出前 flush 一次。

### b. 设置页可见 + 可清空 + 隐私说明更新（必做）

「设置 → 聊天」新增：

| 元素 | 内容 |
|---|---|
| 每角色的对话条数 | 「害羞：24 条 · 猫咪（自定义）：6 条」 |
| 单角色清空 | 每个角色一行「清空」按钮 |
| 全部清空 | 一个「清空所有对话」按钮（二次确认） |

**⚠️ 必须同步改文案**：

`#71 隐私设置页` 里现在写着「最近 3 轮对话只在内存」。本任务改完后这句话**就是错的**，必须改成：

> 对话记录保存在本机 `%APPDATA%\xinchong\chats.json`，不上传；可在「聊天」页清空。

并且 `clearPrivacyData` 的 `all` 选项要**包含 chats.json**。

### c. 长期记忆摘要（可选）

每 20 轮让模型压缩成一句（≤40 字），存进 `memory` 字段，以后拼在 system prompt 最前面：

```
system: 你还记得：用户在准备考试，最近压力大
```

代价：每 20 轮多一次 API 调用。**先不做，等 a/b 稳定。**

---

## 三、要改的文件

| 文件 | 改什么 |
|---|---|
| **新建** `src/main/chat-store.ts` | 读写 `chats.json`、按角色键取/存、裁剪、防抖落盘 |
| `src/main/chat.ts` | 删掉全局 `history`，改成从 `chat-store` 按 `characterKey` 取 |
| `src/main/api.ts` | 新增 IPC：`api:chat:history:list`、`api:chat:history:clear` |
| `src/preload/index.ts` | 暴露上面对应的方法 |
| `src/shared/settings-api.ts` | 类型定义 |
| `src/renderer/settings/settings.ts` | 聊天页追加「对话记录」卡片 |
| `src/main/privacy.ts` | `clearPrivacyData` 加 `chats` 目标，`all` 包含它 |
| `src/main/pet-switch.ts` | 删除角色时清掉该角色的对话 |
| `docs/STATUS.md` + `docs/log/` | 按规矩 |

---

## 四、边界

```
✅ 允许：src/main/chat*.ts、api.ts、preload、shared/*、privacy.ts、pet-switch.ts、
        renderer/settings/*
❌ 禁止：src/main/hit-test.ts、window.ts、tray.ts、renderer/pet-view.ts、petpet.ts
        （命中检测/窗口/动画是别人的地盘）

❌ 不要顺手重构 chat.ts 的其他逻辑（提示词、错误码），只改"历史从哪来"。
```

### ⚠️ 开工前置：确认没有并行改动

本任务会改 `chat.ts` 和设置页，而：

| PR | 状态 | 冲突点 |
|---|---|---|
| #71 隐私设置页 | 可能未合 | 同样改 `settings.ts` / `api.ts` / `privacy.ts` |
| #72 P2-7 话术增强 | 可能未合 | 同样改 `chat.ts` |

**开工第一件事**：

```bash
git fetch origin
git log origin/main --oneline -5     # 确认 #71/#72 已经合进来
```

如果还没合，先等；或者基于 main 建分支，完成后 rebase。

---

## 五、验收

### a 部分
- [ ] 跟害羞聊 3 轮 → 关程序 → 重开 → 继续聊，它记得
- [ ] 切到傲娇 → 它**不知道**害羞聊过什么（不串味）
- [ ] 切回害羞 → 记忆还在
- [ ] `chats.json` 里能看到 `builtin:shy` / `builtin:cheerful` 两个键
- [ ] 每个角色最多存 20 轮（超了丢最早的）
- [ ] 发给 API 的只有 6 轮（看日志或抓包）
- [ ] JSON 损坏 / 不存在时**不崩**，按空历史处理

### b 部分
- [ ] 设置 → 聊天 → 能看到每个角色的对话条数
- [ ] 清空单个角色 → 该角色记忆变空，其他不受影响
- [ ] 清空全部 → `chats.json` 变空
- [ ] 隐私页的数据清单里出现 `chats.json`
- [ ] 「一键清除全部」会删掉 chats.json
- [ ] 隐私页里「只在内存」的文案已更新

### 通用
- [ ] `pnpm typecheck` / `pnpm test` / `pnpm build` 全过
- [ ] 连续快速聊 10 轮不丢消息（防抖写盘不覆盖）
- [ ] 空闲 CPU 不变（没有轮询定时器）

---

## 六、几个坑（提前说）

| 坑 | 说明 |
|---|---|
| **别在渲染层存历史** | 历史涉及隐私，放主进程；渲染层只通过 IPC 拿条数 |
| **写盘要防抖** | 每轮都写会频繁 IO；用 500ms 防抖 + 退出 flush |
| **删除角色要连带清** | 否则 `custom:xxx` 变孤儿数据，越积越多 |
| **JSON 要容错** | `try/catch` + 结构校验，坏了就当空，别让聊天整个不可用 |
| **version 字段** | 以后改结构能迁移；读到未知 version 就备份后重置 |
| **别改提示词** | 这条任务的边界是"历史从哪来"，不是"怎么说话" |

---

## 七、可选加分（做完 a/b 再说）

| 项 | 说明 |
|---|---|
| 长期记忆摘要 | 20 轮压成一句，让"记得住"质变 |
| 导出对话 | 用户导出为 txt/md（隐私友好） |
| 加密存储 | 用 `safeStorage` 加密 chats.json（但排查会变难） |

---

## 八、下一步

```
[ ] 读 src/main/chat.ts（关注 history / resetChatHistory / sendChatMessage）
[ ] 读 #71 的 privacy.ts（看 clearPrivacyData 怎么写的，照它的风格）
[ ] 读 docs/testing/issues.md 的 BUG 列表（了解已修/待修的边界）
[ ] 先做 a（能跑通就行），再做 b（UI）
[ ] 写日志：docs/log/2026-XX-XX-p2-10.md
```
