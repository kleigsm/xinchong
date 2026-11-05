# 协作指南

> 目标是：**任何人 fork 后都能独立完成一个任务，不用等别人。**
> 流程看着长，但第一次做完之后每个任务只有 4 步。

---

## 零、先看这里：权限与保护规则

### 你是「协作者」还是「外部贡献者」

| 身份 | 怎么来 | 能做什么 |
|---|---|---|
| **协作者** | 仓库主在 Settings → Collaborators 里加你 | 直接 clone 主仓库、推分支、开 PR |
| **外部贡献者** | 不用授权，自己 Fork | 推自己的 fork，再向主仓库提 PR |

**队内成员优先走「协作者」**，少一步同步，最省心。

### main 分支有保护，直接推会被拒绝

```
❌ git push origin main            ← 会被拒绝
✅ git push origin feat/你的分支    ← 正确
```

**所有人都要开 PR，由仓库主合并。**
（管理员有应急豁免，但正常流程一样走 PR。）

### ⚠️ 项目路径不能含中文

放在 `D:\...\作业\xinchong` 这种路径下，Electron 会**启动即崩、没有任何报错**。

一律用短英文路径：`E:\xinchong` 或 `D:\xinchong`。见 `docs/DECISIONS.md` 的 D-404。

---

## 一、第一次准备（只做一次）

### 1. Fork 到自己的账号

打开 <https://github.com/kleigsm/xinchong>，右上角 **Fork**。

### 2. 克隆自己的 fork

```bash
git clone https://github.com/<你的用户名>/xinchong.git
cd xinchong
```

### 3. 把主仓库加成 upstream

```bash
git remote add upstream https://github.com/kleigsm/xinchong.git
git remote -v      # 应该看到 origin(你的) 和 upstream(主仓库)
```

---

## 二、领一个任务

1. 打开 [`docs/BACKLOG.md`](docs/BACKLOG.md)，找状态是 `⬜` 且依赖已满足的任务
2. 在 GitHub 建 Issue，用 **任务** 模板，标题格式：`[P1-3] 性格系统`
3. 在 BACKLOG 里把「领取人」改成你，状态改 `🔄`，单独提一个 PR 或直接在任务 PR 里带上

> **一次只领一个。** 同时开两个任务，两个都做不完。

---

## 三、开分支做开发

```bash
git checkout main
git pull upstream main          # 先同步最新
git checkout -b feat/p1-3-personality
```

**分支命名**：`feat/<任务号>-<英文短描述>`

| 类型 | 前缀 | 例 |
|---|---|---|
| 新功能 | `feat/` | `feat/p1-3-personality` |
| 修 bug | `fix/` | `fix/p0-3-drag-jitter` |
| 文档 | `docs/` | `docs/update-status` |

**提交信息**：中文，一句话说清做了什么。

```
feat: 实现三套性格配置切换
fix: 修复拖拽时窗口坐标偏移
docs: 更新 STATUS 与日志
```

---

## 四、开 PR

```bash
git add -A
git commit -m "feat: 实现三套性格配置切换"
git push origin feat/p1-3-personality
```

然后在自己 fork 的页面上点 **Compare & pull request**，目标选 `kleigsm/xinchong` 的 `main`。

**PR 必须包含**：

- [ ] 标题带任务号：`[P1-3] 性格系统`
- [ ] 描述里写 `Closes #<issue 编号>`
- [ ] 怎么验证（命令 / 步骤 / 截图 / 录屏）
- [ ] 已更新 `docs/STATUS.md`，并新增 `docs/log/YYYY-MM-DD-<任务号>.md`

PR 模板会自动带出这些勾选项。

> **为什么日志要按任务建文件？** 如果所有人共用 `2026-11-05.md`，两个人同一天做不同任务就会改同一个文件，每次都要手动解冲突。一人一个文件，冲突直接归零。

---

## 五、评审与合并

- 至少 **1 人** 看过并留 comment 才能合并
- 合并用 **Squash and merge**，保持 `main` 线性
- 合并后删掉分支

---

## 六、同步与冲突

别人的 PR 合并后，你的分支会落后。合并前同步一次：

```bash
git fetch upstream
git rebase upstream/main        # 推荐 rebase，历史干净
# 有冲突就手动解，然后：
git add <冲突文件>
git rebase --continue
git push --force-with-lease origin feat/p1-3-personality
```

**注意**：rebase 之后推送要加 `--force-with-lease`，不要用 `--force`（会覆盖别人的提交）。

---

## 七、几条硬规矩

| 规矩 | 原因 |
|---|---|
| 不直接往 `main` 推 | 会绕开评审，出问题无法回滚 |
| 一个 PR 只做一件事 | 混在一起没法评审，也没法回滚 |
| 不提交 `node_modules/`、安装包、`.env*` | 仓库会被撑爆 |
| 大改前先在 `DECISIONS.md` 记一条 | 免得做完被推翻 |
| 卡住超过半天就在群里说 | 沉默的阻塞最要命 |

---

## 八、常见问题

**Q：我 fork 之后主仓库又更新了，怎么办？**
A：`git fetch upstream && git rebase upstream/main`，见第六节。

**Q：PR 里显示很多无关文件改动？**
A：通常是你从旧的分支切出来的。先 `git rebase upstream/main` 再推。

**Q：任务太大做不完？**
A：在 Issue 里拆成两个，回 BACKLOG 建新行，别硬扛。
