// Builds two artifacts required by Figma:
//   1. code.js  — the sandbox (no DOM), a single IIFE
//   2. ui.html  — the UI iframe, a single self-contained HTML file with JS inlined
import * as esbuild from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

const watch = process.argv.includes("--watch");

// Build identity, baked into both bundles via `define` and shown discreetly in
// the UI. The semver comes from package.json; the git short SHA (+ "-dirty" when
// the tree has uncommitted changes) makes every build uniquely identifiable, so
// we can tell at a glance whether Figma is running a fresh build or a stale one.
function gitRev() {
  try {
    const sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    let dirty = "";
    try {
      execSync("git diff --quiet && git diff --cached --quiet", { stdio: "ignore" });
    } catch {
      dirty = "-dirty";
    }
    return sha + dirty;
  } catch {
    return "nogit";
  }
}
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const TOFIG_VERSION = `${pkg.version}+${gitRev()}`;
const TOFIG_BUILD_TIME = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

const common = {
  bundle: true,
  target: "es2017",
  logLevel: "info",
  define: {
    "process.env.NODE_ENV": '"production"',
    TOFIG_VERSION: JSON.stringify(TOFIG_VERSION),
    TOFIG_BUILD_TIME: JSON.stringify(TOFIG_BUILD_TIME),
  },
};
console.log(`tofig version: ${TOFIG_VERSION} (built ${TOFIG_BUILD_TIME})`);

const TEMPLATE = "src/ui/index.html";
const PLACEHOLDER = "/*INLINE_SCRIPT*/";

async function inlineUI(outputFiles) {
  // Escape any "</script>" so the inlined code can't terminate the host <script>.
  const js = outputFiles[0].text.replace(/<\/script>/gi, "<\\/script>");
  const template = await readFile(TEMPLATE, "utf8");
  if (!template.includes(PLACEHOLDER)) {
    throw new Error(`UI template is missing the ${PLACEHOLDER} marker`);
  }
  // Replace ALL occurrences of the marker; function replacer avoids $-pattern
  // interpretation in the bundled JS.
  const html = template.split(PLACEHOLDER).join(js);
  if (html.includes(PLACEHOLDER)) {
    throw new Error("inline failed: placeholder still present in ui.html");
  }
  await writeFile("ui.html", html);
  console.log(`built ui.html (${js.length} bytes of inlined JS)`);
}

// The extractor is bundled to an IIFE string and injected into the UI build via
// `define`, so the UI can run it inside the render iframe's own context.
async function buildExtractorSource() {
  const out = await esbuild.build({
    ...common,
    entryPoints: ["src/ui/extractor.ts"],
    write: false,
    format: "iife",
    minify: true,
  });
  return out.outputFiles[0].text;
}
const extractorSrc = await buildExtractorSource();

// React + ReactDOM (UMD, production) vendored and injected into the render iframe
// for self-bootstrapping exports. Some Claude exports (the `dc-runtime`) fetch
// React from a CDN, which Figma's `networkAccess: none` blocks; pre-defining
// window.React/ReactDOM lets the runtime boot offline (its loader skips the CDN
// when those globals already exist). Escape </script> so it can be inlined.
async function buildReactSource() {
  const [react, reactDom] = await Promise.all([
    readFile("src/ui/vendor/react.umd.js", "utf8"),
    readFile("src/ui/vendor/react-dom.umd.js", "utf8"),
  ]);
  // react first (react-dom references window.React), then react-dom.
  return `${react}\n;${reactDom}`.replace(/<\/script>/gi, "<\\/script>");
}
const reactSrc = await buildReactSource();

const codeOpts = { ...common, entryPoints: ["src/code.ts"], outfile: "code.js", format: "iife" };
const uiOpts = {
  ...common,
  entryPoints: ["src/ui/ui.ts"],
  write: false,
  format: "iife",
  define: {
    ...common.define,
    TOFIG_EXTRACTOR_SRC: JSON.stringify(extractorSrc),
    TOFIG_REACT_SRC: JSON.stringify(reactSrc),
  },
};

if (watch) {
  const codeCtx = await esbuild.context(codeOpts);
  const uiCtx = await esbuild.context({
    ...uiOpts,
    plugins: [
      {
        name: "inline-ui-html",
        setup(build) {
          build.onEnd(async (res) => {
            if (res.outputFiles?.length) await inlineUI(res.outputFiles);
          });
        },
      },
    ],
  });
  await codeCtx.watch();
  await uiCtx.watch();
  console.log("watching for changes…");
} else {
  await esbuild.build(codeOpts);
  const ui = await esbuild.build(uiOpts);
  await inlineUI(ui.outputFiles);
}
