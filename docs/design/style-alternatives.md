# 更多 UI 风格参考（跳出“AI 模板感”）

> **已选（2026-11-21）：F 沉浸式游戏库。**
> 定稿规格见 [immersive-layout.md](immersive-layout.md)，
> 三张核心稿见 `mockups/shots/immersive.png`、`hall-immersive.png`、`settings-immersive.png`。

> 上一版的问题：虽然换了描边和硬阴影，但仍然是**左侧栏 + 大卡片 + 卡片网格**。
> 只要结构不变，看起来就还是“AI 生成的 dashboard”。
> 这次换的是**界面隐喻**，不是换皮。

---

## 一、为什么会有“AI 味”

| 常见模板特征 | 我们的现状 |
|---|---|
| 左侧竖向导航 + 顶部标题 + 右侧内容 | 完全一致 |
| 大圆角白卡片 + 柔和阴影 | 完全一致 |
| 一个主色 + 大量留白 | 完全一致 |
| 卡片网格装所有东西 | 形象、外观、设置全是网格 |
| 无纹理、无印刷感、无空间 | 纯数字平面 |
| 字体系统只有无衬线 | 只有 Segoe UI / 雅黑 |

**结论：要改的是信息架构和视觉语法，不是圆角大小。**

---

## 二、五个完全不同的方向

### A. 栖息地 / 小屋（最贴产品）

不是“设置面板”，而是宠物住的一个房间：

- 导航是墙上的木牌/门/抽屉
- 形象是衣柜里挂着的盒子/相框
- 外观大厅是“窗外商店”或“书架上的目录”
- 宠物站在地毯上，是画面主角
- 设置项变成房间里的物件（收音机=声音、时钟=行为）

参考：

- 龙虾的小家园：850×560 花园窗口、四场景、家具/状态
  https://skillhub.360.com/skills/pixel-desktop-pet
- DSH Pet Bedroom：房间式桌面宠物面板
  https://www.dsh.so/artifact/dsh-pet-bedroom/

样例：[`mockups/shots/habitat.png`](mockups/shots/habitat.png)

**优点**：最不像模板，情感最强，和“桌面宠物”天然契合
**缺点**：美术工作量大；设置类表单要塞进场景，信息密度低；深色模式要重画光照

---

### B. 编辑图鉴 / Riso 印刷（最像“设计过的产品”）

把控制中心做成一本印刷图鉴：

- 没有卡片，只有**编号索引 + 细线 + 大标题**
- 超大衬线标题、等宽小标签、单一朱红强调
- 宠物是整页“肖像”，不是小卡片
- 外观大厅是 lookbook / 目录页
- 设置项是书页里的表单，不是白卡

参考：

- Retro Zine（riso 印刷、卡其纸、森林绿、印刷颗粒）
  https://github.com/zarazhangrui/beautiful-html-templates/blob/main/templates/retro-zine/design.md
- editorial-minimal（暖纸、墨黑、朱红、超大衬线、发丝网格、索引）
  https://raw.githubusercontent.com/NeverSight/skills_feed/refs/heads/main/data/skills-md/madebymustafa/design-taste/editorial-minimal/SKILL.md

样例：[`mockups/shots/editorial.png`](mockups/shots/editorial.png)
源文件：[`mockups/editorial.html`](mockups/editorial.html)

**优点**：最容易做出“不是 AI”的高级感；实现主要是排版，成本可控
**缺点**：可爱度下降；信息密度高；小屏幕/中文长标题需要调

---

### C. 街机选人 / 卡带墙（最游戏化）

- 全屏角色 roster，横向排列，当前角色放大
- 大号街机字、玩家 1/2 标签、SELECT 按钮
- 外观大厅是“卡带墙/手办盒”
- 设置是暂停菜单/OPTIONS

参考：

- Hero Choice / Anime Fighter Select（角色选择布局）
  https://www.summerengine.com/de/asset-store/hero-choice-game-selection-ui-c1e78328
  https://www.summerengine.com/asset-store/anime-fighter-select-panel-84a4d066

**优点**：形象展示效果最好，用户一眼记住
**缺点**：像游戏，不像陪伴工具；设置页很难塞；中文街机字库要另找

---

### D. 复古桌面 OS（最情怀）

- 窗口、标题栏、任务栏、像素图标
- 点阵桌面、bevel 边框、95 风格按钮
- 外观大厅是“我的电脑/文件夹”
- 右键面板天然像系统菜单

参考：

- Windows 95 Web Designer
  https://github.com/curiositech/some_claude_skills/blob/d47e2e5ded912f448b36da6c391be724d3e50496/website/docs/skills/windows_95_web_designer/index.md
- Flutter Retro OS 组件
  https://pub.dev/packages/zeba_academy_retro_os

**优点**：非常有个性，和“桌面宠物”有梗
**缺点**：容易变廉价/kitsch；可读性和无障碍差；和现代 Windows 不协调

---

### E. Swiss / HyperAktiv 平面（最克制）

- 纯白/纯蓝大色块，完全无阴影、无渐变、无圆角（按钮除外）
- 超紧行高、超大标题、严格网格
- 只有排版和色块，没有“卡片”
- 外观大厅像海报墙

参考：

- HyperAktiv
  https://styles.refero.design/style/d19c6fc3-1fc6-44a0-9c22-a0a82f7f79b4
- Control editorial
  https://styles.refero.design/style/f4e3f701-0fa0-4601-b652-ecfc5c573f86

**优点**：极简、耐看、开发成本低
**缺点**：冷；和桌宠的可爱气质冲突；深色模式需要重新设计

---

### F. 沉浸式游戏库（Wallpaper Engine / PS5 / Steam Big Art）

- 全屏氛围背景，当前宠物是画面主角
- 顶部少量文字导航，不是左侧栏
- 右侧一块玻璃信息卡，不是一排白卡
- 底部横向“卡带架/大图 shelf”，选中项抬起
- 没有卡片网格，没有大圆角白面板

参考：

- Steam Big Art Mode：底部大型竖向 shelf
  https://www.techpowerup.com/352567/steam-gets-big-art-mode-in-latest-ui-overhaul
- PS5 2026 首页改版：全屏游戏、图标 tab
  https://screenrant.com/playstation-5-system-update-april-2026-redesign/
- Wallpaper Engine 截图库
  https://stmstat.com/tr/app/431960/screenshots

样例：[`mockups/shots/immersive.png`](mockups/shots/immersive.png)
源文件：[`mockups/immersive.html`](mockups/immersive.html)

**优点**：最接近你最初说的 Wallpaper Engine；现代、沉浸、形象展示最好
**缺点**：底部 shelf 仍是横向卡片，但已经不是 dashboard；设置页需要另一种排版承接

---

### G. 专业工具 / 命令面板（Raycast / Linear）

- 深色半透明、极窄侧栏、搜索优先
- 列表行 + 键盘快捷键，几乎不用卡片
- 右侧预览，操作靠 `⌘K` 式命令面板
- 信息密度高，像“专业软件”

参考：

- The New Raycast（Liquid Glass、launcher 感）
  https://www.rayca.st/blog/the-new-raycast

**优点**：效率最高，完全不像“AI 生成的大圆角”
**缺点**：偏工具，缺少陪伴感；对普通用户门槛高

---

### H. 1-bit / Playdate 像素（最反潮流）

- 400×240 级别分辨率、1-bit 黑白 + 一个强调色
- 点阵/抖动纹理、像素字、极简动效
- 导航像掌机 Home / 菜单
- 外观大厅像卡带盒

参考：

- Designing for Playdate
  https://help.play.date/ja/developer/designing-for-playdate/

**优点**：辨识度极高，和“桌宠”有玩具感
**缺点**：中文像素字库、可读性、商业化接受度都是风险

---

### I. Y2K / Frutiger Aero 玻璃（最怀旧）

- 高光玻璃、气泡、青绿色、金属/塑料质感
- 2000 年代科技乐观主义
- 圆润但不“AI 白卡”，更像旧式硬件 UI

**优点**：这两年回潮，辨识度高
**缺点**：容易廉价/kitsch；和现代 Windows 不协调；实现细节多

---

## 三、我的建议

### 首选：**F 沉浸式游戏库（首页）+ B 编辑图鉴（大厅/设置）**

- **首页**：全屏氛围 + 大形象 + 右侧玻璃信息卡 + 底部横向 shelf
- **外观大厅**：图鉴/目录页，不是白卡商店
- **声音/行为/系统**：编辑排版表单，承接 B 的排版
- 双主题：深色沉浸（默认）/ 浅色纸感

这样既保留 Wallpaper Engine 的“库”感，又不会回到 dashboard：

- 没有左侧栏 + 白卡片网格
- 宠物是画面主角
- 形象切换是横向 shelf，不是卡片列表
- 设置页用排版而不是一排卡片

### 备选

- 要**最独特、最有情感**：A 栖息地
- 要**最稳、最快出效果**：B 编辑图鉴
- 要**最游戏化**：C 街机选人
- 要**最高效/专业**：G Raycast 命令面板
- 要**最反潮流**：H Playdate 1-bit

### 如果只想选一个

- 首页/形象库：**F 沉浸式**
- 全站统一：**B 编辑图鉴**
- 想彻底不像软件：**A 栖息地**

---

## 四、不管选哪个，都要改的

1. **去掉“左侧栏 + 卡片网格”作为唯一骨架**
2. 导航从“按钮列表”变成一种**空间/物件/索引**
3. 引入**非无衬线字体**（衬线/等宽/压缩体）建立语气
4. 引入**印刷/材质/空间**中的至少一种质感
5. 主色不超过 2 个，强调色只出现在“当前选择/主行动”
6. 动效从“淡入+位移”改成“翻页/抽屉/弹簧”等符合隐喻的动作

---

## 五、需要拍板

1. 选 **A 栖息地 + B 图鉴**、纯 **B 图鉴**、还是 **C 街机**？
2. 首页是否接受“没有传统侧栏”，用木牌/索引导航？
3. 双主题是否保留“白天小屋 / 夜晚小屋”的方向？
4. 是否允许为了风格牺牲一部分设置页信息密度（更多翻页/展开）？
