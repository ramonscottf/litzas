# Litzas Pizza

Family-owned since 1965. Salt Lake City and Midvale. Same family that runs Hires Big H.

- Production: `https://www.litzaspizza.com` (not yet attached)
- Preview: `https://preview.litzas.pages.dev`
- Pages project: `litzas` (Cloudflare)
- Latest review URL: `https://codex-creative-overhaul-2026.litzas.pages.dev`

---

## What this site is

A static, Cloudflare Pages-ready heritage site for Litzas Pizza. Single source
of truth: every public page is rendered from `scripts/render-site.mjs` against
the JSON data in `data/`. No CMS. No runtime backend on Litzas itself — the
jobs and catering forms post to the Hires Big H Launch Control backend (same
company, same inbox), and the response is brand-tagged so Ali can sort by
brand in the dashboard.

### Brand system (locked)

- **Palette:** `#ae9860` gold, warm black (`#0a0908`), warm off-white (`#f4ede0`).
  That is the entire color system. Everything else is glass, shadow, and depth
  built on those three.
- **Type:** Anton (LITZAS display), Alfa Slab One (PIZZA slab), Oswald (labels,
  eyebrows, marquees), Inter (body, blog reading).
- **Nav:** Floating pill, brand-continuous with Hires Big H.
- **Motion rule:** No entrance animations on hero sections. Functional micro-
  motion only (scroll-hint bounce, nav state shift, hover transitions).

### Pages

```
index.html                         homepage
menu/index.html                    structured full menu
locations/index.html               cards + cinematic Google Maps embeds
                                   + iOS/Android native-app deep links
story/index.html                   Don Hale, the Hale family, 60 years of pizza
shop/index.html                    root-beer-extract bridge to Hires
blog/index.html                    Stories from the Booth (3 posts)
blog/why-litzas-is-named-with-a-z/
blog/best-pizza-salt-lake-city/
blog/midvale-family-pizza/
catering/index.html                form POSTs hiresbigh.com/api/catering?brand=litzas
jobs/index.html                    form POSTs hiresbigh.com/api/jobs?brand=litzas
```

### Data

```
data/menu.json                     menu source (23 named pizzas + sides)
data/locations.json                addresses, hours, phones, lat/lng
data/order-links.json              SpotOn URLs (final values pending)
data/menu-photo-manifest.json      pizza photo queue + SpotOn export metadata
data/shop-links.json               root beer + merch links
data/site-assets.json              hero image assignments per page
```

### Assets

```
assets/images/optimized/           page heroes + supporting photography
assets/images/menu/pizzas/         slug-named menu photo slots
downloads/litzas-spoton-menu-photos.zip  current SpotOn photo pack
```

---

## Forms wired to Hires backend

The jobs and catering forms point at the existing Hires Big H Launch Control
API. Both forms send `brand=litzas` so the same dashboard at
`hiresbigh.com/dashboard/` can show Litzas applications/inquiries alongside
Hires ones, sorted by brand.

```html
<form action="https://hiresbigh.com/api/jobs"      data-brand="litzas" ...>
<form action="https://hiresbigh.com/api/catering"  data-brand="litzas" ...>
```

**Hires backend changes are NOT yet shipped.** The forms will return 500 on
submit until `functions/api/jobs/index.js` and `functions/api/catering/index.js`
in the `hiresbigh` repo are updated to:

1. Accept `brand` from form data (default `'hires'`)
2. Add `brand` column to the D1 tables (`ALTER TABLE ... ADD COLUMN brand TEXT DEFAULT 'hires'`)
3. Render a Litzas-branded HTML email template when `brand === 'litzas'`
4. Tag the dashboard cards with the brand

The diff for the Hires backend changes is a planned next step. Scott wants to
review it before it's pushed. See `docs/PLAN-litzas-heritage-build.md`.

---

## Deploying — READ THIS

**Merging to `main` does NOT publish the site.** Production only updates when the
**Publish Site Content** GitHub Action (`.github/workflows/publish.yml`) is run
manually (`workflow_dispatch`). It fetches the latest content, re-renders, and
deploys via wrangler to the `litzas` Pages project.

- **Preview** (`target=preview`) → `ali-preview` branch → https://ali-preview.litzas.pages.dev
- **Production** (`target=production`) → `main` branch → https://litzas.wickowaypoint.com

> History note: the June 9–10 menu pass (24 pizzas, dressings, drinks, corrected
> prices) sat correct on `main` for two weeks while production served a stale
> build, because nobody fired the production deploy after merge. If the live
> site looks behind the repo, **the deploy is the first thing to check.**

Trigger from a shell with the GitHub API (PAT in CF KV `github_pat`):

```bash
# production:
curl -X POST -H "Authorization: token $PAT" -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/ramonscottf/litzas/actions/workflows/281119920/dispatches \
  -d '{"ref":"main","inputs":{"target":"production"}}'
```

### Menu photos toggle

Pizza photos are **off** (`SHOW_MENU_PHOTOS = false` in `scripts/render-site.mjs`)
until Litzas' real food photography lands — the menu renders as clean numbered
text cards. To restore: flip the flag to `true` **and** mark real photos
`approvalStatus !== 'needs-generation'` in `data/menu-photo-manifest.json`.

## Commands

```bash
# Re-render all pages from render-site.mjs (single source of truth)
node scripts/render-site.mjs

# Run the contract tests
npm test

# Run the page sanity check (8 pages)
npm run check

# Local preview server
python3 -m http.server 4173

# Visual smoke (writes screenshots to downloads/visual-smoke/)
npm run visual:smoke
```

---

## Maps + deep links

The locations page uses Google Maps embed iframes for the cinematic in-page
view. The "Directions" button uses `data-maps` / `data-lat` / `data-lng`
attributes that `js/main.js` rewrites at runtime:

- iOS  → `maps://?q=...&ll=lat,lng`  (opens Apple Maps native app)
- Android → `geo:lat,lng?q=lat,lng(label)`  (opens default maps app)
- Desktop → `https://www.google.com/maps/search/?api=1&query=...`

One tap on mobile launches the user's native maps app. No keys, no embed quota.

---

## Cloudflare review deploy

Production stays untouched until Scott approves. To publish a new preview:

```bash
rm -rf .deploy && mkdir -p .deploy/review/downloads
rsync -a index.html css js assets data menu locations shop story blog jobs catering .deploy/review/
cp downloads/litzas-spoton-menu-photos.zip .deploy/review/downloads/
npx wrangler pages deploy .deploy/review --project-name litzas --branch <review-branch-name>
```

---

## SpotOn order links

SpotOn is intentionally pending. When final URLs arrive, edit only
`data/order-links.json`, then:

```bash
node scripts/render-site.mjs
npm test
```

---

## Menu photos

The manifest covers the 23 unique named pizzas. Current files are slug-named
and packaged for SpotOn, but most are marked `needs-generation`. **Do not send
the current zip to SpotOn as final photography until every manifest entry is
approved.**

Pilot generation command (after OpenAI billing is cleared):

```bash
node scripts/generate-menu-photos.mjs --all --only=pepperoni,western-bbq,vegetarian
```

Full missing-photo generation:

```bash
node scripts/generate-menu-photos.mjs
node scripts/package-spoton-photos.mjs
```

The first API generation attempt on 2026-05-17 hit `billing_hard_limit_reached`
on the connected OpenAI account. Rerun when billing is cleared.

### Photo approval flow

1. Replace or approve real pizza photos in `assets/images/menu/pizzas/`.
2. Update `data/menu-photo-manifest.json` from `needs-generation` to
   `approved-existing` or `approved-generated`.
3. Run `node scripts/render-site.mjs`.
4. Run `node scripts/package-spoton-photos.mjs`.
5. Verify with `npm test`, `npm run check`, and `npm run visual:smoke`.

The public menu intentionally renders text-first cards for pizzas that still
need approved photos.

---

## Source rescue history — 2026-05-17

This branch (`rescue/from-preview-2026-05-17`) originally captured a bundle
that was live on Cloudflare Pages but had no git home. See
`docs/PLAN-source-rescue.md` for the original rescue notes.

The branch has since been expanded into the heritage build documented above
and in `docs/PLAN-litzas-heritage-build.md`.

### Project metadata

- Cloudflare account: `77f3d6611f5ceab7651744268d434342`
- Pages project: `litzas`, subdomain `litzas.pages.dev`
- R2 bucket (assets): `pub-8c4898b448c84fa9a36cf230c13c60e3.r2.dev`
- Phone (SLC): 801·359·5352  ·  716 East 400 South, SLC 84102
- Phone (Midvale): 801·561·2171  ·  835 East Fort Union Blvd, Midvale 84047

---

## Family

Litzas and Hires Big H are the same company. Don Hale opened Hires in 1959,
then went looking for a great pizza, and opened Litzas in 1965. The Midvale
locations share a building. The Salt Lake locations share a parking lot.
The Hires kinship is real, not aesthetic.
