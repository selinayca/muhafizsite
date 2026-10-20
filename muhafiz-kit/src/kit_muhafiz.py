"""MUHAFIZ logo kit: shield + M symbol, MUHAFIZ wordmark with the house-A.

All shapes are filled paths. Holes (the M and the signal in single-colour versions)
are real cut-outs (evenodd), so the background shows through on any surface.
"""
import math
from pathlib import Path

import muhafiz
from final import (NAVY, TEAL, WHITE, T, H, ROOF_OVER, f, arc_capsule, shield_outline,
                   paths_svg, window_svg, svg_doc)

OUT = Path(__file__).resolve().parent.parent / "muhafiz-kit"
INK = "#0B1220"


def m_outline(x, y=0.0, k=1.0, w=72.0, depth=50.0):
    """M as one closed polygon (no overlapping parts), scaled by k from (x, y)."""
    tan = (w / 2) / depth
    top = T / math.cos(math.atan(tan))
    m = w / 2
    yi = (m - top) / tan                       # inner V bottom
    ym = T / tan                               # lower V edge meets the stem
    pts = [(0, H), (0, 0), (top, 0), (m, yi), (w - top, 0), (w, 0), (w, H),
           (w - T, H), (w - T, ym), (m, depth), (T, ym), (T, H)]
    pts = [(x + px * k, y + py * k) for px, py in pts]
    head, *rest = pts
    return f"M{f(head[0])},{f(head[1])}" + "".join(f"L{f(a)},{f(b)}" for a, b in rest) + "Z"


def g_M(x):
    return [m_outline(x)], 72.0


muhafiz.GLYPH["M"] = g_M


# ------------------------------------------------------------------ symbol (shield 100 wide)

MK = 0.82          # M scale inside the shield
M_TOP = 30.0       # M top inside the shield (shield is 100 wide, ~115 tall)
ARC_R = (8.5, 17.0)
ARC_W = 5.4


def symbol_parts():
    shield, tip = shield_outline()
    w = 72 * MK
    m = m_outline(50 - w / 2, M_TOP, MK)
    cy = M_TOP - 1.5
    arcs = (arc_capsule(50, cy, ARC_R[0], ARC_W, -140, -40)
            + arc_capsule(50, cy, ARC_R[1], ARC_W, -138, -42))
    return dict(shield=shield, m=m, arcs=arcs, tip=tip)


def symbol_body(mode):
    """light/dark: shield + cut-out M + teal signal.  mono/white: M and signal both cut out."""
    p = symbol_parts()
    color = {"light": NAVY, "dark": WHITE, "mono": NAVY, "white": WHITE}[mode]
    if mode in ("light", "dark"):
        return (f'<path fill="{color}" fill-rule="evenodd" d="{p["shield"]}{p["m"]}"/>'
                f'<path fill="{TEAL}" d="{p["arcs"]}"/>')
    return f'<path fill="{color}" fill-rule="evenodd" d="{p["shield"]}{p["m"]}{p["arcs"]}"/>'


# ------------------------------------------------------------------ layouts

def colors(mode):
    text = {"light": NAVY, "dark": WHITE, "mono": NAVY, "white": WHITE}[mode]
    light = {"light": TEAL, "dark": TEAL, "mono": NAVY, "white": WHITE}[mode]
    return text, light


def wordmark(mode):
    text, light = colors(mode)
    paths, win, right = muhafiz.set_word("MUHAFIZ", 0)
    return paths_svg(paths, text) + window_svg(win, light), (0, -ROOF_OVER, right, H)


def horizontal(mode):
    """Shield-M is the first letter: the M inside matches the cap height of UHAFIZ."""
    text, light = colors(mode)
    p = symbol_parts()
    sc = 1 / MK
    ty = -M_TOP * sc
    sym = f'<g transform="translate(0 {f(ty)}) scale({sc:.5f})">{symbol_body(mode)}</g>'
    start = 100 * sc + 18
    paths, win, right = muhafiz.set_word("UHAFIZ", start)
    body = sym + paths_svg(paths, text) + window_svg(win, light)
    return body, (0, ty, right, ty + p["tip"] * sc)


def symbol(mode):
    p = symbol_parts()
    return symbol_body(mode), (0, 0, 100, p["tip"])


def icon(kind, size=1024.0):
    p = symbol_parts()
    share = {"ios": 0.58, "rounded": 0.58, "fg": 0.42, "mono": 0.42, "maskable": 0.48}[kind]
    s = size * share / p["tip"]
    tx, ty = (size - 100 * s) / 2, (size - p["tip"] * s) / 2
    if kind == "mono":
        art = f'<path fill="{WHITE}" fill-rule="evenodd" d="{p["shield"]}{p["m"]}{p["arcs"]}"/>'
    else:
        art = (f'<path fill="{WHITE}" fill-rule="evenodd" d="{p["shield"]}{p["m"]}"/>'
               f'<path fill="{TEAL}" d="{p["arcs"]}"/>')
    bg = ""
    if kind in ("ios", "maskable"):
        bg = f'<rect width="{f(size)}" height="{f(size)}" fill="{NAVY}"/>'
    elif kind == "rounded":
        bg = f'<rect width="{f(size)}" height="{f(size)}" rx="{f(size * 0.2237)}" fill="{NAVY}"/>'
    return bg + f'<g transform="translate({f(tx)} {f(ty)}) scale({s:.5f})">{art}</g>', (0, 0, size, size)


def splash_icon(mode, size=1152.0):
    p = symbol_parts()
    s = size * 0.42 / p["tip"]
    tx, ty = (size - 100 * s) / 2, (size - p["tip"] * s) / 2
    return f'<g transform="translate({f(tx)} {f(ty)}) scale({s:.5f})">{symbol_body(mode)}</g>', (0, 0, size, size)


def view(box, pad=0.0):
    x0, y0, x1, y1 = box
    return (x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad)


def write(rel, body, v, title="MUHAFIZ"):
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(svg_doc(v, body, title))


def build():
    for mode in ("light", "dark", "mono", "white"):
        for name, fn in (("logo", horizontal), ("wordmark", wordmark),
                         ("symbol", symbol)):
            body, box = fn(mode)
            write(f"svg/muhafiz-{name}-{mode}.svg", body, view(box))
    for kind, rel in (("ios", "app-icon/muhafiz-icon-ios.svg"),
                      ("rounded", "app-icon/muhafiz-icon-rounded.svg"),
                      ("fg", "app-icon/android/ic_launcher_foreground.svg"),
                      ("mono", "app-icon/android/ic_launcher_monochrome.svg"),
                      ("maskable", "web/icon-maskable.svg")):
        body, box = icon(kind)
        write(rel, body, box)
    body, box = icon("rounded", 64)
    write("web/favicon.svg", body, box)
    for mode in ("light", "dark"):
        body, box = splash_icon(mode)
        write(f"splash/android12-splash-icon-{mode}.svg", body, box)


if __name__ == "__main__":
    build()
    print("ok")
