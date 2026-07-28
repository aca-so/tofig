# Design

Visual system for **tofig.aca.so**.

This surface no longer inherits acaso's Syntropic system. Syntropic governs
*product* UI — the interfaces people work inside. tofig.aca.so is a brand
surface whose entire job is to make one transformation legible in under thirty
seconds, and the restraint that makes Syntropic right for an app makes it
invisible on a landing page. The two things it keeps are the ones that carry
identity: **Sora** and **acaso violet**. Everything else is set here.

## The idea

The page is a **Figma canvas at night**. Designs are the light rectangles
floating on it. Violet is structure — nodes, bounds, measurement. Amber is the
honest limit — what does not survive the trip.

That is not decoration. It is the product's own visual grammar, and it makes
the site's one signature possible: press `X` and the page shows you its own
structure, measured and named, the way tofig would hand it to Figma.

## Theme

Dark, and not by default.

The scene: a design engineer at 11pm, Figma open on the left half of a 27-inch
display in an unlit room, pasting a Claude export and watching it become
layers. The screen is the only light source.

Dark is right here for a specific, product-derived reason: **the page is the
canvas, and the specimens on it are the designs.** A white card floating on a
near-black ground is literally what Figma looks like. It is not "tools look
cool dark."

The trap to avoid is the second-order one — *dev tool that isn't SaaS-light →
slate-900 terminal with mono headlines and a green run button.* This escapes it
on three counts: the dark is violet-tinted rather than slate, the second colour
is amber rather than terminal green, and the display face is hairline Sora
rather than a monospace costume.

There is no light mode. A single committed art direction beats a hedged pair.

## Color

OKLCH throughout. Violet is anchored to acaso's `#745FF3`, which resolves to
`oklch(0.588 0.212 284)`; the whole ramp and every tinted neutral rides that
same 284–288 band, so nothing on the page is an untinted grey.

| Role | Token | Value |
|---|---|---|
| Page ground | `--void` | `oklch(0.135 0.018 288)` |
| Raised band | `--canvas` | `oklch(0.190 0.024 288)` |
| Panel / chrome | `--surface` | `oklch(0.225 0.026 288)` |
| Hairline | `--line` | `oklch(0.310 0.028 288)` |
| Canvas grid dot | `--dot` | `oklch(0.375 0.042 288)` |
| Headings | `--ink` | `oklch(0.975 0.004 288)` |
| Body | `--ink-2` | `oklch(0.815 0.012 288)` |
| Secondary | `--ink-3` | `oklch(0.655 0.016 288)` |
| Tertiary | `--ink-4` | `oklch(0.605 0.018 288)` |
| Brand / structure | `--v-500` | `oklch(0.588 0.212 284)` = `#745FF3` |
| Interactive fill | `--v-600` | `oklch(0.535 0.225 284)` |
| Limits / caveats | `--a-400` | `oklch(0.805 0.145 76)` |
| Claude side | `--c-500` | `oklch(0.665 0.125 40)` = `#D97757` |
| Claude fill | `--c-700` | `oklch(0.545 0.135 37)` |
| Paper (specimens) | `--paper` | `oklch(0.995 0 0)` |
| acaso mark only | `--mark` | `#6C03FA` |

**Clay is the third meaning.** tofig's biggest use case is a design Claude
generated, and that journey has two halves. Violet is the tofig/Figma side,
clay is the Claude side, and the handoff is where they meet. It appears on the
Claude section of the landing page and on `/claude.html`, and nowhere else.
`--c-500` on `--void` measures 5.2:1. White on `--c-600` measures only 4.17:1,
so the interactive fill is `--c-700`, the same correction violet needed.

**Color strategy: committed.** Violet is not a 10% accent here; it carries the
structural language of the entire page — outlines, node badges, the layers
panel, the interactive fill, the bloom under the canvas. Amber is rare by
design: it appears only on the three cells of the survival ledger that describe
a limit, and on the sandbox notice. If amber shows up anywhere else, it has
stopped meaning anything.

Measured contrast against `--void`: `--ink` 17.9:1, `--ink-2` 9.6:1, `--ink-3`
6.0:1, `--ink-4` 5.0:1. On the lighter `--canvas` and `--surface` grounds only
`--ink` through `--ink-3` clear AA, so **`--ink-4` is never used inside a
panel.** `--ink-faint` is decoration and is never used for text.

White on `--v-500` measures 4.49:1 — one step under AA. Interactive fills
therefore sit on `--v-600` and move *up* to `--v-500` on hover.

## Typography

**Sora, 100–700, plus Azeret Mono.**

Sora stays because the wordmark's own device — `to` hairline against a heavier
`fig` — is the brand, and it scales beautifully to display size. What changed
is the range: the old surface never went below 200. Here the display sits at
**150**, and on a dark ground thin weights gain optical mass, so the hairline
reads as composure rather than weakness.

Azeret Mono is the **instrument voice** — node names, dimensions, counters,
terminal, code. It is never used for prose. It was chosen against the
saturated defaults (JetBrains Mono, IBM Plex Mono, Space Mono all read as
dev-tool costume by now); Azeret is geometric enough to sit beside Sora and
odd enough to be recognisable.

| Role | Size | Weight |
|---|---|---|
| Display | `clamp(2.9rem, 8.2vw, 6rem)` | 150 |
| Display emphasis | — | 600 |
| h2 | `clamp(1.9rem, 4.4vw, 3.25rem)` | 200 |
| h2 emphasis | — | 600 |
| h3 | 21px | 500 |
| Lede | `clamp(1.0625rem, 1.35vw, 1.3125rem)` | 300 |
| Body | 16px | 350 |
| Instrument | 11–12px mono | 400–500 |

The weight jump from 150/200 to 600 inside a single heading is the system's
signature move. Every h2 is a two-line statement where the second line carries
the weight.

Tracking: `-0.030em` body, `-0.042em` headings, `-0.045em` display,
`+0.005em` mono. Display never goes tighter than `-0.045em`; below that the
letters touch.

Nothing under **11px** carries information. The only exceptions are annotation
chips inside the hero illustration (10px), which are drawn objects rather than
reading text.

## Layout

Content column 1240px; 1560px for the full-bleed survival ledger. Prose 66ch.
4px grid throughout.

Section rhythm is deliberately uneven — 112px standard, 160px for the install
arrival. Uniform vertical padding is the tell of a templated page.

**No kicker above every section.** An eyebrow over each heading is AI grammar,
not voice; the h2s carry their own weight. One section (`.head--split`) sets
its heading against its lede in two columns rather than above it, so the page
never settles into a single repeated head rhythm.

## Responsive

One number governs the X-ray layout: **1100px**. Above it the layers panel
docks into its own column and `main` reserves 292px for it. Below it the panel
is a sheet over the page. Both rules must name the same width; when they
disagreed at 900 and 1100, everything from 901 to 1099 got a floating panel
with no room made for it and it sat on top of the content.

**The sheet opens collapsed.** On a phone the expanded panel covered 40% of
the viewport and buried the hero's call to action, which made X-ray unusable
on the device where the outlines are most useful. The bar is a button: 42px
collapsed, expanding to at most `min(40vh, 320px)` when asked. It re-collapses
each time X-ray is entered, so it never reappears over the content unasked.
Above 1100px it opens by default, because there it costs nothing.

**Nav collapses by priority, not by position.** The two mid-page anchors go
first at 1080px, then Renderer at 940px, then all links at 820px. "Claude to
Figma" leads the list and survives longest; it is the single most important
destination on the site. Ordering the rule by `nth-child` rather than by
importance is how the most valuable link ended up hidden on tablets.

**The X-ray label never hides.** Collapsing it to an icon left a 20x14 violet
blob with no glyph in it: unrecognisable, and under the target minimum. It
fits at 320px with room to spare.

The hero's minimum height is scoped. `60vh` was sized for the two-column
desktop layout; stacked on a phone it reserved 280px of empty canvas around a
226px specimen and pushed the next section off the fold.

Verified at 320, 360, 390, 414, 430, 600, 768, 834, 1024, 1280, 1440, 1920 and
2560, plus landscape phones at 844x390 and 932x430, in both modes.

## Motion

Two speeds, and they are not the same system.

**Interface motion is crisp.** 120ms taps, 200ms colour, 320ms state. Exits run
at roughly 65% of their entrance. Ease-out-expo `cubic-bezier(0.16, 1, 0.30, 1)`
for entrances, nothing overshoots, no springs.

**The signature is cinematic.** A 9-second loop with per-keyframe easing: a
6% rest as a clean rendered card, an expo lift to full extension, a 26% hold
open, then an eased collapse and a long rest before it repeats. The holds are
what make it readable rather than restless. It is not attached to scroll — it
plays on its own so it is seen regardless of where you stop.

The whole choreography rides **one registered custom property**, `--x`, from 0
to 1: scene tilt, per-plane `translateZ`, pane opacity, badge opacity. One
variable, one truth. Inspection chrome runs on a later ramp
(`max(0, --x − 0.3) / 0.7`) so the card is completely clean at rest.

The loop pauses when it scrolls out of view and when the tab is hidden.

Under `prefers-reduced-motion: reduce` the loop stops and `--x` locks to 0.62 —
a static exploded diagram. The information survives; the movement does not.
Every transition drops to 0ms and reveals render inert.

## Signature — X-ray

Press `X`, or use the nav switch, or the invitation under the hero.

The page strips its own render: paper surfaces go to wireframe, fills to violet
ghost, and every element carrying `data-xn` gets its real bounds outlined and
its node name badged. A Figma-style layers panel docks right, built from actual
DOM containment, with bidirectional hover between panel row and page element
and a live `w × h` readout on whatever you point at.

**CSS carries the entire transformation.** Outlines and badges are painted by
the elements themselves, so they travel with the page during scroll at zero
cost. JS only builds the panel, tracks what is on screen, and positions the
single hover readout.

Two entry points is deliberate: the nav switch for people who already know, the
hero invitation for people who don't. It works on the docs page too — a control
that does nothing on half the site is worse than no control.

## Components

**Cards** — `--canvas` ground, 16px radius, `1px --line` border. Never border
and shadow together.

**Buttons** — `--v-600` fill, hover to `--v-500`, 1px translate on press. Radius
10px. Elevation on dark reads as lift plus a violet bloom, the way a selected
object glows on a Figma canvas.

**Focus** — 2px `--v-400` ring at 3px offset, on everything interactive.

**Targets** — 24×24px minimum per WCAG 2.5.8, including nav links, footer links,
panel rows, copy buttons and range inputs. Inline links inside a sentence are
exempt and are the only things below it.

**Icons** — Phosphor bold at 13–20px. The six node-type glyphs in the layers
panel are an inline SVG sprite instead, so the panel draws instantly rather
than waiting on an icon webfont.

## Accessibility

WCAG 2.2 AA, verified by a script that routes every computed colour through a
canvas (computed style keeps `oklch()` verbatim) and composites translucent
layers properly. Both pages pass with no real failures.

Full keyboard operability: the bezier control points in the survival ledger are
`role="slider"` and move with arrow keys; `Escape` exits X-ray; every toy is
reachable and operable without a pointer.

Nothing is gated behind a reveal. The `reveal-ready` class is added by JS, so a
headless render, a background tab or a failed script still shows a complete
page. The terminal replays a transcript that is already in the document rather
than typing content into an empty node.

## Anti-references

- Slate-900 + JetBrains Mono + green accent. The first thing every generator
  reaches for when a developer tool is told not to be light.
- Gradient text, glass cards, floating orbs. None appear here; the drama comes
  from scale, composition and the concept.
- Identical card grids. The survival ledger is six *different* instruments.
- A kicker above every section.
- Scroll-jacking. The signature loop is time-based precisely so the page never
  holds your scroll hostage.
