// This bundle is injected as a <script> INTO the render iframe and executed in
// the iframe's own context. That matters: builder.io's htmlToFigma uses the
// ambient `document`, `HTMLElement` and `getComputedStyle`. Running it inside the
// iframe makes all three resolve to the iframe (correct), instead of the top
// window (wrong — `iframeBody instanceof topWindow.HTMLElement` is false, and
// computed styles would be read against the wrong view).
import { htmlToFigma } from "@builder.io/html-to-figma";

// htmlToFigma drops font-weight/style AND strips DOM refs (removeRefs) before
// returning, so they can't be recovered later. We re-read them here, in the
// iframe, and attach them to text layers — keyed by normalized text content.
const normText = (s: string) => s.replace(/\s+/g, " ").trim();

function buildWeightIndex(rootEl: Element): Map<string, { fontWeight: string; fontStyle: string }> {
  const map = new Map<string, { fontWeight: string; fontStyle: string }>();
  const doc = rootEl.ownerDocument;
  const view = doc.defaultView || window;
  const walker = doc.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = normText(node.textContent || "");
    if (!text || map.has(text)) continue;
    const el = node.parentElement;
    if (!el) continue;
    const cs = view.getComputedStyle(el);
    map.set(text, { fontWeight: cs.fontWeight, fontStyle: cs.fontStyle });
  }
  return map;
}

function attachWeights(nodes: any[], map: Map<string, { fontWeight: string; fontStyle: string }>): void {
  for (const node of nodes || []) {
    if (node && node.type === "TEXT" && node.characters) {
      const hit = map.get(normText(String(node.characters)));
      if (hit) {
        node.fontWeight = hit.fontWeight;
        node.fontStyle = hit.fontStyle;
      }
    }
    if (node && node.children) attachWeights(node.children, map);
  }
}

(window as any).__tofigExtract = (selector: HTMLElement | string, useFrames = true) => {
  const layers = htmlToFigma(selector, useFrames);
  const rootEl =
    selector instanceof HTMLElement ? selector : document.querySelector(selector || "body");
  if (rootEl) attachWeights(layers, buildWeightIndex(rootEl));
  return layers;
};
