# Design

Visual system for **tofig.aca.so**. Inherits acaso's **Syntropic** design
system; every token below traces to `colors_and_type.css` in the Syntropic
project unless marked *site-only*.

## Theme

Light. The scene: a designer at a desk mid-afternoon, Figma open on one half of
the screen and this page on the other. A dark page would fight the canvas it
sits beside; Syntropic's paper white is the same ground Figma's own UI uses.
Dark is reserved for two deliberate inversions — the hero demo surface and the
install band — using Syntropic's documented "dark hero card" device (pure
black, brand-violet interior panels).

Color strategy: **restrained.** Calibrated grey carries the page; violet appears
only where it means something. Syntropic's own summary — "quiet surfaces,
confident typography, purple as the one charismatic accent."

## Color

Syntropic primitives, unchanged.

| Role | Token | Value |
|---|---|---|
| Paper (page ground) | `--neutral-0` | `rgb(254,254,254)` — *not* `#fff` |
| Raised surface | `--neutral-50` | `rgb(249,250,251)` |
| Section ground | `--neutral-100` | `rgb(246,247,249)` |
| Subtle border | `--neutral-300` | `rgb(232,234,239)` |
| Divider | `--neutral-400` | `rgb(209,213,219)` |
| Secondary text | `--neutral-600` | `rgb(107,114,128)` |
| Body text | `--neutral-700` | `rgb(74,78,84)` |
| Ink / headings | `--neutral-950` | `rgb(18,18,18)` |
| Inverse ground | `--neutral-1000` | `rgb(0,0,0)` |
| Brand primary | `--brand-500` | `#745FF3` |
| Interactive fill | `--brand-600` | `#6A48EB` |
| Highlight | `--brand-400` | `#978DF8` |
| Brand tint | `--brand-tint` | `#EAE9FE` |
| acaso mark only | *site-only* `--mark` | `#6C03FA` |

**No gradients.** Syntropic: "There are no gradients in production UI." The
violet→magenta gradient in tofig's Figma-listing assets is a plugin-store
treatment and does not appear here.

The `#0099FF` blue that dominates aca.so's Framer build is not a Syntropic
token and is not used.

Contrast: body `rgb(74,78,84)` on paper is 8.9:1. `--neutral-600` is restricted
to ≥18px or non-essential text. Violet `#6A48EB` on paper is 5.6:1 — safe for
body-size links.

## Typography

**Sora, and only Sora** — Syntropic: "Sora is THE brand font — the only
typeface in the Syntropic system." Loaded as a variable face, 200–700.
JetBrains Mono appears exclusively inside code blocks, which Syntropic
sanctions as the mono fallback (`--font-mono`).

Universal tracking `-0.030em`, per the system. Line heights 1 (headings),
1.1 (display), 1.4 (body).

Scale follows Syntropic's observed sizes (10/12/14/16/18/20/28/32/48/106):

| Role | Size | Weight |
|---|---|---|
| Display | `clamp(3rem, 9vw, 6rem)` | **200** |
| h2 | `clamp(1.75rem, 3.5vw, 2rem)` | 600 |
| h3 | `1.25rem` | 600 |
| Lede | `clamp(1.0625rem, 1.6vw, 1.25rem)` | 300 |
| Body | `1rem` | 400 |
| Label | `0.75rem` | 600 |
| Caption | `0.75rem` | 300 |
| Code | `0.875rem` | 400, mono, tracking `0` |

The display weight of **200** is the deliberate move. Syntropic uses 700 for
headings in *product* UI; on a brand surface the same family at 200, set very
large, reads as considered rather than loud — and it echoes the tofig wordmark,
which already sets `to` at Sora 200 against a heavier `fig`.

Display capped at 6rem (96px) rather than Syntropic's 106px token, which
overflows on narrow viewports at this string length.

## Layout

Content column 1120px, prose column 68ch. 4px base grid throughout — every gap
and pad is a multiple of 4, per Syntropic.

Section rhythm deliberately uneven: the hero breathes at 120px, dense technical
sections tighten to 72px. Uniform vertical padding is the tell of a templated
page.

Flexbox for one-dimensional rows; grid only where two axes genuinely exist.

## Components

**Cards** — Syntropic's rule is explicit: `neutral/0` ground, 16px radius, and
*either* a `1px neutral/300` border *or* the `0 1px 2px rgba(16,24,40,0.05)`
shadow — **never both**. This site uses the border form.

Radii: 4 / 8 / 12 / 16 / 64 (pill) / 9999. Cards take 16 — the signature.
Buttons and inputs take 12.

**Buttons** — fill `--brand-600`, hover one step to `--brand-700`, pressed two.
No opacity-based hovers; always a color token. Padding `8px 16px` at large.

**Focus** — 2px `--brand-400` ring at 2px offset, on every interactive element.

**Shadows** — single-layer, `rgba(16,24,40,0.05)`, almost imperceptible. No
heavy drops, no neumorphism, no inner shadows.

**Icons** — Phosphor bold, per Syntropic's directive, at 16/24/32.

## Motion

Syntropic doesn't define a motion system; it implies one from component states:
"short, linear-out transitions (150–200ms) … no bounces, no springs, no
theatrical transitions."

This site holds to that: 160ms on color and background, 220ms on the hero
decomposition, all `cubic-bezier(0.22, 1, 0.36, 1)`. Nothing overshoots.

Content is never gated on a reveal — sections render visible and animation only
enhances. Under `prefers-reduced-motion: reduce`, the hero decomposition
becomes an instant state swap and all transitions drop to 0ms.

## Signature

**The decomposition.** The hero shows one rendered HTML card. Activating it
peels the render away to expose what tofig actually produces: each element
outlined as a Figma node, named, with a layer tree assembling alongside in
Figma's own visual idiom.

It is the product's single claim, performed rather than asserted — and it
doubles as the honest answer to the audience's real question, which is not
"what does it do" but "what do the layers actually look like when it's done".

Everything else on the page stays quiet so this can be the thing people
remember.
