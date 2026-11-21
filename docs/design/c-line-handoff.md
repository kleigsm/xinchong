# C 线交付清单：沉浸式控制中心

> 状态：**设计部分完成，等 B 线实现**
> 方向：沉浸式游戏库（Wallpaper Engine / Steam Big Art / PS5）
> 日期：2026-11-21

---

## 一、已交付

| 文件 | 内容 |
|---|---|
| [`immersive-layout.md`](immersive-layout.md) | 结构、6 tab、shelf、玻璃、主题、性能、验收 |
| [`mockups/shots/immersive.png`](mockups/shots/immersive.png) | 我的形象 · 深色 |
| [`mockups/shots/immersive-light.png`](mockups/shots/immersive-light.png) | 我的形象 · 浅色 |
| [`mockups/shots/hall-immersive.png`](mockups/shots/hall-immersive.png) | 外观大厅 · 深色 |
| [`mockups/shots/hall-immersive-light.png`](mockups/shots/hall-immersive-light.png) | 外观大厅 · 浅色 |
| [`mockups/shots/settings-immersive.png`](mockups/shots/settings-immersive.png) | 声音/设置页 · 深色 |
| [`mockups/shots/settings-immersive-light.png`](mockups/shots/settings-immersive-light.png) | 声音/设置页 · 浅色 |
| [`mockups/shots/quick-panel-immersive.png`](mockups/shots/quick-panel-immersive.png) | 右键面板 · 深色 |
| [`mockups/shots/quick-panel-immersive-light.png`](mockups/shots/quick-panel-immersive-light.png) | 右键面板 · 浅色 |
| [`mockups/shots/glow-picker.png`](mockups/shots/glow-picker.png) | 光晕调色板 · 浅色 |
| [`mockups/shots/glow-picker-dark.png`](mockups/shots/glow-picker-dark.png) | 光晕调色板 · 深色 |
| [`glow-color.md`](glow-color.md) | 光晕独立层、颜色/强度/吸管方案 |
| [`mockups/immersive.css`](mockups/immersive.css) | 深色样式参考 |
| [`mockups/immersive-light.css`](mockups/immersive-light.css) | 浅色样式参考 |
| [`nav-redesign.md`](../tasks/nav-redesign.md) | B 线任务书 |
| [`quick-panel-request.md`](quick-panel-request.md) | 右键面板 issue 文案 |

HTML 源稿都在 [`mockups/`](mockups/)：
`immersive.html`、`hall-immersive.html`、`settings-immersive.html`、`quick-panel-immersive.html`、`glow-picker.html`。

---

## 二、C 线自查

### 布局

- [x] 没有左侧栏
- [x] 顶部 6 项 tab：形象 / 大厅 / 声音 / 行为 / 系统 / 关于
- [x] 当前宠物首屏主角
- [x] 右侧玻璃信息卡，不是白卡列表
- [x] 底部横向 shelf，当前项抬起 + 描边
- [x] 设置页为玻璃表单 + 发丝行

### 主题

- [x] 深色：`#0D0C11` + 蜜桃 `#FFB27A`
- [x] 浅色：`#F3ECE2` + 朱红 `#E8663C`
- [x] 三页都有深/浅两版
- [x] 只切 CSS 变量，不换 DOM

### 光晕

- [x] 独立层方案，动画期间不消失
- [x] 8 个预设色
- [x] 系统取色器 + HEX + 吸管
- [x] 强度滑杆 / 跟随性格 / 最近使用
- [x] 浅色/深色调色板

### 右键面板

- [x] 306px 玻璃面板
- [x] 4 动作 + 性格 + 音量 + 静音/勿扰
- [x] 深/浅两版
- [x] 已写 issue 文案

---

## 三、给 B 线的输入

1. 先读 [`immersive-layout.md`](immersive-layout.md) 和 [`nav-redesign.md`](../tasks/nav-redesign.md)
2. 样式可直接参考 `immersive.css` / `immersive-light.css`
3. 图片资产：内置宠物首帧已裁在 `mockups/assets/`
4. 大厅卡片当前是 hue-rotate 模拟，不是真实素材；B 实现时用 catalog 预览图
5. 背景模糊必须用 64×64 预模糊图，不要每帧 `filter: blur`
6. 光晕按 [`glow-color.md`](glow-color.md) 做独立层

---

## 四、待确认（需要你/产品拍板）

1. 光晕默认**跟随性格**还是固定粉色？建议跟随性格。
2. 最近使用颜色存 5 个，是否够？
3. 大厅第一期 8 个策展位，C 线后续补 8 张封面 + catalog 示例。
4. 右键面板 issue 还没提交，需要 PAT 或网页提交。
5. 浅色是否需要单独的“纸感”背景图？当前是 CSS 渐变。

---

## 五、边界

C 线到此为止：

- 设计稿、token、样式参考、光晕方案、issue 文案、任务书
- **不改 `src/` 代码**
- B 线实现后，C 线负责视觉验收、素材补充、文案

下一步：B 线按 P1 开工；C 线可同步补大厅封面与空/加载态。
