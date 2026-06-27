import type { EditorTarget, SandboxToUI, UIToSandbox } from "../shared/messages";
import { capture } from "./capture";

function post(msg: UIToSandbox): void {
  parent.postMessage({ pluginMessage: msg }, "*");
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const els = {
  badge: $("badge") as HTMLSpanElement,
  ver: $("ver") as HTMLSpanElement,
  input: $("html") as HTMLTextAreaElement,
  drop: $("drop") as HTMLDivElement,
  file: $("file") as HTMLInputElement,
  pick: $("pick") as HTMLButtonElement,
  widthRow: $("widthRow") as HTMLDivElement,
  width: $("width") as HTMLInputElement,
  convert: $("convert") as HTMLButtonElement,
  status: $("status") as HTMLDivElement,
};

// Discreet build identity, read straight from this (the UI) bundle — if the
// number here matches the latest build, you know Figma isn't serving a stale UI.
els.ver.textContent = `v${TOFIG_VERSION}`;
els.ver.title = `Built ${TOFIG_BUILD_TIME}`;
console.log(`[tofig] UI v${TOFIG_VERSION} (built ${TOFIG_BUILD_TIME})`);

let target: EditorTarget = "design";
let renderWidth = 1440;
let slideSize: { width: number; height: number } | undefined;
let busy = false;

function setStatus(text: string, kind: "" | "ok" | "err" = ""): void {
  els.status.textContent = text;
  els.status.className = `status ${kind}`;
}

function setBusy(on: boolean): void {
  busy = on;
  els.convert.disabled = on;
  els.convert.textContent = on ? "Working…" : convertLabel();
}

function convertLabel(): string {
  return target === "slides" ? "Convert to Slides" : "Convert to Frames";
}

async function run(): Promise<void> {
  if (busy) return;
  const html = els.input.value.trim();
  if (!html) {
    setStatus("Paste some HTML or drop an .html file first.", "err");
    return;
  }
  setBusy(true);
  try {
    setStatus("Rendering & measuring…");
    const width = parseInt(els.width.value, 10) || renderWidth;
    const { roots, title } = await capture(html, target, width, slideSize);
    if (!roots.length) {
      setStatus("Nothing to import — the HTML produced no layers.", "err");
      setBusy(false);
      return;
    }
    setStatus("Building Figma layers…");
    post({ type: "import", target, title, roots });
  } catch (err: any) {
    console.error(err);
    setStatus(`Capture failed: ${err?.message || err}`, "err");
    setBusy(false);
  }
}

function readFile(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    els.input.value = String(reader.result || "");
    const looksHtml = /\.html?$/i.test(file.name) || /html/i.test(file.type) || /<\w+[\s>]/.test(els.input.value);
    setStatus(looksHtml ? `Loaded ${file.name}.` : `Loaded ${file.name} (doesn't look like HTML).`, looksHtml ? "ok" : "err");
  };
  reader.onerror = () => setStatus("Could not read that file.", "err");
  reader.readAsText(file);
}

function fileFromDataTransfer(dt: DataTransfer | null): File | null {
  if (!dt) return null;
  if (dt.files && dt.files.length) return dt.files[0];
  if (dt.items && dt.items.length) {
    for (const item of Array.from(dt.items)) {
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f) return f;
      }
    }
  }
  return null;
}

// --- wiring ---------------------------------------------------------------

els.convert.addEventListener("click", run);
els.pick.addEventListener("click", () => els.file.click());
els.file.addEventListener("change", () => {
  const f = els.file.files?.[0];
  if (f) readFile(f);
  els.file.value = ""; // allow re-picking the same file
});

// Drag & drop is handled at the window level: the entire plugin surface is the
// drop target, and we must preventDefault on dragover/drop everywhere so neither
// the textarea nor Figma's host window hijacks the dropped file.
window.addEventListener("dragenter", (e) => {
  e.preventDefault();
  els.drop.classList.add("over");
});
window.addEventListener("dragover", (e) => {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  els.drop.classList.add("over");
});
window.addEventListener("dragleave", (e) => {
  if (!e.relatedTarget) els.drop.classList.remove("over");
});
window.addEventListener("drop", (e) => {
  e.preventDefault();
  els.drop.classList.remove("over");
  const f = fileFromDataTransfer(e.dataTransfer);
  if (f) readFile(f);
  else setStatus("Couldn't read a file from that drop — try “Choose .html…”.", "err");
});

// keyboard: Cmd/Ctrl+Enter to convert
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
});

window.onmessage = (event: MessageEvent) => {
  const msg = event.data?.pluginMessage as SandboxToUI | undefined;
  if (!msg) return;
  switch (msg.type) {
    case "init":
      target = msg.target;
      renderWidth = msg.renderWidth;
      slideSize = msg.slideSize;
      els.badge.textContent = target === "slides" ? "Slides" : "Design";
      els.badge.dataset.target = target;
      els.convert.textContent = convertLabel();
      els.widthRow.style.display = target === "slides" ? "none" : "flex";
      els.width.value = String(renderWidth);
      break;
    case "progress":
      setStatus(msg.message);
      break;
    case "done": {
      const base =
        target === "slides"
          ? `Imported ${msg.count} slide${msg.count === 1 ? "" : "s"}. ✓`
          : "Imported ✓";
      if (msg.fontsSubstituted && msg.fontsSubstituted.length) {
        setStatus(`${base}  ⚠ Fonts not in Figma → fell back: ${msg.fontsSubstituted.join(", ")}`, "err");
      } else {
        setStatus(base, "ok");
      }
      setBusy(false);
      break;
    }
    case "error":
      setStatus(msg.message, "err");
      setBusy(false);
      break;
  }
};
