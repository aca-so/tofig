# Changelog

All notable changes to tofig are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The **Release notes** block under each version is the text to paste into Figma's
"Publish new version" dialog.

## [0.3.1] — 2026-07-27

First released version — published to the acaso organization and to npm. Earlier `0.x`
numbers were development-only and never shipped, so everything below is what org members
get on first install.

### Added
- **HTML → native Figma layers.** Rebuilds self-contained HTML as real Figma nodes:
  frames, text, editable vectors (inline SVG), image fills, gradients, strokes, radii.
- **Auto-targets Design or Slides** based on where the plugin is opened
  (`figma.editorType`), including deck detection that maps each slide to a Figma slide.
- **Font mapping** to the nearest available weight/style, with a report of exactly what
  was substituted (falling back to Inter).
- **External renderer** (`tofig-render`) — renders exports that Figma's plugin sandbox
  can't run (CDN-loaded React, `data:`-origin restrictions, `eval`) in a real headless
  Chrome outside Figma, and writes a `.tofig.json` payload the plugin imports directly.
- Support for **Claude `dc-runtime` exports** — injects React and captures `#dc-root`.
- **Multi-slide decks in Design files** — imports one frame per slide, not just in Slides.
- Build version baked into both bundles, with a discreet indicator in the UI.
- Runs with `networkAccess: none` — no external fetches, by design.

### Fixed
- **Text no longer overlaps text.** When a design's font isn't in Figma, the fallback
  reflows taller and — since every layer is absolutely positioned — spilled onto the
  element below. `shrinkToFit` now fits text into its measured box reliably (0.5px steps,
  tolerance 1.06, readable floor of `max(8, 50%)`), trading a slightly smaller glyph for
  no overlap.
- **Layers no longer stick out past their frame.** Each captured root is clipped to its
  own frame (`clipsContent`), so an overflowing child is bounded instead of hanging
  behind the artboard.
- Shim `localStorage`/`sessionStorage` so apps that touch them render in the `data:` sandbox.
- Clear, actionable error when a self-bootstrapping export fails to render.
- Deck capture no longer explodes in width (stopped disabling the deck's own fit logic).
- Oversized deck slides rescale to fit instead of clipping at the root.
- Wait for async-rendered exports to settle before capturing.

### Known limits
- Layout uses absolute positioning for visual fidelity; auto-layout is on the roadmap.
- Fonts must exist in Figma or they're substituted.
- External URLs and assets are never fetched — make exports self-contained.

### Release notes

```
Convert self-contained HTML — including Claude designs — into native, editable
Figma layers. Frames in a Design file, slides in a Slides file.

• Paste HTML or drop a .html file, then Convert. Everything runs locally.
• Rebuilds real Figma nodes: frames, text, editable vectors, images, gradients.
• Detects slide decks and imports one slide (or frame) per section.
• Maps your fonts to the nearest available weight/style and reports substitutions.
• For live-app exports that Figma's sandbox can't run (CDN React, localStorage),
  run `tofig-render your-export.html` on your machine and drop the resulting
  .tofig.json into the plugin — it imports directly, still fully local.
```

[0.3.1]: https://github.com/aca-so/tofig/releases/tag/v0.3.1
