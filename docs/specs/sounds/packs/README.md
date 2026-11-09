# 萌宠语音包（v0.2）

四个**独立**主题包，每种动物一包；每包 **5 类动作 × 2 个变体 = 10 条**，共 **40 条**。

```
packs/
├── README.md / SOURCES.md / manifest.json
├── dog/    click-1/2 … confirm-1/2
├── cat/    同上
├── bird/   同上
└── pig/    同上
```

- 44.1kHz / 单声道 / OGG Vorbis
- click ≤0.35s、drag ≤1.0s、sleep 1.5s、appear ≤0.8s、confirm ≤0.5s
- 峰值 -1dB，首尾淡入淡出
- 狗/猫/鸟：**CC0**；猪：**CC-BY 3.0**（需署名 Vinrax）

## 试听

打开 `docs/specs/sounds/packs-preview.html`（音频内嵌，单文件可播）。

## 四个包

| 包 | 点击 | 拖拽 | 睡觉 | 出现 | 确认 |
|---|---|---|---|---|---|
| 小狗 dog | 短汪 | 呜咽 | 鼻息 | 两声汪 | 轻汪 |
| 小猫 cat | 短喵 | 长喵/咕噜 | 呼噜 | 喵呜 | 咕噜 |
| 小鸟 bird | 啾 | 扑棱/啾 | 轻啾 | 鸟鸣 | 啾啾 |
| 小猪 pig | 短哼 | 哼唧/叫 | 鼻息 | 哼 | 哼唧 |

## 接入（B 线）

1. 主题选择建议做成 `soundTheme: "dog" | "cat" | "bird" | "pig" | "human"` 设置
2. 同一动作随机取 `-1` / `-2` 变体
3. 三套性格做后期差异（害羞 +2 半音、开朗原调、傲娇 -1 半音）
4. `appear` / `confirm` 不是 `AnimationName`，需要 `SoundEvent` 类型扩展
5. 保留合成音作为加载失败兜底

## 署名

猪包必须署名：

> Pig SFX Pack by Vinrax (OpenGameArt), licensed under CC-BY 3.0.

其余包 CC0，无需署名，但来源仍记录在 `SOURCES.md`。

## 人声包

暂未制作。网络梗音频（曼波 / 哈吉密 / 动漫角色语音）涉及角色形象、声优表演、录音三重权利，不能直接商用。
建议自己录（签授权）或商用 TTS。
