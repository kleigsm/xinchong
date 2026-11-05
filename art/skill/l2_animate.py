"""L2 立绘自动动画：一张透明立绘 → 4×4 雪碧图（12 帧）+ 预览。

与项目现有导入器完全兼容：4 列 × 4 行、每格 128、待机 0-3 / 点击 4-7 /
拖拽 8-9 / 睡觉 12-13，空格 10/11/14/15 保持透明。

用法：
    python l2_animate.py --input portrait.png --out out_dir [--name 角色名]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

CELL = 128
COLS = ROWS = 4
CANVAS = 512          # 4 倍超采样画布
TARGET = 384          # 512 画布下角色最大边；旋转/压扁后仍留出 ≥8px 安全边距
MIN_ALPHA = 8


def font(size: int) -> ImageFont.FreeTypeFont:
    for p in (r"C:\Windows\Fonts\msyh.ttc", r"C:\Windows\Fonts\simhei.ttf"):
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


def load_portrait(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    alpha = im.getchannel("A")
    if alpha.getextrema()[1] == 0:
        raise SystemExit("这张图是全透明的，没有内容。")
    if alpha.getextrema()[0] == 255:
        raise SystemExit(
            "这张图没有透明背景（整张都不透明）。\n"
            "L2 需要透明 PNG：请先抠图，或在图片编辑器里删掉背景再导出。"
        )
    return im


def normalize(im: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    """裁到内容包围盒，缩放到 448 内，居中放进 512 画布。"""
    bbox = im.getchannel("A").point(lambda v: 255 if v > MIN_ALPHA else 0).getbbox()
    if not bbox:
        raise SystemExit("抠图后没有可见内容，检查图片。")
    content = im.crop(bbox)
    w, h = content.size
    scale = min(TARGET / w, TARGET / h)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    content = content.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.alpha_composite(content, ((CANVAS - nw) // 2, (CANVAS - nh) // 2))
    return canvas, bbox


def transform(base: Image.Image, sx: float, sy: float, angle: float, dx: float, dy: float) -> Image.Image:
    """在 512 画布上做缩放/旋转/位移。dx/dy 以 128 尺度传入。"""
    w = max(1, round(base.width * sx))
    h = max(1, round(base.height * sy))
    im = base.resize((w, h), Image.LANCZOS)
    if abs(angle) > 0.01:
        im = im.rotate(angle, resample=Image.BICUBIC, expand=True)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.alpha_composite(
        im,
        (round((CANVAS - im.width) / 2 + dx * 4), round((CANVAS - im.height) / 2 + dy * 4)),
    )
    return canvas


# (sx, sy, angle, dx, dy)
FRAMES: dict[int, tuple[float, float, float, float, float]] = {
    # 待机：呼吸 + 极轻微摆动
    0: (1.000, 1.000, 0.0, 0.0, 0.0),
    1: (1.012, 1.016, 0.4, 0.0, -2.5),
    2: (1.006, 1.008, -0.4, 0.0, -1.2),
    3: (1.010, 1.012, 0.2, 0.0, -2.0),
    # 点击：压扁 → 回弹 → 微晃 → 还原
    4: (1.045, 0.935, 0.0, 0.0, 3.0),
    5: (0.960, 1.050, -1.5, 0.0, -3.0),
    6: (1.025, 0.985, 1.5, 1.0, 0.5),
    7: (1.000, 1.000, 0.0, 0.0, 0.0),
    # 拖拽：左右倾斜
    8: (0.985, 1.010, -6.0, -2.0, -3.0),
    9: (0.985, 1.010, 6.0, 2.0, -3.0),
    # 睡觉：下沉 + 缩小
    12: (0.985, 0.985, 2.0, 0.0, 3.5),
    13: (0.975, 0.975, 3.0, 0.0, 6.0),
}


def make_sheet(base: Image.Image) -> Image.Image:
    sheet = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    for idx, (sx, sy, angle, dx, dy) in FRAMES.items():
        frame = transform(base, sx, sy, angle, dx, dy)
        small = frame.resize((CELL, CELL), Image.LANCZOS)
        alpha = small.getchannel("A").point(lambda v: 0 if v < 3 else v)
        small.putalpha(alpha)
        sheet.alpha_composite(small, ((idx % COLS) * CELL, (idx // COLS) * CELL))
    return sheet


def checker(size: int, step: int = 16) -> Image.Image:
    img = Image.new("RGB", (size, size), (252, 251, 247))
    d = ImageDraw.Draw(img)
    for y in range(0, size, step):
        for x in range(0, size, step):
            if (x // step + y // step) % 2 == 0:
                d.rectangle([x, y, x + step - 1, y + step - 1], fill=(228, 224, 214))
    return img


def contact_sheet(sheet: Image.Image, name: str) -> Image.Image:
    cell, gap, left, top = 200, 10, 86, 76
    width = left + COLS * cell + (COLS + 1) * gap
    height = top + ROWS * cell + (ROWS + 1) * gap + 24
    out = Image.new("RGB", (width, height), (243, 240, 233))
    d = ImageDraw.Draw(out)
    d.text((28, 22), f"{name} · L2 立绘自动动画（4×4 / 12 帧）", font=font(22), fill=(58, 48, 38))
    labels = {0: "待机", 1: "点击", 2: "拖拽", 3: "睡觉"}
    for row, label in labels.items():
        d.text((10, top + gap + row * (cell + gap) + cell // 2 - 10), label, font=font(14), fill=(120, 106, 90))
    for idx in range(16):
        col, row = idx % COLS, idx // COLS
        x = left + gap + col * (cell + gap)
        y = top + gap + row * (cell + gap)
        out.paste(checker(cell), (x, y))
        if idx in FRAMES:
            im = sheet.crop((col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL)).resize((cell, cell), Image.LANCZOS)
            out.paste(im, (x, y), im)
        d.text((x + 5, y + 4), str(idx), font=font(12), fill=(150, 120, 90))
    d.text((28, height - 20), "空格子 10/11/14/15 保持透明；每格四周 ≥8px。", font=font(12), fill=(130, 116, 97))
    return out


def gif(sheet: Image.Image, idxs: list[int], fps: float, path: Path, size: int = 160, bg=(243, 240, 233)) -> None:
    frames = []
    for idx in idxs:
        cell = sheet.crop(((idx % COLS) * CELL, (idx // COLS) * CELL, (idx % COLS + 1) * CELL, (idx // COLS + 1) * CELL))
        canvas = Image.new("RGBA", (size, size), bg + (255,))
        canvas.alpha_composite(cell.resize((size, size), Image.LANCZOS))
        frames.append(canvas.convert("P", palette=Image.ADAPTIVE, colors=128))
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=int(1000 / fps), loop=0, disposal=2)


def checks(sheet: Image.Image) -> dict:
    out = {"size": sheet.size, "mode": sheet.mode, "cells": {}, "warnings": []}
    if sheet.size != (512, 512):
        out["warnings"].append(f"整图尺寸不是 512×512：{sheet.size}")
    for idx in range(16):
        cell = sheet.crop(((idx % 4) * CELL, (idx // 4) * CELL, (idx % 4 + 1) * CELL, (idx // 4 + 1) * CELL))
        bbox = cell.getbbox()
        used = idx in FRAMES
        out["cells"][idx] = {"used": used, "bbox": bbox}
        if used:
            if bbox is None:
                out["warnings"].append(f"第 {idx} 格是空的")
            else:
                l, t, r, b = bbox
                if min(l, t, CELL - r, CELL - b) < 8:
                    out["warnings"].append(f"第 {idx} 格边距不足 8px：{l},{t},{CELL - r},{CELL - b}")
        elif bbox is not None:
            out["warnings"].append(f"第 {idx} 格应为空却有内容")
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="透明立绘 PNG")
    ap.add_argument("--out", required=True)
    ap.add_argument("--name", default="custom")
    args = ap.parse_args()

    src = Path(args.input)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    base, bbox = normalize(load_portrait(src))
    sheet = make_sheet(base)
    sheet.save(out / "sprite.png")
    contact_sheet(sheet, args.name).save(out / "preview-sheet.png")

    gif(sheet, [0, 1, 2, 3], 4, out / "preview-idle.gif")
    gif(sheet, [4, 5, 6, 7], 5, out / "preview-click.gif")
    gif(sheet, [8, 9], 4, out / "preview-drag.gif")
    gif(sheet, [12, 13], 1.5, out / "preview-sleep.gif")

    report = checks(sheet)
    report["input"] = {"file": str(src), "content_bbox": bbox}
    (out / "check.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"OK -> {out / 'sprite.png'}")
    for w in report["warnings"]:
        print("  !", w)


if __name__ == "__main__":
    main()
