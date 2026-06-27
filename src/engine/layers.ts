// The IR. `htmlToFigma` (builder.io) returns a tree of these — a Partial of the
// real Figma Plugin API node interfaces plus a few lib-specific extras (`svg`,
// `fontFamily`, image fills carrying `url`/`intArr`, and a DOM `ref`).
// We keep it permissive so it survives the UI -> sandbox message boundary cleanly.
export interface LayerNode {
  type: "FRAME" | "GROUP" | "RECTANGLE" | "TEXT" | "SVG" | string;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: LayerNode[];
  fills?: any[];
  // lib extras
  svg?: string;
  ref?: any; // DOM Node while in the UI; stripped before postMessage
  fontFamily?: string; // CSS font stack (lib drops weight/style)
  fontWeight?: number | string; // recovered from computed style in the UI
  fontStyle?: string; // "normal" | "italic" | "oblique"
  characters?: string;
  // Set by the capture layer on a deck-captured root: the authored slide size the
  // whole subtree should be uniformly rescaled to fit (via Figma's native
  // node.rescale, which scales geometry AND font size together). See capture.ts.
  fitTo?: { w: number; h: number };
  [key: string]: any;
}

export interface ImageFill {
  type: "IMAGE";
  scaleMode?: string;
  url?: string; // emitted by the lib
  intArr?: Uint8Array; // bytes, attached in the UI; consumed in the sandbox
  imageHash?: string; // attached in the sandbox after createImage
  [key: string]: any;
}

/** Depth-first visit of every layer in a forest of roots. */
export function walkLayers(
  roots: LayerNode[],
  cb: (layer: LayerNode, parent: LayerNode | null) => void,
  parent: LayerNode | null = null
): void {
  for (const layer of roots) {
    if (!layer) continue;
    cb(layer, parent);
    if (Array.isArray(layer.children) && layer.children.length) {
      walkLayers(layer.children, cb, layer);
    }
  }
}

/** Collect IMAGE fills from a single layer. */
export function imageFills(layer: LayerNode): ImageFill[] {
  if (!Array.isArray(layer.fills)) return [];
  return layer.fills.filter((f) => f && f.type === "IMAGE");
}

/**
 * Normalize the array `htmlToFigma` returns into a single root layer.
 * Usually it's a single frame; if it's several top-level layers we wrap them.
 */
export function normalizeRoot(layers: LayerNode[]): LayerNode {
  if (layers.length === 1) return layers[0];
  let w = 1;
  let h = 1;
  for (const l of layers) {
    w = Math.max(w, (l.x || 0) + (l.width || 0));
    h = Math.max(h, (l.y || 0) + (l.height || 0));
  }
  return { type: "FRAME", name: "group", x: 0, y: 0, width: w, height: h, fills: [], children: layers };
}
