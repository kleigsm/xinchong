# 任务书 · 骨骼宠物 POC 运行时（B 线）

**负责人**：高晟铭（B 交互与动画）
**估时**：2 天
**分支**：`feat/poc-rig-runtime`
**性质**：只做运行时验证，不接 AI、不做用户导入

---

## 一、要做什么

用 C 线已经做好的四足狗模板，在 Electron 里跑通：

1. 加载 `docs/specs/rig-poc/templates/dog/`
2. 播放 8 个动作：idle / click / drag / sleep / wave / stretch / pat / angry
3. 按 `acceptance.md` 采集性能数据
4. D2 给出 **go / no-go** 结论

C 线的骨骼、图层、动作参数、`pet-rig.json` 都已经交付，不需要你重画。

---

## 二、输入

```
docs/specs/rig-poc/
├── README.md
├── skeleton-spec.md
├── action-spec.md
├── rig-format.md
├── acceptance.md
└── templates/dog/
    ├── pet-rig.json
    ├── 8 个分层 PNG
    ├── bones-guide.png
    └── preview.png
```

先读 `rig-format.md` 和 `acceptance.md`，再动手。

---

## 三、运行时要求

接口：

```ts
interface RigPlayer {
  load(packDir: string): Promise<void>;
  play(action: string, opts?: { loop?: boolean; speed?: number }): void;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  destroy(): void;
}
```

- 骨骼位置是画布绝对坐标，layer pivot 也是绝对坐标
- 旋转围绕 pivot；父骨骼变换要传递
- dt 钳制 ≤1/30s
- 支持 DPR 2.0
- 加载失败给明确文件名，不白屏

动作参数见 `action-spec.md`，不要自己发明幅度。

---

## 四、边界

```
✅ 允许：src/renderer/rig/**、必要的 demo 入口、tests
❌ 禁止：改 L2/L3 现有逻辑、改 C1/C2 音效、接任何 AI 模型
```

- 先做一个独立 demo 页面/入口即可，不要求进设置面板
- 不要求用户导入，只加载仓库内模板

---

## 五、验收

按 `acceptance.md` 逐条填，重点：

| 项 | 标准 |
|---|---|
| idle CPU | ≤5% 单核 |
| 交互帧率 | ≥30fps |
| 8 个动作 | 无错位、无穿模 |
| 交互映射 | 单击/双击/长按/连点/睡觉/拖拽正确 |
| 回归 | L2/L3 角色仍正常 |

**No-Go 红线**：idle CPU >8%、2 个以上动作明显错位、需要 GPU、破坏 L2/L3。

---

## 六、交付

- 可运行的 POC demo
- `docs/log/<日期>-poc-rig-runtime.md`：实现方式、性能数据、结论
- `docs/STATUS.md` 更新
- PR 标题 `[POC] 骨骼宠物运行时验证`

---

## 七、已知风险

- 耳朵/尾巴弹簧参数可能需要现场微调（C 线配合）
- 图层旋转时边缘可能露缝（C 线补重叠）
- Canvas 2D 在 4K/150% 缩放下要单独测

---

## 八、D2 结论

只允许两种：

1. **继续 P1**：四套骨骼 + 8 动作 + 单图切层排期
2. **退回分层 PSD 导入**：不做自动绑骨

结论写进 `docs/log/` 和 `docs/DECISIONS.md`。
