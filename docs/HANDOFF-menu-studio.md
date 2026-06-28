# Litzas Menu Photo System — Handoff (2026-06-27)

## TL;DR
Menu photos for litzas.wickowaypoint.com (the ONLY Litzas dev site; work on `main`).
Every menu item peeks a photo from the top-right corner of its card. Photos live in
an R2 bucket, served by a Worker, uploaded via a studio page. **30/31 done — only
Calzone left.**

## Pieces
- **R2 bucket** `litzas-menu` — one object per item, key `{slug}.png`.
- **Worker** `litzas-menu` → https://litzas-menu.ramonscottf.workers.dev
  - `GET /img/{slug}.png` (serve, cache 300s) · `GET /list` ({slugs:[...]}) ·
    `POST /upload` (headers `X-Upload-Token` + `X-Slug`, PNG body)
  - Secret `UPLOAD_TOKEN = LitzasMenu-BeerCan26`
  - Source in repo: `studio-worker/` (index.js + wrangler.toml, binding BUCKET→litzas-menu)
  - Deploy: `cd studio-worker && CLOUDFLARE_API_KEY=<globalkey> CLOUDFLARE_EMAIL=ramonscottf@gmail.com npx wrangler deploy`
- **Studio page** `studio/index.html` → https://litzas.wickowaypoint.com/studio/
  - Lists 31 items (24 pizzas + 7 sides). Per item: Copy prompt, Add photo
    (in-browser processing + preview), Upload, Save. Category chips
    (All/Red/White/Specialty/Sides) + bulk zip download (JSZip) for Ali.
  - Upload key field stores to localStorage; key = `LitzasMenu-BeerCan26`.

## How a photo flows
1. Studio "Copy prompt" → paste into image gen, attach a finished photo as style ref.
2. Upload in studio → browser processes → POST to Worker → R2 `{slug}.png`.
3. Menu card `<img>` points at `${MENU_IMG_BASE}/${slug}.png` (R2) with onerror fallback.
   New uploads show on next page load — **no rebuild needed**.

## Processing rules (must stay consistent between studio JS and any server reprocessing)
- **Pizzas** → `knockout()` (flood-fill white→transparent, crop, 760² PNG).
- **Plated sides** (garden-salad, chef-salad, spaghetti, lasagna; `plated:true`)
  → `circularCrop()` (detect plate via max(rgb)<245 bbox, circular mask, 760² disc).
- **Standalone sides** (garlic-bread, cheese-garlic-bread, calzone) → knockout cutout.
- render-site `MENU_IMG_BASE = https://litzas-menu.ramonscottf.workers.dev/img`,
  `PEEK_FALLBACK = generic pepperoni peek`.
  - Pizza cards: onerror → generic pepperoni peek.
  - Side cards: class `has-peek`; onerror removes the peek img AND the has-peek class.

## State
- 24 pizzas: ALL done.
- Sides done: garden-salad, chef-salad, garlic-bread, cheese-garlic-bread, spaghetti, lasagna.
- **REMAINING: calzone** (generate via studio; it's a no-plate cutout, not a disc).

## Repo / deploy facts
- Repo `ramonscottf/litzas`, work on `main`. Clone to /tmp/litzas.
- Deploy: push `main` → GitHub Actions "Publish Site Content" → fetch-content
  (overwrites data/content.json + posts.json from CMS) → render-site.mjs → `wrangler pages deploy .`.
- **menu.json is NOT overwritten** by the build (only content.json/posts.json are). Side
  slugs were added directly to data/menu.json.
- CMS copy gotcha: homepage/marketing copy lives in D1 `ali-cms` (62538589), site='litzas';
  editing data/content.json alone gets overwritten at build.
- CF auth: X-Auth-Email/X-Auth-Key (global key), never Bearer. Acct 77f3d6611f5ceab7651744268d434342.
- GitHub PAT: CF KV ns 228b8d9d75e8443fa4ad8c5b687913f8 key `github_pat`.
- Commit hygiene: `git checkout -- package.json package-lock.json` before `git add -A` (playwright drift).
- Verify: Playwright from /tmp/litzas, screenshot the LIVE url (file:// won't load /css/).

## Open items (not photo-system)
- Calzone photo (above).
- SpotOn online-ordering link still pending Scott's URL → wire order CTAs.
- New SLC location photo (sign outdated) — needs asset.
- Story PAGE still has "gold lettering on the door" + some "shop"/"pies" in blog bodies — Scott edits in CMS.
