"""角色模板构建器：一份角色配置 + 12 个姿态 → 一张 512 雪碧图 + 质检 + 预览。

用法（在 art/template 目录）：
    python build.py characters/shy.json
    python build.py --all
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image

TEMPLATE = Path(__file__).resolve().parent
ART = TEMPLATE.parent
ROOT = ART.parent
TOOLS = ROOT / ".tools"

sys.path.insert(0, str(ART))
import assemble as asm  # noqa: E402
import gen  # noqa: E402

# 调色板角色 → rig 里的默认颜色
ROLES = {
    "primary_light": gen.YELLOW_TOP,
    "primary": gen.YELLOW_MID,
    "primary_dark": gen.YELLOW_BOT,
    "primary_shade": gen.YELLOW_DARK,
    "accent_light": gen.ORANGE_TOP,
    "accent": gen.ORANGE_BOT,
    "accent_dark": gen.ORANGE_DARK,
    "comb_light": gen.RED_TOP,
    "comb": gen.RED_BOT,
    "circuit": gen.TEAL,
    "circuit_dark": gen.TEAL_DARK,
    "screen_top": gen.SCREEN_TOP,
    "screen_bottom": gen.SCREEN_BOT,
    "screen_edge": gen.SCREEN_EDGE,
    "blush": gen.PINK,
    "outline": gen.OUTLINE,
}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def recolor(svg: str, palette: dict[str, str]) -> str:
    unknown = set(palette) - set(ROLES)
    if unknown:
        raise SystemExit(f"未知的调色板角色：{sorted(unknown)}\n可用：{sorted(ROLES)}")
    for role, value in palette.items():
        svg = svg.replace(ROLES[role], value)
    return svg


def build(character_path: Path) -> None:
    char = load_json(character_path)
    cid = char["id"]
    style = gen.Style(**char.get("style", {}))
    palette = char.get("palette", {})
    poses_ref = char.get("poses", "poses.json")
    poses_path = Path(poses_ref)
    if not poses_path.is_absolute():
        poses_path = TEMPLATE / poses_ref
    poses = load_json(poses_path)

    out = TEMPLATE / "out" / cid
    svg_dir = out / "svg"
    png_dir = out / "512"
    svg_dir.mkdir(parents=True, exist_ok=True)
    png_dir.mkdir(parents=True, exist_ok=True)

    jobs = []
    for item in poses:
        idx = item["index"]
        pose = gen.Pose(**{k: v for k, v in item.items() if k != "index"})
        svg = recolor(gen.frame_svg(style, pose), palette)
        svg_path = svg_dir / f"f{idx:02d}.svg"
        svg_path.write_text(svg, encoding="utf-8")
        jobs.append({"svg": str(svg_path), "out": str(png_dir / f"f{idx:02d}.png"), "size": 512})

    jobs_path = out / "jobs.json"
    jobs_path.write_text(json.dumps(jobs, ensure_ascii=False, indent=1), encoding="utf-8")

    node = shutil.which("node")
    if not node:
        raise SystemExit("找不到 node，请先安装 Node.js 24+")
    render = TOOLS / "render.mjs"
    if not render.exists():
        raise SystemExit(f"找不到渲染器：{render}")
    subprocess.run([node, str(render), str(jobs_path)], check=True, cwd=str(TOOLS))

    frames = {}
    for job in jobs:
        idx = int(Path(job["out"]).stem[1:])
        frames[idx] = Image.open(job["out"]).convert("RGBA")

    frames = asm.fit_frames(frames)
    cols = char.get("cols", 4)
    rows = char.get("rows", 4)
    anims = char.get("animations") or asm.ANIMS
    used_frames = {f for spec in anims.values() for f in spec["frames"]}
    sheet = asm.build_sheet(frames, cols, rows)
    sheet.save(out / f"pet-{cid}.png")

    report = asm.checks(sheet, cols, rows, used_frames, anims)
    (out / "check-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")

    title = f"{char.get('name', cid)} · {len(used_frames)} 帧雪碧图（每格 128，显示为 2×）"
    asm.contact_sheet(frames, title=title, cols=cols, rows=rows, anims=anims).save(out / "preview-sheet.png")
    for name, spec in anims.items():
        asm.preview_gif(frames, name, spec["frames"], spec.get("fps", 5), out_dir=out)
        asm.strip(frames, name, spec["frames"], out_dir=out)

    status = "OK" if not report["warnings"] else f"{len(report['warnings'])} warnings"
    print(f"[{cid}] {status} -> {out / f'pet-{cid}.png'}")
    for w in report["warnings"]:
        print("  !", w)


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return
    if args[0] == "--all":
        for path in sorted((TEMPLATE / "characters").glob("*.json")):
            build(path)
    else:
        build((TEMPLATE / args[0]).resolve() if not Path(args[0]).is_absolute() else Path(args[0]))


if __name__ == "__main__":
    main()
