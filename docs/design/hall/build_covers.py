"""生成外观大厅 8 张策展封面 + catalog 示例。"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

BASE = Path(r"C:\人机交互\材料\xinchong")
OUT = BASE / "docs/design/hall"
COVERS = OUT / "covers"
COVERS.mkdir(parents=True, exist_ok=True)
SRC = BASE / "src/renderer/assets"
FONT = r"C:\Windows\Fonts\msyh.ttc"

ITEMS = [
    # id, name, file, hue, bg_top, bg_bottom, tags
    ("mint-soda", "薄荷汽水", "pet-cheerful.png", 120, "#DFF7F0", "#BFEADF", ["猫", "夏日"]),
    ("night-fox", "夜樱狐", "pet-tsundere.png", 260, "#E8E4FF", "#CFC6F5", ["狐", "夜晚"]),
    ("caramel-pudding", "焦糖布丁", "pet-shy.png", 15, "#F7E7D2", "#E8CFAE", ["猫", "甜点"]),
    ("cloud-rabbit", "云朵兔", "pet-cheerful.png", 200, "#E6F1FF", "#C9DDF7", ["兔", "云"]),
    ("sakura-cat", "樱花猫", "pet-tsundere.png", 320, "#FFE6F0", "#F7C9DC", ["猫", "樱花"]),
    ("star-dog", "星尘犬", "pet-shy.png", 40, "#FFF3D6", "#F5DDA8", ["狗", "星空"]),
    ("lemon-soda", "柠檬气泡", "pet-cheerful.png", 50, "#FFF8D9", "#F5E6A8", ["猫", "夏日"]),
    ("grape-gummy", "葡萄软糖", "pet-tsundere.png", 290, "#F0E4FF", "#D9C2F5", ["兔", "糖果"]),
]


def hue_rotate(im: Image.Image, deg: float) -> Image.Image:
    arr = np.asarray(im).astype(np.float32)
    rgb = arr[..., :3] / 255.0
    c = math.cos(math.radians(deg))
    s = math.sin(math.radians(deg))
    m = np.array([
        [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928],
        [0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283],
        [0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072],
    ], dtype=np.float32)
    out = np.clip(rgb @ m.T, 0, 1)
    arr[..., :3] = out * 255
    return Image.fromarray(arr.astype(np.uint8))


def gradient(w: int, h: int, top: str, bottom: str) -> Image.Image:
    a = np.array([int(top[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32)
    b = np.array([int(bottom[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32)
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    arr = (a[None, None, :] * (1 - t) + b[None, None, :] * t)
    arr = np.repeat(arr, w, axis=1)
    canvas = Image.fromarray(arr.astype(np.uint8)).convert("RGBA")
    # 柔光
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse([w * 0.18, h * 0.05, w * 0.82, h * 0.62], fill=(255, 255, 255, 120))
    glow = glow.filter(ImageFilter.GaussianBlur(50))
    canvas.alpha_composite(glow)
    return canvas


def pet_frame(file: str) -> Image.Image:
    im = Image.open(SRC / file).convert("RGBA")
    cell = im.width // 4
    return im.crop((0, 0, cell, cell))


for item_id, name, file, hue, top, bottom, tags in ITEMS:
    canvas = gradient(512, 512, top, bottom)
    pet = hue_rotate(pet_frame(file), hue)
    pet = ImageEnhance.Color(pet).enhance(0.95)
    pet = pet.resize((430, 430), Image.LANCZOS)
    # 地面阴影
    shadow = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse([140, 404, 372, 462], fill=(70, 45, 30, 60))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(pet, ((512 - 430) // 2, 44))
    canvas.save(COVERS / f"{item_id}.png")


# 联系表
cols, rows = 4, 2
cell = 260
pad = 18
label_h = 34
sheet = Image.new("RGB", (cols * cell + (cols + 1) * pad, rows * (cell + label_h) + (rows + 1) * pad), (247, 242, 234))
d = ImageDraw.Draw(sheet)
font = ImageFont.truetype(FONT, 16)
for i, (item_id, name, *_rest) in enumerate(ITEMS):
    c, r = i % cols, i // cols
    x = pad + c * (cell + pad)
    y = pad + r * (cell + label_h + pad)
    im = Image.open(COVERS / f"{item_id}.png").convert("RGB").resize((cell, cell), Image.LANCZOS)
    sheet.paste(im, (x, y))
    d.text((x, y + cell + 6), name, font=font, fill=(46, 37, 33))
sheet.save(OUT / "contact-sheet.png")

catalog = {
    "version": 1,
    "generatedAt": "2026-11-27",
    "note": "示例目录；download/sha256/size 待真实 zip 打包后填写",
    "items": [
        {
            "id": item_id,
            "name": name,
            "author": "芯宠官方",
            "license": "CC0",
            "tags": tags,
            "preview": f"covers/{item_id}.png",
            "download": None,
            "sha256": None,
            "size": None,
            "version": 1,
        }
        for item_id, name, *_rest in ITEMS
    ],
}
(OUT / "catalog.example.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
print("covers", len(ITEMS), "->", OUT)
