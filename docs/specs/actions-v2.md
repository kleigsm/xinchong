# 内置角色动作规格 v2（36 帧）

> 适用于内置三套角色（害羞 / 开朗 / 傲娇）。
> 用户导入的雪碧图仍支持 4 行 / 5 行 / 9 行三种布局（见 `src/main/sheet-layout.ts`）；

## 1. 网格

| 项 | 值 |
|---|---|
| 整图 | **512 × 1152**（4 列 × 9 行） |
| 单格 | **128 × 128** |
| 背景 | 透明 |
| 空格子 | 无（36 格全部使用） |
| 安全边距 | 每格四周 ≥8px |

## 2. 帧表

| 行 | 帧号 | 动作 | 帧数 | fps | 循环 | 触发 |
|---|---|---|---|---|---|---|
| 0–1 | 0–7 | 待机 idle | 8 | 4 | 是 | 默认 |
| 2 | 8–11 | 点击 click | 4 | 5 | 否 | 单击 |
| 3 | 12–15 | 拖拽 drag | 4 | 4 | 是 | 按住拖动 |
| 4 | 16–19 | 睡觉 sleep | 4 | 1.5 | 是 | 30 秒无互动 |
| 5 | 20–23 | 招手 wave | 4 | 6 | 否 | 双击 / 右键菜单 |
| 6 | 24–27 | 伸懒腰 stretch | 4 | 4 | 否 | 睡醒 / 右键菜单 |
| 7 | 28–31 | 摸头 pat | 4 | 6 | 否 | 长按 0.65s / 右键菜单 |
| 8 | 32–35 | 生气 angry | 4 | 8 | 否 | 1.2s 内连点 3 次 / 右键菜单 |

一次性动作（click / wave / stretch / pat / angry）播完自动回 idle；拖拽中不响应其它动作。

## 3. 程序契约

- `AnimationName` 增加 `wave | stretch | pat | angry`
- `PetPack.animations` 改为 `Partial<Record<AnimationName, AnimationSpec>>`：用户导入的 4×4 包只提供 4 个动作，缺失动作播不到即可
- 右键菜单「动作」子菜单与手势触发见 `src/renderer/main.ts` / `src/main/tray.ts`

## 4. 与 v1 的关系

| | v1（用户导入 L3） | v2（内置） |
|---|---|---|
| 网格 | 4×4 / 12 帧 | 4×9 / 36 帧 |
| 动作 | 4 | 8 |
| 导入器 | ✅ | ❌（只校验 4×4） |
| 内置资源 | 占位图 | 三套 36 帧 |

如果以后要让用户导入 8 动作素材，需要同步升级 `src/main/importer.ts` 的行数与帧表校验。

## 5. 生成方式

三套素材由 `art/template/` 的矢量模板生成，改 `poses-*.json` 后：

```powershell
cd art/template
python build.py --all
```

输出在 `art/template/out/<id>/pet-<id>.png`，再覆盖 `src/renderer/assets/`。
