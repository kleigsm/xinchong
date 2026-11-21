# 2026-11-21 · 导航改造设计定稿（浅色 + 深色）

## 决策

- 方案 B：控制中心 + 右键快捷面板
- 视觉：浅色（暖奶油）+ 深色（工作室）双主题，默认跟随系统
- 导航合并为 6 项：我的形象 / 外观大厅 / 声音台词 / 行为 / 系统 / 关于
- 外观大厅第一期只做策展 + 静态下载，不做上传/账号
- 右键替换原生菜单，作为独立 issue

## 交付

- `docs/design/navigation-redesign.md`：信息架构、分期、验收
- `docs/design/design-system.md`：双主题 token、组件、状态、适配
- `docs/design/tasks/nav-redesign.md`：B 线任务书
- `docs/design/mockups/`：
  - 浅色/深色：我的形象、外观大厅、右键面板
  - HTML 高保真源 + 截图 + 对比图
- `docs/design/quick-panel-request.md` / `quick-panel-issue.md`：右键面板建议与 issue 文案

## 验证

- 高保真稿 1040×700，2x 截图
- 浅色/深色同一结构，只切 CSS 变量
- 大厅 6 个策展卡片 + 详情面板
- 右键面板 306px，含 4 动作/性格/音量/开关

## 待办

- 提交右键面板 issue（脚本/预填链接已备）
- B 线按 `docs/tasks/nav-redesign.md` 做 P1

## 追加（同日）

- 新增 `docs/design/glow-color.md`：桌宠光晕独立层、自定义颜色/强度、调色板与吸管方案
- 新增 `docs/design/style-direction.md`：UI 风格审计与三个升级方向
- 新增高保真：
  - `shots/home-sticker-light.png` / `home-sticker-dark.png`
  - `shots/glow-picker.png` / `glow-picker-dark.png`
- 参考：Playful Cream Sticker、Candy OS、Xsolla ColorPicker
- 待拍板：风格选 A/B/C、光晕默认是否跟随性格

## 追加二（结构级风格方案）

- 新增 `docs/design/style-alternatives.md`：栖息地 / 编辑图鉴 / 街机 / 复古 OS / Swiss 五个方向
- 新增高保真：`shots/editorial.png`、`shots/habitat.png`
- 参考：龙虾的小家园、DSH Pet Bedroom、Retro Zine、editorial-minimal、Hero Choice、Windows 95、HyperAktiv
- 推荐组合：栖息地（首页）+ 编辑图鉴（大厅/设置）
- 待拍板：A/B/C、是否去掉传统侧栏、是否接受信息密度下降

## 追加三（第二批风格参考）

- 新增 `shots/immersive.png`：沉浸式游戏库（Wallpaper Engine / Steam Big Art / PS5）
- `style-alternatives.md` 增加 F 沉浸式、G Raycast、H Playdate、I Y2K
- 推荐改为：沉浸式首页 + 编辑图鉴大厅/设置
- 参考：Steam Big Art、PS5 改版、Wallpaper Engine 截图、Raycast、Playdate

## 追加四（布局定稿：沉浸式游戏库）

- 选定 **F 沉浸式游戏库**：无左侧栏、顶部 6 tab、全屏氛围、玻璃信息卡、底部横向 shelf
- 新增：
  - `docs/design/immersive-layout.md` 布局/主题/性能/验收
  - `mockups/immersive.css`
  - `hall-immersive.html` / `settings-immersive.html`
  - 截图：`immersive.png`、`hall-immersive.png`、`settings-immersive.png`
- 更新 `docs/tasks/nav-redesign.md`：B 线按沉浸式布局实现
- 6 项导航：我的形象 / 外观大厅 / 声音 / 行为 / 系统 / 关于

## 追加五（C 线收尾）

- 补浅色沉浸式三页：`immersive-light`、`hall-immersive-light`、`settings-immersive-light`
- 补右键面板新视觉：`quick-panel-immersive` / `quick-panel-immersive-light`
- 新增 `docs/design/c-line-handoff.md`：交付清单、C 线自查、B 线输入、待确认
- 新增 `immersive-light.css`
- C 线设计部分到此收口，代码由 B 线按 `docs/tasks/nav-redesign.md` 实现
