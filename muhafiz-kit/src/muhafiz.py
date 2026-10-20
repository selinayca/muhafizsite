"""MUHAFIZ: wordmark in the DEYAS letter system and three symbol directions."""
import math
from pathlib import Path

from final import (NAVY, TEAL, WHITE, T, H, OV, ROOF_OVER, f, rect, poly, arc_capsule,
                   shield_outline, g_A, a_window, paths_svg, window_svg, svg_doc)

OUT = Path(__file__).resolve().parent.parent / "muhafiz"


# ------------------------------------------------------------------ letters

def g_M(x, w=72.0, depth=50.0):
    """Vertical stems, V reaching `depth`."""
    m = x + w / 2
    tan = (w / 2) / depth
    top = T / math.cos(math.atan(tan))
    v = poly([(x, 0), (m, depth), (x + w, 0), (x + w - top, 0),
              (m, (w / 2 - top) / tan), (x + top, 0)])
    return [rect(x, 0, T, H), rect(x + w - T, 0, T, H), v], w


def g_U(x, w=54.0):
    ro = w / 2
    ri = ro - T
    cx, cy = x + ro, H - ro
    ring = (f"M{f(x)},{f(cy)}A{f(ro)},{f(ro)} 0 0 0 {f(x + w)},{f(cy)}"
            f"L{f(x + w - T)},{f(cy)}A{f(ri)},{f(ri)} 0 0 1 {f(x + T)},{f(cy)}Z")
    return [rect(x, 0, T, cy + OV), rect(x + w - T, 0, T, cy + OV), ring], w


def g_H(x, w=54.0):
    return [rect(x, 0, T, H), rect(x + w - T, 0, T, H),
            rect(x + T - OV, H / 2 - T / 2, w - 2 * T + 2 * OV, T)], w


def g_F(x, w=41.0):
    return [rect(x, 0, T, H), rect(x, 0, w, T), rect(x, H / 2 - T / 2, w - 4, T)], w


def g_I(x):
    return [rect(x, 0, T, H)], T


def g_Z(x, w=50.0):
    rise = H - 2 * T
    dx = T
    for _ in range(30):
        alpha = math.atan(rise / (w - dx))
        dx = T / math.sin(alpha)
    k = (w - dx) / rise                       # horizontal shift per unit of y
    y0, y1 = T - OV, H - T + OV
    xr0 = x + w - (y0 - T) * k                # right edge x at y0
    diag = poly([(xr0 - dx, y0), (xr0, y0),
                 (x + dx - (y1 - (H - T)) * k, y1), (x - (y1 - (H - T)) * k, y1)])
    return [rect(x, 0, w, T), rect(x, H - T, w, T), diag], w


def g_roofM(x, w=80.0):
    """M as two pitched roofs side by side (a pair of houses)."""
    q = w / 4
    peak = -ROOF_OVER
    eave = peak + q
    ip = peak + T * math.sqrt(2)
    outer = [(x, H), (x, eave), (x + q, peak), (x + 2 * q, eave), (x + 3 * q, peak),
             (x + w, eave), (x + w, H)]
    inner = [(x + w - T, H), (x + w - T, ip + (q - T)), (x + 3 * q, ip),
             (x + 2 * q, ip + q), (x + q, ip), (x + T, ip + (q - T)), (x + T, H)]
    return [poly(outer + inner)], w


GLYPH = {"M": g_M, "U": g_U, "H": g_H, "A": g_A, "F": g_F, "I": g_I, "Z": g_Z, "m": g_roofM}
GAP = {"MU": 14, "mU": 14, "UH": 14, "HA": 12, "AF": 12, "FI": 9, "IZ": 13}


def set_word(text, x0):
    paths, x, win = [], x0, None
    for i, ch in enumerate(text):
        p, w = GLYPH[ch](x)
        paths += p
        if ch == "A":
            win = a_window(x)
        x += w + (GAP[ch + text[i + 1]] if i + 1 < len(text) else 0)
    return paths, win, x


# ------------------------------------------------------------------ symbols (shield 100 wide)

def house_outline(cx, base, w, t):
    """House drawn as a band: walls and a 45 degree roof; returns path and inner box."""
    x = cx - w / 2
    peak = base - (w / 2) - 30          # wall height 30 below the eaves
    eave = peak + w / 2
    ip = peak + t * math.sqrt(2)
    ie = ip + (w / 2 - t)
    d = (poly([(x, base), (x, eave), (cx, peak), (x + w, eave), (x + w, base)])
         + poly([(x + t, base - t), (x + t, ie), (cx, ip), (x + w - t, ie), (x + w - t, base - t)]))
    return d, (ip, base - t)


def sym_house():
    shield, tip = shield_outline()
    t = 10.0
    d, (itop, ibot) = house_outline(50, 85, 60, t)
    size = 15.0
    wy = (itop + ibot) / 2 + 6
    win = f'<rect x="{f(50 - size / 2)}" y="{f(wy - size / 2)}" width="{f(size)}" height="{f(size)}" rx="2.6" fill="{TEAL}"/>'
    return shield, d, win, tip


def sym_m():
    shield, tip = shield_outline()
    k = 0.62
    w = 72 * k
    x0 = 50 - w / 2
    y0 = 40
    parts, _ = g_M(0)
    g = f'<g transform="translate({f(x0)} {f(y0)}) scale({k})">'
    m = g + "".join(f'<path fill="{WHITE}" d="{p}"/>' for p in parts) + "</g>"
    arcs = arc_capsule(50, 40, 11, 5.5, -140, -40) + arc_capsule(50, 40, 21, 5.5, -138, -42)
    return shield, m, arcs, tip


def sym_roofm():
    shield, tip = shield_outline()
    k = 0.66
    w = 80 * k
    x0 = 50 - w / 2
    y0 = 38
    parts, _ = g_roofM(0)
    g = f'<g transform="translate({f(x0)} {f(y0)}) scale({k})">'
    m = g + "".join(f'<path fill="{WHITE}" d="{p}"/>' for p in parts) + "</g>"
    size = 12.0
    wy = y0 + 46 * k
    win = f'<rect x="{f(50 - size / 2)}" y="{f(wy - size / 2)}" width="{f(size)}" height="{f(size)}" rx="2.4" fill="{TEAL}"/>'
    return shield, m, win, tip


def symbol_body(kind, dark=False):
    sh_color = WHITE if dark else NAVY
    cut = NAVY if dark else WHITE
    if kind == "house":
        shield, house, win, tip = sym_house()
        if dark:
            body = (f'<path fill="{WHITE}" d="{shield}"/><path fill="{NAVY}" fill-rule="evenodd" d="{house}"/>' + win)
        else:
            body = f'<path fill="{NAVY}" d="{shield}"/><path fill="{WHITE}" fill-rule="evenodd" d="{house}"/>' + win
    elif kind == "m":
        shield, m, arcs, tip = sym_m()
        body = f'<path fill="{sh_color}" d="{shield}"/>' + m.replace(WHITE, cut) + f'<path fill="{TEAL}" d="{arcs}"/>'
    else:
        shield, m, win, tip = sym_roofm()
        body = f'<path fill="{sh_color}" d="{shield}"/>' + m.replace(WHITE, cut) + win
    return body, tip


# ------------------------------------------------------------------ files

def write(name, body, view, title="MUHAFIZ"):
    OUT.mkdir(exist_ok=True)
    (OUT / f"{name}.svg").write_text(svg_doc(view, body, title))


def wordmark(name, text="MUHAFIZ", color=NAVY, light=TEAL):
    paths, win, right = set_word(text, 0)
    body = paths_svg(paths, color) + window_svg(win, light)
    write(name, body, (-2, -ROOF_OVER - 2, right + 4, H + ROOF_OVER + 4))
    return right


def symbol(name, kind, dark=False):
    body, tip = symbol_body(kind, dark)
    write(name, body, (-2, -2, 104, tip + 4))


def lockup(name, kind, dark=False):
    body, tip = symbol_body(kind, dark)
    color = WHITE if dark else NAVY
    s = 118.0 / tip
    ty = (H / 2) - (tip * s) / 2 - 4
    sym = f'<g transform="translate(0 {f(ty)}) scale({s:.4f})">{body}</g>'
    start = 100 * s + 22
    paths, win, right = set_word("MUHAFIZ", start)
    content = sym + paths_svg(paths, color) + window_svg(win, TEAL)
    write(name, content, (-4, ty - 4, right + 8, tip * s + 8))


def stacked(name, kind, dark=False):
    body, tip = symbol_body(kind, dark)
    color = WHITE if dark else NAVY
    paths, win, right = set_word("MUHAFIZ", 0)
    s = 150.0 / tip
    sx = right / 2 - 50 * s
    sy = -ROOF_OVER - 30 - tip * s
    sym = f'<g transform="translate({f(sx)} {f(sy)}) scale({s:.4f})">{body}</g>'
    content = sym + paths_svg(paths, color) + window_svg(win, TEAL)
    write(name, content, (-4, sy - 4, right + 8, H - sy + 8))


if __name__ == "__main__":
    wordmark("muhafiz-wordmark")
    wordmark("muhafiz-wordmark-dark", color=WHITE)
    wordmark("muhafiz-wordmark-roofm", text="mUHAFIZ")
    for kind in ("house", "m", "roofm"):
        symbol(f"sym-{kind}", kind)
        symbol(f"sym-{kind}-dark", kind, dark=True)
        lockup(f"lockup-{kind}", kind)
        lockup(f"lockup-{kind}-dark", kind, dark=True)
    stacked("stacked-house", "house")
    stacked("stacked-house-dark", "house", dark=True)
    print("ok")
