# 芯宠角色模板 v1

把「一份角色配置 + 12 个固定姿态」变成一张可直接接入项目的雪碧图。

**已验证**：用这套模板重跑「害羞」，输出与定稿 `pet-shy.png` **逐字节一致**（SHA256 相同）。
**已演示**：`cheerful`（橙）和 `tsundere`（紫）两套换色，一条命令生成。

---

## 1. 快速开始

```powershell
cd art\template
python build.py characters\shy.json     # 生成一套
python build.py --all                   # 生成 characters\ 下全部
```

依赖：Python 3 + Pillow、Node 24、项目里的 `sharp`（`.tools/node_modules`，已装好）。

输出在 `art/template/out/<id>/`：

| 文件 | 用途 |
|---|---|
| `pet-<id>.png` | 交付用雪碧图（512×512） |
| `preview-sheet.png` | 20 帧对照图 |
| `preview-*.gif` | 四组动画预览（3.5 / 5 / 3.5 / 1.5 fps） |
| `check-report.json` | 自动质检：尺寸、边距、空格、帧差 |
| `svg/` `512/` | 中间产物，方便单独调某一帧 |

---

## 2. 加一个新角色（同一骨架）

1. 复制 `characters/shy.json` → `characters/<id>.json`
2. 改 `id`、`name`
3. 调 `palette`（不写则用官方黄）；只改比例就调 `style`
4. 跑 `python build.py characters/<id>.json`
5. 把 `out/<id>/pet-<id>.png` 覆盖到 `src/renderer/assets/`

### 调色板角色（16 个）

| role | 作用 | 默认 |
|---|---|---|
| `primary_light` / `primary` / `primary_dark` / `primary_shade` | 身体、头、手的主色四阶 | 官方黄 |
| `accent_light` / `accent` / `accent_dark` | 耳机、靴子 | 橙 |
| `comb_light` / `comb` | 鸡冠 | 红 |
| `circuit` / `circuit_dark` | 胸口电路纹 | 青 |
| `screen_top` / `screen_bottom` / `screen_edge` | 屏幕与边框 | 白/米 |
| `blush` | 腮红 | 粉 |
| `outline` | 描边 | 棕 |

> 注意：`palette` 只换颜色，不改形状。全色替换会改变吉祥物识别度，正式三套建议先定「整只换色」还是「只换点缀」。

### 比例（style）

`head_w/head_h/head_y/head_rx`、`body_w/body_top/body_bottom`、`foot_w/foot_h/foot_y`、`outline`、`eye_rx/eye_ry/eye_dx`、`cheek_opacity`、`hand_r`、`antenna`（`ball`/`star`）、`ear_tilt`（耳机外张角度）。默认值就是「害羞」这套。

---

## 3. 姿态（poses.json）

固定 36 帧（4 列 × 9 行），行优先：

| 行 | 格子 | 动作 |
|---|---|---|
| 0–1 | 0–7 | 待机（8 帧）|
| 2 | 8–11 | 点击（4 帧）|
| 3 | 12–15 | 拖拽（4 帧）|
| 4 | 16–19 | 睡觉（4 帧）|
| 5 | 20–23 | 招手（4 帧）|
| 6 | 24–27 | 伸懒腰（4 帧）|
| 7 | 28–31 | 摸头（4 帧）|
| 8 | 32–35 | 生气（4 帧）|

每帧可调：

| 字段 | 含义 |
|---|---|
| `dy` / `tilt` | 整体上下位移 / 旋转 |
| `head_dy` / `head_tilt` | 头相对身体的位移 / 旋转 |
| `squash` | 纵向压扁（1 = 正常，>1 拉伸） |
| `eyes` | `open` `half` `closed` `happy` `wide` `peek` `squeeze` |
| `look` | 瞳孔水平偏移 |
| `brows` | `none` `angry` `worried`（傲娇用怒眉，开朗/害羞不画） |
| `arms` | `side` `cheeks` `up` `dangle` `hip` `wave` `stretch` |
| `mouth` | `smile` `open` `small` `none` |
| `blush` / `comb` / `ears` | 腮红强度 / 鸡冠摆角 / 天线摆角 |
| `heart` / `zzz` / `anger` | 爱心 / 睡觉 z / 生气符号 |
| `wave` | 招手时手部水平偏移 |

改完跑一次构建，36 帧会全部重算，不会漏帧。

### 每个角色可以有自己的动作

在角色 JSON 里加一行 `"poses": "poses-cheerful.json"`，就会用那套姿态而不是默认的 `poses.json`。
现有三套：

| 角色 | 姿态文件 | 特点 |
|---|---|---|
| 害羞 | `poses.json` | 小幅度呼吸、捂脸、偷看 |
| 开朗 | `poses-cheerful.json` | 笑眼、弹跳、摆幅大 |
| 傲娇 | `poses-tsundere.json` | 怒眉、扭头、半眯眼 |

---

## 4. 边界（先看清楚，避免预期错位）

- **支持**：同一「显示器小鸡」骨架下的换色、换比例、换表情、换配件强度。
- **不支持**：换物种（猫、兔、云朵）。那需要新增一个 `rig_<species>.py`，实现同样的 `frame_svg(style, pose)` 接口；姿态文件与构建流程可以复用。
- **不是「一张图自动生成 12 帧」**：那是产品文档里的 L2 路线（程序自动做呼吸/眨眼），动作幅度和遮挡处理都弱于手绘帧。

---

## 5. 接入产品

1. 覆盖 `src/renderer/assets/pet-<id>.png`（36 帧版是 512×1152）
2. `src/renderer/pets/index.ts` 里 `rows` 改成 9，并按 `交付/动作扩展-接入说明.md` 补齐 8 组动画
3. 新动作还需要改 `AnimationName`、状态机、右键菜单（同一份说明里有完整代码）
4. `pnpm start` 验证
