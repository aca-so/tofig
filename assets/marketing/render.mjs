#!/usr/bin/env node
/**
 * Renders every published image from its source.
 *
 *   node assets/marketing/render.mjs
 *
 * Listing art is captured at 2x and downscaled, which is what gives hairline
 * Sora its edges — a straight 1x capture renders the 150-weight display type
 * thin and fringed. The icon set is rasterised once at 1024 and downscaled
 * from there: 512/256/128/64/32/16 are all exact power-of-two steps off that
 * master, so every size in the set is a clean resample of one render.
 *
 * Outputs, all overwritten in place:
 *   assets/marketing/01-thumbnail.png     1920×1080
 *   assets/marketing/02-how-it-works.png  1920×1080
 *   assets/marketing/03-design-slides.png 1920×1080
 *   assets/marketing/04-nodes.png         1920×1080
 *   assets/marketing/05-what-survives.png 1920×1080
 *   assets/icon/icon-{16,32,48,64,128,256,512}.png   ← Figma wants 128
 *   site/assets/tofig-mark.svg            copied from assets/icon/mark.svg
 *   site/assets/favicon-32.png            transparent mark, PNG fallback
 *   site/assets/apple-touch-icon.png      180×180, opaque tile (iOS composites)
 */

import { execFile } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import puppeteer from "puppeteer-core";

const execFileP = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

const CHROME = [
  process.env.TOFIG_CHROME,
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].find((p) => p && existsSync(p));

if (!CHROME) {
  console.error("Chrome not found. Set TOFIG_CHROME to a Chrome binary.");
  process.exit(1);
}

/* The carousel, in listing order. Frames 4 and 5 are named for what they
   show; the previous set's "before-after" and "why-tofig" described art
   that no longer exists. */
const FRAMES = [
  "01-thumbnail.png",
  "02-how-it-works.png",
  "03-design-slides.png",
  "04-nodes.png",
  "05-what-survives.png",
];

const ICON_SIZES = [512, 256, 128, 64, 48, 32, 16];

/** Downscale in place with sips. macOS-only, already how this repo's assets are built. */
const resize = (file, w, h = w) =>
  execFileP("sips", ["-z", String(h), String(w), file, "--out", file]);

/** Fonts and images both have to land before a capture, or Sora silently falls
    back to system-ui and the whole art direction is lost. */
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((img) =>
        img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })
      )
    );
  });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
}

/** Rasterise an SVG at `css` px with a 2x device ratio, so the PNG lands at 2×css.
 *
 *  The SVG is embedded as a data URI rather than referenced by path: a
 *  setContent document has an about:blank origin, and Chrome refuses file://
 *  subresources from it, so a src="file://…" silently renders as a broken
 *  image. Keeping it in an <img> rather than inlining the markup preserves
 *  the SVG's own isolated styling — mark.svg carries a prefers-color-scheme
 *  block, and inline it would resolve against the host page instead. */
async function rasterise(browser, svgPath, out, css, { transparent = false } = {}) {
  const uri = `data:image/svg+xml;base64,${readFileSync(svgPath).toString("base64")}`;
  const page = await browser.newPage();
  await page.setViewport({ width: css, height: css, deviceScaleFactor: 2 });
  await page.setContent(
    `<style>html,body{margin:0;background:${transparent ? "transparent" : "#08070f"}}
       img{display:block;width:${css}px;height:${css}px}</style>
     <img src="${uri}">`,
    { waitUntil: "load" }
  );
  await settle(page);
  const img = await page.$("img");
  const ok = await img.evaluate((el) => el.complete && el.naturalWidth > 0);
  if (!ok) throw new Error(`${svgPath} failed to rasterise`);
  await img.screenshot({ path: out, omitBackground: transparent });
  await page.close();
}

/** Rasterise the icon tile from icon.html at `css` px, 2x device ratio.
 *
 *  The glyph is Sora set live, so the one failure that matters is the webfont
 *  not arriving: the tile would still render, just in system-ui, and nothing
 *  downstream would notice. document.fonts.check() at both weights turns that
 *  into a hard stop instead of a silently wrong release. */
async function rasteriseTile(browser, out, css) {
  const page = await browser.newPage();
  await page.setViewport({ width: css, height: css, deviceScaleFactor: 2 });
  await page.goto(`file://${resolve(root, "assets/icon/icon.html")}`, { waitUntil: "load" });
  await settle(page);

  const ok = await page.evaluate(() =>
    document.fonts.check('300 52px Sora') && document.fonts.check('600 52px Sora'));
  if (!ok) throw new Error("Sora did not load — the icon would ship in system-ui");

  const el = await page.$(".icon");
  const { width } = await el.boundingBox();
  if (Math.round(width) !== css) {
    throw new Error(`icon.html rendered ${Math.round(width)}px, expected ${css}`);
  }
  await el.screenshot({ path: out });
  await page.close();
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--force-color-profile=srgb", "--font-render-hinting=none"],
});

try {
  // ═══ Listing art ════════════════════════════════════════════════════
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
    await page.goto(`file://${resolve(here, "marketing.html")}`, { waitUntil: "load" });
    await settle(page);

    const slides = await page.$$(".slide");
    if (slides.length !== FRAMES.length) {
      throw new Error(`marketing.html has ${slides.length} slides, expected ${FRAMES.length}`);
    }
    for (const [i, slide] of slides.entries()) {
      const out = resolve(here, FRAMES[i]);
      await slide.screenshot({ path: out });
      await resize(out, 1920, 1080);
      console.log(`  ✓ ${FRAMES[i]}  1920×1080`);
    }
    await page.close();
  }

  // ═══ Icon set ═══════════════════════════════════════════════════════
  {
    const dir = resolve(root, "assets/icon");
    mkdirSync(dir, { recursive: true });
    const master = resolve(dir, "icon-512.png");

    await rasteriseTile(browser, master, 512);
    await resize(master, 512);

    for (const s of ICON_SIZES.filter((s) => s !== 512)) {
      const out = resolve(dir, `icon-${s}.png`);
      copyFileSync(master, out);
      await resize(out, s);
    }
    console.log(`  ✓ assets/icon/icon-{${ICON_SIZES.join(",")}}.png`);
  }

  // ═══ Site favicon ═══════════════════════════════════════════════════
  {
    const siteAssets = resolve(root, "site/assets");
    const markSrc = resolve(root, "assets/icon/mark.svg");

    // One source of truth: the deployed SVG is a copy, never hand-edited.
    copyFileSync(markSrc, resolve(siteAssets, "tofig-mark.svg"));

    const fav = resolve(siteAssets, "favicon-32.png");
    await rasterise(browser, markSrc, fav, 256, { transparent: true });
    await resize(fav, 32);

    // iOS composites this over its own ground, so it needs the opaque tile.
    const touch = resolve(siteAssets, "apple-touch-icon.png");
    await rasteriseTile(browser, touch, 360);
    await resize(touch, 180);

    console.log("  ✓ site/assets/tofig-mark.svg · favicon-32.png · apple-touch-icon.png");
  }
} finally {
  await browser.close();
}
