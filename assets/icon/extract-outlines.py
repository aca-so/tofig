"""Extract Sora's real `t` (wght 300) and `/` (wght 600) contours as SVG paths,
laid out exactly the way icon.html sets them, so the favicon shows the same
letterform as the rasterised icon instead of a redraw.

Only mark.svg needs this. icon.html sets Sora live, but no browser loads a
webfont for an SVG favicon, so the favicon has to carry outlines — and hand
drawing them produced a different letterform, which is the whole thing this
avoids.

Run it when icon.html's type settings change (font size, weights, letter
spacing, the slash's negative margin) — the constants below mirror them, and
the layout is only faithful while they agree.

    curl -sSL -o /tmp/sora.ttf \\
      "https://github.com/google/fonts/raw/main/ofl/sora/Sora%5Bwght%5D.ttf"
    python3 -m venv /tmp/ft && /tmp/ft/bin/pip install -q fonttools
    /tmp/ft/bin/python assets/icon/extract-outlines.py

Paste the MARK block's two paths into mark.svg, keep its viewBox in step, then
validate: XML forbids a double hyphen in a comment and a broken SVG favicon
fails silently.
"""
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.misc.transform import Transform

SRC = "/tmp/sora.ttf"
# icon.html: font-size 52 in a 100-unit tile, letter-spacing -0.06em,
# and the slash carries margin-left -0.03em.
FS, LS_EM, ML_EM = 52.0, -0.06, -0.03

def glyph(weight, name):
    f = instantiateVariableFont(TTFont(SRC), {"wght": weight}, inplace=False)
    gs = f.getGlyphSet()
    upem = f["head"].unitsPerEm
    adv = f["hmtx"][name][0]
    return gs, gs[name], upem, adv

gs_t, g_t, upem, adv_t = glyph(300, "t")
gs_s, g_s, _,   adv_s = glyph(600, "slash")
k = FS / upem                       # font units -> tile units
dx_slash = adv_t * k + (LS_EM + ML_EM) * FS

def bounds(g, gset, xoff):
    bp = BoundsPen(gset); g.draw(bp)
    x0, y0, x1, y1 = bp.bounds
    return (x0 * k + xoff, y0 * k, x1 * k + xoff, y1 * k)

bt = bounds(g_t, gs_t, 0.0)
bs = bounds(g_s, gs_s, dx_slash)
ink = (min(bt[0], bs[0]), min(bt[1], bs[1]), max(bt[2], bs[2]), max(bt[3], bs[3]))
w, h = ink[2] - ink[0], ink[3] - ink[1]
print(f"# upem={upem} adv_t={adv_t} k={k:.6f} dx_slash={dx_slash:.4f}")
print(f"# ink w={w:.3f} h={h:.3f}  (font units above baseline: {ink[1]:.1f}..{ink[3]:.1f})")

def path(g, gset, xoff, tx, ty):
    """Bake the flip and placement into the path data so the SVG stays flat."""
    pen = SVGPathPen(gset, ntos=lambda v: f"{v:.2f}")
    t = Transform().translate(tx + xoff, ty).scale(k, -k)
    g.draw(TransformPen(pen, t))
    return pen.getCommands()

for label, box, pad in (("TILE", 100.0, None), ("MARK", None, 3.0)):
    if label == "TILE":
        # Centre the ink in the 100 tile, then apply icon.html's optical nudge:
        # -1.5% x (the pair leans right off the slash) and +7% y of the glyph box.
        tx = (box - w) / 2 - ink[0] - 0.015 * FS
        ty = (box - h) / 2 + h + ink[1] + 0.07 * FS
        print(f'\n{label} viewBox="0 0 100 100"')
    else:
        side = max(w, h) + pad * 2
        tx = (side - w) / 2 - ink[0]
        ty = (side - h) / 2 + h + ink[1]
        print(f'\n{label} viewBox="0 0 {side:.2f} {side:.2f}"')
    print("t     ", path(g_t, gs_t, 0.0, tx, ty))
    print("slash ", path(g_s, gs_s, dx_slash, tx, ty))
