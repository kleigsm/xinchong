# 2026-11-11 · 骨骼宠物 POC：模板与验收

## 背景

自定义宠物目前只有 L2（单图整图 transform）和 L3（逐帧雪碧图），
做不了肢体动作。调研后决定先验证「分层图 + 骨骼 + 程序化动作」路线，
不直接接 AI。

## 产出

```
docs/specs/rig-poc/
├── README.md             POC 范围/时间盒/go-no-go
├── skeleton-spec.md      4 套骨骼模板（POC 只做四足狗）
├── action-spec.md        8 个动作的关键帧与弹簧参数
├── rig-format.md         pet-rig.json 格式与运行时 API
├── acceptance.md         LOAD/VIS/ACT/INT/PERF/COMPAT/LIC 验收清单
└── templates/dog/
    ├── pet-rig.json      10 骨骼 / 9 图层 / 8 动作
    ├── 8 个分层 PNG
    ├── bones-guide.png   骨骼位置参考
    └── preview.png       合成预览
```

## POC 范围

- 只做四足狗
- 8 个动作：idle / click / drag / sleep / wave / stretch / pat / angry
- 运行时由 B 线实现，C 线负责骨骼/图层/动作规格与视觉验收

## 验证

- `pet-rig.json` 解析通过：10 骨骼、9 图层、8 动作
- 所有图层均为 512×512 PNG，文件存在
- 骨骼 parent / layer.bone 引用无缺失

## 下一步（B 线）

1. 按 `rig-format.md` 实现 `RigPlayer.load/play/update/draw`
2. 用 `templates/dog` 跑 idle + click
3. 按 `acceptance.md` 采集 CPU/内存/帧率
4. D2 给 go/no-go 结论
