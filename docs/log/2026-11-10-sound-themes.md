# 2026-11-10 · 接入 4 套萌宠语音包（音效主题）

## 背景

C2 交付了 61 个音频，分两类：

| 类别 | 数量 | 用途 | 之前状态 |
|---|---|---|---|
| 三套性格音效（wav） | 15 | 跟随角色切换 | ✅ 已接入（PR #63） |
| **4 套萌宠语音包（ogg）** | 40 | 用户可选主题 | ❌ 躺在 `docs/specs/` 里没人用 |

这篇处理的是第二类 —— 也就是 BUG-018「用户不能自定义音效」。

## 做了什么

### 1. 音频进资源目录

```
src/renderer/assets/sounds/packs/
├── dog/   appear-1/2 click-1/2 confirm-1/2 drag-1/2 sleep-1/2 (.ogg)
├── cat/
├── bird/
└── pig/
```

40 个文件，424 KB。

### 2. 主题 id 与显示名放 shared

`src/shared/sound-themes.ts`：

```ts
export type SoundTheme = "personality" | "dog" | "cat" | "bird" | "pig";
export const SOUND_THEMES = [
  { id: "personality", label: "跟随性格" },
  { id: "dog", label: "狗狗" },
  ...
];
```

**为什么单独拆出来**：设置面板只需要列选项，不该因此把 40 个音频塞进设置页的打包产物。
音频 URL 留在 `src/renderer/sound-packs.ts`。

### 3. 播放优先级

```ts
// 1) 萌宠语音包（用户选的主题）：2 个变体随机取一个
// 2) 角色自带音效（跟随性格）
// 3) Web Audio 合成音兜底
```

日志能看出走的哪条：

```
[audio] play click (pack=dog)
[audio] play click (file)
[audio] play pat (synth, base=660Hz)
```

### 4. 设置界面

「声音」页新增一张卡：

```
音效主题
用哪套音效   [跟随性格] [狗狗] [猫咪] [小鸟] [小猪]
```

新增 `data-action="segment-text"`（因为值域是字符串，原来的 `segment` 只处理数字）。

### 5. 新设置项

`soundTheme`，默认 `"personality"`（保持不变，不改变老用户体验）。

---

## 验证

| 项 | 结果 |
|---|---|
| 主题设为 dog → 点击 | ✅ `play click (pack=dog)` |
| pat（语音包没有这个音效） | ✅ 回落 `synth` |
| 设置界面 | ✅ 五个选项，狗选中态正确 |
| 打包产物 | ✅ 40 个 ogg，424 KB |
| typecheck / test(11) / build | ✅ |

---

## 说明

- 语音包只有 5 种音效（appear/click/confirm/drag/sleep），所以 wave/stretch/pat/angry 仍走合成音
- 每种音效有 2 个变体，随机播放，避免每次都一样
- BUG-018 从「不能自定义」变成「可以选 4 套内置主题」；**导入自己的音效**仍未做
