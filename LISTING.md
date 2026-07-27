# tofig — Figma Community listing copy

Brand: **acaso** design system (font Sora, brand gradient `#6C03FA → #EC17F7`, acaso symbol).
## Assets (match Figma's publish form)
- **Icon** *(required)* — `assets/icon.png` · **128×128**. Full-bleed t/ monogram on the tonal-purple gradient; Figma applies its own rounded mask, so the art has no baked corners (avoids white corners).
- **Thumbnail** *(required)* — `assets/marketing/01-thumbnail.png` · **1920×1080**.
- **Carousel** (additional thumbnail images, **1920×1080** each — upload after the thumbnail):
  - `assets/marketing/02-how-it-works.png` — 3-step flow + a real screenshot of the plugin UI
  - `assets/marketing/03-design-slides.png` — auto Design/Slides target (figma.editorType)
  - `assets/marketing/04-before-after.png` — HTML → editable layers (with a Figma Layers panel)
  - `assets/marketing/05-why-tofig.png` — value props grid
- **Playground file** *(optional)* — a Figma/Slides file with a sample HTML pre-pasted, so people can try it. (Not built yet — say the word.)

Sources (regenerate any time): `assets/icon.html`, `assets/marketing/marketing.html` (Sora via Google Fonts; acaso symbol/wordmark inlined). Real UI shot lives at `assets/marketing/plugin-ui.png`.

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
Convert self-contained HTML — including designs you generate with Claude — into
native, fully editable Figma layers. Open it in a Design file to get frames, or in
a Figma Slides file to get slides.

Everything runs locally: your HTML never leaves your machine. No servers, no account,
no upload.

HOW TO USE
1. Open tofig in a Design or Slides file.
2. Paste your HTML, or drop a .html file.
3. Click Convert.

WHAT IT DOES
• Rebuilds your HTML as real Figma nodes: frames, text, editable vectors (inline
  SVG), image fills, gradients, strokes and corner radii.
• Auto-targets Design (frames) or Slides depending on where you run it.
• Detects JavaScript slide decks and imports each slide as its own Figma slide.
• Maps typography to your Figma fonts (nearest weight/style) and tells you which
  fonts weren't available.

BEST WITH SELF-CONTAINED HTML
Inline CSS, data:/base64 images, inline SVG, and web fonts that exist in Figma.
External URLs and assets are not fetched — the plugin has no network access by design.

WHEN AN EXPORT WON'T RENDER
Some "HTML" files are really live apps — they boot a React runtime, pull React or
Babel from a CDN, or touch localStorage. Figma's plugin sandbox blocks all of that,
so those can't render inside the plugin. For them, render on your own machine with
the companion CLI and import the result:

  npx --package=github:aca-so/tofig tofig-render export.html

That writes an export.tofig.json — drop it into the plugin and it imports directly.
Still fully local (it drives your own Chrome); it just isn't sandbox-restricted.

GOOD TO KNOW
• Fonts must be available in Figma; otherwise text falls back to the nearest match
  (then Inter), and tofig reports exactly what was substituted.
• Layout uses absolute positioning for visual fidelity (auto-layout is on the roadmap).

An open-source plugin by acaso. MIT licensed.
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

  npx --package=github:aca-so/tofig tofig-render export.html

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
- Icon: open `assets/icon.html` in a browser, screenshot the square, downscale to 128×128.
- Thumbnail + carousel: open `assets/marketing/marketing.html` (five stacked 1920×1080
  sections), screenshot each section element, downscale to 1920×1080.
All self-contained (Sora via Google Fonts; acaso symbol/wordmark inlined). The thumbnail's
embedded plugin screenshot is `plugin-ui.png` (a real capture of `ui.html`).
```
