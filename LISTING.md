# tofig — Figma Community listing copy

Brand: the **tofig.aca.so** system — see [DESIGN.md](./DESIGN.md). Sora (150–600) plus
Azeret Mono on the violet-tinted dark canvas, violet anchored to acaso's `#745FF3`.
The listing used to run acaso's old `#6C03FA → #EC17F7` store gradient on a light
ground; it now matches the site, so the two surfaces read as one product.

## Assets (match Figma's publish form)
- **Icon** *(required)* — upload **`assets/icon/icon-128.png`**. The set ships
  16/32/48/64/128/256/512 from one master; Figma's form wants 128, the rest exist for the
  site, docs and anywhere else the mark is needed.

  The site as an icon: a paper `t/` on the `void` ground with one violet source behind it
  and a violet rim. Full-bleed, because Figma applies its own rounded mask and a baked
  corner would composite to white. Verified legible at 32px, the size Figma uses in its own
  plugin menus.

  | File | Purpose |
  |---|---|
  | `assets/icon/icon.html` | master — the tile: ground, bloom, rim, and Sora set live |
  | `assets/icon/mark.svg` | the glyph alone, transparent and theme-aware; source of the site favicon |
  | `assets/icon/icon-*.png` | rasterised set, all downscaled from one 1024 render |

  **The glyph is Sora, set live — that is the mark.** It was once redrawn as hand-made
  vector paths to remove the webfont dependency, with a shortened `t` tail because Sora's
  own long curled tail thins toward the solidus at small sizes. That redraw was rejected:
  Sora's letterform *is* the identity, and a cleaned-up approximation of it is not. Weights
  are 300 against 600 — the wordmark's light-against-heavy device at monogram scale.

  The webfont dependency is real but confined to **regeneration**, not to what ships: the
  artefacts are PNGs, and `render.mjs` calls `document.fonts.check()` at both weights and
  hard-fails if Sora is missing. Without that guard the tile still renders — in system-ui —
  and nothing downstream notices.

  `mark.svg` is the one place that cannot use live text, because no browser will load a
  webfont for an SVG favicon. Rather than redraw it, its two contours are **extracted from
  the font file** at the same weights and laid out with the same metrics, so the favicon and
  the icon show the same letterform. See Regeneration for how to re-extract them.

  Two colour alternatives were rejected on measurement, not taste: a **violet mark on void**
  lost the glyph entirely at 32px, and a **paper ground** left the tile with no edge at all
  on Figma's light menu chrome. The rim is what holds the edge on dark chrome, so it is
  load-bearing rather than decorative. A mono-violet ramp also works and reads fine — it was
  dropped because Figma Community is saturated with near-identical violet tiles, and a
  near-black tile is the one thing that grid doesn't have.
- **Thumbnail** *(required)* — `assets/marketing/01-thumbnail.png` · **1920×1080**.
  The site's signature specimen held at its `prefers-reduced-motion` pose: a paper frame
  decomposed into named, badged layers.
- **Carousel** (additional thumbnail images, **1920×1080** each — upload after the thumbnail):
  - `assets/marketing/02-how-it-works.png` — the In → locally → Out pipeline, beside an
    unretouched capture of the actual plugin panel
  - `assets/marketing/03-design-slides.png` — auto Design/Slides target (`figma.editorType`)
  - `assets/marketing/04-nodes.png` — HTML source → the layer tree, with real node types
  - `assets/marketing/05-what-survives.png` — the survival ledger: three things that come
    through in violet, three real limits in amber
- **Playground file** *(optional)* — a Figma/Slides file with a sample HTML pre-pasted, so people can try it. (Not built yet — say the word.)

Amber appears on frame 5 and nowhere else, per DESIGN.md: it means "this is a real limit",
and spread across five frames it would mean nothing.

Wordmark note: "tofig" sets **to** in Sora ExtraLight (200) and **fig** a touch heavier (320) — a subtle nod to "to figma".

Publisher: **acaso**. Visibility: org first, then **Public** (open source).

---

## Name
tofig

## Tagline (pick one — #1 recommended)
1. **HTML → editable Figma layers. Frames or Slides, 100% local.**
2. Paste HTML, get native, editable Figma layers — Design or Slides.
3. Turn self-contained HTML (and Claude designs) into native Figma.

## Tags
`html` · `import` · `code-to-design` · `slides` · `html-to-figma`

---

## Description — EN (Community / public)

```
Convert self-contained HTML — including the designs Claude generates — into native,
fully editable Figma layers. Open tofig in a Design file to get frames, or in a Figma
Slides file to get slides.

Everything runs locally. The plugin declares networkAccess: none, so your HTML never
leaves your machine: no servers, no account, no upload.

HOW TO USE
1. Open tofig in a Design or Slides file.
2. Paste your HTML, or drop a .html file.
3. Click Convert.

WHAT YOU GET
• Real Figma nodes — frames, live text you can retype, editable vectors from inline
  SVG, image fills, gradients, strokes and corner radii. Not a screenshot.
• The right output for wherever you are: frames in a Design file, slides in a Slides
  file. tofig reads figma.editorType, so there is no mode to pick.
• Decks, including JavaScript-driven ones, imported one Figma slide per slide.
• Typography mapped to your Figma fonts by nearest weight and style, with a report
  of every substitution it made.

WHAT DOESN'T SURVIVE
These limits are real, and knowing them now is cheaper than finding them at 2am.
• External URLs and assets are never fetched — that is what networkAccess: none
  means. Keep your HTML self-contained: inline CSS, data: images, inline SVG.
• Fonts must already exist in your Figma. Otherwise text falls back to the nearest
  match, then Inter, and tofig tells you exactly what changed.
• Layout is absolutely positioned, chosen for visual fidelity. You get pixel-accurate
  placement, not responsive constraints. Auto-layout is on the roadmap.

WHEN AN EXPORT WON'T RENDER
Some files called "HTML" are really live apps: they boot a React runtime, pull React
or Babel from a CDN, or reach for localStorage. Figma's plugin sandbox blocks all of
that — and that sandbox is what makes tofig safe to run on untrusted markup. For
those files, render on your own machine and import the result:

  npx --package=@aca-so/tofig tofig-render export.html

That writes an export.tofig.json — drop it into the plugin and it imports directly.
Still fully local: it drives your own Chrome, it just isn't sandbox-restricted.

An open-source tool by acaso. MIT licensed.
Site: tofig.aca.so
Code: github.com/aca-so/tofig
Built on @builder.io/html-to-figma (MIT); bundles React/ReactDOM (MIT).
```

---

## Description — PT-BR (caso publique só para a org)

**Tagline:** `HTML → camadas editáveis no Figma. Frames ou Slides, 100% local.`

```
Converta HTML self-contained — incluindo designs gerados com o Claude — em camadas
nativas e totalmente editáveis no Figma. Abra num arquivo de Design para gerar frames,
ou num arquivo de Slides para gerar slides.

Tudo roda localmente: seu HTML não sai da sua máquina. Sem servidores, sem conta,
sem upload.

COMO USAR
1. Abra o tofig num arquivo de Design ou Slides.
2. Cole o HTML ou solte um arquivo .html.
3. Clique em Convert.

O QUE ELE FAZ
• Reconstrói o HTML como nós nativos: frames, texto, vetores editáveis (SVG inline),
  imagens, gradientes, bordas e cantos arredondados.
• Detecta automaticamente Design (frames) ou Slides conforme onde você roda.
• Reconhece decks em JavaScript e importa cada slide como um slide do Figma.
• Mapeia as fontes para as suas fontes do Figma (peso/estilo mais próximo) e avisa
  quais fontes não estavam disponíveis.

MELHOR COM HTML SELF-CONTAINED
CSS inline, imagens data:/base64, SVG inline e fontes que existam no Figma. URLs e
assets externos não são baixados — o plugin não tem acesso à rede, por design.

QUANDO UM EXPORT NÃO RENDERIZA
Alguns arquivos "HTML" são, na verdade, apps: inicializam um runtime React, baixam
React ou Babel de uma CDN, ou usam localStorage. O sandbox de plugins do Figma
bloqueia tudo isso, então esses casos não renderizam dentro do plugin. Para eles,
renderize na sua máquina com a CLI complementar e importe o resultado:

  npx --package=@aca-so/tofig tofig-render export.html

Isso gera um export.tofig.json — arraste esse arquivo para o plugin e ele importa
direto. Continua 100% local (usa o seu próprio Chrome), só não fica limitado pelo
sandbox.

BOM SABER
• As fontes precisam existir no Figma; senão o texto cai na correspondência mais
  próxima (e depois Inter), e o tofig informa o que foi substituído.
• O layout usa posicionamento absoluto para fidelidade visual (auto-layout no roadmap).

Um plugin open-source da acaso. Licença MIT.
Código: github.com/aca-so/tofig
```

---

## Regeneration

One command, no manual screenshotting:

```bash
node assets/marketing/render.mjs
```

It drives your local Chrome over three sources and overwrites every published image in
place:

| Source | Outputs |
|---|---|
| `assets/marketing/marketing.html` | the five 1920×1080 listing frames |
| `assets/icon/icon.html` | `assets/icon/icon-*.png` and `site/assets/apple-touch-icon.png` |
| `assets/icon/mark.svg` | `site/assets/tofig-mark.svg` and `site/assets/favicon-32.png` |

The listing frames are captured at 2x and downscaled; a straight 1x capture renders the
150-weight display type thin and fringed. The icon set is rasterised once at 1024 and
downscaled from there, so 512/256/128/64/32/16 are all clean power-of-two resamples of a
single render rather than seven independent rasterisations.

`site/assets/tofig-mark.svg` is a **copy**, not a hand-maintained file. Edit
`assets/icon/mark.svg` and re-run the script; editing the deployed copy directly means the
two drift.

`marketing.html` and `icon.html` both pull Sora from Google Fonts, so the render needs
network access. That's a property of the *asset pipeline* only — the plugin itself still
declares `networkAccess: none`. The script waits on `document.fonts.ready` before every
capture, and for the icon it additionally calls `document.fonts.check()` at both weights
and refuses to write the file if Sora is absent. Without that guard the tile still renders,
in system-ui, and nothing downstream notices.

### Re-extracting the favicon outlines

`mark.svg` is the only asset carrying Sora as outlines rather than live text, because no
browser will load a webfont for an SVG favicon. Its two contours come out of the font file
via `assets/icon/extract-outlines.py`, which instances the variable font at wght 300 and
600 and lays the pair out with icon.html's own metrics.

**Re-run it whenever `icon.html`'s type settings change** — font size, either weight, the
letter spacing, or the slash's negative margin. The script's constants mirror those values,
and the favicon only matches the icon while the two agree. Usage is in its docstring.

**If you edit either SVG, validate it** — `xmllint --noout assets/icon/*.svg`. XML forbids
a double hyphen inside a comment, so a token name written with its CSS custom property
prefix breaks the file, and a broken SVG fails *silently*: it rasterises to a zero-size
broken image and a favicon just falls back to a globe. The script now hard-fails on that
rather than writing an empty PNG, but the validator catches it sooner.

The plugin panel embedded in frame 2 is `assets/marketing/plugin-ui.png`, a real capture
of `ui.html` at its native 880×1200, shown uncropped. Keeping it real matters: Figma's
review guidelines check that screenshots match the product.
```
