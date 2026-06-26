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

// Let a slide transition finish and its fonts/images settle before extracting.
async function settle(doc: Document): Promise<void> {
  await raf();
  await delay(400);
  try {
    await (doc as any).fonts?.ready;
  } catch {
    /* ignore */
  }
  await decodeImages(doc);
  await raf();
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

  // For Design imports, grow to fit a page taller than the viewport (scrolling
  // pages). For Slides we keep the fixed slide canvas size.
  if (grow) {
    const contentH = Math.max(
      height,
      doc.documentElement?.scrollHeight || 0,
      doc.body?.scrollHeight || 0
    );
    if (contentH > height) {
      iframe.style.height = `${contentH}px`;
      await raf();
    }
  }

  try {
    await (doc as any).fonts?.ready;
  } catch {
    /* ignore */
  }
  await decodeImages(doc);
  await raf();
  await raf();
  return iframe;
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
    if (isSlides) {
      const deck = findDeck(doc);
      if (deck) {
        // JS deck: drive it through every slide and capture each visible one.
        roots = [];
        const n = deck.count();
        for (let i = 0; i < n; i++) {
          try {
            deck.goTo(i);
          } catch {
            /* keep going */
          }
          await settle(doc);
          roots.push(normalizeRoot(extract(visibleSlide(deck.el) as HTMLElement)));
        }
      } else {
        // Static HTML: cascade split (markers -> sections -> body children -> whole).
        const slideEls = detectSlides(doc);
        roots = slideEls.map((el) => normalizeRoot(extract(el as HTMLElement)));
      }
    } else {
      roots = extract(doc.body);
    }

    await embedImages(roots);
    stripRefs(roots);
    return { roots, title };
  } finally {
    iframe.remove();
  }
}
