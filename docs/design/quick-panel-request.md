# 建议申请：用 HTML 快捷面板替换原生右键菜单

> 状态：**待批准**
> 关联：[导航改造方案](navigation-redesign.md) · [高保真稿](mockups/README.md)
> 预估：B 线 3–4 天
> 建议分支：`feat/quick-panel`

---

## 一、问题

当前右键桌宠/托盘弹出的是 Electron 原生 `Menu`：

- Windows 默认样式，无法调圆角、间距、图标、动效
- 12 个一级项 + 「我的角色」「性格」「动作」「音量」4 个二级菜单
- 高频操作（招手、摸头、静音）被埋在二级里
- 与新的控制中心视觉完全脱节

导师反馈的“导航过于基础、人机化”，右键菜单是感受最直接的一处。

---

## 二、建议

把**桌宠右键**改成独立 HTML 快捷面板；托盘菜单可以保留原生（系统托盘用原生更合适）。

### 交互

- 右键桌宠 → 面板出现在鼠标右上方
- 超出屏幕自动翻转，限制在当前显示器工作区
- 点击外部 / Esc / 失焦 → 关闭
- 不占任务栏，不长时间抢焦点
- 面板内完成：招手、摸头、睡觉、隐藏、性格、音量、静音、勿扰
- 低频操作（导入、删除、系统设置）只放「打开控制中心」

### 视觉

见 [`shots/quick-panel.png`](mockups/shots/quick-panel.png)：

- 306px 宽，20–26px 圆角，浅色毛玻璃
- 顶部头像 + 名字 + 状态
- 4 个动作方块
- 性格分段、音量滑杆、两个开关
- 底部「打开控制中心 / 退出」

---

## 三、不做什么

- 不改托盘菜单（系统托盘保留原生）
- 不做圆形/环形菜单
- 不做多级子菜单
- 不在面板里做导入/删除
- 不引入新 UI 框架

---

## 四、实现建议（B 线）

### 主进程

```ts
// 伪代码
ipcMain.on("quick-panel:open", (_e, point: { x: number; y: number }) => {
  openQuickPanel(point);
});
```

- `BrowserWindow`: `transparent: true`, `frame: false`, `resizable: false`,
  `skipTaskbar: true`, `alwaysOnTop: true`, `show: false`
- 尺寸 320×420（内容 306 + 阴影边距）
- `screen.getDisplayNearestPoint(point)` 计算边界，翻转/夹取
- `blur` + `Esc` 关闭；建议隐藏复用，二次打开 <100ms
- 加载失败/异常时回落到原生菜单

### 渲染层

- 新页面 `src/renderer/quick-panel/`
- 复用设置页 CSS 变量和控件类
- 通过 preload 暴露：
  - `quickPanel.close()`
  - `quickPanel.action("wave" | "pat" | "sleep" | "hide")`
  - `quickPanel.patchSettings(partial)`
  - `quickPanel.openControlCenter()`
  - `quickPanel.quit()`

### 状态同步

- 面板打开时拉一次 `getSettings()` + `listPetSummaries()`
- 切换性格/音量后立即 `patchSettings`，并广播 `settings-changed`
- 关闭时不需要额外清理

---

## 五、风险

| 风险 | 处理 |
|---|---|
| 面板抢焦点，桌宠点击失效 | `showInactive()` + 关闭后恢复；必要时 `focusable:false` + 自定义键盘 |
| 失焦关闭与点击面板内按钮冲突 | 用 `blur` 延迟 80ms 关闭，或判断 `isFocused` |
| 多屏/DPI 位置错 | 统一用 DIP 坐标，`getDisplayNearestPoint` + 工作区夹取 |
| 透明窗口在部分显卡发黑 | 设置 `backgroundColor: "#00000000"`，失败回落原生菜单 |
| 启动慢 | 隐藏复用 + 预加载 |

---

## 六、验收

- [ ] 右键 100ms 内出现，位置不超出屏幕
- [ ] 点击外部 / Esc 关闭，不残留透明窗口
- [ ] 4 个动作、性格、音量、静音、勿扰全部生效
- [ ] 「打开控制中心」能正常打开
- [ ] 125% / 150% / 多屏不错位
- [ ] 键盘可操作（Tab/Enter/Esc）
- [ ] 异常时能回落原生菜单
- [ ] 空闲 CPU 与旧版持平

---

## 七、备选方案

| 方案 | 成本 | 结论 |
|---|---|---|
| 保留原生菜单，只精简层级 | 0.5 天 | 不解决“人机感”，不推荐 |
| 桌宠窗口内自绘菜单 | 2–3 天 | 透明窗点击穿透/焦点更复杂，不推荐 |
| **独立 HTML 面板** | 3–4 天 | **推荐** |

---

## 八、Issue 文案（可直接提交）

**标题**

```
[建议] 右键菜单改为 HTML 快捷面板
```

**正文**

```markdown
## 任务

导航改造 P1 的一部分：把桌宠右键从原生 Menu 换成 HTML 快捷面板。

**BACKLOG 编号**：无（建议）
**关联需求**：F2 点击反馈 / F3 性格切换 / 导航改造

## 这个问题

原生右键菜单 12 个一级项 + 4 个二级菜单，无法定制视觉，
高频操作（招手/摸头/静音）被埋在二级，和新的控制中心风格脱节。

## 建议

- 桌宠右键 → 独立透明 HTML 面板（306px 宽）
- 面板内：4 个动作、性格、音量、静音、勿扰、打开控制中心
- 托盘菜单保留原生
- 点击外部/Esc/失焦关闭，多屏自动翻转
- 异常回落原生菜单

设计稿：docs/design/mockups/shots/quick-panel.png

## 验收标准

- [ ] 100ms 内出现，不超出屏幕
- [ ] 点击外部/Esc 关闭，无残留
- [ ] 动作/性格/音量/开关全部生效
- [ ] 125%/150%/多屏不错位
- [ ] 键盘可操作
- [ ] 异常可回落原生菜单

## 依赖

控制中心的 CSS 变量与 preload API 可以先独立做。

## 预估

3–4 天（B 线）

## 备注

需要 B 线确认透明窗焦点方案；C 线提供设计稿与图标。
```
