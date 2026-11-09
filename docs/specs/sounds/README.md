# C2 音效素材

三套性格 × 5 类，共 **15 个 WAV**，全部为**本项目原创合成**，无第三方采样。

> 2026-11-10 更新：新增 4 个独立萌宠语音包（packs/，狗/猫/鸟/猪）。
> 本目录这 15 个合成音保留作为**加载失败兜底**，优先级低于 packs/。

## 文件

```
docs/specs/sounds/
├── README.md
├── LICENSE.md
├── manifest.json
├── shy/
│   ├── click.wav     0.26s
│   ├── drag.wav      0.55s
│   ├── sleep.wav     1.30s
│   ├── appear.wav    0.75s
│   └── confirm.wav   0.40s
├── cheerful/
│   ├── click.wav     0.22s
│   ├── drag.wav      0.45s
│   ├── sleep.wav     1.10s
│   ├── appear.wav    0.80s
│   └── confirm.wav   0.42s
└── tsundere/
    ├── click.wav     0.24s
    ├── drag.wav      0.38s
    ├── sleep.wav     0.90s
    ├── appear.wav    0.55s
    └── confirm.wav   0.32s
```

全部 44.1kHz / 单声道 / 16-bit，峰值约 -1dB，时长均 ≤3 秒。

## 声音设计

| 类别 | 害羞 shy | 开朗 cheerful | 傲娇 tsundere |
|---|---|---|---|
| click | 两声轻软正弦（E5→G5） | 三连上行三角波 | 短噪声 + 低方波“哼” |
| drag | 520→300Hz 轻滑音 | 700Hz 带抖动的下滑 | 330→196Hz 短下滑 + 气声 |
| sleep | 196Hz 呼吸感低鸣 | 523→392→330 下行 | 196Hz 短低音 + 叹气 |
| appear | C5-E5-G5 柔和的钟声 | C6-E6-G6-C7 明亮琶音 | 440→392 两音 |
| confirm | G5→C6 轻声确认 | C6-E6-G6 快速上行 | 880→660 清脆两下 |

## 接入说明（交给 B 线）

1. 文件可直接被 `fetch` / `Audio` 加载；打包时需要把 `docs/specs/sounds/**` 复制到 `resources/sounds/`，或作为 renderer asset 导入。
2. 当前 `SoundPlayer` 是 Web Audio 合成音，建议保留为**加载失败兜底**。
3. `PetPack.sounds` 现在的类型是 `Partial<Record<AnimationName, string>>`，只覆盖动画名；
   `appear` / `confirm` 不是 `AnimationName`，需要 B 线把类型扩成 `SoundEvent`：

```ts
type SoundEvent = AnimationName | "appear" | "confirm";
sounds?: Partial<Record<SoundEvent, string>>;
```

4. 播放规则建议：
   - 同一音效最多同时 2 个实例
   - 静音 / 勿扰直接不播
   - 播放失败静默回退到合成音
   - 音量归一化已在文件内完成，不要再叠加增益

## 重新生成

这些文件由脚本合成（正弦/三角/方波 + 包络 + 噪声），参数见 `manifest.json`。
如需调整音色，可重新生成同名文件，不要改文件名。

## 验收

- [x] 三套 × 5 类 = 15 个
- [x] 每个 ≤3 秒
- [x] WAV / 44.1kHz / 单声道
- [x] 无第三方素材，CC0 可商用
- [ ] 遮住名字盲听，能分辨三套性格（待人工试听）
