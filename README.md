# tofig

> Export HTML and other formats — such as Claude-generated designs — to Figma.

[![CI](https://github.com/tiagomoraes/tofig/actions/workflows/ci.yml/badge.svg)](https://github.com/tiagomoraes/tofig/actions/workflows/ci.yml)
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

- 🐛 [Report a bug](https://github.com/tiagomoraes/tofig/issues/new/choose)
- ✨ [Request a feature](https://github.com/tiagomoraes/tofig/issues/new/choose)
- 🔒 [Report a security issue](./SECURITY.md)

## License

Distributed under the [MIT License](./LICENSE). Copyright © 2026 Tiago Moraes.
Bundles `@builder.io/html-to-figma` (MIT).
