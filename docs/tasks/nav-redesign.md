# 任务书 · 沉浸式控制中心（B 线）

**负责人**：高晟铭（B 交互与动画）
**分支**：`feat/nav-immersive`
**C 线输入**：[沉浸式布局规格](../design/immersive-layout.md) · [高保真稿](../design/mockups/README.md) · [光晕](../design/glow-color.md)

---

## 一、目标

把 760×580 的设置面板，改成 **1040×700 沉浸式控制中心**：

- 没有左侧栏；顶部 6 项 tab
- 当前宠物占首屏，全屏氛围背景
- 右侧玻璃信息卡
- 底部横向 shelf 管理形象
- 深色默认 + 浅色可选
- 外观大厅第一期只做策展 + 静态下载

---

## 二、不做什么

- 不做用户上传 / 账号 / 评论 / 支付
- 不重写桌宠透明窗和动画状态机
- 不引入 React/Vue/UI 框架
- P1 不接真实下载
- 不改 C1 台词 / C2 音效逻辑

---

## 三、P1：壳 + 我的形象（4–5 天）

### 交付

1. 窗口 1040×700，最小 900×620
2. 自绘标题栏（拖动区 + 最小化/关闭）
3. 顶部 6 tab：我的形象 / 外观大厅 / 声音 / 行为 / 系统 / 关于
4. 我的形象：
   - 全屏氛围背景（当前形象缩略图模糊，静态层）
   - 390px 大形象 + 光晕 + 地面阴影
   - 右侧玻璃信息卡：名字/性格/描述/chips/4 动作
   - 底部 shelf：内置 + 精选 + 导入；当前项抬起、描边
   - 键盘 ← → / Enter
5. 主题：
   - `settings.theme: "system" | "light" | "dark"`
   - 默认 system，监听 `nativeTheme`
   - 只切 CSS 变量
6. 设置页迁移：
   - 声音/行为/系统/关于用“玻璃表单 + 发丝行”，不再用卡片
   - 聊天从一级导航收进系统

### 验收

- [ ] 无左侧栏，6 tab 可切换
- [ ] 当前形象首屏可见，切换 ≤2 次
- [ ] shelf 滚动/键盘可用，当前项抬起
- [ ] 深色/浅色即时切换并持久化
- [ ] 1040×700 / 900×620 / 125% / 150% 不裁切
- [ ] L2/L3/自定义角色正常
- [ ] `pnpm typecheck && pnpm test && pnpm build` 通过

---

## 四、P2：右键快捷面板（3–4 天，独立 issue）

见 [quick-panel-request.md](../design/quick-panel-request.md)。

- 独立分支 `feat/quick-panel`
- 306px 透明玻璃面板
- 4 动作 + 性格 + 音量 + 静音/勿扰
- 点击外部/Esc/失焦关闭，多屏翻转
- 异常回落原生菜单

---

## 五、P3：外观大厅（3–4 天）

- 静态 `catalog.json` + 预览图 + zip
- 顶部筛选 chips，底部 shelf 策展
- 右侧详情：作者/许可/大小/版本/更新时间
- 下载到 `%APPDATA%/xinchong/pets/<id>`
- sha256 校验、防路径穿越
- 已下载进「我的形象」
- 断网提示

---

## 六、C 线交付

| 文件 | 内容 |
|---|---|
| `docs/design/immersive-layout.md` | 布局、tab、shelf、玻璃、主题、性能、验收 |
| `docs/design/mockups/shots/immersive.png` | 我的形象（深色） |
| `docs/design/mockups/shots/immersive-light.png` | 我的形象（浅色） |
| `docs/design/mockups/shots/hall-immersive.png` | 外观大厅（深色） |
| `docs/design/mockups/shots/hall-immersive-light.png` | 外观大厅（浅色） |
| `docs/design/mockups/shots/settings-immersive.png` | 设置页（深色） |
| `docs/design/mockups/shots/settings-immersive-light.png` | 设置页（浅色） |
| `docs/design/mockups/shots/quick-panel-immersive.png` | 右键面板（深/浅） |
| `docs/design/mockups/immersive.css` | 深色样式参考 |
| `docs/design/mockups/immersive-light.css` | 浅色样式参考 |
| `docs/design/glow-color.md` | 光晕自定义方案 |
| `docs/design/c-line-handoff.md` | C 线交付清单与验收 |

后续按需补：浅色稿、空状态/加载态、shelf 图标、动效标注。

---

## 七、风险

| 风险 | 处理 |
|---|---|
| 背景模糊耗 GPU | 用 64×64 预模糊图，静态层，不在动画里 blur |
| 大图 390px 放大发虚 | 用 512/1024 立绘，`image-rendering:auto` |
| shelf 横向滚动在触控板不跟手 | 支持 Shift+滚轮 + 键盘 |
| 浅色模式对比度不足 | 玻璃白 + 深墨文字，暗角改亮角 |
| 自绘标题栏拖动/双击 | `-webkit-app-region: drag`，按钮 no-drag |
| 旧设置页状态丢失 | 复用 patchSettings，不重写 store |

---

## 八、依赖

- 现有 `import-flow` / `pet-switch` / `store` 不改接口
- 右键面板依赖 P1 的 CSS token 与 preload API
- 大厅依赖 C 线 catalog 格式与素材

---

## 九、D2 检查点

P1 结束先给可点的控制中心（不用等大厅），
按 `docs/WORKFLOW.md` 收工：STATUS + 日志 + 截图 + 性能数据。
