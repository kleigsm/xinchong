# 外观大厅 · 策展示例

> 用途：给 P3「外观大厅」提供可直接接入的封面与目录样例。
> 状态：**示例数据**，不是最终上架内容。

## 文件

| 文件 | 内容 |
|---|---|
| [`covers/`](covers/) | 8 张 512×512 封面 |
| [`catalog.example.json`](catalog.example.json) | 8 项目录示例 |
| [`contact-sheet.png`](contact-sheet.png) | 8 张封面一览 |
| [`build_covers.py`](build_covers.py) | 可复现的生成脚本 |

## 8 个策展位

| id | 名称 | 标签 |
|---|---|---|
| mint-soda | 薄荷汽水 | 猫 / 夏日 |
| night-fox | 夜樱狐 | 狐 / 夜晚 |
| caramel-pudding | 焦糖布丁 | 猫 / 甜点 |
| cloud-rabbit | 云朵兔 | 兔 / 云 |
| sakura-cat | 樱花猫 | 猫 / 樱花 |
| star-dog | 星尘犬 | 狗 / 星空 |
| lemon-soda | 柠檬气泡 | 猫 / 夏日 |
| grape-gummy | 葡萄软糖 | 兔 / 糖果 |

封面由内置角色首帧 + 色相变体生成，用于验证大厅卡片比例与配色；
真正上架前应替换为独立绘制/授权的角色图。

## catalog 字段

```json
{
  "id": "mint-soda",
  "name": "薄荷汽水",
  "author": "芯宠官方",
  "license": "CC0",
  "tags": ["猫", "夏日"],
  "preview": "covers/mint-soda.png",
  "download": null,
  "sha256": null,
  "size": null,
  "version": 1
}
```

- `preview` 相对 catalog 文件路径
- `download` / `sha256` / `size` 在真实 zip 打出来后填写
- 每项必须有 `author` / `license`；没有授权的素材不进大厅
- B 线下载流程：校验 sha256 → 解压到 `%APPDATA%/xinchong/pets/<id>` → 防路径穿越

## 接到哪

- 大厅 UI 规格：`docs/design/immersive-layout.md`
- B 线任务：`docs/tasks/nav-redesign.md` P3
- 试听/选色等后续能力不在这里，先只做“浏览 → 详情 → 下载并使用”
