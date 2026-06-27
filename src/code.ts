// Sandbox entry (no DOM). Shows the UI, reports the editor target, and turns
// imported layer trees into native Figma nodes.
import type { EditorTarget, UIToSandbox } from "./shared/messages";
import { importDesign, importSlides } from "./engine/inject";

declare const __html__: string;

// Build identity (see esbuild.mjs). Logged so the sandbox bundle is identifiable
// in the console alongside the UI's discreet version badge.
console.log(`[tofig] sandbox v${TOFIG_VERSION} (built ${TOFIG_BUILD_TIME})`);

const target: EditorTarget = figma.editorType === "slides" ? "slides" : "design";

figma.showUI(__html__, { width: 440, height: 600, themeColors: true });

figma.ui.postMessage({
  type: "init",
  target,
  renderWidth: 1440,
  slideSize: { width: 1920, height: 1080 },
});

figma.ui.onmessage = async (msg: UIToSandbox) => {
  if (msg.type === "resize") {
    figma.ui.resize(Math.max(320, msg.width), Math.max(360, msg.height));
    return;
  }
  if (msg.type === "cancel") {
    figma.closePlugin();
    return;
  }
  if (msg.type === "import") {
    try {
      const result =
        msg.target === "slides"
          ? await importSlides(figma, msg.roots, msg.title)
          : await importDesign(figma, msg.roots, msg.title, msg.multiFrame);

      const { nodes, fontsSubstituted } = result;
      if (nodes.length) {
        figma.viewport.scrollAndZoomIntoView(nodes);
      }
      figma.ui.postMessage({ type: "done", count: nodes.length, fontsSubstituted });

      const base =
        msg.target === "slides"
          ? `tofig: imported ${nodes.length} slide${nodes.length === 1 ? "" : "s"}`
          : `tofig: imported ${nodes.length} frame${nodes.length === 1 ? "" : "s"}`;
      figma.notify(
        fontsSubstituted.length
          ? `${base} · fonts not in Figma: ${fontsSubstituted.join(", ")}`
          : base,
        { timeout: fontsSubstituted.length ? 8000 : 3000 }
      );
    } catch (err: any) {
      console.error(err);
      figma.ui.postMessage({ type: "error", message: String(err?.message || err) });
      figma.notify(`tofig error: ${err?.message || err}`, { error: true });
    }
  }
};
