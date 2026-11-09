# 自定义音效包：格式与设置项（接入说明）

> 给 B 线（交互/窗口）的接入方案。C 线负责素材与格式，代码由 B 线实现。
> 现状：`PetPack.sounds` 和 `SoundPlayer` 已经会优先播放文件，但**没有导入入口、没有设置项**。

---

## 一、用户能做什么

1. 在「设置 → 声音」里选择音效主题：内置（狗/猫/鸟/猪）或自己导入的包
2. 导入一个音效包（文件夹或 zip）
3. 试听、切换、删除
4. 加载失败时自动回落到内置/合成音

---

## 二、音效包格式

一个音效包 = 一个文件夹：

```
my-dog-sounds/
├── manifest.json
├── LICENSE.md          ← 可选，但建议有
├── click-1.ogg
├── click-2.ogg
├── drag-1.ogg
├── drag-2.ogg
├── sleep-1.ogg
├── appear-1.ogg
└── confirm-1.ogg
```

### manifest.json

```json
{
  "id": "my-dog-sounds",
  "name": "我的小狗",
  "version": 1,
  "license": "CC0",
  "sounds": {
    "click": ["click-1.ogg", "click-2.ogg"],
    "drag": ["drag-1.ogg", "drag-2.ogg"],
    "sleep": ["sleep-1.ogg"],
    "appear": ["appear-1.ogg"],
    "confirm": ["confirm-1.ogg"]
  }
}
```

规则：

- `id`：小写字母/数字/短横线，导入后用作目录名
- `sounds` 的 key 必须是 `click / drag / sleep / appear / confirm`
- 每个 key 至少 1 个文件；多个文件表示随机变体
- 文件路径必须是**相对路径**，禁止 `..`、绝对路径、符号链接
- 格式：`.ogg` / `.wav` / `.mp3`，单文件 ≤2MB，总包 ≤20MB
- 每个音频 ≤2 秒；建议 44.1kHz 单声道，峰值 ≤ -1dB

---

## 三、类型改动

```ts
// shared/pet-pack.ts
export type SoundEvent =
  | AnimationName
  | "appear"
  | "confirm";

export interface PetPack {
  // ...
  sounds?: Partial<Record<SoundEvent, string | string[]>>;
}
```

- `string`：单个文件
- `string[]`：变体列表，播放时随机取一个
- `SoundKind` 与 `SoundEvent` 对齐，避免 `appear` 只存在于实现里

---

## 四、设置项

```ts
// shared/types.ts
soundTheme: string;        // "builtin:dog" | "builtin:cat" | "builtin:bird" | "builtin:pig" | "user:<id>"
soundVolume: number;       // 0–1，复用现有 volume
```

设置页「声音」增加：

| 控件 | 行为 |
|---|---|
| 音效主题 | 下拉：内置四套 + 已导入的包 |
| 导入音效包… | 选文件夹或 zip，校验后复制到用户目录 |
| 试听 | 依次播放 click/drag/sleep/appear/confirm |
| 删除此音效包 | 二次确认；正在使用时先切回内置 |
| 恢复默认 | 切回内置主题 + 合成音兜底 |

---

## 五、导入流程（主进程）

1. 选择文件夹 / zip
2. 读 `manifest.json`，校验 schema、id、路径、扩展名、大小
3. 校验音频：能解码、时长 ≤2s（用 `music-metadata` 或解码后检查）
4. 复制到 `%APPDATA%/xinchong/sounds/<id>/`
5. 写设置 `soundTheme = "user:<id>"`
6. 通知渲染层重载 `SoundPlayer`

失败提示要具体：

- 「manifest.json 读不出来」
- 「click 缺少音频文件」
- 「click-1.ogg 超过 2 秒」
- 「文件路径不能包含 ..」

---

## 六、播放规则

- 同一动作有多个变体 → 随机取，避免连续重复
- 同一音效最多同时 2 个实例
- 静音 / 勿扰 → 不播
- 文件加载失败 → 回落到合成音，不报错
- 切换主题时预加载前 5 个常用音效，避免首次延迟

---

## 七、安全与边界

- 只接受音频扩展名，拒绝 `.exe/.bat/.js`
- 拒绝 `..` 和绝对路径，复制时重命名
- 限制总大小，防止 zip 炸弹
- CSP 增加 `media-src 'self' data:`
- 用户包不参与打包，只存在用户目录

---

## 八、验收

- [ ] 导入合法包后能切换并播放
- [ ] 缺文件/超时长/坏路径分别有明确提示
- [ ] 删除正在使用的包会自动切回内置
- [ ] 加载失败不崩、回落到合成音
- [ ] 切换主题不重启即刻生效
- [ ] 静音/勿扰严格无声

---

## 九、分工

| 事项 | 负责 |
|---|---|
| 音效包格式、示例包、素材 | C 线（我们） |
| manifest 校验、导入流程、设置页、播放器改造 | B 线（高晟铭） |
| 测试用例、用户测试 | D 线 / T1 |
