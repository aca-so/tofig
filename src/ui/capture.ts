// Capture layer (UI iframe = a real browser). Renders the pasted/dropped HTML
// offscreen, runs builder.io's `htmlToFigma` against it, then post-processes the
// IR so it can cross the message boundary into the sandbox:
//   - recover font weight/style (the lib drops them)
//   - turn image `url`s into raw bytes (createImage needs PNG/JPEG/GIF)
//   - strip DOM refs (not serializable)
import type { EditorTarget } from "../shared/messages";
import { LayerNode, normalizeRoot, walkLayers, imageFills } from "../engine/layers";
import { detectSlides } from "../engine/slides";

// Injected by esbuild: the IIFE source of src/ui/extractor.ts, run inside the
// render iframe so htmlToFigma sees the iframe's document/HTMLElement/getComputedStyle.
declare const TOFIG_EXTRACTOR_SRC: string;

type ExtractFn = (selector: HTMLElement | string, useFrames?: boolean) => LayerNode[];

export interface CaptureResult {
  roots: LayerNode[];
  title: string;
  // Design imports only: when true each root is an independent slide and should
  // become its own Figma frame (a deck), rather than the page-wrapping default.
  multiFrame?: boolean;
}

const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// A JS-driven slide deck (custom element / framework) that shows one slide at a
// time. We detect any controller exposing goTo()/next()/length and drive it so
// every slide becomes its own Figma slide.
interface DeckController {
  el: any;
  count: () => number;
  goTo: (i: number) => void;
}

function findDeck(doc: Document): DeckController | null {
  for (const el of Array.from(doc.querySelectorAll("*"))) {
    const a = el as any;
    if (
      typeof a.goTo === "function" &&
      typeof a.next === "function" &&
      typeof a.length === "number" &&
      a.length > 0
    ) {
      return { el: a, count: () => Number(a.length) || 0, goTo: (i) => a.goTo(i) };
    }
  }
  return null;
}

// After navigating, return the deck's currently-visible slide (the most opaque
// visible direct child), so we capture just that slide — not the hidden buffer
// slides or the prev/next overlay.
function visibleSlide(deckEl: Element): Element {
  const view = deckEl.ownerDocument.defaultView || window;
  const opacityOf = (el: Element) => parseFloat(view.getComputedStyle(el).opacity || "1");
  const isVisible = (el: Element) => {
    const cs = view.getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && opacityOf(el) > 0.5;
  };
  const children = Array.from(deckEl.children);
  // Prefer a visible <section> (the slide) so prev/next overlays, counters and
  // hidden buffer slides are never captured.
  const sections = children.filter((c) => c.tagName.toLowerCase() === "section" && isVisible(c));
  const pool = sections.length ? sections : children.filter(isVisible);
  if (!pool.length) return deckEl;
  return pool.reduce((a, b) => (opacityOf(b) > opacityOf(a) ? b : a));
}

// A cheap, transform-insensitive signature of the rendered DOM. We poll it until
// it stops changing — that's our proxy for "the page has finished rendering".
// `booting` stays true while a self-bootstrapping export still shows its loading
// thumbnail (Claude/`__bundler` HTML decodes assets, swaps the whole document via
// replaceWith, then mounts React/Babel — none of which fires a `load` event).
function renderSignature(doc: Document): string {
  const de = doc.documentElement;
  const body = doc.body;
  const booting = !!(doc.getElementById("__bundler_thumbnail") || doc.getElementById("__bundler_loading"));
  const count = doc.getElementsByTagName("*").length;
  const w = Math.round((de && de.scrollWidth) || 0);
  const h = Math.round((de && de.scrollHeight) || 0);
  const textLen = body ? (body.innerText || "").length : 0;
  return `${booting ? "boot" : "ok"}:${count}:${w}:${h}:${textLen}`;
}

interface WaitOpts {
  maxMs?: number; // hard cap — extract whatever's there once we hit it
  interval?: number; // ms between samples
  stableFrames?: number; // consecutive equal samples that mean "settled"
  // Refuse to treat the page as "ready" while its content is wider than this
  // (a deck whose inner React layout hasn't fit-to-width yet overflows massively
  // — extracting then yields the giant/stretched frame). 0 disables the gate.
  maxContentWidth?: number;
}

// Wait until the document stops mutating (or we time out). This is the fix for
// async-rendered exports: the old pipeline extracted right after `load`, before
// the bundle unpacked / React mounted / a slide-deck web component applied its
// fit-to-stage transform — capturing a half-built, unscaled, overflowing DOM.
async function waitForRender(
  iframe: HTMLIFrameElement,
  { maxMs = 12000, interval = 150, stableFrames = 3, maxContentWidth = 0 }: WaitOpts = {}
): Promise<void> {
  const doc = iframe.contentDocument!;
  const start = Date.now();
  let last = "";
  let stable = 0;
  while (Date.now() - start < maxMs) {
    try {
      await (doc as any).fonts?.ready;
    } catch {
      /* ignore */
    }
    await decodeImages(doc);
    const sig = renderSignature(doc);
    const tooWide =
      maxContentWidth > 0 &&
      (doc.documentElement?.scrollWidth || 0) > maxContentWidth;
    if (!sig.startsWith("boot") && !tooWide && sig === last) {
      if (++stable >= stableFrames) break;
    } else {
      stable = 0;
    }
    last = sig;
    await delay(interval);
  }
  // Let the final layout/paint (e.g. a deck's fit transform) commit.
  await raf();
  await raf();
  await delay(120);
}

// Per-slide settle when driving a JS deck: a navigation triggers a transition +
// refit but not new top-level structure, so a short stability window suffices.
async function settle(iframe: HTMLIFrameElement): Promise<void> {
  await waitForRender(iframe, { maxMs: 3500, interval: 100, stableFrames: 2 });
}

function injectExtractor(iframe: HTMLIFrameElement): ExtractFn {
  const win = iframe.contentWindow as any;
  if (!win.__tofigExtract) {
    const doc = iframe.contentDocument!;
    const script = doc.createElement("script");
    script.textContent = TOFIG_EXTRACTOR_SRC;
    (doc.body || doc.documentElement).appendChild(script);
  }
  if (typeof win.__tofigExtract !== "function") {
    throw new Error("extractor failed to initialize inside the render frame");
  }
  return win.__tofigExtract as ExtractFn;
}

async function renderHTML(
  html: string,
  width: number,
  height: number,
  grow: boolean
): Promise<HTMLIFrameElement> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  // A REAL viewport size is set before the document loads: responsive layouts
  // (100vh, position:fixed, flex/grid filling the screen) need it, otherwise the
  // whole page collapses into a sliver. Offscreen, not visibility:hidden, so it
  // still fully lays out and paints.
  iframe.style.cssText =
    `position:fixed;left:-100000px;top:0;width:${width}px;height:${height}px;border:0;`;
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();

  await new Promise<void>((resolve) => {
    if (doc.readyState === "complete") resolve();
    else iframe.addEventListener("load", () => resolve(), { once: true });
  });

  // The `load` event only covers the initial markup. Self-contained exports
  // (Claude designs, single-file bundles) unpack assets, swap the document and
  // mount a framework *after* load, so we must wait for the DOM to actually
  // settle before measuring or extracting — otherwise we capture a half-built,
  // unscaled page (the classic "huge / stretched import").
  await waitForRender(iframe);

  // For Design imports, grow to fit a page taller than the viewport (scrolling
  // pages). For Slides we keep the fixed slide canvas size. Measure only after
  // the content has settled, then let a reflow settle again.
  if (grow) {
    const contentH = Math.max(
      height,
      doc.documentElement?.scrollHeight || 0,
      doc.body?.scrollHeight || 0
    );
    if (contentH > height + 1) {
      iframe.style.height = `${contentH}px`;
      await waitForRender(iframe, { maxMs: 4000, stableFrames: 2 });
    }
  }
  return iframe;
}

// The authored ("design") size of a deck slide — independent of whatever
// fit-to-stage scale the deck is currently applying. These exports expose it as
// `designWidth`/`designHeight`; fall back to the visible slide's layout box.
function deckAuthoredSize(deckEl: any): { w: number; h: number } {
  const w = Number(deckEl && deckEl.designWidth) || 0;
  const h = Number(deckEl && deckEl.designHeight) || 0;
  if (w > 1 && h > 1) return { w: Math.min(w, 8192), h: Math.min(h, 8192) };
  try {
    const slide = visibleSlide(deckEl) as HTMLElement;
    if (slide.offsetWidth > 1 && slide.offsetHeight > 1) {
      return { w: Math.min(slide.offsetWidth, 8192), h: Math.min(slide.offsetHeight, 8192) };
    }
  } catch {
    /* fall through */
  }
  return { w: 1920, h: 1080 };
}

// Render a slide-deck export at its authored resolution and return that size.
//
// We DON'T disable the deck's own fit logic (e.g. a `noscale` hook). That was the
// 36864px-explosion bug: a deck fits its slide to the stage AND uses that same
// fit to constrain its inner layout, so removing it lets the content expand to
// its full intrinsic width (a wide timeline blows out to ~19× the slide). Proof:
// deckAuthoredSize() measures the slide at its real width *before* we touch the
// deck — it's only the fit-disable that explodes it.
//
// Instead we size the iframe to the deck's authored size so the deck's fit lands
// at scale ≈ 1: no visible CSS transform, so htmlToFigma's box geometry (from the
// transform-aware getBoundingClientRect) and font size (from the transform-blind
// computed style) stay consistent — a clean 1:1 capture with the width still
// constrained by the deck.
async function prepareDeck(iframe: HTMLIFrameElement, deckEl: any): Promise<{ w: number; h: number }> {
  const size = deckAuthoredSize(deckEl);
  iframe.style.width = `${size.w}px`;
  iframe.style.height = `${size.h}px`;
  // Nudge the deck (and any ResizeObserver-driven inner layout) to re-fit to the
  // new stage size, using the iframe's own Event constructor so listeners fire.
  try {
    const win = iframe.contentWindow as any;
    win.dispatchEvent(new win.Event("resize"));
  } catch {
    /* ignore */
  }
  await waitForRender(iframe, {
    maxMs: 8000,
    stableFrames: 2,
    maxContentWidth: Math.round(size.w * 1.25),
  });
  return size;
}

// Tag a deck-captured root with the authored slide size so the inject layer can
// rescale the WHOLE subtree to fit, via Figma's native node.rescale (geometry AND
// fonts together — see inject.ts). With the deck rendered at scale ≈ 1 the content
// already fits and this is a no-op; it's a safety net against any residual
// overflow, and it must never be a root-only resize (that leaves children at full
// size — the "huge layer behind a correct-size frame" bug).
function tagFit(root: LayerNode, size: { w: number; h: number }): void {
  if (size.w > 1 && size.h > 1) root.fitTo = { w: size.w, h: size.h };
}

// Drive a JS deck through every slide and capture each visible one as its own
// root (tagged with the authored size). Shared by the Slides path (one SlideNode
// per root) and the Design path (one frame per root) — so a multi-slide deck
// imported into a Design file yields every slide, not just the visible one.
async function captureDeckSlides(
  iframe: HTMLIFrameElement,
  deck: DeckController,
  extract: ExtractFn
): Promise<LayerNode[]> {
  const size = await prepareDeck(iframe, deck.el);
  const roots: LayerNode[] = [];
  const n = deck.count();
  for (let i = 0; i < n; i++) {
    try {
      deck.goTo(i);
    } catch {
      /* keep going — capture whatever slide is shown */
    }
    await settle(iframe);
    const root = normalizeRoot(extract(visibleSlide(deck.el) as HTMLElement));
    tagFit(root, size);
    roots.push(root);
  }
  return roots;
}

async function decodeImages(doc: Document): Promise<void> {
  const imgs = Array.from(doc.images || []);
  await Promise.all(
    imgs.map(async (img) => {
      try {
        if (typeof img.decode === "function") await img.decode();
      } catch {
        /* broken/external image — ignore */
      }
    })
  );
}

const RAW_OK = /image\/(png|jpe?g|gif)/i;

async function urlToBytes(url: string): Promise<Uint8Array | null> {
  // PNG/JPEG/GIF: take the bytes as-is. Everything else (webp, svg-as-img,
  // avif…): rasterize to PNG via canvas, since createImage rejects them.
  try {
    if (RAW_OK.test(url.slice(0, 32)) || (!url.startsWith("data:") && /\.(png|jpe?g|gif)(\?|$)/i.test(url))) {
      const buf = await (await fetch(url)).arrayBuffer();
      return new Uint8Array(buf);
    }
  } catch {
    /* fall through to canvas */
  }
  return rasterize(url);
}

function rasterize(url: string): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width || 1;
        canvas.height = img.naturalHeight || img.height || 1;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return resolve(null);
          const reader = new FileReader();
          reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
          reader.onerror = () => resolve(null);
          reader.readAsArrayBuffer(blob);
        }, "image/png");
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function embedImages(roots: LayerNode[]): Promise<void> {
  const jobs: Promise<void>[] = [];
  walkLayers(roots, (layer) => {
    for (const fill of imageFills(layer)) {
      if (!fill.url) continue;
      const url = fill.url;
      jobs.push(
        urlToBytes(url).then((bytes) => {
          if (bytes) fill.intArr = bytes;
          delete fill.url;
        })
      );
    }
  });
  await Promise.all(jobs);
}

function stripRefs(roots: LayerNode[]): void {
  walkLayers(roots, (layer) => {
    delete layer.ref;
  });
}

export async function capture(
  html: string,
  target: EditorTarget,
  renderWidth: number,
  slideSize?: { width: number; height: number }
): Promise<CaptureResult> {
  const isSlides = target === "slides";
  const width = isSlides ? slideSize?.width || 1920 : renderWidth;
  // Slides: render at the exact slide canvas. Design: a real viewport height that
  // grows for tall scrolling pages.
  const height = isSlides ? slideSize?.height || 1080 : 1024;
  const iframe = await renderHTML(html, width, height, !isSlides);
  try {
    const doc = iframe.contentDocument!;
    const title = (doc.title || "").trim() || "import";
    const extract = injectExtractor(iframe);

    let roots: LayerNode[];
    let multiFrame = false;
    if (isSlides) {
      const deck = findDeck(doc);
      if (deck) {
        // JS deck: drive it through every slide and capture each. importSlides'
        // fitInto() rescales each slide's subtree to the slide canvas as a safety net.
        roots = await captureDeckSlides(iframe, deck, extract);
      } else {
        // Static HTML: cascade split (markers -> sections -> body children -> whole).
        const slideEls = detectSlides(doc);
        roots = slideEls.map((el) => normalizeRoot(extract(el as HTMLElement)));
      }
    } else {
      // Design import. A slide-deck export (Claude timelines, decks) fills the
      // viewport with ONE web-component that scales its slide to fit the stage.
      // Capturing <body> then grabs the deck's chrome and surrounding internals.
      // Instead render the deck at its authored size and capture EVERY slide
      // (each tagged with its authored size), then lay them out as one frame per
      // slide — so a multi-slide deck becomes multiple frames, not just the first.
      const deck = findDeck(doc);
      if (deck) {
        roots = await captureDeckSlides(iframe, deck, extract);
        multiFrame = true;
      } else {
        roots = extract(doc.body);
      }
    }

    await embedImages(roots);
    stripRefs(roots);
    return { roots, title, multiFrame };
  } finally {
    iframe.remove();
  }
}
