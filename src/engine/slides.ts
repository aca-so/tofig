// Cascade slide detection (decision: markers -> body children -> whole doc).
// Honors intentional structure when present, but works on arbitrary HTML.

function isVisible(el: Element): boolean {
  const win = el.ownerDocument?.defaultView;
  if (!win) return true;
  const cs = win.getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden") return false;
  const r = el.getBoundingClientRect();
  return r.width > 1 && r.height > 1;
}

/**
 * Returns the list of elements that should each become one slide.
 * 1. Explicit markers ([data-slide] / .slide) anywhere.
 * 2. else top-level <section> children of <body>.
 * 3. else the direct children of <body> (when there is more than one).
 * 4. else the whole <body> as a single slide.
 */
export function detectSlides(doc: Document): Element[] {
  const markers = Array.from(doc.querySelectorAll<HTMLElement>("[data-slide], .slide")).filter(isVisible);
  if (markers.length) return markers;

  const sections = Array.from(doc.querySelectorAll<HTMLElement>("body > section")).filter(isVisible);
  if (sections.length) return sections;

  const kids = Array.from(doc.body.children).filter(isVisible);
  if (kids.length > 1) return kids;

  return [doc.body];
}
