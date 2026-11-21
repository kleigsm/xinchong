# 沉浸式游戏库：布局与开发规格

> 已选方向（2026-11-21）：参考 Wallpaper Engine / Steam Big Art / PS5。
> 目标：去掉“左侧栏 + 白卡片网格”，让宠物成为画面主角。
> 对应高保真：`docs/design/mockups/shots/immersive.png`、`hall-immersive.png`、`settings-immersive.png`

---

## 一、结构

窗口：**1040×700**，最小 900×620。

```
┌──────────────────────────────────────────────────────────┐
│ 芯宠   我的形象  外观大厅  声音  行为  系统  关于   ⌕  ⚙ │ 58px
├──────────────────────────────────────────────────────────┤
│                                                          │
│      [大形象 / 氛围背景]              ┌────────────────┐  │
│                                       │ 玻璃信息卡      │  │
│                                       │ 名字 / 性格     │  │
│                                       │ 动作 / 下载     │  │
│                                       └────────────────┘  │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ 筛选 chips（仅大厅）                                      │
│ 我的形象 ─────────────────────────── ← → 切换 · Enter   │
│ [竖向 shelf 1] [2] [3] [4] [5] [6]                       │ 176px
└──────────────────────────────────────────────────────────┘
```

- **没有左侧栏**
- 顶部 6 个文字 tab，当前项底部 2px 高亮
- 中间是“舞台 + 玻璃信息卡”
- 底部是横向 shelf，不是卡片网格
- 背景由当前形象的模糊图 + 暗色渐变构成

---

## 二、页面

### 1. 我的形象

- 舞台：当前宠物 390px 高，脚下阴影 + 光晕
- 右上标签：`CURRENT COMPANION`
- 信息卡：编号 / 名字 / 性格 / 描述 / 状态 chips / 摸头·招手·隐藏
- shelf：内置 + 精选 + 导入，当前项抬起 12px、描边高亮
- shelf 右侧：`← → 切换 · ENTER 使用`

### 2. 外观大厅

- 舞台：当前选中外观的大图，背景氛围跟随该外观主色
- 信息卡：
  - 名称 / 作者 / 更新时间
  - 许可 / 大小 / 版本
  - 「下载并使用」主按钮 + 「预览」次按钮
- shelf 上方加筛选 chips：全部 / 猫 / 狗 / 鸟 / 幻想 / 节日
- shelf 展示策展目录，标签：官方 / 精选 / 内置

### 3. 声音 / 行为 / 系统 / 关于

- 同一套顶部 tab，不跳窗口
- 左侧一块大玻璃表单，右侧小预览（宠物 / 试听）
- 表单用**发丝分隔行**，不再用一张张卡片
- 内容超长时页面内滚动，shelf 隐藏

### 4. 设置页样式

```
┌────────────────────────────────────────────┐
│ PREFERENCES / 03                           │
│ 声音与台词                                  │
│ 换一套音效，或者让桌宠安静一点。            │
│ ────────────────────────────────────────── │
│ 音效主题           [跟随性格][狗][猫][鸟][猪]│
│ ────────────────────────────────────────── │
│ 音量               ───────●────  70%        │
│ ────────────────────────────────────────── │
│ 静音               [开关]                   │
└────────────────────────────────────────────┘
```

- 玻璃面板 `rgba(24,22,28,.55)` + 1px 边 + 24px blur
- 行高 15px 上下，发丝线
- 右侧预览卡：宠物 + 试听按钮

---

## 三、主题

### 深色（默认）

| Token | 值 |
|---|---|
| 背景 | `#0D0C11` |
| 玻璃 | `rgba(24,22,28,.55)` |
| 文字 | `#F6EFE7` |
| 次文字 | `#A49B91` |
| 主强调 | `#FFB27A` 蜜桃 |
| 次强调 | `#7BE0D0` 薄荷 |
| 边线 | `rgba(255,255,255,.12)` |

- 背景：当前形象模糊图 + 径向暗角
- 信息卡：玻璃，不是白卡

### 浅色（黎明纸感）

| Token | 值 |
|---|---|
| 背景 | `#F3ECE2` |
| 玻璃 | `rgba(255,255,255,.62)` |
| 文字 | `#2A211C` |
| 次文字 | `#8A7B6E` |
| 主强调 | `#E8663C` |
| 次强调 | `#2F9E8F` |
| 边线 | `rgba(42,33,28,.14)` |

- 背景：暖色渐变 + 当前形象淡化图
- 玻璃用白色半透明，不用纯白卡片

主题默认 `system`，设置里可切浅色/深色。

---

## 四、组件行为

### 顶部 tab

- 6 项，等距，13px
- 当前项 2px 主色下划线，位置与 tab 同宽
- 支持 `←/→` 在 tab 间移动，`Enter` 进入
- 不做路由跳转，单页切换内容

### 底部 shelf

- 横向滚动，`overflow-x: auto`，隐藏滚动条
- 每项 150×156，当前项 `translateY(-12px) scale(1.04)`
- 当前项描边主色 + 内阴影
- 支持鼠标滚轮横向、`←/→`、`Home/End`
- `Enter` 使用，`D` 下载（仅大厅）
- 两侧渐隐，避免截断

### 信息卡

- 316px 宽，玻璃，24px blur
- 名称 34px，正文 12px
- 按钮不超过 3 个
- 动作：主按钮 + 2 个次按钮

### 背景氛围

- 由当前形象的**缩略图**生成，不直接用 512 大图
- 先离线/缓存成 64×64 模糊图，再放大铺底
- 禁止每帧对背景做 `filter: blur()`；只在切换形象时换图
- 叠加暗角保证文字对比度

---

## 五、性能

| 项 | 目标 |
|---|---|
| 空闲 CPU | 与旧版持平（±1%） |
| 切换形象 | <100ms 出图 |
| shelf 滚动 | 60fps |
| 内存增量 | ≤80MB |
| 背景模糊 | 静态层，不参与动画 |

注意：

- 390px 大图会放大；用 `image-rendering: auto`，不要每帧 transform
- 背景图用 CSS `background-image`，不额外叠 `filter` 动画
- 低端机可降低氛围图分辨率

---

## 六、验收

- [ ] 没有左侧栏，6 项 tab 可切换
- [ ] 当前宠物首屏可见，切换 ≤2 次点击
- [ ] shelf 横向滚动 / 键盘可用，选中项抬起
- [ ] 大厅详情含作者/许可/大小/版本
- [ ] 设置页为玻璃表单，不是卡片列表
- [ ] 深色/浅色都成立，切换即时
- [ ] 1040×700 / 900×620 / 125% / 150% 不裁切
- [ ] 空闲 CPU 与旧版持平
- [ ] L2/L3/自定义角色均正常

---

## 七、B 线改动

| 文件 | 改动 |
|---|---|
| `src/main/settings-window.ts` | 1040×700、无边框/自绘标题栏（或保留系统边框，二选一） |
| `src/renderer/settings/index.html` | 新壳：top tabs + stage + info + shelf |
| `src/renderer/settings/settings.ts` | 页面切换、shelf 键盘、主题 |
| `src/renderer/settings/settings.css` | 沉浸式 token/玻璃/舞台/shelf |
| `src/preload` | 无需新增（复用现有 API） |
| 新组件 | `Shelf`、`TopTabs`、`GlassPanel`、`Atmosphere` |

估时：

- 壳 + tab + 我的形象 + 主题：4–5 天
- 大厅：3–4 天
- 设置页迁移：2–3 天
- 右键面板：3–4 天（独立 issue）

---

## 八、C 线交付

- 三张核心稿（深/浅各一套）：
  [`immersive.png`](mockups/shots/immersive.png)、[`hall-immersive.png`](mockups/shots/hall-immersive.png)、[`settings-immersive.png`](mockups/shots/settings-immersive.png)
- 浅色：
  [`immersive-light.png`](mockups/shots/immersive-light.png)、[`hall-immersive-light.png`](mockups/shots/hall-immersive-light.png)、[`settings-immersive-light.png`](mockups/shots/settings-immersive-light.png)
- 右键面板：
  [`quick-panel-immersive.png`](mockups/shots/quick-panel-immersive.png)、[`quick-panel-immersive-light.png`](mockups/shots/quick-panel-immersive-light.png)
- HTML 源：
  [`immersive.html`](mockups/immersive.html)、[`hall-immersive.html`](mockups/hall-immersive.html)、[`settings-immersive.html`](mockups/settings-immersive.html)
- 样式：
  [`immersive.css`](mockups/immersive.css)、[`immersive-light.css`](mockups/immersive-light.css)
- 光晕：[`glow-color.md`](glow-color.md)
- 交接：[`c-line-handoff.md`](c-line-handoff.md)

后续需补：空状态/加载态、shelf 图标、大厅 8 张封面、动效标注。
