# 2026-11-05 · 美术 v2：三套 36 帧 + 四个新动作

## 做了什么

### 1. 三套内置角色升级到 36 帧（4 列 × 9 行，512×1152）

| 角色 | 配色 | 配饰 | 备注 |
|---|---|---|---|
| 害羞 shy | 官方黄 + 粉色点缀 | 无 | 呼吸 8 帧、点击捂脸、偷看爱心 |
| 开朗 cheerful | 官方黄 + 橙色点缀 | 星星天线 + 金色星星耳钉 | 笑眼、弹跳幅度大 |
| 傲娇 tsundere | 樱花粉整体 + 玫红描边 | 右耳蝴蝶结 | 怒眉、窄眼、手叉腰 |

### 2. 新增 4 个动作（各 4 帧）

| 动作 | 帧号 | 触发 |
|---|---|---|
| 招手 wave | 20–23 | 双击 |
| 伸懒腰 stretch | 24–27 | 睡醒 |
| 摸头 pat | 28–31 | 长按 0.65 秒 |
| 生气 angry | 32–35 | 1.2 秒内连点 3 次 |

同时托盘 / 宠物右键菜单新增「动作」子菜单，可主动触发以上四个动作。

### 3. 代码改动

| 文件 | 改动 |
|---|---|
| `src/shared/pet-pack.ts` | `AnimationName` 扩到 8 个；`animations` 改 `Partial` |
| `src/shared/types.ts` | `PetApi` 增加 `onPlayAction` |
| `src/preload/index.ts` | 转发 `play-action` 事件 |
| `src/renderer/state-machine.ts` | 新状态、一次性动作回 idle、睡醒伸懒腰 |
| `src/renderer/pets/index.ts` | `rows: 9` + 8 组帧表 |
| `src/renderer/main.ts` | 双击 / 长按 / 连点手势 + 菜单触发 |
| `src/main/tray.ts` | 「动作」子菜单 |
| `src/main/importer.ts` | 返回类型随 `Partial` 调整（行为不变，仍只收 4×4） |

## 验证

| 项 | 结果 |
|---|---|
| `pnpm typecheck` | ✅ 通过 |
| 启动渲染 | ✅ 三套 36 帧正常显示，无越界警告 |
| 双击 | ✅ `idle → click → wave → idle`（约 0.68 秒） |
| 长按 0.75s | ✅ `idle → pat → idle`（约 0.68 秒） |
| 1.2s 内三连点 | ✅ `click → wave → angry → idle`（约 0.51 秒） |
| 睡醒 | ✅ `sleep → stretch → idle` |

手势验证来自主进程日志（`[renderer] [state] ... → wave/pat/angry`），不是仅看代码。

## 已知限制

- **导入器仍是 4×4 / 4 动作**：用户导入的素材不受本次改动影响，但也不能导入 8 动作。
- **`importFromPath` 生成的包只有 4 个动作**：`PetPack.animations` 已改成 `Partial`，渲染层缺失动作会被跳过，不会崩。
- 角色在 160px 显示下比 v1 略小（36 帧动作幅度更大，统一缩放约 0.9）。
- 音效仍只有 click / drag / appear，新动作暂无声效与台词。

## 下一步

- 给新动作补台词与音效（`lines` 目前只有 click / drag / idleLong / sleep）
- 若要让用户导入 8 动作素材，升级 `importer.ts` 的行数与帧表
- 打包（P3-1）
