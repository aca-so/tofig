// Browser-side capture for the external renderer (bin/tofig-render.mjs). Bundled
// to an IIFE and injected into a real, UNRESTRICTED headless-Chrome page — so the
// self-bootstrapping Claude exports that Figma's plugin sandbox can't run (CDN
// React, data:-URL localStorage, etc.) render natively here, with no shims.
//
// It reuses the SAME extraction logic as the in-plugin path: `window.__tofigExtract`
// (src/ui/extractor.ts) is injected first, and the layer-tree post-processing
// helpers come from engine/. The detection/driving here mirrors src/ui/capture.ts
// but operates on the page document directly (the page IS the render surface, so
// there is no iframe and no sandbox to work around). Sizing (deck authored size /
// dc preview / tall-page grow) is driven by the CLI via __tofigProbe + setViewport,
// since a page can't resize its own viewport.
import { LayerNode, normalizeRoot, walkLayers, imageFills } from "../engine/layers";
import { detectSlides } from "../engine/slides";

type ExtractFn = (selector: HTMLElement | string, useFrames?: boolean) => LayerNode[];

declare global {
  interface Window {
    __tofigExtract: ExtractFn;
    __tofigProbe: () => ProbeResult;
    __tofigCapture: (target: string) => Promise<CaptureResult>;
  }
}

interface ProbeResult {
  kind: "deck" | "dc" | "static";
  w?: number;
  h?: number;
  count?: number;
}
interface CaptureResult {
  roots: LayerNode[];
  title: string;
  multiFrame?: boolean;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

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

function visibleSlide(deckEl: Element): Element {
  const view = deckEl.ownerDocument.defaultView || window;
  const opacityOf = (el: Element) => parseFloat(view.getComputedStyle(el).opacity || "1");
  const isVisible = (el: Element) => {
    const cs = view.getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && opacityOf(el) > 0.5;
  };
  const children = Array.from(deckEl.children);
  const sections = children.filter((c) => c.tagName.toLowerCase() === "section" && isVisible(c));
  const pool = sections.length ? sections : children.filter(isVisible);
  if (!pool.length) return deckEl;
  return pool.reduce((a, b) => (opacityOf(b) > opacityOf(a) ? b : a));
}

function findDcRoot(doc: Document): HTMLElement | null {
  const root = doc.getElementById("dc-root");
  if (!root) return null;
  const el = (root.firstElementChild as HTMLElement) || root;
  const r = el.getBoundingClientRect();
  return r.width > 1 && r.height > 1 ? el : null;
}

function dcPreviewSize(doc: Document): { w: number; h: number } | null {
  const el = doc.querySelector('script[type="text/x-dc"][data-props]');
  if (!el) return null;
  try {
    const preview = JSON.parse(el.getAttribute("data-props") || "{}")["$preview"];
    const w = Number(preview && preview.width);
    const h = Number(preview && preview.height);
    if (w > 1 && h > 1) return { w: Math.min(w, 8192), h: Math.min(h, 8192) };
  } catch {
    /* ignore */
  }
  return null;
}

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

async function decodeImages(doc: Document): Promise<void> {
  await Promise.all(
    Array.from(doc.images || []).map(async (img) => {
      try {
        if (typeof img.decode === "function") await img.decode();
      } catch {
        /* ignore */
      }
    })
  );
}

async function waitForRender(maxMs: number, stableFrames = 3, interval = 150): Promise<void> {
  const doc = document;
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
    if (doc.getElementById("__bundler_err")) break;
    const sig = renderSignature(doc);
    if (!sig.startsWith("boot") && sig === last) {
      if (++stable >= stableFrames) break;
    } else {
      stable = 0;
    }
    last = sig;
    await delay(interval);
  }
  await raf();
  await raf();
  await delay(120);
}

// Resolve every image fill to a self-contained data: URL, so the import payload
// carries no external/blob references (the plugin runs offline, networkAccess:none).
async function embedImages(roots: LayerNode[]): Promise<void> {
  const jobs: Promise<void>[] = [];
  walkLayers(roots, (layer) => {
    for (const fill of imageFills(layer)) {
      const url = fill.url;
      if (!url || url.startsWith("data:")) continue;
      jobs.push(
        toDataUrl(url).then((d) => {
          if (d) fill.url = d;
        })
      );
    }
  });
  await Promise.all(jobs);
}

function toDataUrl(url: string): Promise<string | null> {
  return fetch(url)
    .then((r) => r.blob())
    .then(
      (blob) =>
        new Promise<string | null>((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : null);
          fr.onerror = () => resolve(null);
          fr.readAsDataURL(blob);
        })
    )
    .catch(() => null);
}

// Phase 1 (CLI calls this, then sizes the viewport): what is this export and what
// viewport does it want? Deck → authored design size; dc app → its $preview size;
// otherwise static (the CLI sizes by render width + scrollHeight).
window.__tofigProbe = (): ProbeResult => {
  const deck = findDeck(document);
  if (deck) {
    const el = deck.el;
    const w = Number(el.designWidth) || 0;
    const h = Number(el.designHeight) || 0;
    return {
      kind: "deck",
      w: w > 1 ? Math.min(w, 8192) : 1920,
      h: h > 1 ? Math.min(h, 8192) : 1080,
      count: deck.count(),
    };
  }
  const dc = dcPreviewSize(document);
  if (dc) return { kind: "dc", w: dc.w, h: dc.h };
  return { kind: "static" };
};

// Phase 2: viewport is set — settle and extract. Mirrors src/ui/capture.ts:
// deck → one root per slide (multiFrame for Design); dc app → the component;
// slides → cascade split; static design → the whole body.
window.__tofigCapture = async (target: string): Promise<CaptureResult> => {
  const isSlides = target === "slides";
  await waitForRender(8000, 2);
  const extract = window.__tofigExtract;
  const title = (document.title || "").trim() || "import";
  let roots: LayerNode[] = [];
  let multiFrame = false;

  const deck = findDeck(document);
  if (deck) {
    const n = deck.count();
    for (let i = 0; i < n; i++) {
      try {
        deck.goTo(i);
      } catch {
        /* keep going */
      }
      await waitForRender(3500, 2, 100);
      roots.push(normalizeRoot(extract(visibleSlide(deck.el) as HTMLElement)));
    }
    multiFrame = !isSlides; // Design: one frame per slide.
  } else if (findDcRoot(document)) {
    roots = [normalizeRoot(extract(findDcRoot(document) as HTMLElement))];
  } else if (isSlides) {
    roots = detectSlides(document).map((el) => normalizeRoot(extract(el as HTMLElement)));
  } else {
    roots = extract(document.body);
  }

  await embedImages(roots);
  walkLayers(roots, (layer) => {
    delete layer.ref;
  });
  return { roots, title, multiFrame };
};
