#!/usr/bin/env node
// tofig external renderer.
//
// Renders an HTML file in a REAL, unrestricted headless Chrome — so self-contained
// Claude exports that Figma's plugin sandbox can't run (CDN React, data:-URL
// localStorage, eval, …) render natively here — runs the same extractor, and
// writes a `<name>.tofig.json` import payload. Load that file in the tofig plugin
// (drag-drop or "Choose…") to import it deterministically, no shims.
//
// Usage:
//   node bin/tofig-render.mjs <input.html> [--target design|slides] [--width 1440]
//                             [--out file.tofig.json] [--chrome /path/to/chrome] [--headful]
//
// Requires a Chrome/Chromium install (uses puppeteer-core, no bundled browser).
import * as esbuild from "esbuild";
import puppeteer from "puppeteer-core";
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";

function parseArgs(argv) {
  const args = { target: "design", width: 1440, headful: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target") args.target = argv[++i];
    else if (a === "--width") args.width = parseInt(argv[++i], 10) || 1440;
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--chrome") args.chrome = argv[++i];
    else if (a === "--headful") args.headful = true;
    else rest.push(a);
  }
  args.input = rest[0];
  return args;
}

function resolveChrome(explicit) {
  const candidates = [
    explicit,
    process.env.TOFIG_CHROME,
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

async function bundleIIFE(entry) {
  const out = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: "iife",
    target: "es2020",
    minify: true,
    define: { "process.env.NODE_ENV": '"production"' },
  });
  return out.outputFiles[0].text;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) {
    console.error("usage: tofig-render <input.html> [--target design|slides] [--width N] [--out f.tofig.json] [--chrome path] [--headful]");
    process.exit(2);
  }
  const input = resolve(args.input);
  if (!existsSync(input)) {
    console.error(`not found: ${input}`);
    process.exit(2);
  }
  const chrome = resolveChrome(args.chrome);
  if (!chrome) {
    console.error("Chrome not found. Install Google Chrome, or pass --chrome <path> (or set TOFIG_CHROME).");
    process.exit(2);
  }
  const isSlides = args.target === "slides";
  const out = args.out || input.replace(/\.html?$/i, "") + ".tofig.json";

  // Same extractor as the plugin, plus the page-side orchestration.
  const here = new URL(".", import.meta.url).pathname;
  const [extractorSrc, captureSrc] = await Promise.all([
    bundleIIFE(resolve(here, "../src/ui/extractor.ts")),
    bundleIIFE(resolve(here, "../src/cli/page-capture.ts")),
  ]);

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: args.headful ? false : "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    const initialH = isSlides ? 1080 : 1024;
    const initialW = isSlides ? 1920 : args.width;
    await page.setViewport({ width: initialW, height: initialH });

    console.error(`tofig-render: ${basename(input)} → ${args.target} (chrome: ${basename(chrome)})`);
    await page.goto(pathToFileURL(input).href, { waitUntil: "networkidle0", timeout: 45000 }).catch((e) => {
      console.error(`  navigation: ${e.message} (continuing)`);
    });

    // Wait for a self-bootstrapping export to swap in / mount.
    await page
      .waitForFunction(
        () =>
          !document.getElementById("__bundler_thumbnail") &&
          (document.querySelector("deck-stage") ||
            (document.getElementById("dc-root") && document.getElementById("dc-root").children.length) ||
            (document.body && (document.body.innerText || "").trim().length > 10) ||
            document.getElementById("__bundler_err")),
        { timeout: 25000 }
      )
      .catch(() => console.error("  render wait timed out (continuing)"));

    await page.addScriptTag({ content: extractorSrc });
    await page.addScriptTag({ content: captureSrc });

    // Phase 1: probe for the export's intended viewport, then size it.
    const probe = await page.evaluate(() => window.__tofigProbe());
    if ((probe.kind === "deck" || probe.kind === "dc") && probe.w && probe.h) {
      await page.setViewport({ width: probe.w, height: probe.h });
      await new Promise((r) => setTimeout(r, 500));
    } else if (!isSlides) {
      // Static design page: grow to the full scroll height so tall pages capture whole.
      const h = await page.evaluate(() =>
        Math.max(document.documentElement.scrollHeight || 0, document.body.scrollHeight || 0)
      );
      await page.setViewport({ width: args.width, height: Math.max(initialH, h) });
      await new Promise((r) => setTimeout(r, 300));
    }
    console.error(`  probe: ${probe.kind}${probe.count ? ` (${probe.count} slides)` : ""}`);

    // Phase 2: capture.
    const result = await page.evaluate((t) => window.__tofigCapture(t), args.target);
    if (!result.roots || !result.roots.length) {
      console.error("  produced no layers");
      process.exit(1);
    }

    const payload = {
      tofig: 1,
      target: args.target,
      title: result.title,
      multiFrame: !!result.multiFrame,
      roots: result.roots,
    };
    await writeFile(out, JSON.stringify(payload));
    const n = result.roots.length;
    console.error(`  ✓ ${n} root${n === 1 ? "" : "s"} → ${out}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
