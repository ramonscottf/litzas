# 2026-05-17 — Litzas source rescue

Companion plan to the rescue branch `rescue/from-preview-2026-05-17`. Mirrored to `ramonscottf/skippy-plans/plans/2026-05-17-litzas-source-rescue.md` per the build-plan persistence rule.

## What happened

A previous Claude Code session built the Litzas Pizza website (Brand v2 — Black/Bone/Gold, Oswald + Inter Tight + Fraunces) and deployed it to Cloudflare Pages project `litzas` via direct wrangler upload. The session worked on a feature branch named `claude/migrate-litzas-pizza-ykXcE` that was never pushed.

Two consequences:

1. The `ramonscottf/litzas` repo was empty apart from the Skippy-Capture workflow YAML. The production HTML/CSS/JS had no git home.
2. If the build machine had been lost (Dutchman power-out, laptop drive failure, accidental directory delete) the site source was gone.

## What this branch does

`rescue/from-preview-2026-05-17` captures everything `https://preview.litzas.pages.dev` is currently serving:

- `index.html` — homepage (the only real page)
- `css/style.css` — 730 lines, Brand v2 system
- `js/main.js` — interactions + easter eggs (pepperoni rain on typing "pizza", souvenir Z via localStorage, click-wobble on Z marks)
- `_r2-snapshot/litzas-v2/*` — local backup of the four R2 assets the page references (logo-wordmark, pizza-boxes, dough-hands, pizzeria-mural). **Not the live path** — `index.html` continues to reference `pub-8c4898b448c84fa9a36cf230c13c60e3.r2.dev/litzas-v2/` directly. The snapshot is insurance.

The pre-existing `.github/workflows/skippy-capture.yml` is preserved.

## What this branch does NOT do

- Does not promote to `main` — that's a follow-up after Scott reviews
- Does not connect Cloudflare Pages to the GitHub repo (Pages project still configured for direct upload, `source.config = /`, `production_branch = None`)
- Does not recover any source files that may have existed beyond the deployed bundle. If the original Claude Code session left richer source on Dutchman or Scott's laptop (build configs, partials, drafts), those should be merged in before promoting

## Recovery sequence (in order)

1. **Scott reviews this branch** — eyeball the README and the deployed HTML/CSS/JS for accuracy
2. **Merge `rescue/from-preview-2026-05-17` → `main`** (PR or fast-forward, either is fine)
3. **Connect Pages project `litzas` to the GitHub repo**
   - Cloudflare API or dashboard
   - Production branch: `main`
   - Build command: none
   - Build output directory: `/` (it's static HTML)
   - Once connected, the next push to `main` deploys to `litzas.pages.dev` automatically
4. **Verify production deploy** is byte-identical to current preview (or near enough)
5. **Build the real sub-pages** — `/menu/`, `/locations/`, `/order/`, `/blog/` currently fall back to `index.html` via SPA-style routing. Either build them or remove from the nav
6. **Resolve founding-date question** — page says 1965, family history mentions 1959 multi-location lineage. Confirm with Ali which year leads the brand story
7. **Attach `litzaspizza.com`** as a custom domain on the Pages project once 1-6 are done

## Coordination note

This rescue was initiated by two Skippy sessions independently within minutes of each other on 2026-05-17. The earlier one (commit `7e7e0ef`, 18:54:45 UTC, author "Skippy (rescue)") landed first and got adopted. The second session caught the conflict on push and stood down rather than force-pushing. **The "never two Claude sessions pushing the same repo" rule held only because `git push` blocks non-fast-forwards by default.** A `--force` would have erased the first Skippy's work. Future rescue operations should `git fetch && git log origin/<branch>` before assuming a branch name is available.

## Capture inventory

| Path | Source | Notes |
|---|---|---|
| `index.html` | `curl https://preview.litzas.pages.dev/` | 224 lines, served as-is |
| `css/style.css` | `curl .../css/style.css` | 730 lines |
| `js/main.js` | `curl .../js/main.js` | 142 lines |
| `_r2-snapshot/litzas-v2/dough-hands.jpg` | R2 public bucket | 593 KB |
| `_r2-snapshot/litzas-v2/logo-wordmark.png` | R2 public bucket | 2 KB |
| `_r2-snapshot/litzas-v2/pizza-boxes.png` | R2 public bucket | 1.7 MB |
| `_r2-snapshot/litzas-v2/pizzeria-mural.jpg` | R2 public bucket | 196 KB |

## Reference

- Pages project: `litzas` (Cloudflare account `77f3d6611f5ceab7651744268d434342`)
- Subdomain: `litzas.pages.dev`
- Preview URL: `https://preview.litzas.pages.dev`
- Production target: `litzaspizza.com` (not yet attached)
- R2 bucket (assets): `pub-8c4898b448c84fa9a36cf230c13c60e3.r2.dev`, prefix `litzas-v2/`
