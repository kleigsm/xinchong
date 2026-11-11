# 2026-11-11 · C2 语音包补齐 9 个动作

## 背景

#63 / #64 把 4 套萌宠语音包接入了 app，但每套只有 5 类音效
（click / drag / sleep / appear / confirm），
选「狗/猫/鸟/猪」主题后，wave / stretch / pat / angry 仍会回落合成音。

## 做了什么

给四套包各补 4 个动作 × 2 变体 = 32 条，总 40 → **72 条**：

- wave：短促两声
- stretch：拉长/低通，像伸懒腰
- pat：轻软的一声
- angry：短促、略低，气但不凶

素材来源：全部从各自动物已有的 5 类音效**派生**（变调、低通、拼接），
没有引入新的第三方素材，许可证不变（狗/猫/鸟 CC0，猪 CC-BY 3.0）。

## 落盘

- `docs/specs/sounds/packs/{dog,cat,bird,pig}/` 新增 32 个 ogg
- `src/renderer/assets/sounds/packs/` 同步一份供打包
- `src/renderer/sound-packs.ts` 的 import 与 `SOUND_PACKS` 映射改为 9 个动作
- 试听页更新：`docs/specs/sounds/packs-preview.html`

## 验证

- `pnpm typecheck` ✅
- 设置音效主题为狗 → wave / pat 日志走 `pack=dog`

## 遗留

- 用户自定义导入仍未做（BUG-018 的另一半）
- 狗/猫原始录音可继续补更自然的版本
