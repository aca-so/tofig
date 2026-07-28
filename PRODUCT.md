# Product

## Register

brand

## Users

Two audiences, one page.

**Designers and design engineers** who generate UI as HTML — increasingly from
Claude — and need it back in Figma as real, editable layers rather than a
flat screenshot. They arrive skeptical: they have tried "HTML to Figma" tools
before and got a soup of unnamed rectangles. Their context is mid-task, with a
file open and a deadline.

**acaso's own team**, who use tofig internally and need a link to send
colleagues.

The site is English only. A pt-BR pair shipped briefly and was withdrawn: two
documents drifting out of sync is a worse outcome than one that is right, and
this audience reads English technical documentation daily.

The job: decide in under thirty seconds whether this tool will actually rebuild
their design as editable layers, and install it if so.

## Product Purpose

tofig converts self-contained HTML into native Figma layers — frames in a
Design file, slides in a Slides file. It runs entirely locally: the plugin
declares `networkAccess: none` and nothing is uploaded.

The site exists to make the transformation legible before install. Success is a
visitor who understands what comes out the other side — named frames, live
text, editable vectors — and either installs the plugin or copies the CLI
command. Secondary success: an honest visitor who learns their export *won't*
render in-plugin and reaches the external renderer instead of bouncing.

## Brand Personality

Separate the voice from the surface; they are not the same register.

**The voice is exact and candid.** No marketing exclamation points, no winking
copy, no emoji, no superlatives. Every claim is specific enough to be checked.
Three words: **precise, unhurried, candid.** The page should read like it was
written by the person who built it.

**The surface is confident and loud.** Hairline display type at 96px, a
committed violet on a near-black canvas, a signature that runs on a loop. The
old surface was quiet in both registers and read as competent rather than
memorable; a brand page that nobody remembers has failed at its only job.

The emotional goal is trust through specificity. This audience is persuaded by
accurate constraints, not claims. Saying "fonts must exist in Figma or we
substitute and tell you exactly what changed" earns more confidence than any
claim of magic — and *showing* it, in a cell you can click, earns more than
saying it.

## Anti-references

- **The AI dev-tool landing page.** Slate-900, JetBrains Mono headline, acid
  green accent, floating gradient orbs, "10x your workflow", a logo wall of
  companies that never used it. Being dark is not the problem; being *that*
  dark is. See DESIGN.md on why this page's dark is product-derived.
- **The hero-metric template.** Big number, small label, supporting stats.
- **Gradient text and glassmorphism.** Neither appears. tofig's own
  violet→magenta plugin-store gradient is a listing treatment and stays there.
- **Identical card grids.** Icon + heading + paragraph, repeated six times.
  The survival ledger is six different working instruments instead.
- **A kicker above every section.** One named device is voice; a label over
  every heading is scaffolding.
- **Scroll-jacking.** The signature animation is time-based so the page never
  holds the scroll hostage.
- **Overclaiming.** tofig has real limits — absolute positioning, font
  substitution, no external assets. Hiding them would break the one thing this
  audience responds to.

## Design Principles

1. **Show the transformation, don't describe it.** The product is a change of
   state: rendered HTML becomes a layer tree. The hero must perform that
   change, not caption it.
2. **Constraints are the pitch.** Every limit is stated plainly and early.
   `networkAccess: none` is a feature. Font substitution reporting is a
   feature. The page that admits what it can't do is the page that gets
   believed.
3. **Two voices, no more.** Sora from 100 to 700 carries everything human;
   Azeret Mono is the instrument voice and appears only where the page is
   measuring, naming or counting something. Mono is never used for prose.
4. **Violet means structure.** It is not an accent sprinkled for warmth — it
   is the colour of a node, a bound, a measurement, wherever one appears.
   Amber, used sparingly, means a limit. Colour carries meaning or it goes.
5. **Practice what it preaches.** A tool that produces clean, well-named layers
   cannot ship a site with sloppy structure. Semantic HTML, real headings,
   keyboard-navigable, no div soup.

## Accessibility & Inclusion

WCAG 2.2 AA. Body text ≥ 4.5:1, large text ≥ 3:1 — verified, not assumed.
On the near-black canvas `--ink-4` clears it at 5.0:1; on the lighter panel
grounds it does not, so nothing below `--ink-3` is used inside a panel.

Full keyboard operability with a visible focus ring — 2px `--v-400` at 3px
offset. Every interactive demonstration must be operable
without a pointer and must never be the only way to understand the product —
the bezier control points are `role="slider"` and move with arrow keys, and
X-ray mode is reachable by keyboard and exits on `Escape`.

`prefers-reduced-motion: reduce` collapses every transition to a crossfade or
an instant state change. Content is never gated behind a scroll-triggered
reveal: everything renders visible by default, so a headless renderer or a
background tab still shows a complete page.

English only, with a correct `lang` attribute.

Contrast is verified rather than assumed, by a script that routes every
computed colour through a canvas — computed style keeps `oklch()` verbatim, so
naive parsing silently reports nonsense — and composites translucent layers
properly. Targets meet the 24×24px minimum; inline links inside a sentence are
the documented exception.
