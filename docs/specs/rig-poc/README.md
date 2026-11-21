# 骨骼宠物 POC：模板与验收

> 目的：用一只 8 层小狗，验证「分层图 + 骨骼 + 程序化动作」在 Electron 里能不能跑。
> 分工：C 线出模板/骨骼/动作规格/验收；B 线接运行时与性能测试。

---

## 一、POC 范围

只做 **四足狗** 一套模板，不碰 AI 生成、不碰用户导入。

| 项 | 范围 |
|---|---|
| 模板 | 只有 dog（四足） |
| 图层 | 8 层：后腿 ×2、身体、前腿 ×2、尾巴、头（含脸）、耳朵 ×2 |
| 动作 | 8 个：idle / click / drag / sleep / wave / stretch / pat / angry |
| 运行时 | Electron 渲染层，Canvas 2D 或 WebGL |
| 输入 | 固定 `pet-rig.json` + 分层 PNG |
| 不做 | 文字生成、单图切层、用户绑骨、L2/L3 迁移 |

---

## 二、文件

```
docs/specs/rig-poc/
├── README.md             ← 本文件
├── skeleton-spec.md      ← 4 套骨骼模板定义（POC 只实现 dog）
├── action-spec.md        ← 8 个动作的关键帧与弹簧参数
├── rig-format.md         ← pet-rig.json 格式
├── acceptance.md         ← 验收清单与 go/no-go
└── templates/dog/
    ├── pet-rig.json
    ├── body.png
    ├── head.png
    ├── ear-l.png / ear-r.png
    ├── front-leg-l.png / front-leg-r.png
    ├── back-leg-l.png / back-leg-r.png
    ├── tail.png
    ├── bones-guide.png    ← 骨骼位置参考图
    └── preview.png        ← 合成预览
```

---

## 三、POC 通过标准

- B 线能在 **2 天**内把 dog 模板加载进 Electron 并播放 8 个动作
- idle 空闲 CPU **≤5%**（30fps 上限）
- 8 个动作无明显抖动/穿插/错位
- 点击/拖拽/长按/双击/连点能正确切换动作
- 不破坏现有 L2/L3 角色

详见 `acceptance.md`。

---

## 四、时间盒

| 天 | 内容 |
|---|---|
| D1 | B 线跑通 loader + idle/click；C 线确认骨骼/图层对齐 |
| D2 | 补齐 8 个动作与性能数据，开 go/no-go 会 |

D2 结束必须给结论：**继续 P1** 或 **退回分层 PSD 导入**。
