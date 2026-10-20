"""DEYAS final logo kit.

Every shape is a filled path (no strokes, no clip paths), so the files render the
same in browsers, Figma, Illustrator and flutter_svg.

Grid: cap height 68, stroke 14. Letters sit on y=0 (cap) .. y=68 (baseline).
"""
import math
from pathlib import Path

NAVY = "#0F2A47"
TEAL = "#14B8C4"
WHITE = "#FFFFFF"
INK = "#0B1220"

T = 14.0          # stroke
OV = 1.0          # overlap between touching parts, hides anti-aliasing seams
H = 68.0          # cap height

OUT = Path(__file__).resolve().parent.parent / "kit"


def f(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")


# ------------------------------------------------------------------ primitives

def rect(x, y, w, h):
    return f"M{f(x)},{f(y)}h{f(w)}v{f(h)}h{f(-w)}Z"


def poly(points):
    head, *rest = points
    return f"M{f(head[0])},{f(head[1])}" + "".join(f"L{f(x)},{f(y)}" for x, y in rest) + "Z"


def d_shape(x0, y0, height, t, neck):
    """D as outer contour + counter; filled with evenodd."""
    cx = x0 + t / 2 + neck
    ro, ri = height / 2, height / 2 - t
    outer = (f"M{f(x0)},{f(y0)}H{f(cx)}A{f(ro)},{f(ro)} 0 0 1 {f(cx)},{f(y0 + height)}"
             f"H{f(x0)}Z")
    inner = (f"M{f(x0 + t)},{f(y0 + t)}H{f(cx)}A{f(ri)},{f(ri)} 0 0 1 {f(cx)},"
             f"{f(y0 + height - t)}H{f(x0 + t)}Z")
    return outer + inner, (cx, y0 + height / 2, ro)


def half_ring(cx, cy, ro, ri, side):
    """Half annulus, `side` = 'left' or 'right'."""
    s = 0 if side == "left" else 1
    return (f"M{f(cx)},{f(cy - ro)}A{f(ro)},{f(ro)} 0 0 {s} {f(cx)},{f(cy + ro)}"
            f"L{f(cx)},{f(cy + ri)}A{f(ri)},{f(ri)} 0 0 {1 - s} {f(cx)},{f(cy - ri)}Z")


def arc_capsule(cx, cy, rc, width, a0, a1):
    """An arc of given width with round ends, as a filled outline."""
    h = width / 2

    def p(r, a):
        return f"{f(cx + r * math.cos(math.radians(a)))},{f(cy + r * math.sin(math.radians(a)))}"

    return (f"M{p(rc + h, a0)}A{f(rc + h)},{f(rc + h)} 0 0 1 {p(rc + h, a1)}"
            f"A{f(h)},{f(h)} 0 0 1 {p(rc - h, a1)}"
            f"A{f(rc - h)},{f(rc - h)} 0 0 0 {p(rc - h, a0)}"
            f"A{f(h)},{f(h)} 0 0 1 {p(rc + h, a0)}Z")


# ------------------------------------------------------------------ letters
# each returns (path_d, width); x is the outer left edge

def g_D(x):
    d, _ = d_shape(x, 0, H, T, 12)
    return [d], 12 + T / 2 + H / 2


def g_E(x):
    w = 41
    return [rect(x, 0, T, H), rect(x, 0, w, T), rect(x, H - T, w, T),
            rect(x, H / 2 - T / 2, w - 4, T)], w


def g_Y(x):
    w, jy = 60.0, 35.0          # outer width, junction (centerline) height
    m = x + w / 2
    # find the arm angle so the arm's outer edge starts exactly at the corner
    top = T
    for _ in range(30):
        theta = math.atan((w / 2 - top / 2) / jy)
        top = T / math.cos(theta)
    tan = math.tan(theta)
    v = poly([(x, 0), (m, (w / 2) / tan), (x + w, 0), (x + w - top, 0),
              (m, (w / 2 - top) / tan), (x + top, 0)])
    stem_top = (w / 2 - top) / tan
    return [v, rect(m - T / 2, stem_top, T, H - stem_top)], w


ROOF_OVER = 6.0                 # how far the roof peak rises above the cap line


def house_a_geometry(x):
    w = 60.0
    m = x + w / 2
    peak = -ROOF_OVER
    eave = peak + w / 2                       # 45 degree roof
    ipeak = peak + T * math.sqrt(2)
    ieave = ipeak + (w / 2 - T)
    return dict(w=w, m=m, peak=peak, eave=eave, ipeak=ipeak, ieave=ieave,
                bar=(x + T, ieave, w - 2 * T, T))


def g_A(x):
    g = house_a_geometry(x)
    w, m = g["w"], g["m"]
    walls = poly([(x, H), (x, g["eave"]), (m, g["peak"]), (x + w, g["eave"]), (x + w, H),
                  (x + w - T, H), (x + w - T, g["ieave"]), (m, g["ipeak"]),
                  (x + T, g["ieave"]), (x + T, H)])
    bx, by, bw, bh = g["bar"]
    return [walls, rect(bx - OV, by, bw + 2 * OV, bh)], w


def a_window(x, size=14.0):
    g = house_a_geometry(x)
    top = g["bar"][1] + T
    cy = (top + H) / 2
    return (g["m"] - size / 2, cy - size / 2, size)


def g_S(x):
    rc = (H - T) / 4                # centreline radius of each turn
    ro, ri = rc + T / 2, rc - T / 2
    lx = x + ro                      # left turn centre x
    rx = x + 54 - ro                 # right turn centre x
    w = 54.0
    parts = [
        rect(lx - OV, 0, (x + 47) - lx + OV, T),            # top bar
        half_ring(lx, ro, ro, ri, "left"),                  # upper turn
        rect(lx - OV, H / 2 - T / 2, rx - lx + 2 * OV, T),  # middle bar
        half_ring(rx, H - ro, ro, ri, "right"),             # lower turn
        rect(x + 7, H - T, rx - (x + 7) + OV, T),           # bottom bar
    ]
    return parts, w


GLYPH = {"D": g_D, "E": g_E, "Y": g_Y, "A": g_A, "S": g_S}
GAP = {"DE": 16, "EY": 12, "YA": 10, "AS": 14}


def set_word(text, x0):
    """Returns (letters path, window rect, right edge)."""
    d, x, win = [], x0, None
    for i, ch in enumerate(text):
        paths, w = GLYPH[ch](x)
        d += paths
        if ch == "A":
            win = a_window(x)
        if i + 1 < len(text):
            x += w + GAP[ch + text[i + 1]]
        else:
            x += w
    return d, win, x


# ------------------------------------------------------------------ shield symbol
# symbol coordinates: shield 100 wide, 0..115 tall

K = 0.88                        # D scale inside the shield
SH_R = 70.0


def shield_outline():
    w, shoulder, side_end = 100.0, 14.0, 48.0
    tip = side_end + math.sqrt(SH_R ** 2 - (w / 2 - (w - SH_R)) ** 2)
    d = (f"M50,0L100,{f(shoulder)}L100,{f(side_end)}A{f(SH_R)},{f(SH_R)} 0 0 1 50,{f(tip)}"
         f"A{f(SH_R)},{f(SH_R)} 0 0 1 0,{f(side_end)}L0,{f(shoulder)}Z")
    return d, tip


def symbol_parts():
    shield, tip = shield_outline()
    t = T * K
    x0, y0 = 21 - t / 2, 27 - t / 2
    d, (cx, cy, ro) = d_shape(x0, y0, H * K, t, 12 * K)
    a, gap = 7.0, 5.0
    r1 = ro + gap + a / 2
    r2 = r1 + a + gap
    arcs = arc_capsule(cx, cy, r1, a, -40, 40) + arc_capsule(cx, cy, r2, a, -40, 40)
    return dict(shield=shield, d=d, arcs=arcs, tip=tip, d_top=y0)


def symbol_svg_body(mode):
    """mode: light | dark | mono | white  (see README)."""
    p = symbol_parts()
    body_color = {"light": NAVY, "dark": WHITE, "mono": NAVY, "white": WHITE}[mode]
    if mode in ("light", "dark"):
        return (f'<path fill="{body_color}" fill-rule="evenodd" d="{p["shield"]}{p["d"]}"/>'
                f'<path fill="{TEAL}" d="{p["arcs"]}"/>')
    # single colour: D and signal are cut out of the shield
    return f'<path fill="{body_color}" fill-rule="evenodd" d="{p["shield"]}{p["d"]}{p["arcs"]}"/>'


# ------------------------------------------------------------------ assembly

def svg_doc(view, body, title):
    x, y, w, h = view
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{f(x)} {f(y)} {f(w)} {f(h)}" '
            f'width="{f(w)}" height="{f(h)}" role="img" aria-label="{title}">'
            f"<title>{title}</title>{body}</svg>\n")


def colors(mode):
    text = {"light": NAVY, "dark": WHITE, "mono": NAVY, "white": WHITE}[mode]
    light = {"light": TEAL, "dark": TEAL, "mono": NAVY, "white": WHITE}[mode]
    return text, light


def paths_svg(paths, color):
    return "".join(f'<path fill="{color}" fill-rule="evenodd" d="{d}"/>' for d in paths)


def window_svg(win, color):
    x, y, s = win
    return f'<rect x="{f(x)}" y="{f(y)}" width="{f(s)}" height="{f(s)}" rx="3" fill="{color}"/>'


def wordmark(mode, x0=0.0):
    text, light = colors(mode)
    d, win, right = set_word("DEYAS", x0)
    body = paths_svg(d, text) + window_svg(win, light)
    return body, (x0, -ROOF_OVER, right, H)


def shield_lockup(mode):
    text, light = colors(mode)
    p = symbol_parts()
    s = 1 / K
    ty = -p["d_top"] * s
    sym = f'<g transform="translate(0 {f(ty)}) scale({s:.5f})">{symbol_svg_body(mode)}</g>'
    start = 100 * s + 16
    d, win, right = set_word("EYAS", start)
    body = sym + paths_svg(d, text) + window_svg(win, light)
    return body, (0, ty, right, ty + p["tip"] * s)


def symbol(mode):
    p = symbol_parts()
    return symbol_svg_body(mode), (0, 0, 100, p["tip"])


def stacked(mode):
    w_body, (wx0, wy0, wx1, wy1) = wordmark(mode)
    p = symbol_parts()
    sym_h = 150.0
    s = sym_h / p["tip"]
    sym_w = 100 * s
    width = wx1 - wx0
    sx = (width - sym_w) / 2
    gap = 34.0
    sym = (f'<g transform="translate({f(sx)} {f(-sym_h - gap - ROOF_OVER)}) scale({s:.5f})">'
           f'{symbol_svg_body(mode)}</g>')
    return sym + w_body, (0, -sym_h - gap - ROOF_OVER, width, H)


def box_view(box, pad=0.0):
    x0, y0, x1, y1 = box
    return (x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad)


def icon(kind, size=1024.0):
    """App icon artwork on a 1024 grid.

    kind: ios (full square), rounded (preview), fg (android foreground, transparent),
          mono (android themed icon), maskable (web, 80% safe zone).
    """
    p = symbol_parts()
    scale_share = {"ios": 0.56, "rounded": 0.56, "fg": 0.40, "mono": 0.40, "maskable": 0.46}[kind]
    s = size * scale_share / p["tip"]
    w = 100 * s
    tx = (size - w) / 2
    ty = (size - p["tip"] * s) / 2
    if kind == "mono":
        art = f'<path fill="{WHITE}" fill-rule="evenodd" d="{p["shield"]}{p["d"]}{p["arcs"]}"/>'
    else:
        art = (f'<path fill="{WHITE}" fill-rule="evenodd" d="{p["shield"]}{p["d"]}"/>'
               f'<path fill="{TEAL}" d="{p["arcs"]}"/>')
    g = f'<g transform="translate({f(tx)} {f(ty)}) scale({s:.5f})">{art}</g>'
    bg = ""
    if kind in ("ios", "maskable"):
        bg = f'<rect width="{f(size)}" height="{f(size)}" fill="{NAVY}"/>'
    elif kind == "rounded":
        bg = f'<rect width="{f(size)}" height="{f(size)}" rx="{f(size * 0.2237)}" fill="{NAVY}"/>'
    return bg + g, (0, 0, size, size)


def write(rel, body, view, title):
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(svg_doc(view, body, title))
    return path


def build():
    titles = {"light": "açık zemin", "dark": "koyu zemin", "mono": "tek renk lacivert",
              "white": "tek renk beyaz"}
    for mode in ("light", "dark", "mono", "white"):
        b, box = wordmark(mode)
        write(f"svg/deyas-wordmark-{mode}.svg", b, box_view(box), f"DEYAS ({titles[mode]})")
        b, box = shield_lockup(mode)
        write(f"svg/deyas-logo-{mode}.svg", b, box_view(box), f"DEYAS ({titles[mode]})")
        b, box = symbol(mode)
        write(f"svg/deyas-symbol-{mode}.svg", b, box_view(box), f"DEYAS sembol ({titles[mode]})")
        b, box = stacked(mode)
        write(f"svg/deyas-stacked-{mode}.svg", b, box_view(box), f"DEYAS ({titles[mode]})")
    for kind, rel in (("ios", "app-icon/deyas-icon-ios.svg"),
                      ("rounded", "app-icon/deyas-icon-rounded.svg"),
                      ("fg", "app-icon/android/ic_launcher_foreground.svg"),
                      ("mono", "app-icon/android/ic_launcher_monochrome.svg"),
                      ("maskable", "web/icon-maskable.svg")):
        b, box = icon(kind)
        write(rel, b, box, "DEYAS")
    b, box = icon("rounded", 64)
    write("web/favicon.svg", b, box, "DEYAS")


if __name__ == "__main__":
    build()
    print("ok")


def build_splash():
    """Android 12+ splash icon: symbol inside the 2/3 safe circle of a square."""
    p = symbol_parts()
    size = 1152.0
    for mode in ("light", "dark"):
        s = size * 0.42 / p["tip"]
        tx = (size - 100 * s) / 2
        ty = (size - p["tip"] * s) / 2
        body = f'<g transform="translate({f(tx)} {f(ty)}) scale({s:.5f})">{symbol_svg_body(mode)}</g>'
        write(f"splash/android12-splash-icon-{mode}.svg", body, (0, 0, size, size), "DEYAS")


build_splash()
