# tofig

> Export HTML and other formats — such as Claude-generated designs — to Figma.

[![CI](https://github.com/aca-so/tofig/actions/workflows/ci.yml/badge.svg)](https://github.com/aca-so/tofig/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Convert **self-contained HTML** (a Claude design, or any single `.html` file) into
**native, editable Figma layers** — as a Design (frames) or as Figma **Slides**.

An open-source take on the "HTML → Figma" direction: you author in HTML, tofig
rebuilds it as real Figma nodes (frames, text, vectors, gradients, image fills).
No server, no browser extension, no account — just a Figma plugin.

## How it works

The plugin's UI is a real browser, so it renders your HTML in a hidden iframe,
extracts computed styles + geometry (via the MIT `@builder.io/html-to-figma`), and
the plugin sandbox rebuilds everything as native Figma nodes. See
[ARCHITECTURE.md](./ARCHITECTURE.md).

## Build

```bash
npm install
npm run build        # produces code.js + ui.html
npm run watch        # rebuild on change
npm run typecheck
```

## Run it in Figma (desktop app)

1. `npm run build`
2. Figma → **Plugins → Development → Import plugin from manifest…**
3. Choose this repo's `manifest.json`.
4. Open any **Design** file (or a **Figma Slides** file), then
   **Plugins → Development → tofig**.
5. Paste HTML or drop an `.html` file → **Convert**.

Try the bundled examples:
- `examples/sample-design.html` — open the plugin in a **Design** file.
- `examples/sample-slides.html` — open the plugin in a **Slides** file (two
  `<section>`s become two slides).

## Inputs & limits

- ✅ Paste HTML, or drop a single `.html` file.
- ✅ Inline CSS, `data:`/base64 images, inline `<svg>`, CSS gradients, web fonts
  that exist in Figma (others fall back to the nearest available, then Inter).
- ❌ External URLs / assets behind `http(s)` — the plugin runs with
  `networkAccess: none`. Make your HTML self-contained (inline styles & images).

## Exports that won't render in the plugin → the external renderer

Some self-contained exports are really **live apps** — a Claude artifact that
boots a React runtime, fetches React/Babel from a CDN, reads `localStorage`, etc.
Figma's plugin sandbox blocks those (no network, `data:`-URL origin), so they
can't render *inside* the plugin.

For those, render them in a **real, unrestricted headless Chrome** outside Figma,
then import the result. Same extractor, deterministic — just an unrestricted
browser:

```bash
npm install                                   # installs puppeteer-core (uses your Chrome)
npx tofig-render path/to/export.html          # → path/to/export.tofig.json
# options: --target design|slides  --width 1440  --out file.tofig.json  --chrome /path/to/chrome
```

Then in the plugin: **drop the `.tofig.json`** (or "Choose…") — it imports
directly, no in-plugin render. Requires a local Google Chrome / Chromium.

### Using the renderer without cloning the repo

If you installed tofig from the Figma plugin list, you don't have this repo — the
renderer is a separate Node CLI. Install it straight from GitHub:

```bash
npm install -g github:aca-so/tofig     # then: tofig-render export.html
```

Or run it one-off, without installing:

```bash
npx --package=github:aca-so/tofig tofig-render export.html
```

## Status

🚧 Early development — APIs and structure may still change.

The capture pipeline (render → extract → bytes → font weight/italic recovery →
slide splitting) is validated in a real browser. The inject side (building Figma
nodes) runs via the Plugin API and is best verified by loading the plugin and
running the examples above.

## Contributing

Contributions are welcome! Please read the
[Contributing Guide](./CONTRIBUTING.md) to learn about the branching model
(Git Flow), commit conventions, and the pull request process.

- 🐛 [Report a bug](https://github.com/aca-so/tofig/issues/new/choose)
- ✨ [Request a feature](https://github.com/aca-so/tofig/issues/new/choose)
- 🔒 [Report a security issue](./SECURITY.md)

## License

Distributed under the [MIT License](./LICENSE). Copyright © 2026 acaso.

Third-party code, all MIT, with license headers preserved in the bundle:
- [`@builder.io/html-to-figma`](https://github.com/BuilderIO/html-to-figma) — style/geometry extraction.
- **React** and **ReactDOM** (production UMD builds, vendored in `src/ui/vendor/`) —
  injected into the render iframe so React-based exports can boot.
