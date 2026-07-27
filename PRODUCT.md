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
colleagues. They read Portuguese first.

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

Quiet, exact, technical. Syntropic's own words: "professional, calm, confident,
functional. No marketing exclamation points, no winking copy, no emoji."

Three words: **precise, unhurried, candid.**

The emotional goal is trust through specificity. This audience is persuaded by
accurate constraints, not superlatives. Saying "fonts must exist in Figma or we
substitute and tell you exactly what changed" earns more confidence than any
claim of magic. The page should read like it was written by the person who
built it.

## Anti-references

- **The AI-tool landing page.** Dark hero, acid-green accent, floating gradient
  orbs, "10x your workflow", logo wall of companies that never used it.
- **The hero-metric template.** Big number, small label, supporting stats.
- **Gradient text and glassmorphism.** Syntropic bans gradients in production
  UI outright; tofig's own violet→magenta marketing gradient does not belong on
  an acaso surface.
- **Identical card grids.** Icon + heading + paragraph, repeated six times.
- **Uppercase tracked eyebrows above every section.**
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
3. **One family, full range.** Sora from 200 to 700 does all the typographic
   work. Discipline in the type system is what makes an acaso surface
   recognizable.
4. **Quiet surfaces, one charismatic accent.** Calibrated grey carries the
   page; violet appears where it means something.
5. **Practice what it preaches.** A tool that produces clean, well-named layers
   cannot ship a site with sloppy structure. Semantic HTML, real headings,
   keyboard-navigable, no div soup.

## Accessibility & Inclusion

WCAG 2.2 AA. Body text ≥ 4.5:1, large text ≥ 3:1 — verified, not assumed.
Syntropic's `--fg-secondary` (`rgb(74,78,84)`) on paper clears it; the lighter
`--fg-tertiary` is reserved for large or non-essential text.

Full keyboard operability with a visible focus ring — Syntropic specifies a 2px
`brand/400` ring at 2px offset. The interactive hero demo must be operable
without a pointer and must never be the only way to understand the product.

`prefers-reduced-motion: reduce` collapses every transition to a crossfade or
an instant state change. Content is never gated behind a scroll-triggered
reveal: everything renders visible by default, so a headless renderer or a
background tab still shows a complete page.

Bilingual EN / pt-BR as separate documents with correct `lang` attributes and
`hreflang` pairs, so screen readers announce the right language.
