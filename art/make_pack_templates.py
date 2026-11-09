"""生成芯宠素材包模板：空白/参考雪碧图、立绘模板、pack-9row、README、zip。"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "resources" / "pet-pack-template"
OUT = ROOT / "交付" / "素材包模板"
SHEETS = ROOT / "交付" / "雪碧图"
ART_OUT = ROOT / "art" / "template" / "out"

CELL = 128
COLS = 4
FONT = r"C:\Windows\Fonts\msyh.ttc"

LAYOUTS = {
    4: [
        ("待机", "0-3"),
        ("点击", "4-7"),
        ("拖拽", "8-9"),
        ("睡觉", "12-13"),
    ],
    5: [
        ("待机", "0-3"),
        ("待机", "4-7"),
        ("点击", "8-11"),
        ("拖拽", "12-15"),
        ("睡觉", "16-19"),
    ],
    9: [
        ("待机", "0-3"),
        ("待机", "4-7"),
        ("点击", "8-11"),
        ("拖拽", "12-15"),
        ("睡觉", "16-19"),
        ("招手", "20-23"),
        ("伸懒腰", "24-27"),
        ("摸头", "28-31"),
        ("生气", "32-35"),
    ],
}


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT, size)


def blank(rows: int) -> Image.Image:
    return Image.new("RGBA", (COLS * CELL, rows * CELL), (0, 0, 0, 0))


def guide(rows: int) -> Image.Image:
    img = blank(rows)
    d = ImageDraw.Draw(img)
    w, h = img.size
    for c in range(COLS + 1):
        x = c * CELL
        d.line([(x, 0), (x, h)], fill=(90, 90, 90, 70), width=1)
    for r in range(rows + 1):
        y = r * CELL
        d.line([(0, y), (w, y)], fill=(90, 90, 90, 70), width=1)
    d.rectangle([0, 0, w - 1, h - 1], outline=(120, 80, 60, 120), width=2)

    num_font = font(12)
    label_font = font(11)
    for idx in range(rows * COLS):
        c, r = idx % COLS, idx // COLS
        x, y = c * CELL, r * CELL
        d.text((x + 5, y + 4), str(idx), font=num_font, fill=(120, 120, 120, 170))

    for r, (name, frames) in enumerate(LAYOUTS[rows]):
        y = r * CELL
        d.text((5, y + CELL - 18), f"{name} {frames}", font=label_font, fill=(150, 70, 70, 200))
    return img


def portrait_template() -> Image.Image:
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    margin = 8
    # 虚线安全区
    for x in range(margin, size - margin, 16):
        d.line([(x, margin), (min(x + 8, size - margin), margin)], fill=(120, 120, 120, 90))
        d.line([(x, size - margin), (min(x + 8, size - margin), size - margin)], fill=(120, 120, 120, 90))
    for y in range(margin, size - margin, 16):
        d.line([(margin, y), (margin, min(y + 8, size - margin))], fill=(120, 120, 120, 90))
        d.line([(size - margin, y), (size - margin, min(y + 8, size - margin))], fill=(120, 120, 120, 90))
    # 中心十字
    d.line([(size // 2, size // 2 - 14), (size // 2, size // 2 + 14)], fill=(160, 90, 90, 80))
    d.line([(size // 2 - 14, size // 2), (size // 2 + 14, size // 2)], fill=(160, 90, 90, 80))
    d.text((20, size - 36), "透明背景 · 512×512 · 角色居中，四周留 8px", font=font(14), fill=(120, 100, 90, 170))
    d.text((20, 18), "L2 立绘模板（单张，程序自动生成动作）", font=font(14), fill=(120, 100, 90, 170))
    return img


def write_pack_9row() -> None:
    data = {
        "_说明": "9 行布局：8 个动作，每行一个动作；待机占前两行（8 帧）",
        "id": "my-pet",
        "name": "我的角色",
        "sprite": {
            "image": "sprite.png",
            "frameWidth": 128,
            "frameHeight": 128,
            "columns": 4,
            "rows": 9,
        },
        "animations": {
            "idle": {"frames": [0, 1, 2, 3, 4, 5, 6, 7], "fps": 4, "loop": True},
            "click": {"frames": [8, 9, 10, 11], "fps": 5, "loop": False},
            "drag": {"frames": [12, 13, 14, 15], "fps": 4, "loop": True},
            "sleep": {"frames": [16, 17, 18, 19], "fps": 1.5, "loop": True},
            "wave": {"frames": [20, 21, 22, 23], "fps": 6, "loop": False},
            "stretch": {"frames": [24, 25, 26, 27], "fps": 4, "loop": False},
            "pat": {"frames": [28, 29, 30, 31], "fps": 6, "loop": False},
            "angry": {"frames": [32, 33, 34, 35], "fps": 8, "loop": False},
        },
        "lines": {
            "click": ["诶？", "你好呀", "别戳啦", "嗯？"],
            "drag": ["要掉下去了！", "轻一点"],
            "idleLong": ["你在忙吗", "发会儿呆"],
            "sleep": ["呼……呼……"],
            "wave": ["拜拜～", "挥挥！"],
            "stretch": ["伸个懒腰", "啊——好舒服"],
            "pat": ["嘿嘿～", "再摸一下"],
            "angry": ["哼！", "别戳了"],
        },
    }
    (RES / "pack-9row.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


README = """# 芯宠 · 素材包模板

这个包里是所有需要的东西，照着改就能做出你自己的桌宠角色。

---

## 包里有什么

```
pet-pack-template/
├── README.md                 ← 你正在看的这份
├── example-shy.png           ← 示例雪碧图（害羞套，4 行布局）
├── example-shy-9row.png      ← 示例雪碧图（害羞套，9 行 36 帧）
├── blank-4row.png            ← 空白画布（4 行，512×512）
├── blank-5row.png            ← 空白画布（5 行，512×640）
├── blank-9row.png            ← 空白画布（9 行，512×1152）
├── guide-4row.png            ← 参考网格（带格号/动作标注）
├── guide-5row.png            ← 参考网格
├── guide-9row.png            ← 参考网格（8 个动作）
├── portrait-template.png     ← 单张立绘模板（L2）
├── pack-4row.json            ← 4 行配置示例
├── pack-5row.json            ← 5 行配置示例
└── pack-9row.json            ← 9 行 / 8 动作配置示例
```

---

## 两种做法，选一个

### 做法 A：只有一张立绘（最省事）

打开芯宠 → 设置 → 角色 → **导入立绘（单张）**。

给一张透明背景的 PNG（建议 512×512，人物居中），程序自动做呼吸、点击弹跳、拖拽摆动、睡觉下沉。

**不会眨眼或换表情**，也不会有招手这类动作。

### 做法 B：画一整套动作（效果最好）

按下面的规格画一张雪碧图，然后用 **导入雪碧图（多帧）**。
新手建议先用 `guide-9row.png` 当参考网格，或直接把 `blank-9row.png` 当画布。

---

## 雪碧图规格

| 项 | 要求 |
|---|---|
| 格式 | PNG，**必须透明背景** |
| 网格 | **4 列** |
| 每格 | **128 × 128**（整图宽 512） |
| 行数 | **4 行**（512 高）/ **5 行**（640）/ **9 行**（1152） |
| 角色位置 | 每格居中，四周留约 8px 空隙 |
| 单图上限 | 2048 × 2048 |

**规则：每个动作必须从新的一行开始**，不能两个动作挤在同一行。

### 4 行（只有 4 个基础动作）

```
+----+----+----+----+
| 0  | 1  | 2  | 3  |   待机
+----+----+----+----+
| 4  | 5  | 6  | 7  |   点击
+----+----+----+----+
| 8  | 9  |    |    |   拖拽（后两格留空）
+----+----+----+----+
| 12 | 13 |    |    |   睡觉（后两格留空）
+----+----+----+----+
```

### 5 行（待机 8 帧）

```
+----+----+----+----+
| 0  | 1  | 2  | 3  |   待机 前半
+----+----+----+----+
| 4  | 5  | 6  | 7  |   待机 后半（共 8 帧）
+----+----+----+----+
| 8  | 9  | 10 | 11 |   点击
+----+----+----+----+
| 12 | 13 | 14 | 15 |   拖拽
+----+----+----+----+
| 16 | 17 | 18 | 19 |   睡觉
+----+----+----+----+
```

### 9 行（8 个动作，内置三套就是这种）

```
+----+----+----+----+
| 0  | 1  | 2  | 3  |   待机 前半
+----+----+----+----+
| 4  | 5  | 6  | 7  |   待机 后半（共 8 帧）
+----+----+----+----+
| 8  | 9  | 10 | 11 |   点击
+----+----+----+----+
| 12 | 13 | 14 | 15 |   拖拽
+----+----+----+----+
| 16 | 17 | 18 | 19 |   睡觉
+----+----+----+----+
| 20 | 21 | 22 | 23 |   招手（双击 / 右键菜单）
+----+----+----+----+
| 24 | 25 | 26 | 27 |   伸懒腰（睡醒 / 右键菜单）
+----+----+----+----+
| 28 | 29 | 30 | 31 |   摸头（长按 / 右键菜单）
+----+----+----+----+
| 32 | 33 | 34 | 35 |   生气（连点三下 / 右键菜单）
+----+----+----+----+
```

> 9 行素材导入后，8 个动作全部可用；4/5 行只有 4 个基础动作。

---

## 动作画什么

| 动作 | 帧数 | 循环 | 内容 |
|---|---|---|---|
| 待机 idle | 4–8 | 是 | 呼吸起伏、偶尔眨眼 |
| 点击 click | 3–6 | 否 | 被戳到的反应：惊讶 / 开心 / 缩一下 |
| 拖拽 drag | 2–4 | 是 | 被拎起来：倾斜、晃动 |
| 睡觉 sleep | 2–4 | 是 | 闭眼、呼吸放慢 |
| 招手 wave | 4 | 否 | 抬手挥两下 |
| 伸懒腰 stretch | 4 | 否 | 双臂上举、身体拉长 |
| 摸头 pat | 4 | 否 | 闭眼、蹭一下、脸红 |
| 生气 angry | 4 | 否 | 皱眉、跺脚、气鼓鼓 |

---

## 给程序看的配置

用芯宠的「导入雪碧图」**不需要手写配置**——程序按图片行数自动判断 4/5/9 行布局。

`pack-*.json` 只是参考帧号怎么对应，以及以后做更复杂的角色包时能用到。

---

## 交付前自查

- [ ] 背景是**透明**的（不是白底）
- [ ] 每格都是 128×128，四格边长一致
- [ ] 角色在格子里居中，四周留了空隙
- [ ] 待机在最上面，动作顺序对不对
- [ ] 每个动作从新的一行开始
- [ ] 空着的格子是真的透明
- [ ] 9 行素材：待机 8 帧、其余 4 帧

---

## 常见错误

| 看到什么 | 原因 |
|---|---|
| 桌面上出现白方块 | 背景不透明，导出时没勾 Alpha |
| 动作串到别的格子 | 每格尺寸不一致，或两个动作挤在一行 |
| 角色被切掉一半 | 角色贴边了，四周要留 8px |
| 动作僵住不动 | 导入成了「立绘」而不是「雪碧图」 |

---

## 还是不会画？

打开 `example-shy-9row.png`（36 帧完整示例），或把 `guide-9row.png` 放在上层照着描。
"""


def contact_sheet() -> Image.Image:
    """4/5/9 行参考图 + 立绘模板的预览。"""
    thumb_w = 300
    items = [
        ("4 行 · 512×512", guide(4)),
        ("5 行 · 512×640", guide(5)),
        ("9 行 · 512×1152", guide(9)),
        ("立绘模板 · 512×512", portrait_template()),
    ]
    gap = 24
    width = gap + len(items) * (thumb_w + gap)
    height = 520
    out = Image.new("RGB", (width, height), (243, 240, 233))
    d = ImageDraw.Draw(out)
    d.text((gap, 18), "芯宠素材包模板 · 4/5/9 行参考网格与立绘模板", font=font(22), fill=(60, 50, 40))
    for i, (label, im) in enumerate(items):
        w = thumb_w
        h = round(im.height * (w / im.width))
        if h > 420:
            h = 420
            w = round(im.width * (h / im.height))
        small = im.resize((w, h), Image.LANCZOS)
        x = gap + i * (thumb_w + gap) + (thumb_w - w) // 2
        y = 70
        # 棋盘底
        checker = Image.new("RGB", (w, h), (252, 251, 247))
        cd = ImageDraw.Draw(checker)
        for yy in range(0, h, 20):
            for xx in range(0, w, 20):
                if (xx // 20 + yy // 20) % 2 == 0:
                    cd.rectangle([xx, yy, xx + 19, yy + 19], fill=(228, 224, 214))
        out.paste(checker, (x, y))
        out.paste(small, (x, y), small)
        d.text((x, y + h + 8), label, font=font(14), fill=(100, 88, 76))
    return out


def main() -> None:
    RES.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    SHEETS.mkdir(parents=True, exist_ok=True)

    for rows in (4, 5, 9):
        blank(rows).save(RES / f"blank-{rows}row.png")
        guide(rows).save(RES / f"guide-{rows}row.png")

    portrait_template().save(RES / "portrait-template.png")

    # 9 行示例：用害羞套 36 帧
    shutil.copy2(ART_OUT / "shy" / "pet-shy.png", RES / "example-shy-9row.png")

    write_pack_9row()
    (RES / "README.md").write_text(README, encoding="utf-8")

    # 三套雪碧图
    for cid in ("shy", "cheerful", "tsundere"):
        shutil.copy2(ART_OUT / cid / f"pet-{cid}.png", SHEETS / f"pet-{cid}.png")

    # 单独可用的模板文件 + zip
    for p in RES.iterdir():
        if p.is_file():
            shutil.copy2(p, OUT / p.name)
    contact_sheet().save(OUT / "预览-模板.png")

    zip_base = OUT / "芯宠素材包模板"
    if zip_base.with_suffix(".zip").exists():
        zip_base.with_suffix(".zip").unlink()
    shutil.make_archive(str(zip_base), "zip", root_dir=RES.parent, base_dir=RES.name)
    print("templates ->", OUT)
    print("sheets ->", SHEETS)


if __name__ == "__main__":
    main()
