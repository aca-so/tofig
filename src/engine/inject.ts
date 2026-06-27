// Inject layer (sandbox). Walks the IR and builds native Figma nodes via the
// Plugin API. Takes `figma` as a parameter so the same code can run in a plugin
// sandbox OR any other PluginAPI host (e.g. the Figma MCP `use_figma`) later.
//
// The traversal/positioning faithfully mirrors builder.io's `figma-html` import
// (the matched consumer of `htmlToFigma`'s coordinate convention), with three
// upgrades: a one-frame wrapper, Slides as a target, and weight/italic-aware
// font resolution (the lib drops font-weight).

import type { LayerNode } from "./layers";
import { imageFills } from "./layers";

// Props we set explicitly (position/size/structure/custom), never via the
// generic copy loop.
const SKIP = new Set([
  "ref", "type", "children", "svg", "width", "height", "x", "y",
  "intArr", "url", "fontFamily", "fontWeight", "fontStyle", "id", "parent",
  "fitTo", // capture-layer hint (rescale subtree to fit), not a Figma node prop
]);

const DEFAULT_FONTS: FontName[] = [
  { family: "Inter", style: "Regular" },
  { family: "Roboto", style: "Regular" },
];

interface FontFamilyEntry {
  family: string; // real (proper-case) family name
  styles: Set<string>;
}

export interface InjectCtx {
  figma: PluginAPI;
  fontIndex: Map<string, FontFamilyEntry>; // normalized family -> entry
  fontCache: Map<string, FontName>;
  defaultFont: FontName;
  // requested primary family (as written in CSS) -> family actually used
  substituted: Map<string, string>;
}

export interface ImportResult {
  nodes: SceneNode[];
  /** human-readable "Requested -> Used" font substitutions */
  fontsSubstituted: string[];
}

function reportSubstitutions(ctx: InjectCtx): string[] {
  return [...ctx.substituted.entries()].map(([from, to]) => `${from} → ${to}`);
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function makeCtx(figma: PluginAPI): Promise<InjectCtx> {
  const fonts = await figma.listAvailableFontsAsync();
  const fontIndex = new Map<string, FontFamilyEntry>();
  for (const f of fonts) {
    const key = norm(f.fontName.family);
    let entry = fontIndex.get(key);
    if (!entry) {
      entry = { family: f.fontName.family, styles: new Set() };
      fontIndex.set(key, entry);
    }
    entry.styles.add(f.fontName.style);
  }

  let defaultFont = DEFAULT_FONTS[0];
  for (const candidate of DEFAULT_FONTS) {
    try {
      await figma.loadFontAsync(candidate);
      defaultFont = candidate;
      break;
    } catch {
      /* try next */
    }
  }

  return { figma, fontIndex, fontCache: new Map(), defaultFont, substituted: new Map() };
}

const unquote = (s: string) => s.replace(/^["']|["']$/g, "").trim();
const GENERIC_FAMILIES = new Set([
  "sans-serif", "serif", "monospace", "ui-sans-serif", "ui-serif", "ui-monospace",
  "system-ui", "cursive", "fantasy", "ui-rounded", "emoji", "math", "fangsong", "inherit",
]);

// --- font resolution -------------------------------------------------------

const WEIGHT_NAMES: Array<[number, string[]]> = [
  [100, ["Thin", "Hairline"]],
  [200, ["ExtraLight", "Extra Light", "UltraLight"]],
  [300, ["Light"]],
  [400, ["Regular", "Normal", "Book"]],
  [500, ["Medium"]],
  [600, ["SemiBold", "Semi Bold", "DemiBold", "Demi Bold"]],
  [700, ["Bold"]],
  [800, ["ExtraBold", "Extra Bold", "UltraBold"]],
  [900, ["Black", "Heavy"]],
];

function matchStyle(styles: Set<string>, name: string): string | null {
  const n = norm(name);
  for (const s of styles) if (norm(s) === n) return s;
  return null;
}

function pickStyle(styles: Set<string>, weight: number, italic: boolean): string {
  const ordered = [...WEIGHT_NAMES].sort(
    (a, b) => Math.abs(a[0] - weight) - Math.abs(b[0] - weight)
  );
  for (const [, names] of ordered) {
    for (const base of names) {
      if (italic) {
        const ital = base === "Regular" ? "Italic" : `${base} Italic`;
        const f = matchStyle(styles, ital);
        if (f) return f;
      }
      const f = matchStyle(styles, base);
      if (f) return f;
    }
  }
  // last resort: any style this family has
  const first = styles.values().next().value;
  return first || "Regular";
}

async function resolveFont(ctx: InjectCtx, layer: LayerNode): Promise<FontName> {
  const stack = String(layer.fontFamily || "").split(/\s*,\s*/).filter(Boolean);
  const weight = Number(layer.fontWeight) || 400;
  const italic = String(layer.fontStyle || "").includes("italic") ||
    String(layer.fontStyle || "").includes("oblique");
  const cacheKey = `${layer.fontFamily}|${weight}|${italic}`;
  const cached = ctx.fontCache.get(cacheKey);
  if (cached) return cached;

  // The intended (primary) family is the first non-generic name in the stack.
  const primary = stack.map(unquote).find((f) => !GENERIC_FAMILIES.has(f.toLowerCase()));

  for (const fam of stack) {
    const cleaned = unquote(fam);
    const entry = ctx.fontIndex.get(norm(cleaned));
    if (!entry) continue;
    const font: FontName = { family: entry.family, style: pickStyle(entry.styles, weight, italic) };
    try {
      await ctx.figma.loadFontAsync(font);
      // Record a substitution when the primary intended family wasn't the one used.
      if (primary && norm(primary) !== norm(entry.family)) {
        ctx.substituted.set(primary, entry.family);
      }
      ctx.fontCache.set(cacheKey, font);
      return font;
    } catch {
      /* try next family */
    }
  }
  if (primary) ctx.substituted.set(primary, ctx.defaultFont.family);
  ctx.fontCache.set(cacheKey, ctx.defaultFont);
  return ctx.defaultFont;
}

// --- node building ---------------------------------------------------------

function setPos(node: SceneNode, layer: { x?: number; y?: number }): void {
  if (typeof layer.x === "number") node.x = layer.x;
  if (typeof layer.y === "number") node.y = layer.y;
}

function applyProps(node: SceneNode, layer: LayerNode): void {
  for (const key of Object.keys(layer)) {
    if (SKIP.has(key)) continue;
    const value = (layer as any)[key];
    if (value === undefined) continue;
    try {
      (node as any)[key] = value;
    } catch {
      /* property not valid for this node type — ignore */
    }
  }
}

async function processImages(ctx: InjectCtx, layer: LayerNode): Promise<void> {
  for (const fill of imageFills(layer)) {
    if (fill.intArr) {
      try {
        fill.imageHash = ctx.figma.createImage(fill.intArr).hash;
      } catch {
        /* unsupported image bytes — drop the fill's image */
      }
      delete fill.intArr;
    }
  }
}

function shrinkToFit(text: TextNode, layer: LayerNode): void {
  const targetH = Math.max(layer.height || 0, layer.lineHeightPx || 0);
  let guard = 0;
  const maxDrops = typeof layer.fontSize === "number" ? layer.fontSize * 0.3 : 6;
  while (
    typeof text.fontSize === "number" &&
    (text.height > Math.max(targetH, 1) * 1.2 ||
      (layer.width ? text.width > layer.width * 1.2 : false))
  ) {
    if (guard++ > maxDrops || text.fontSize <= 1) break;
    try {
      text.fontSize = text.fontSize - 1;
    } catch {
      break;
    }
  }
}

async function buildLayer(ctx: InjectCtx, layer: LayerNode): Promise<SceneNode | null> {
  const { figma } = ctx;
  const w = Math.max(1, layer.width || 1);
  const h = Math.max(1, layer.height || 1);

  switch (layer.type) {
    case "FRAME":
    case "GROUP": {
      const frame = figma.createFrame();
      frame.resize(w, h);
      frame.fills = [];
      frame.clipsContent = false;
      applyProps(frame, layer);
      for (const child of layer.children || []) {
        const node = await buildLayer(ctx, child);
        if (node) {
          frame.appendChild(node);
          setPos(node, child);
        }
      }
      return frame;
    }

    case "SVG": {
      try {
        const node = figma.createNodeFromSvg(layer.svg || "<svg/>");
        node.resize(w, h);
        applyProps(node, layer);
        return node;
      } catch {
        return null;
      }
    }

    case "RECTANGLE": {
      const rect = figma.createRectangle();
      await processImages(ctx, layer);
      rect.resize(w, h);
      applyProps(rect, layer);
      return rect;
    }

    case "TEXT": {
      const text = figma.createText();
      text.fontName = await resolveFont(ctx, layer);
      applyProps(text, layer); // sets characters (font is loaded), color, size, spacing…
      text.resize(w, h);
      text.textAutoResize = "HEIGHT";
      shrinkToFit(text, layer);
      return text;
    }

    default:
      return null; // unsupported node type — skip
  }
}

// --- bounding box helpers --------------------------------------------------

function fitWrapperToChildren(wrapper: FrameNode): void {
  const kids = wrapper.children as SceneNode[];
  if (!kids.length) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const k of kids) {
    minX = Math.min(minX, k.x);
    minY = Math.min(minY, k.y);
    maxX = Math.max(maxX, k.x + k.width);
    maxY = Math.max(maxY, k.y + k.height);
  }
  if (!isFinite(minX)) return;
  for (const k of kids) {
    k.x -= minX;
    k.y -= minY;
  }
  wrapper.resize(Math.max(1, maxX - minX), Math.max(1, maxY - minY));
}

// Uniformly shrink a node's whole subtree — geometry, font size, strokes and all
// — so it fits within W×H. Only ever scales DOWN. Figma's native rescale is the
// right tool: it scales every descendant together (unlike a root-only resize,
// which leaves children at full size — the "huge layer behind a correct frame").
function rescaleToFit(node: SceneNode, W: number, H: number): void {
  if (!("rescale" in node)) return;
  const scale = Math.min(W / node.width, H / node.height, 1);
  if (scale < 1) (node as FrameNode).rescale(scale);
}

function fitInto(node: SceneNode, W: number, H: number): void {
  rescaleToFit(node, W, H);
  node.x = Math.round((W - node.width) / 2);
  node.y = Math.round((H - node.height) / 2);
}

// --- public entry points ---------------------------------------------------

/** Build a Design import: one wrapper frame holding the page, centered in view. */
export async function importDesign(
  figma: PluginAPI,
  roots: LayerNode[],
  title: string
): Promise<ImportResult> {
  const ctx = await makeCtx(figma);
  const wrapper = figma.createFrame();
  wrapper.name = `tofig · ${title}`;
  wrapper.fills = [];
  wrapper.clipsContent = false;

  for (const root of roots) {
    const node = await buildLayer(ctx, root);
    if (node) {
      wrapper.appendChild(node);
      setPos(node, root);
      // A deck-captured root carries the authored slide size: rescale its whole
      // subtree down to fit so an oversized capture (e.g. a wide timeline laid
      // out at authored width under `noscale`) shrinks instead of overflowing.
      if (root.fitTo) rescaleToFit(node, root.fitTo.w, root.fitTo.h);
    }
  }
  fitWrapperToChildren(wrapper);

  const center = figma.viewport.center;
  wrapper.x = Math.round(center.x - wrapper.width / 2);
  wrapper.y = Math.round(center.y - wrapper.height / 2);
  figma.currentPage.selection = [wrapper];
  return { nodes: [wrapper], fontsSubstituted: reportSubstitutions(ctx) };
}

/** Build a Slides import: one SlideNode per root, content scaled to fit. */
export async function importSlides(
  figma: PluginAPI,
  roots: LayerNode[],
  title: string
): Promise<ImportResult> {
  const api = figma as any;
  if (typeof api.createSlide !== "function") {
    throw new Error("Slides API unavailable — open this plugin inside a Figma Slides file.");
  }
  const ctx = await makeCtx(figma);
  const created: SceneNode[] = [];

  for (let i = 0; i < roots.length; i++) {
    const slide: SceneNode = api.createSlide();
    try {
      slide.name = `${title} · ${i + 1}`;
    } catch {
      /* name may be read-only on some versions */
    }
    const content = await buildLayer(ctx, roots[i]);
    if (content) {
      (slide as any).appendChild(content);
      const W = (slide as any).width || 1920;
      const H = (slide as any).height || 1080;
      fitInto(content, W, H);
    }
    created.push(slide);
  }
  return { nodes: created, fontsSubstituted: reportSubstitutions(ctx) };
}
