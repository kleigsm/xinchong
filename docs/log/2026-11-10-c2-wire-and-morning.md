# 2026-11-10 · 接入 C2 音效 + 修 BUG-017（morning 无入口）

## 一、C2 音效接入

### 之前的状况

胡汇兴交付了 61 个音频文件，但全躺在 `docs/specs/sounds/` 里——**程序仍然在播合成音**。

`SoundPlayer` 其实早就支持"有文件就播文件，没有就合成"，缺的只是**把文件塞进角色包**。

### 做了什么

1. 把三套性格音效复制进渲染层资源目录：

```
src/renderer/assets/sounds/
├── shy/       appear click confirm drag sleep (.wav)
├── cheerful/  同上
└── tsundere/  同上
```

共 15 个文件，745 KB。

2. `PetPack.sounds` 的类型修正：

```ts
// 之前：复用 AnimationName（但 appear / confirm 没有对应动画）
sounds?: Partial<Record<AnimationName, string>>;

// 现在：单独定义 SoundName
export type SoundName = "click" | "drag" | "sleep" | "appear" | "wave" | "stretch" | "pat" | "angry" | "confirm";
sounds?: Partial<Record<SoundName, string>>;
```

3. `src/renderer/pets/index.ts` 里给三套角色包各加 `sounds: { appear, click, confirm, drag, sleep }`。

4. `assets.d.ts` 补 `*.wav / *.ogg / *.mp3` 的模块声明。

5. `synthesize()` 补上 `confirm` 分支（之前这个 kind 会静默无声）。

### 结果

日志从 `[audio] play click (synth, base=660Hz)` 变成 **`[audio] play click (file)`**。

**用户导入的角色仍然用合成音**——他们的包里没有 sounds 字段，这是预期行为（回落）。

## 二、BUG-017：morning 台词没有触发入口

### 问题

三套各 4 条 `morning` 台词，但 `main.ts` 里**只有 night 的分支**，没有任何地方调 `pick("morning")`。

这是 C1 任务书没写清楚导致的——只定义了场景，没定义何时触发。

### 修法

新增设置项 `lastActiveDate`（YYYY-MM-DD），点击时比较：

```ts
const today = todayKey();
const isFirstToday = currentSettings?.lastActiveDate !== today;
if (isFirstToday) void window.api.patchSettings({ lastActiveDate: today });

// 优先级：当天第一句 → 深夜（30%）→ 普通点击
const morningLine = isFirstToday ? lineEngine.pick("morning") : null;
```

### 验证

把 `settings.json` 的 `lastActiveDate` 改成 `2020-01-01` 重启，点一下 → 冒出 **「早…又见面了」**。

---

## 验证记录

| 项 | 结果 |
|---|---|
| 内置角色音效 | ✅ 日志 `play click (file)` |
| 自定义角色音效 | ✅ 回落合成音（预期） |
| 当天第一次点击 | ✅ 「早…又见面了」 |
| 之后点击 | ✅ 正常 click 台词 |
| `lastActiveDate` 落盘 | ✅ 保存为 2026-11-10 |
| typecheck / test(11) / build | ✅ |

## 遗留

- **4 套萌宠语音包（狗/猫/鸟/猪）没接**——那是 BUG-018「用户不能选音效主题」的活，属于新功能，不是接入
- wave / stretch / pat / angry 四个动作仍用合成音（C2 只交付了 5 种）
