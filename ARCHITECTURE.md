# tofig — architecture

An open-source Figma plugin that converts **self-contained HTML** (e.g. a Claude
design or any single `.html` file) into **native, editable Figma layers** — as a
Design (frames) or as Figma **Slides**. It is the export counterpart to
"import Figma → code": here you author in HTML and ship into Figma.

## The one idea

Three swappable layers connected by a JSON **IR**:

```
 CAPTURE (real browser)        IR (layers)          INJECT (Plugin API)
 ──────────────────────   ─────────────────────   ───────────────────────
 paste/drop HTML                                   walk tree → figma.create*
   → hidden iframe        a tree of Figma-node-     → frames / text / vectors
   → htmlToFigma()  ───▶  shaped objects     ───▶   / image fills / gradients
   → bytes + weights                                → Design frames OR Slides
```

The **IR-mapping is the moat**; capture and inject are interchangeable adapters.
Today both run inside one Figma plugin, but the inject mapper takes `figma` as a
parameter, so the same code can later run under the Figma MCP `use_figma` or a CLI.

## Locked decisions

| # | Decision | Choice | Why |
|---|----------|--------|-----|
| 1 | Surface | Standalone Figma plugin | The real distributable product; no server/extension/MCP needed |
| 2 | Render/measure | Plugin UI's hidden `<iframe>` | The UI iframe is a real browser → correct `getComputedStyle`/geometry |
| 3 | Extractor + IR | `@builder.io/html-to-figma` (MIT) | Proven CSS→node mapping; its `layers` tree is the IR. Frozen v0.0.3, so we may vendor later |
| 4 | Layout | Absolute positioning (IR keeps flex/grid hints) | Pixel-faithful now; auto-layout is an additive phase 2 |
| 5 | Inputs | Paste HTML + drop one `.html` | `networkAccess: none`; covers Claude designs / single-file exports |
| 6 | Target | Auto by `figma.editorType` | Design file → frames; Slides file → `createSlide()` |
| 7 | Slide split | Cascade: `[data-slide]/.slide` → `body > section` → body children → whole doc | Works on arbitrary HTML, honors structure |
| 8 | Fonts | Resolve family stack → nearest named style (weight+italic) → Inter | Never crashes; brand-aware |
| 9 | Assets | raster → image fill; inline `<svg>` → editable vectors; gradients → native | Best fidelity + editability |
| 10 | Repo | Single repo, engine isolated in Figma-agnostic `src/engine` | Future MCP/CLI reuse without a rewrite |
| 11 | Placement | One wrapper frame, centered + zoomed; slides appended | Predictable result |
| 12 | MVP | Paste→frames first; drop-file + Slides same release | Ship the core, fast |

## Data flow (detail)

1. **`code.ts` (sandbox)** decides `target` from `figma.editorType`, shows the UI,
   and posts an `init` message (target + default render width + slide size).
2. **`ui/ui.ts`** takes pasted/dropped HTML and calls **`ui/capture.ts`**.
3. **`capture.ts`** renders the HTML in a hidden, offscreen iframe (sized to the
   render width / slide width), then:
   - **waits for the page to actually settle** (`waitForRender`) before measuring
     or extracting. The iframe `load` event only covers the *initial* markup, but
     self-contained exports (Claude designs, single-file bundles) ship a tiny
     loading thumbnail, then on `DOMContentLoaded` unpack/gunzip their assets, swap
     the whole document via `replaceWith`, mount React/Babel, and run a slide-deck
     web component that applies a fit-to-stage `transform` — none of which refires
     `load`. Extracting too early captures a half-built, **unscaled, overflowing**
     DOM (the "huge / stretched import" bug). `waitForRender` polls a cheap DOM
     signature until it stops changing (gated on the bundler thumbnail being gone),
     awaiting fonts + image decode, capped by a timeout.
   - **injects `ui/extractor.ts` as a script *inside* the iframe** and calls it
     there. This is essential — `htmlToFigma` uses ambient `document`,
     `HTMLElement`, and `getComputedStyle`; running it in the iframe makes them
     resolve correctly (an element from a child iframe is **not**
     `instanceof topWindow.HTMLElement`).
   - the extractor also re-reads **font weight + italic** from computed styles and
     attaches them to text layers (the lib drops weight and `removeRefs()` strips
     DOM refs before returning, so this must happen at extraction time).
   - Slide-deck exports (a web component exposing `goTo`/`next`/`length`, common in
     Claude exports) get `prepareDeck`: we set the deck's **`noscale`** attribute —
     a hook these decks ship *specifically for DOM capture* (`_fit` then does
     `transform:none`) — and render the iframe at the deck's authored
     `designWidth`/`designHeight`. This matters: under the normal fit-to-stage
     `transform: scale()`, the deck's inner React layout measures a *scaled*
     container, miscomputes its fit-to-width, and overflows to many times the
     slide width — the giant/stretched frame. `noscale` + authored size makes the
     content lay out 1:1. `waitForRender` additionally refuses to settle while the
     content is still overflowing (`maxContentWidth`), and each captured slide root
     is finally pinned to the authored size with `clipsContent` (`fitRootToSlide`)
     as a hard guarantee that the import can never exceed one slide.
   - Design: capture the deck's *visible slide* (not `<body>`, which would grab the
     deck chrome). Slides: `engine/slides.ts` cascade picks one element per slide
     for static HTML, or the deck is driven through every slide (settling between
     each).
   - converts image fill `url`s → bytes (`createImage` only takes PNG/JPEG/GIF, so
     webp/svg-as-img/etc. are canvas-rasterized to PNG), and strips DOM refs.
4. UI posts an `import` message (`roots`, `title`, `target`) to the sandbox.
5. **`engine/inject.ts`** walks the IR and builds nodes: frames/groups,
   rectangles (with image fills), editable SVG vectors, and text (font resolved &
   loaded, then a shrink-to-fit pass). Design → one centered wrapper frame;
   Slides → one `SlideNode` per root, content scaled to fit.

## File map

```
manifest.json          # id, ui:ui.html, editorType:[figma,slides], networkAccess:none
esbuild.mjs            # builds code.js + inlined ui.html; injects extractor as a string
src/
  code.ts              # SANDBOX entry (no DOM): editorType → showUI → import
  shared/messages.ts   # UI ⇄ sandbox message protocol
  engine/
    layers.ts          # the IR type + tree helpers (framework-free)
    slides.ts          # cascade slide detection (DOM-pure)
    inject.ts          # IR → figma.create* (takes `figma` as a param → reusable)
  ui/
    index.html         # UI template (esbuild inlines the bundle at /*INLINE_SCRIPT*/)
    ui.ts              # UI controller (paste/drop/width/status)
    capture.ts         # render iframe → extract → bytes → strip refs
    extractor.ts       # injected INTO the iframe; runs htmlToFigma + weight recovery
  types/html-to-figma.d.ts  # ambient shim (pkg "exports" hides its types)
examples/              # sample-design.html, sample-slides.html
```

## Validated (live browser, via the capture test bundle)

- Cross-iframe extraction works; geometry is correct (all nodes sized).
- Text captured with size, family, and **recovered weight + italic**.
- Inline `<svg>` → `SVG` layer; multi-section HTML → N slides (cascade).
- `data:` image → fill carrying real bytes (ready for `createImage`).

> The **inject half** (`figma.create*`) can only be exercised inside Figma — load
> the plugin and run the samples (see README).

## Known limitations / roadmap

- **Auto-layout** — phase 2; IR already carries the flex/grid hints.
- **External URLs / authed or live pages** — out of scope (`networkAccess: none`).
  The right answer is a companion **Chrome extension** (CDP capture), like
  html.to.design — not the plugin's network allowlist.
- **Gradients/effects** rely on builder.io emitting Figma-valid paints; verify in
  Figma and patch in the mapper if any paint shape is rejected.
- **Frozen dependency** — `@builder.io/html-to-figma@0.0.3` is unmaintained. If we
  need deeper fixes (weight at the source, newer CSS), vendor it (it's MIT).
- **MCP/CLI adapter** — `inject.ts` is already `figma`-parameterized for this.
```
