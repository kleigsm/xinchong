# `pet-rig.json` 格式（POC）

> 一个骨骼宠物 = 一个文件夹：`pet-rig.json` + 分层 PNG。
> POC 只要求四足狗能加载，字段保持最小可用。

---

## 1. 示例

```json
{
  "version": 1,
  "id": "poc-dog",
  "name": "POC 小狗",
  "canvas": { "width": 512, "height": 512 },
  "root": "root",
  "actions": ["idle", "click", "drag", "sleep", "wave", "stretch", "pat", "angry"],
  "bones": [
    { "id": "root", "parent": null, "x": 256, "y": 380 },
    { "id": "body", "parent": "root", "x": 256, "y": 380 },
    { "id": "head", "parent": "body", "x": 256, "y": 255 },
    { "id": "ear-l", "parent": "head", "x": 214, "y": 165 },
    { "id": "ear-r", "parent": "head", "x": 298, "y": 165 },
    { "id": "front-leg-l", "parent": "body", "x": 228, "y": 370 },
    { "id": "front-leg-r", "parent": "body", "x": 284, "y": 370 },
    { "id": "back-leg-l", "parent": "body", "x": 202, "y": 380 },
    { "id": "back-leg-r", "parent": "body", "x": 310, "y": 380 },
    { "id": "tail", "parent": "body", "x": 348, "y": 330 }
  ],
  "layers": [
    { "id": "back-leg-l", "file": "back-leg-l.png", "bone": "back-leg-l", "z": 1, "pivot": [202, 380] },
    { "id": "back-leg-r", "file": "back-leg-r.png", "bone": "back-leg-r", "z": 2, "pivot": [310, 380] },
    { "id": "tail", "file": "tail.png", "bone": "tail", "z": 3, "pivot": [348, 330] },
    { "id": "body", "file": "body.png", "bone": "body", "z": 4, "pivot": [256, 380] },
    { "id": "front-leg-l", "file": "front-leg-l.png", "bone": "front-leg-l", "z": 5, "pivot": [228, 370] },
    { "id": "front-leg-r", "file": "front-leg-r.png", "bone": "front-leg-r", "z": 6, "pivot": [284, 370] },
    { "id": "head", "file": "head.png", "bone": "head", "z": 7, "pivot": [256, 255] },
    { "id": "ear-l", "file": "ear-l.png", "bone": "ear-l", "z": 8, "pivot": [214, 165] },
    { "id": "ear-r", "file": "ear-r.png", "bone": "ear-r", "z": 9, "pivot": [298, 165] }
  ]
}
```

---

## 2. 字段规则

| 字段 | 规则 |
|---|---|
| `version` | 固定 `1` |
| `id` | 小写字母/数字/连字符，导入后作为目录名 |
| `canvas` | POC 固定 512×512 |
| `root` | 必须是 `bones` 里的 id |
| `actions` | 至少包含 8 个标准动作 |
| `bones[].x/y` | **画布绝对坐标**，不是相对父级 |
| `bones[].parent` | 根为 `null`，其余必须存在 |
| `layers[].file` | 相对路径，只能引用同目录 PNG |
| `layers[].bone` | 必须存在 |
| `layers[].pivot` | 画布绝对坐标，通常等于骨骼位置 |
| `layers[].z` | 整数，越大越靠前；同 z 按数组顺序 |
| `layers[].opacity` | 0–1，可选 |
| `layers[].visible` | 布尔，可选 |

---

## 3. 运行时 API（B 线实现）

```ts
interface RigPlayer {
  load(packDir: string): Promise<void>;
  play(action: string, opts?: { loop?: boolean; speed?: number }): void;
  update(dt: number): void;   // dt 秒，建议钳制 ≤1/30
  draw(ctx: CanvasRenderingContext2D): void;
  destroy(): void;
}
```

POC 要求：

- `load` 失败时返回明确错误（缺文件/坏 JSON/骨骼缺失）
- `play` 未知动作不崩，回 idle
- `update` 内不分配大对象，避免 GC 抖动
- `draw` 支持 DPR，窗口缩放不模糊

---

## 4. 校验（加载时）

1. `version === 1`
2. 所有 `parent` 可解析，不能成环
3. 每个 `layer.bone` 存在
4. 每个 `layer.file` 存在且是 PNG
5. `z` 唯一或可稳定排序
6. `canvas` 与 PNG 尺寸一致
7. 失败时给出具体文件名

---

## 5. 与现有角色包的关系

- 现有 L2/L3 继续用 `PetPack`，不改造
- 骨骼包作为新的 `kind: "rig"`，加载后映射成 `PetPack` 兼容接口
- `sounds` / `lines` 复用现有字段
- 设置里先只做一个「POC 骨骼狗」入口，不做用户导入
