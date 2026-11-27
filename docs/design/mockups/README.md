# 设计样例：控制中心 / 外观大厅 / 右键面板

> 对应方案 [navigation-redesign.md](../navigation-redesign.md) 的 B 方案。
> 这组是 **HTML 高保真稿**，用于定视觉和布局，不是最终代码。

## 看哪几张

| 文件 | 内容 |
|---|---|
| [`shots/home-light.png`](shots/home-light.png) | 我的形象 · 浅色（暖奶油） |
| [`shots/home-dark.png`](shots/home-dark.png) | 我的形象 · 深色（工作室） |
| [`shots/home-sticker-light.png`](shots/home-sticker-light.png) | 我的形象 · 浅色（贴纸手账） |
| [`shots/home-sticker-dark.png`](shots/home-sticker-dark.png) | 我的形象 · 深色（夜光手账） |
| [`shots/hall-light.png`](shots/hall-light.png) | 外观大厅 · 浅色 |
| [`shots/hall-dark.png`](shots/hall-dark.png) | 外观大厅 · 深色 |
| [`shots/quick-panel.png`](shots/quick-panel.png) | 右键快捷面板 · 浅色 |
| [`shots/quick-panel-dark.png`](shots/quick-panel-dark.png) | 右键快捷面板 · 深色 |
| [`shots/glow-picker.png`](shots/glow-picker.png) | 桌宠光晕调色板 · 浅色 |
| [`shots/glow-picker-dark.png`](shots/glow-picker-dark.png) | 桌宠光晕调色板 · 深色 |
| [`shots/editorial.png`](shots/editorial.png) | 编辑图鉴 / Riso 风格（新） |
| [`shots/habitat.png`](shots/habitat.png) | 栖息地 / 小屋风格 |
| [`shots/immersive.png`](shots/immersive.png) | 沉浸式游戏库 · 我的形象（深色） |
| [`shots/immersive-light.png`](shots/immersive-light.png) | 沉浸式游戏库 · 我的形象（浅色） |
| [`shots/icon-sheet.png`](shots/icon-sheet.png) | 图标系统：12 个功能图标 + 品牌标记 |
| [`shots/hall-immersive.png`](shots/hall-immersive.png) | 沉浸式游戏库 · 外观大厅（深色） |
| [`shots/hall-immersive-light.png`](shots/hall-immersive-light.png) | 沉浸式游戏库 · 外观大厅（浅色） |
| [`shots/settings-immersive.png`](shots/settings-immersive.png) | 沉浸式游戏库 · 设置页（深色） |
| [`shots/settings-immersive-light.png`](shots/settings-immersive-light.png) | 沉浸式游戏库 · 设置页（浅色） |
| [`shots/quick-panel-immersive.png`](shots/quick-panel-immersive.png) | 右键面板 · 深色 |
| [`shots/quick-panel-immersive-light.png`](shots/quick-panel-immersive-light.png) | 右键面板 · 浅色 |
| [`shots/compare-light-dark.png`](shots/compare-light-dark.png) | 浅色/深色对比 |

> 浅色/深色不是二选一，是同一套结构的两个主题；默认跟随系统。
> 贴纸手账是风格升级候选，见 [style-direction.md](../style-direction.md)。
> 更彻底的结构方案（编辑图鉴 / 栖息地 / 街机 / 复古 OS）见 [style-alternatives.md](../style-alternatives.md)。

## 设计要点

### 我的形象

- 当前宠物占首屏 1/3，大图 + 性格 + 快捷动作
- 形象卡片 3:4，保留棋盘格透明底
- 「使用中」用珊瑚描边 + 角标，不用大色块
- 导入入口做成第 4 张虚线卡，降低“设置表单”感

### 外观大厅

- 顶部本周推荐 banner，先给“逛”的感觉
- 分类 chips + 3 列卡片 + 右侧详情
- 详情固定展示：作者、许可、大小、版本、更新时间
- 下载按钮是唯一主行动，预览是次行动

### 右键面板

- 306px 宽，毛玻璃浅色卡
- 高频四动作：招手 / 摸头 / 睡觉 / 隐藏
- 性格、音量、静音、勿扰一屏完成
- 低频的导入/删除不放这里，统一进控制中心

## 文件

```
mockups/
├── mockup.css
├── home.html          ?dark 切深色
├── hall.html
├── quick-panel.html
├── assets/            三套内置宠物首帧
└── shots/
```

## 说明

- 宠物图是内置角色首帧裁剪，仅用于设计稿
- 大厅卡片用 hue-rotate 做了 6 个配色变体，不是真实素材
- 字体按 Windows 默认：Segoe UI / 微软雅黑
- 窗口尺寸按 1040×700 设计，1366×768 / 125% 下可用
- 主题切换只换 CSS 变量，完整 token 见 [design-system.md](../design-system.md)

