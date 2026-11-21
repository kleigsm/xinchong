# 萌宠语音包（v0.3）

四个**独立**主题包，每种动物一包；每包 **9 类动作 × 2 个变体 = 18 条**，共 **72 条**。

```
packs/
├── README.md / SOURCES.md / manifest.json
├── dog/    appear/click/confirm/drag/sleep/wave/stretch/pat/angry（各 -1/-2）
├── cat/    同上
├── bird/   同上
└── pig/    同上
```

- 44.1kHz / 单声道 / OGG Vorbis
- 峰值 -1dB，首尾淡入淡出
- 狗/猫/鸟：**CC0**；猪：**CC-BY 3.0**（需署名 Vinrax）

## 试听

打开 `docs/specs/sounds/packs-preview.html`（音频内嵌，单文件可播）。

## 动作与声音

| 动作 | 小狗 | 小猫 | 小鸟 | 小猪 |
|---|---|---|---|---|
| click | 短汪 | 短喵 | 啾 | 短哼 |
| drag | 呜咽 | 长喵 | 扑棱/啾 | 哼唧 |
| sleep | 鼻息 | 呼噜 | 轻啾 | 鼻息 |
| appear | 两声汪 | 喵呜 | 鸟鸣 | 哼 |
| confirm | 轻汪 | 咕噜 | 啾啾 | 哼唧 |
| wave | 两声短汪 | 短喵 | 啾啾 | 两声哼 |
| stretch | 哈欠/低呜 | 长喵 | 长啾 | 长哼 |
| pat | 轻哼 | 咕噜 | 轻啾 | 轻哼 |
| angry | 低吼 | 低吼/哈气 | 急促啾 | 短哼 |

## 接入（B 线）

已接入 `src/renderer/sound-packs.ts` 与 `src/renderer/assets/sounds/packs/`：

1. `SoundName` 已包含 wave / stretch / pat / angry
2. 设置「声音 → 音效主题」切换后，9 个动作都会走语音包
3. 没交付的音效仍回落性格音效 / 合成音
4. 用户自定义导入仍未做（BUG-018 的另一半）

## 署名

猪包必须署名：

> Pig SFX Pack by Vinrax (OpenGameArt), licensed under CC-BY 3.0.

其余包 CC0，无需署名，但来源仍记录在 `SOURCES.md`。

## 说明

- 新增的 wave/stretch/pat/angry 是从各自动物已有的 5 类音效**派生**的（变调、低通、拼接），没有引入新第三方素材
- 狗/猫后续还可以继续补更自然的原始录音
