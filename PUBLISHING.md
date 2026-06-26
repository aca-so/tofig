# Publishing tofig

Figma plugins are published from the **desktop app** (Menu → Plugins → Manage plugins →
your plugin → **Publish**). The plugin already has an `id` in `manifest.json`, so it's
ready to publish — no need to "create" it again.

## Visibility options

| Mode | Who can use it | Plan needed | Review |
|------|----------------|-------------|--------|
| **Only your organization** | members of your Figma org | **Organization or Enterprise** | none (org-internal) |
| **Unlisted** | anyone with the share link (not searchable) | any plan | light / fast |
| **Public** (Community) | anyone, searchable in Community | any plan | full review (days) |

**Recommendation**
1. **Internal rollout:** if you're on **Organization/Enterprise**, publish as
   **"Only <your org>"** — teammates get it in the org Plugins tab, you control updates,
   no public review. If you're on Professional/Starter (no org-private option), use
   **Unlisted** and share the link with your team.
2. **Open-source / public:** once it's polished, switch the same plugin to **Public**
   for the Community listing (this is the "open-source html.to.design" goal). Pair it
   with the GitHub repo so people can read/build the code.

You can change visibility later, and Unlisted → Public reuses the same plugin id.

## Pre-publish checklist

- [ ] `npm run build` — Figma uploads the on-disk `code.js` + `ui.html` (they're
      git-ignored build outputs, but must exist locally at publish time).
- [ ] Smoke test in a Design file **and** a Slides file with `examples/`.
- [ ] **Icon** 128×128 PNG (set in the publish dialog).
- [ ] **Cover art** ~1920×960 PNG (the Community card / org listing image).
- [ ] **Name + tagline + description.** Be explicit about the constraints so reviewers
      and users aren't surprised: self-contained HTML only, `networkAccess: none`
      (no external URLs/assets), fonts must exist in Figma (else fall back to Inter).
- [ ] **License/attribution:** keep the MIT `LICENSE`; the plugin bundles
      `@builder.io/html-to-figma` (MIT) — preserve its copyright notice.
- [ ] Tags: e.g. `html`, `import`, `slides`, `code-to-design`.

## Updating after publish

Rebuild (`npm run build`) → Manage plugins → **Publish new version** (add release notes).
Org/Unlisted updates are quick; Public updates may go through review again.

## Open-sourcing the code (recommended alongside Public)

This repo is already self-contained: `README.md` has build/run steps. Push it to GitHub;
people can `npm install && npm run build` and **Import plugin from manifest** to run their
own build, or install your published Community version.
