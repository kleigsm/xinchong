# 任务书 · P2-5 话术引擎

**负责人**：林予炫
**分支**：`feat/p2-5-line-engine`
**估时**：2 天
**依赖**：无（P1-2 已完成）

---

## 一、要做什么（一句话）

把现在"随机挑一句、不重复"的简单逻辑，升级成一个**按 性格 × 场景 挑台词**的引擎。

---

## 二、现在的状况

`src/renderer/bubble.ts` 里有个 `LinePicker`：

```ts
export class LinePicker {
  constructor(lines: string[], historySize = 10)
  next(): string | null   // 随机取，避开最近 10 条
}
```

能用，但有两个问题：

1. **只有"台词库"一个维度**，没有场景概念——点击和拖拽用的是两个独立实例，
   无法做"深夜台词""好久没理我"这类状态相关的表达。
2. **逻辑写死在类里**，没法单测（依赖 `window`）。

---

## 三、交付物

### 1. 台词库数据结构 `src/shared/lines.ts`

```ts
/** 场景：程序知道"现在发生了什么" */
export type Scene =
  | "click"      // 被点了一下
  | "drag"       // 被拖起来
  | "idleLong"   // 很久没互动
  | "sleep"      // 进入睡眠
  | "morning"    // 早上第一次见
  | "night";     // 深夜（22:00–05:00）

export type LineBank = Record<Scene, string[]>;  // 允许部分场景为空
```

**注意**：现有的 `src/shared/pet-pack.ts` 里 `LineBank` 只有 4 个场景（click/drag/idleLong/sleep），
需要把它换成上面这个（向后兼容：新增的场景可选、缺失时引擎要能回退）。

### 2. 引擎 `src/renderer/line-engine.ts`

```ts
export interface LineEngineOptions {
  /** 同一场景里，最近多少条不重复。默认 10 */
  historySize?: number;
  /** 注入随机源，方便测试。默认 Math.random */
  random?: () => number;
  /** 注入"当前时间"，方便测试深夜台词。默认 () => new Date() */
  now?: () => Date;
}

export class LineEngine {
  constructor(bank: LineBank, options?: LineEngineOptions);

  /** 取一句；库为空返回 null（调用方静默处理） */
  pick(scene: Scene): string | null;

  /** 换角色时整体换库（同时清空历史） */
  setBank(bank: LineBank): void;

  /** 某场景是否有内容（供调用方决定要不要触发） */
  hasScene(scene: Scene): boolean;
}
```

### 3. 单测 `src/renderer/line-engine.test.ts`

引入 `vitest`（devDependency，和现有 vite 生态兼容），`pnpm test` 能跑。

---

## 四、规则（必须满足）

| # | 规则 | 说明 |
|---|---|---|
| 1 | **同场景不重复** | 连续取 `min(10, 库长-1)` 次不出现重复 |
| 2 | **库不够时降级** | 若某场景只有 3 条，则"最近 3 条不重复"退化为轮换，不报错 |
| 3 | **空场景回退** | 场景没内容 → 回退到 `click` 池 → 再没有就返回 `null` |
| 4 | **时间感知** | `pick("night")` 只在 22:00–05:00 返回内容，否则返回 `null` |
| 5 | **纯函数可测** | 不引用 `window` / DOM / 全局时间，全部通过构造参数注入 |
| 6 | **换库清历史** | `setBank()` 后历史清空（否则新角色会"继承"旧角色的去重记录） |

---

## 五、验收标准（照着自测）

```ts
// 1. 不重复
const engine = new LineEngine({ click: ["a","b","c","d","e"], drag: [], idleLong: [], sleep: [], morning: [], night: [] });
const picked = new Set(Array.from({ length: 5 }, () => engine.pick("click")));
expect(picked.size).toBe(5);

// 2. 空库回退
expect(engine.pick("drag")).toBe(null);   // drag 空 → 回退 click → 有内容
// 注意：规则 3 说回退到 click，所以这里应该返回 click 里的某句，不是 null

// 3. 深夜
const at2am = new LineEngine({ night: ["还没睡？"], click: [], drag: [], idleLong: [], sleep: [], morning: [] }, { now: () => new Date("2026-01-01T02:00:00") });
expect(at2am.pick("night")).toBe("还没睡？");

// 4. 白天
const atNoon = new LineEngine(..., { now: () => new Date("2026-01-01T12:00:00") });
expect(atNoon.pick("night")).toBe(null);
```

另外要满足：

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 全部通过
- [ ] `pnpm build` 通过
- [ ] 不引入除 `vitest` 外的运行时依赖

---

## 六、边界（重要）

**只改这些文件：**

```
src/shared/lines.ts            ← 新建
src/shared/pet-pack.ts         ← 只改 LineBank 类型（4 场景 → 6 场景，其余场景可选）
src/renderer/line-engine.ts    ← 新建
src/renderer/line-engine.test.ts ← 新建
package.json                   ← 只加 vitest 和 test 脚本
```

**不要动：**

```
src/renderer/main.ts        ← 接入由高晟铭做，避免冲突
src/main/**                 ← 主进程不归你
src/renderer/pet-view.ts    ← 动画播放器，别人在改
src/renderer/settings/**    ← 设置面板
electron-builder.yml        ← 打包配置
```

**接入说明**：引擎做完后，把 `src/renderer/main.ts` 里需要改的地方写成 PR 描述里的 diff 片段，
由高晟铭合并。参考现有用法：

```ts
// 现在
clickLines = new LinePicker(pack.lines.click);
const line = clickLines.next();

// 之后（示意）
lineEngine = new LineEngine(pack.lines);
const line = lineEngine.pick("click");
```

---

## 七、台词内容

先用**占位内容**（每个场景 8–10 条，短句、≤20 字、不用句号）。

正式台词由胡汇兴（美术/内容）另行提供（C1 任务），到时只替换数据文件，引擎不用改。

---

## 八、提交规矩

1. 从 `main` 拉分支：`feat/p2-5-line-engine`
2. 提交信息用中文，一句话说清做了什么
3. PR 标题：`[P2-5] 话术引擎：按性格×场景挑台词`
4. PR 描述里附：
   - 测试用例的截图或输出
   - `src/renderer/main.ts` 需要的接入 diff
5. 同时更新 `docs/STATUS.md` 和新增 `docs/log/<日期>-p2-5.md`

---

## 九、第一步清单

```
[ ] 读 docs/STATUS.md + docs/BACKLOG.md 的 P2-5 行
[ ] 读 src/renderer/bubble.ts（现有 LinePicker）
[ ] 读 src/shared/pet-pack.ts（现有 LineBank）
[ ] 跑通 pnpm install && pnpm start，能看到桌宠
[ ] 拉分支，先写 src/shared/lines.ts 的类型
[ ] 再写引擎 + 测试
```

**卡住随时问**，别自己发明规则——这份文档里的规则都是和主窗口对过的。
