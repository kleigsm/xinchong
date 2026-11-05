"""芯宠角色矢量生成器：集美大学计算机学院吉祥物「显示器小鸡」。

坐标系：128×128（最终单格尺寸）；渲染时按 4 倍（512）输出，再下采样到 128。
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# ---------------------------------------------------------------- 配色
YELLOW_TOP = "#FFDA5C"
YELLOW_BOT = "#F3BC12"
YELLOW_MID = "#F9CA2A"
YELLOW_DARK = "#D89C0C"
ORANGE_TOP = "#F59A3C"
ORANGE_BOT = "#DC6A14"
ORANGE_DARK = "#B2500D"
RED_TOP = "#E8563A"
RED_BOT = "#C33418"
TEAL = "#2FB6C6"
TEAL_DARK = "#1E8FA0"
SCREEN_TOP = "#FFFFFF"
SCREEN_BOT = "#EFF2EA"
SCREEN_EDGE = "#DCD8C9"
INK = "#24201D"
PINK = "#F58A93"
OUTLINE = "#7A4D10"


@dataclass
class Style:
    """一套角色的比例与画法参数。"""

    head_w: float = 78
    head_h: float = 62
    head_y: float = 16
    head_rx: float = 21
    screen_inset: float = 6.6
    screen_rx: float = 14
    body_w: float = 56
    body_top: float = 78
    body_bottom: float = 110
    foot_w: float = 19
    foot_h: float = 10
    foot_y: float = 110
    outline: float = 2.2
    eye_rx: float = 5.6
    eye_ry: float = 6.8
    eye_dx: float = 14
    eye_y: float = 43
    cheek_rx: float = 6.2
    cheek_ry: float = 3.8
    cheek_y: float = 52
    cheek_opacity: float = 0.6
    use_gradient: bool = True
    detail: int = 2  # 0 简、1 中、2 全
    outline_color: str = OUTLINE
    hand_r: float = 6.0
    antenna: str = "ball"  # ball / star
    ear_tilt: float = 0.0  # 耳机外张角度（正值向外）
    accessory: str = "none"  # none / bow / star


@dataclass
class Pose:
    """一帧的姿态参数。"""

    dy: float = 0.0
    tilt: float = 0.0
    head_dy: float = 0.0
    head_tilt: float = 0.0
    squash: float = 1.0
    eyes: str = "open"  # open / half / closed / happy / wide / peek / squeeze
    look: float = 0.0
    arms: str = "side"  # side / cheeks / up / dangle
    mouth: str = "smile"  # smile / open / small / none
    brows: str = "none"  # none / angry / worried
    blush: float = 1.0
    comb: float = 0.0
    ears: float = 0.0
    heart: bool = False
    zzz: int = 0
    sweat: bool = False
    wave: float = 0.0  # 招手时手部水平偏移
    anger: bool = False  # 生气符号


def _grad(gid: str, c1: str, c2: str, x1=0, y1=0, x2=0, y2=1) -> str:
    return (
        f'<linearGradient id="{gid}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">'
        f'<stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/>'
        f"</linearGradient>"
    )


def yellow_fill(st: Style) -> str:
    return "url(#yellow)" if st.use_gradient else YELLOW_MID


def orange_fill(st: Style) -> str:
    return "url(#orange)" if st.use_gradient else "#E8822A"


def red_fill(st: Style) -> str:
    return "url(#red)" if st.use_gradient else "#D8422A"


def screen_fill(st: Style) -> str:
    return "url(#screen)" if st.use_gradient else "#FDFDF8"


def defs(st: Style) -> str:
    parts = [
        _grad("yellow", YELLOW_TOP, YELLOW_BOT, 0.2, 0, 0.8, 1),
        _grad("orange", ORANGE_TOP, ORANGE_BOT),
        _grad("red", RED_TOP, RED_BOT),
        _grad("screen", SCREEN_TOP, SCREEN_BOT, 0, 0, 0.4, 1),
        '<filter id="soft" x="-30%" y="-30%" width="160%" height="160%">'
        '<feDropShadow dx="0" dy="1.2" stdDeviation="0.9" flood-color="#000" flood-opacity="0.16"/>'
        "</filter>",
    ]
    return "<defs>" + "".join(parts) + "</defs>"


def eyes_svg(st: Style, p: Pose, cx1: float, cx2: float, cy: float) -> str:
    """左右眼；按表情切换。"""
    ink = INK
    out: list[str] = []
    dx = p.look
    for cx in (cx1, cx2):
        x = cx + dx
        if p.eyes == "open":
            out.append(
                f'<ellipse cx="{x:.2f}" cy="{cy:.2f}" rx="{st.eye_rx}" ry="{st.eye_ry}" fill="{ink}"/>'
                f'<circle cx="{x - 1.7:.2f}" cy="{cy - 2.4:.2f}" r="1.7" fill="#fff"/>'
                f'<circle cx="{x + 1.5:.2f}" cy="{cy + 2.2:.2f}" r="0.8" fill="#fff" opacity="0.8"/>'
            )
        elif p.eyes == "wide":
            out.append(
                f'<ellipse cx="{x:.2f}" cy="{cy:.2f}" rx="{st.eye_rx + 0.9}" ry="{st.eye_ry + 1.1}" '
                f'fill="#fff" stroke="{ink}" stroke-width="1.4"/>'
                f'<circle cx="{x:.2f}" cy="{cy + 0.4:.2f}" r="3.0" fill="{ink}"/>'
                f'<circle cx="{x - 1.1:.2f}" cy="{cy - 0.9:.2f}" r="1.0" fill="#fff"/>'
            )
        elif p.eyes == "half":
            out.append(
                f'<path d="M{x - st.eye_rx:.2f} {cy:.2f} A{st.eye_rx} {st.eye_ry} 0 0 0 '
                f'{x + st.eye_rx:.2f} {cy:.2f} Z" fill="{ink}"/>'
            )
        elif p.eyes == "closed":
            out.append(
                f'<path d="M{x - 5.4:.2f} {cy + 0.6:.2f} Q{x:.2f} {cy + 4.3:.2f} {x + 5.4:.2f} {cy + 0.6:.2f}" '
                f'fill="none" stroke="{ink}" stroke-width="2.2" stroke-linecap="round"/>'
            )
        elif p.eyes == "happy":
            out.append(
                f'<path d="M{x - 5.4:.2f} {cy + 2.4:.2f} Q{x:.2f} {cy - 4.2:.2f} {x + 5.4:.2f} {cy + 2.4:.2f}" '
                f'fill="none" stroke="{ink}" stroke-width="2.2" stroke-linecap="round"/>'
            )
        elif p.eyes == "peek":
            out.append(
                f'<path d="M{x - 5.4:.2f} {cy + 0.4:.2f} Q{x:.2f} {cy - 4.0:.2f} {x + 5.4:.2f} {cy + 0.4:.2f}" '
                f'fill="none" stroke="{ink}" stroke-width="2.2" stroke-linecap="round"/>'
                f'<circle cx="{x:.2f}" cy="{cy + 1.2:.2f}" r="1.5" fill="{ink}"/>'
            )
        elif p.eyes == "squeeze":
            out.append(
                f'<path d="M{x - 5.6:.2f} {cy - 1.2:.2f} L{x + 5.6:.2f} {cy + 1.4:.2f} '
                f'M{x - 5.6:.2f} {cy + 1.4:.2f} L{x + 5.6:.2f} {cy - 1.2:.2f}" '
                f'fill="none" stroke="{ink}" stroke-width="2.2" stroke-linecap="round"/>'
            )
    return "".join(out)


def brows_svg(st: Style, p: Pose, cx1: float, cx2: float, cy: float) -> str:
    """眉毛：傲娇用上挑的怒眉，害羞/开朗默认不画。"""
    if p.brows == "none":
        return ""
    y = cy - st.eye_ry - 3.6
    out = []
    for i, cx in enumerate((cx1, cx2)):
        inner = 1 if i == 0 else -1  # 朝向鼻子的一侧
        if p.brows == "angry":
            x1, y1 = cx - 5.2 * inner, y - 0.6
            x2, y2 = cx + 4.4 * inner, y + 1.6
        else:  # worried
            x1, y1 = cx - 5.2 * inner, y + 1.6
            x2, y2 = cx + 4.4 * inner, y - 0.6
        out.append(
            f'<path d="M{x1:.2f} {y1:.2f} L{x2:.2f} {y2:.2f}" fill="none" stroke="{INK}" '
            f'stroke-width="1.6" stroke-linecap="round"/>'
        )
    return "".join(out)


def mouth_svg(st: Style, p: Pose, cx: float, cy: float) -> str:
    if p.mouth == "none":
        return ""
    if p.mouth == "open":
        return (
            f'<path d="M{cx - 3.6:.2f} {cy - 1.6:.2f} Q{cx:.2f} {cy + 5.2:.2f} {cx + 3.6:.2f} {cy - 1.6:.2f} Z" '
            f'fill="{ORANGE_BOT}" stroke="{ORANGE_DARK}" stroke-width="1.1" stroke-linejoin="round"/>'
        )
    if p.mouth == "small":
        return (
            f'<path d="M{cx - 2.4:.2f} {cy:.2f} Q{cx:.2f} {cy + 2.4:.2f} {cx + 2.4:.2f} {cy:.2f}" '
            f'fill="none" stroke="{ORANGE_DARK}" stroke-width="1.5" stroke-linecap="round"/>'
        )
    # smile：橙色小喙（菱形）
    return (
        f'<path d="M{cx:.2f} {cy - 4.4:.2f} L{cx + 4.4:.2f} {cy + 0.4:.2f} L{cx:.2f} {cy + 4.6:.2f} '
        f'L{cx - 4.4:.2f} {cy + 0.4:.2f} Z" fill="{ORANGE_TOP}" stroke="{ORANGE_DARK}" '
        f'stroke-width="1.0" stroke-linejoin="round"/>'
        f'<path d="M{cx - 4.4:.2f} {cy + 0.4:.2f} L{cx + 4.4:.2f} {cy + 0.4:.2f}" '
        f'stroke="{ORANGE_DARK}" stroke-width="0.8" opacity="0.55"/>'
    )


def comb_svg(st: Style, p: Pose, cx: float, top: float) -> str:
    """头顶鸡冠：三瓣（左小、中高、右小）。"""
    return f"""<g transform="translate({cx:.2f} {top:.2f}) rotate({p.comb:.1f}) scale(0.95 0.82)">
<path d="M-11 1
 C-13 -3 -12.5 -7 -9.8 -8.2 C-7.2 -9.3 -5.2 -7.4 -5.0 -4.6
 C-4.4 -9.4 -2.2 -12.2 1.0 -12.2 C4.2 -12.2 5.6 -9.2 5.0 -4.6
 C5.2 -7.4 7.2 -9.3 9.8 -8.2 C12.5 -7 13 -3 11 1 Z"
 fill="{red_fill(st)}" stroke="{st.outline_color}" stroke-width="{st.outline * 0.8:.2f}" stroke-linejoin="round"/>
<path d="M-6 -1.2 C-7 -4 -6.4 -5.6 -5.2 -5.8" fill="none" stroke="#fff" stroke-width="1.1"
 opacity="0.45" stroke-linecap="round"/>
</g>"""


def _star_path(cx: float, cy: float, r_out: float, r_in: float) -> str:
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        r = r_out if i % 2 == 0 else r_in
        pts.append(f"{cx + r * math.cos(ang):.2f},{cy + r * math.sin(ang):.2f}")
    return "M" + " L".join(pts) + " Z"


def headphones_svg(st: Style, p: Pose, left_x: float, right_x: float, y: float) -> str:
    """两侧耳机（含左侧天线）；ear_tilt 控制外张，antenna 控制天线头形状。"""
    sw = st.outline * 0.9
    ear_w, ear_h = 8.6, 24
    out: list[str] = []
    for x, sign in ((left_x, -1), (right_x, 1)):
        angle = st.ear_tilt * sign
        out.append(
            f'<g transform="rotate({angle:.1f} {x:.2f} {y + ear_h / 2:.2f})">'
            f'<rect x="{x - ear_w / 2:.2f}" y="{y:.2f}" width="{ear_w}" height="{ear_h}" rx="4.3" '
            f'fill="{orange_fill(st)}" stroke="{st.outline_color}" stroke-width="{sw:.2f}"/>'
            f'<rect x="{x - ear_w / 2 + 1.6:.2f}" y="{y + 3:.2f}" width="{ear_w - 3.2}" '
            f'height="{ear_h - 6}" rx="3.2" fill="#000" opacity="0.10"/></g>'
        )
    ax = left_x
    tip_x = ax - 2.0 + p.ears * 0.4
    ant = (
        f'<path d="M{ax:.2f} {y - 0.5:.2f} L{tip_x:.2f} {y - 10:.2f}" '
        f'stroke="{st.outline_color}" stroke-width="1.7" stroke-linecap="round"/>'
    )
    if st.antenna == "star":
        ant += (
            f'<path d="{_star_path(tip_x, y - 11.5, 4.3, 1.9)}" fill="{red_fill(st)}" '
            f'stroke="{st.outline_color}" stroke-width="1.0" stroke-linejoin="round"/>'
        )
    else:
        ant += (
            f'<circle cx="{tip_x:.2f}" cy="{y - 11:.2f}" r="2.1" '
            f'fill="{red_fill(st)}" stroke="{st.outline_color}" stroke-width="1.1"/>'
        )
    out.append(ant)
    return "".join(out)


def hand_svg(st: Style, x: float, y: float, r: float = 6.4) -> str:
    sw = st.outline * 0.95
    out = (
        f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r}" fill="{yellow_fill(st)}" '
        f'stroke="{st.outline_color}" stroke-width="{sw:.2f}"/>'
    )
    out += (
        f'<path d="M{x - r * 0.72:.2f} {y + r * 0.38:.2f} Q{x:.2f} {y + r * 0.95:.2f} '
        f'{x + r * 0.72:.2f} {y + r * 0.38:.2f}" fill="none" stroke="{YELLOW_DARK}" '
        f'stroke-width="1.1" opacity="0.45" stroke-linecap="round"/>'
    )
    return out


def arms_svg(st: Style, p: Pose, shoulders: tuple[float, float]) -> tuple[str, str]:
    """返回（手臂线条, 手掌）。手掌单独画在头部之后，避免被头挡住。"""
    lw = 8.2
    sw = st.outline
    lx, rx = shoulders
    segs: list[str] = []
    hands: list[tuple[float, float]] = []

    if p.arms == "cheeks":
        segs.append(f"M{lx:.2f} 88 C{lx - 5:.2f} 82, {lx - 4:.2f} 72, {lx + 6.5:.2f} 64")
        segs.append(f"M{rx:.2f} 88 C{rx + 5:.2f} 82, {rx + 4:.2f} 72, {rx - 6.5:.2f} 64")
        hands = [(lx + 8.0, 61.8), (rx - 8.0, 61.8)]
    elif p.arms == "up":
        segs.append(f"M{lx:.2f} 91 C{lx - 5:.2f} 82, {lx - 4:.2f} 70, {lx - 1:.2f} 62")
        segs.append(f"M{rx:.2f} 91 C{rx + 5:.2f} 82, {rx + 4:.2f} 70, {rx + 1:.2f} 62")
        hands = [(lx - 1, 59.5), (rx + 1, 59.5)]
    elif p.arms == "dangle":
        segs.append(f"M{lx:.2f} 90 C{lx - 6:.2f} 94, {lx - 7:.2f} 98, {lx - 6.5:.2f} 100")
        segs.append(f"M{rx:.2f} 90 C{rx + 6:.2f} 94, {rx + 7:.2f} 98, {rx + 6.5:.2f} 100")
        hands = [(lx - 6.5, 101.5), (rx + 6.5, 101.5)]
    elif p.arms == "hip":
        segs.append(f"M{lx:.2f} 88 C{lx - 6:.2f} 90, {lx - 8:.2f} 96, {lx - 3:.2f} 99")
        segs.append(f"M{rx:.2f} 88 C{rx + 6:.2f} 90, {rx + 8:.2f} 96, {rx + 3:.2f} 99")
        hands = [(lx - 2.5, 100), (rx + 2.5, 100)]
    elif p.arms == "cross":
        segs.append(f"M{lx:.2f} 86 C{lx + 6:.2f} 87, {rx - 8:.2f} 88, {rx - 3:.2f} 89")
        segs.append(f"M{rx:.2f} 86 C{rx - 6:.2f} 91, {lx + 8:.2f} 91.5, {lx + 3:.2f} 92")
        hands = [(rx - 3, 89), (lx + 3, 92)]
    elif p.arms == "wave":
        segs.append(f"M{lx:.2f} 91 C{lx - 3:.2f} 95, {lx - 5:.2f} 98, {lx - 5.5:.2f} 100")
        segs.append(f"M{rx:.2f} 88 C{rx + 7:.2f} 80, {rx + 9 + p.wave:.2f} 70, {rx + 9 + p.wave:.2f} 64")
        hands = [(lx - 5.5, 102), (rx + 9 + p.wave, 62)]
    elif p.arms == "stretch":
        hx = 64 - st.head_w / 2
        segs.append(f"M{lx:.2f} 88 C{lx - 10:.2f} 82, {hx - 8:.2f} 70, {hx - 6:.2f} 60")
        segs.append(f"M{rx:.2f} 88 C{rx + 10:.2f} 82, {hx + st.head_w + 8:.2f} 70, {hx + st.head_w + 6:.2f} 60")
        hands = [(hx - 6, 58), (hx + st.head_w + 6, 58)]
    else:  # side
        segs.append(f"M{lx:.2f} 91 C{lx - 3:.2f} 95, {lx - 5:.2f} 98, {lx - 5.5:.2f} 100")
        segs.append(f"M{rx:.2f} 91 C{rx + 3:.2f} 95, {rx + 5:.2f} 98, {rx + 5.5:.2f} 100")
        hands = [(lx - 5.5, 102), (rx + 5.5, 102)]

    out = []
    for d in segs:
        out.append(
            f'<path d="{d}" fill="none" stroke="{st.outline_color}" '
            f'stroke-width="{lw + sw * 1.7:.2f}" stroke-linecap="round"/>'
        )
    for d in segs:
        out.append(
            f'<path d="{d}" fill="none" stroke="{yellow_fill(st)}" '
            f'stroke-width="{lw:.2f}" stroke-linecap="round"/>'
        )
    hand_html = "".join(hand_svg(st, hx, hy, r=st.hand_r) for hx, hy in hands)
    return "".join(out), hand_html


def body_svg(st: Style, p: Pose) -> str:
    bw = st.body_w
    top = st.body_top
    bot = st.body_bottom
    d = (
        f"M64 {top:.2f} C{64 - bw * 0.62:.2f} {top + 1:.2f} {64 - bw / 2:.2f} {top + 7:.2f} "
        f"{64 - bw / 2:.2f} {top + 16:.2f} "
        f"C{64 - bw / 2:.2f} {bot - 5:.2f} {64 - bw * 0.32:.2f} {bot:.2f} 64 {bot:.2f} "
        f"C{64 + bw * 0.32:.2f} {bot:.2f} {64 + bw / 2:.2f} {bot - 5:.2f} {64 + bw / 2:.2f} {top + 16:.2f} "
        f"C{64 + bw / 2:.2f} {top + 7:.2f} {64 + bw * 0.62:.2f} {top + 1:.2f} 64 {top:.2f} Z"
    )
    out = [f'<path d="{d}" fill="{yellow_fill(st)}" stroke="{st.outline_color}" stroke-width="{st.outline:.2f}"/>']
    out.append(f'<ellipse cx="54" cy="{top + 10:.2f}" rx="9" ry="5.5" fill="#fff" opacity="0.28"/>')
    if st.detail >= 1:
        out.append(
            f'<path d="M46 {top + 15:.2f} L53 {top + 15:.2f} L57 {top + 19:.2f} L71 {top + 19:.2f} '
            f'L75 {top + 15:.2f} L82 {top + 15:.2f}" fill="none" stroke="{TEAL}" stroke-width="2.0" '
            f'stroke-linecap="round" stroke-linejoin="round"/>'
        )
        out.append(f'<circle cx="57" cy="{top + 19:.2f}" r="1.15" fill="{TEAL}"/>')
        out.append(f'<circle cx="71" cy="{top + 19:.2f}" r="1.15" fill="{TEAL}"/>')
    if st.detail >= 2:
        out.append(
            f'<path d="M50 {top + 24:.2f} Q64 {top + 28:.2f} 78 {top + 24:.2f}" fill="none" '
            f'stroke="{YELLOW_DARK}" stroke-width="1.1" opacity="0.5"/>'
        )
    return "".join(out)


def feet_svg(st: Style, p: Pose) -> str:
    sw = st.outline * 0.95
    out: list[str] = []
    for cx in (64 - 14, 64 + 14):
        out.append(
            f'<rect x="{cx - 4.6:.2f}" y="{st.body_bottom - 7:.2f}" width="9.2" height="10" rx="4.6" '
            f'fill="{yellow_fill(st)}" stroke="{st.outline_color}" stroke-width="{sw:.2f}"/>'
        )
        y = st.foot_y
        w = st.foot_w
        h = st.foot_h
        out.append(
            f'<rect x="{cx - w / 2:.2f}" y="{y:.2f}" width="{w}" height="{h}" rx="{h / 2:.2f}" '
            f'fill="{orange_fill(st)}" stroke="{st.outline_color}" stroke-width="{sw:.2f}"/>'
        )
        out.append(
            f'<path d="M{cx - w / 2 + 3:.2f} {y + h - 2.4:.2f} L{cx + w / 2 - 3:.2f} {y + h - 2.4:.2f}" '
            f'stroke="{ORANGE_DARK}" stroke-width="1.6" opacity="0.65" stroke-linecap="round"/>'
        )
        out.append(
            f'<ellipse cx="{cx:.2f}" cy="{y + 2.4:.2f}" rx="{w / 2 - 3.4:.2f}" ry="1.6" fill="#fff" opacity="0.22"/>'
        )
    return "".join(out)


def extras_svg(p: Pose) -> str:
    out: list[str] = []
    if p.heart:
        out.append(
            '<g opacity="0.95" transform="translate(106 15) rotate(12) scale(0.85)">'
            '<path d="M0 5 C-7 -1 -12 4 -7 9 L0 16 L7 9 C12 4 7 -1 0 5 Z" fill="#FF7A8A" '
            'stroke="#D9435C" stroke-width="1.3" stroke-linejoin="round"/></g>'
        )
    for i in range(p.zzz):
        size = 5.4 + i * 1.4
        out.append(
            f'<text x="{104 + i * 4.4}" y="{27 - i * 6.0}" font-family="Arial, sans-serif" '
            f'font-size="{size}" font-weight="700" fill="{TEAL_DARK}" opacity="{0.85 - i * 0.2:.2f}">z</text>'
        )
    if p.sweat:
        out.append(
            '<path d="M101 47 C97 53 97 57 101 57 C105 57 105 53 101 47 Z" fill="#8ED8F0" '
            'stroke="#3E9FC4" stroke-width="1.1"/>'
        )
    if p.anger:
        cx, cy = 105, 30
        out.append(
            f'<g stroke="#E23F1E" stroke-width="2.0" fill="none" stroke-linecap="round">'
            f'<path d="M{cx - 6} {cy - 6} Q{cx - 1} {cy - 3} {cx - 2} {cy}"/>'
            f'<path d="M{cx + 6} {cy - 6} Q{cx + 1} {cy - 3} {cx + 2} {cy}"/>'
            f'<path d="M{cx - 4} {cy + 6} Q{cx - 1} {cy + 2} {cx + 1} {cy + 3}"/>'
            f'<path d="M{cx + 5} {cy + 5} Q{cx + 2} {cy + 1} {cx} {cy + 1}"/>'
            f"</g>"
        )
    return "".join(out)


def accessory_svg(st: Style, left_x: float, right_x: float, y: float) -> str:
    """耳机上的小配饰：傲娇＝蝴蝶结，开朗＝星星耳钉。"""
    if st.accessory == "none":
        return ""
    out = []
    if st.accessory == "bow":
        cx, cy = right_x, y + 1
        out.append(
            f'<g transform="rotate(-12 {cx:.2f} {cy:.2f})">'
            f'<ellipse cx="{cx - 5.0:.2f}" cy="{cy:.2f}" rx="5.0" ry="3.6" fill="{red_fill(st)}" '
            f'stroke="{OUTLINE}" stroke-width="1.1"/>'
            f'<ellipse cx="{cx + 5.0:.2f}" cy="{cy:.2f}" rx="5.0" ry="3.6" fill="{red_fill(st)}" '
            f'stroke="{OUTLINE}" stroke-width="1.1"/>'
            f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="2.5" fill="{red_fill(st)}" '
            f'stroke="{OUTLINE}" stroke-width="1.1"/>'
            f"</g>"
        )
    elif st.accessory == "star":
        out.append(
            f'<path d="{_star_path(right_x, y - 1, 5.2, 2.2)}" fill="#FFC94A" '
            f'stroke="#A86B00" stroke-width="1.1" stroke-linejoin="round"/>'
        )
    return "".join(out)


def frame_svg(st: Style, p: Pose) -> str:
    head_cy = st.head_y + st.head_h / 2
    shoulders = (64 - st.body_w / 2 + 3.5, 64 + st.body_w / 2 - 3.5)
    hx = 64 - st.head_w / 2
    hy = st.head_y
    hw, hh = st.head_w, st.head_h

    arm_limbs, hands_html = arms_svg(st, p, shoulders)
    front_arms = p.arms in ("cheeks", "up")
    inner: list[str] = []
    inner.append(f'<g transform="translate(0 {p.dy:.2f})">')
    inner.append(body_svg(st, p))
    inner.append(feet_svg(st, p))
    if not front_arms:
        inner.append(arm_limbs)
    inner.append("</g>")

    head: list[str] = []
    head.append(
        f'<rect x="{hx:.2f}" y="{hy:.2f}" width="{hw}" height="{hh}" rx="{st.head_rx}" '
        f'fill="{yellow_fill(st)}" stroke="{st.outline_color}" stroke-width="{st.outline:.2f}"/>'
    )
    ins = st.screen_inset
    sx, sy = hx + ins, hy + ins + 0.5
    sw_, sh_ = hw - ins * 2, hh - ins * 2 - 1
    head.append(
        f'<rect x="{sx:.2f}" y="{sy:.2f}" width="{sw_:.2f}" height="{sh_:.2f}" rx="{st.screen_rx}" '
        f'fill="{screen_fill(st)}" stroke="{SCREEN_EDGE}" stroke-width="1.0"/>'
    )
    head.append(
        f'<path d="M{sx + 3:.2f} {sy + 2:.2f} L{sx + sw_ * 0.55:.2f} {sy + 2:.2f} '
        f'L{sx + sw_ * 0.3:.2f} {sy + 9:.2f} L{sx + 3:.2f} {sy + 9:.2f} Z" fill="#fff" opacity="0.55"/>'
    )
    ecx1, ecx2 = 64 - st.eye_dx, 64 + st.eye_dx
    head.append(eyes_svg(st, p, ecx1, ecx2, st.eye_y))
    head.append(brows_svg(st, p, ecx1, ecx2, st.eye_y))
    head.append(
        f'<ellipse cx="{ecx1 - 8:.2f}" cy="{st.cheek_y:.2f}" rx="{st.cheek_rx}" ry="{st.cheek_ry}" '
        f'fill="{PINK}" opacity="{st.cheek_opacity * p.blush:.2f}"/>'
        f'<ellipse cx="{ecx2 + 8:.2f}" cy="{st.cheek_y:.2f}" rx="{st.cheek_rx}" ry="{st.cheek_ry}" '
        f'fill="{PINK}" opacity="{st.cheek_opacity * p.blush:.2f}"/>'
    )
    head.append(mouth_svg(st, p, 64, 52.5))

    inner.append(
        f'<g transform="translate(0 {p.dy + p.head_dy:.2f}) rotate({p.head_tilt:.1f} 64 {head_cy:.1f})" '
        f'filter="url(#soft)">{"".join(head)}</g>'
    )
    inner.append(comb_svg(st, p, 64, hy + 1.5))
    inner.append(headphones_svg(st, p, hx - 1.0, hx + hw + 1.0, hy + 16))
    inner.append(accessory_svg(st, hx - 1.0, hx + hw + 1.0, hy + 16))
    if front_arms:
        inner.append(arm_limbs)
    inner.append(hands_html)
    inner.append(extras_svg(p))

    body = "".join(inner)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 128 128">'
        f"{defs(st)}"
        f'<g transform="translate(64 64) rotate({p.tilt:.2f}) scale(1 {p.squash:.3f}) translate(-64 -64)">'
        f"{body}</g></svg>"
    )


# ---------------------------------------------------------------- 三套比例方案
STYLES = {
    "faithful": Style(
        head_w=72, head_h=60, head_y=17, head_rx=15, screen_inset=6.0, screen_rx=10,
        body_w=50, body_top=77, body_bottom=112, foot_w=18, foot_h=9.5, foot_y=110,
        outline=1.9, eye_rx=4.9, eye_ry=6.2, eye_dx=12.8, cheek_opacity=0.5, detail=2,
        hand_r=5.5,
    ),
    "chibi": Style(
        head_w=80, head_h=64, head_y=16, head_rx=22, screen_inset=6.8, screen_rx=14,
        body_w=56, body_top=78, body_bottom=110, foot_w=19, foot_h=10, foot_y=110,
        outline=2.2, eye_rx=5.8, eye_ry=7.0, eye_dx=14.5, cheek_opacity=0.62, detail=2,
    ),
    "sticker": Style(
        head_w=78, head_h=62, head_y=16, head_rx=23, screen_inset=5.6, screen_rx=16,
        body_w=55, body_top=79, body_bottom=110, foot_w=19, foot_h=10, foot_y=110,
        outline=2.9, eye_rx=6.2, eye_ry=6.4, eye_dx=15, cheek_opacity=0.8, detail=0,
        use_gradient=False, outline_color="#B4611A",
    ),
}


def build_concepts() -> None:
    out = ROOT / "build"
    (out / "svg").mkdir(parents=True, exist_ok=True)
    jobs = []
    poses = {
        "idle": Pose(dy=0, eyes="open", arms="side", blush=1.0),
        "shy": Pose(dy=0, eyes="closed", arms="cheeks", blush=1.0, head_tilt=-1.5),
    }
    for name, st in STYLES.items():
        for pname, pose in poses.items():
            svg = frame_svg(st, pose)
            path = out / "svg" / f"{name}-{pname}.svg"
            path.write_text(svg, encoding="utf-8")
            for size in (512, 128):
                jobs.append(
                    {
                        "name": f"{name}-{pname}",
                        "svg": str(path),
                        "out": str(out / "png" / f"{name}-{pname}-{size}.png"),
                        "size": size,
                    }
                )
    (out / "jobs.json").write_text(json.dumps(jobs, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {len(jobs)} jobs")


def shy_frames() -> list[tuple[int, Pose]]:
    """害羞套 12 帧：待机 0-3 / 点击 4-7 / 拖拽 8-9 / 睡觉 12-13。"""
    return [
        (0, Pose(dy=0.0, eyes="open", look=-0.6, arms="side", blush=0.95)),
        (1, Pose(dy=-2.6, eyes="open", look=-0.6, arms="side", blush=1.0, comb=3.0, ears=1.4)),
        (2, Pose(dy=-0.9, eyes="open", look=-1.6, arms="side", blush=1.0, comb=1.0)),
        (3, Pose(dy=-1.8, eyes="half", look=-1.0, arms="side", blush=1.0, comb=1.6)),
        (4, Pose(dy=2.2, squash=0.93, eyes="wide", arms="up", mouth="open", comb=-8, ears=-3,
                 blush=0.7, head_dy=1.2)),
        (5, Pose(dy=0.0, squash=0.94, eyes="closed", arms="cheeks", mouth="small", blush=1.0,
                 head_tilt=3, comb=-3)),
        (6, Pose(dy=0.0, squash=0.97, eyes="half", look=0.0, arms="cheeks", mouth="smile", blush=1.0,
                 head_tilt=-3, heart=True)),
        (7, Pose(dy=0.4, eyes="happy", arms="side", mouth="smile", blush=0.85, comb=1)),
        (8, Pose(tilt=-6, dy=-2.0, eyes="wide", arms="dangle", mouth="open", comb=5, ears=-4,
                 head_tilt=-2)),
        (9, Pose(tilt=6, dy=-1.0, eyes="wide", arms="dangle", mouth="open", comb=-5, ears=4,
                 head_tilt=2)),
        (12, Pose(dy=1.2, eyes="closed", arms="side", mouth="small", blush=0.7, head_tilt=5,
                  comb=7, zzz=1)),
        (13, Pose(dy=2.2, squash=0.985, eyes="closed", arms="side", mouth="small", blush=0.7,
                  head_tilt=7, comb=9, zzz=2)),
    ]


def build_shy() -> None:
    out = ROOT / "build" / "shy"
    (out / "svg").mkdir(parents=True, exist_ok=True)
    jobs = []
    st = STYLES["faithful"]
    for idx, pose in shy_frames():
        svg = frame_svg(st, pose)
        path = out / "svg" / f"f{idx:02d}.svg"
        path.write_text(svg, encoding="utf-8")
        jobs.append(
            {
                "name": f"frame-{idx:02d}",
                "svg": str(path),
                "out": str(out / "512" / f"f{idx:02d}.png"),
                "size": 512,
            }
        )
    (out / "jobs.json").write_text(json.dumps(jobs, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {len(jobs)} frame jobs")


def main() -> None:
    import sys

    mode = sys.argv[1] if len(sys.argv) > 1 else "concepts"
    if mode == "shy":
        build_shy()
    else:
        build_concepts()


if __name__ == "__main__":
    main()
