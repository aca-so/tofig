# Publishing tofig

> **Status: published and public.** tofig is live on Figma Community at
> **<https://www.figma.com/community/plugin/1652349254564019815>** — that is the
> canonical install URL, and every route on the site points to it. What follows is the
> procedure, kept for each new version.

Figma plugins are published from the **desktop app** (Menu → Plugins → Manage plugins →
your plugin → **Publish**). The plugin already has an `id` in `manifest.json`, so it's
ready to publish — no need to "create" it again.

## Visibility options

| Mode | Who can use it | Plan needed | Review |
|------|----------------|-------------|--------|
| **Only your organization** | members of your Figma org | **Organization or Enterprise** | none (org-internal) |
| **Unlisted** | anyone with the share link (not searchable) | any plan | light / fast |
| **Public** (Community) | anyone, searchable in Community | any plan | full review (days) |

**acaso is on Organization**, so all three paths were available. Both steps of the
rollout are done:

1. **Internal rollout:** published as **"acaso"** — teammates got it in the org Plugins
   tab, with **no Figma review**, so it was live immediately. Guests were excluded
   (org members only), which is what made the second step necessary.
2. **Public:** the same plugin is now **Public** on the Community, paired with the
   public repo so people can read and build the code. Updates to a public plugin can go
   through review again, so leave time for it before announcing a version.

Caveats worth knowing before you pick the publishing account:
- Only the plugin's **original publisher** can later change its access (private → public).
- If that person leaves the org, transferring ownership requires **Figma Support**.
- So publish from an acaso account that will stick around, not a throwaway.

## Pre-publish checklist

- [ ] `npm install && npm run build` — Figma uploads the on-disk `code.js` + `ui.html`.
      They're git-ignored build outputs, but **must exist locally at publish time**.
- [ ] Build from a **clean tree** — the version stamp appends `-dirty` otherwise
      (check `git status` first; the banner prints e.g. `0.3.0+f0721e2`).
- [ ] Smoke test in a Design file **and** a Slides file with `examples/`.
- [ ] **Icon** — upload `assets/icon/icon-128.png`. ✅ built
      (the set also ships 16/32/48/64/256/512; Figma's form only wants 128)
- [ ] **Thumbnail / cover art** — `assets/marketing/01-thumbnail.png`, **1920×1080**
      (Figma's recommended size — *not* 1920×960). ✅ built
- [ ] **Carousel** — `assets/marketing/02-…` through `05-…`, 1920×1080 each. ✅ built
- [ ] **Name + tagline + description** — copy is ready in [LISTING.md](./LISTING.md).
      Be explicit about the constraints so users aren't surprised: self-contained HTML
      only, `networkAccess: none` (no external URLs/assets), fonts must exist in Figma
      (else fall back to Inter), and the external-renderer escape hatch for live-app
      exports.
- [ ] **License/attribution:** keep the MIT `LICENSE`. The plugin bundles
      `@builder.io/html-to-figma` (MIT) and **React/ReactDOM** (MIT) — preserve their
      copyright notices.
- [ ] Tags: `html`, `import`, `code-to-design`, `slides`, `html-to-figma`.
- [ ] Release notes for the version you're shipping (see [CHANGELOG.md](./CHANGELOG.md)).

## The publish dialog, step by step

Desktop app → **Menu → Plugins → Manage plugins → tofig → Publish**. Four steps:

1. **Describe your resource** — name, tagline, description, category.
2. **Choose some images** — icon + thumbnail (required), then carousel images.
   A playground file is optional and not built yet.
3. **Data security** — optional disclosure form. Skip it for the org publish; note that
   if you fill it in later for the public listing, review can take **up to two weeks**.
4. **Add the final details** — **Publish to → Community** (it is public now; **acaso**
   is what made it org-private), pick the publisher, support contact, and review the
   network-access summary. It should report **no network access**, matching
   `manifest.json`.

## Updating after publish

Rebuild (`npm run build`) → Manage plugins → **Publish new version** (add release notes).
Org/Unlisted updates are quick; Public updates may go through review again.

## Open-sourcing the code (recommended alongside Public)

Already done — the repo is public at **github.com/aca-so/tofig** and self-contained:
`README.md` has build/run steps. People can `npm install && npm run build` and
**Import plugin from manifest** to run their own build, or install the published version.

## The external renderer (`tofig-render`)

Teammates who install the *plugin* don't get the CLI — it ships separately on npm as
**[`@aca-so/tofig`](https://www.npmjs.com/package/@aca-so/tofig)**:

```bash
npm install -g @aca-so/tofig                          # then: tofig-render export.html
npx --package=@aca-so/tofig tofig-render export.html  # one-off
```

### Why the package is scoped

The bare name `tofig` is unclaimed but **not publishable** — npm's typosquat filter
rejects it as "too similar to existing packages twig, config". Scoped names bypass that
check, and org-scoped ownership was the goal anyway. `publishConfig.access` is set to
`public` in `package.json`, since scoped packages otherwise default to restricted.

### Releasing a new version

Pushing a `v*` tag triggers [`.github/workflows/release.yml`](./.github/workflows/release.yml),
which lints, typechecks, builds, and publishes to npm:

```bash
npm version <patch|minor|major>   # bumps package.json and creates the tag
git push --follow-tags            # the tag push publishes
```

The workflow refuses to publish if the tag and `package.json` version disagree —
npm forbids reusing a version, so that mistake is unrecoverable.

### One-time npm setup (trusted publishing)

The release workflow authenticates with **OIDC**, not a token: npm verifies that the
request came from this repository and this workflow. No `NPM_TOKEN` secret, nothing to
rotate, no browser 2FA prompt, and published tarballs get **provenance** attestation
automatically.

This has to be enabled once, on npmjs.com:

1. Go to the [@aca-so/tofig package settings](https://www.npmjs.com/package/@aca-so/tofig/access).
2. Under **Trusted publisher**, choose **GitHub Actions**.
3. Organization or user: `aca-so` · Repository: `tofig` · Workflow filename: `release.yml`.
   Leave the environment blank unless you add one to the workflow.

Until that's configured the workflow will fail at the publish step — the build and
checks still run, so a failure there means "finish the npm setup", not "the code broke".

Why bother: npm disabled classic token creation in November 2025, and write-enabled
granular tokens now default to 7 days and cap at 90. Token-based release automation
means rotating a shared credential every quarter, forever. OIDC has no credential.
