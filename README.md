# Litzas Pizza

Website for Litzas Pizza — Salt Lake City and Midvale. A Utah classic since 1965.

Production: https://www.litzaspizza.com (not yet attached)
Preview:    https://preview.litzas.pages.dev
Pages project: `litzas` (Cloudflare)
Latest review: https://codex-creative-overhaul-2026.litzas.pages.dev

---

## Heritage site build — 2026-05-17

This branch now contains a static Cloudflare Pages-ready refresh:

```
index.html                         homepage
menu/index.html                    structured full menu
locations/index.html               location cards + SpotOn-ready buttons
story/index.html                   Litzas / Hires / old-Utah story page
shop/index.html                    Litzas-branded Hires Big H root beer bridge
data/menu.json                     menu source data captured from litzaspizza.com/menu
data/locations.json                location details
data/order-links.json              final SpotOn URLs go here
data/menu-photo-manifest.json      pizza photo queue + SpotOn export metadata
assets/images/optimized/           optimized site photography
assets/images/menu/pizzas/         slug-named menu photo slots
downloads/litzas-spoton-menu-photos.zip  current SpotOn photo pack
```

The latest handoff notes are in `docs/HANDOFF-2026-05-17.md`.

No runtime backend, CMS, or production build command is required. The HTML is
committed and can be served directly by Cloudflare Pages. Development scripts
exist only to re-render pages, validate the contract, regenerate menu photos,
and rebuild the SpotOn photo pack.

### Commands

```
npm test
npm run check
node scripts/render-site.mjs
node scripts/package-spoton-photos.mjs
python3 -m http.server 4173
```

### Local review loop

```
node scripts/render-site.mjs
npm test
npm run check
python3 -m http.server 4173
npm run visual:smoke
```

Visual smoke screenshots are written to `downloads/visual-smoke/` and ignored
by git.

### Cloudflare review deploy

Production should stay untouched until Scott approves the review. To deploy a
new preview alias:

```
rm -rf .deploy && mkdir -p .deploy/review/downloads
rsync -a index.html css js assets data menu locations shop story .deploy/review/
cp downloads/litzas-spoton-menu-photos.zip .deploy/review/downloads/
npx wrangler pages deploy .deploy/review --project-name litzas --branch <review-branch-name>
```

### SpotOn order links

SpotOn is intentionally pending. When final URLs arrive, edit only
`data/order-links.json`, then run:

```
node scripts/render-site.mjs
npm test
```

### Menu photos

The menu-photo manifest covers the 23 unique named pizzas from the public
Litzas menu. Current files are slug-named and packaged for SpotOn, but most are
marked `needs-generation` until the final generated/approved set replaces them.
Do not send the current zip to SpotOn as final photography until every manifest
entry is approved.

Pilot generation command:

```
node scripts/generate-menu-photos.mjs --all --only=pepperoni,western-bbq,vegetarian
```

Full missing-photo generation command:

```
node scripts/generate-menu-photos.mjs
node scripts/package-spoton-photos.mjs
```

The first API generation attempt on 2026-05-17 was blocked by the connected
OpenAI account with `billing_hard_limit_reached`, before any pilot image was
returned. Once billing is cleared, rerun the pilot command above.

### Next photo pass

Start with the manifest, not the rendered cards:

1. Replace or approve real pizza photos in `assets/images/menu/pizzas/`.
2. Update `data/menu-photo-manifest.json` from `needs-generation` to
   `approved-existing` or `approved-generated`.
3. Run `node scripts/render-site.mjs`.
4. Run `node scripts/package-spoton-photos.mjs`.
5. Verify with `npm test`, `npm run check`, and `npm run visual:smoke`.

The public menu intentionally renders text-first cards for pizzas that still
need approved photos, so customers do not see repeated or misleading images.

---

## Source rescue — 2026-05-17

This repo was sitting empty (only the Skippy-Capture workflow) while a fully
designed v2 preview was live on Cloudflare Pages, deployed via direct upload
from a Claude Code session (`claude/migrate-litzas-pizza-ykXcE` branch, never
pushed). Source had no git home — a power-out on the build machine would have
taken the site with it.

This branch (`rescue/from-preview-2026-05-17`) originally captured the deployed bundle:

```
index.html              homepage (single page currently real)
css/style.css           Brand v2 — Black / Bone / Gold, no red
                        Oswald (display) + Inter Tight (body) + Fraunces (editorial)
js/main.js              interactions
_r2-snapshot/litzas-v2/ local backup of R2 assets referenced by the page
```

The `_r2-snapshot/` folder is a backup so the rescue is self-contained if the
R2 bucket ever goes away. The refreshed site now serves optimized local copies
from `assets/images/optimized/` and is ready for an R2 upload prefix such as
`litzas-v3/`.

### Project metadata

- Cloudflare account: `77f3d6611f5ceab7651744268d434342`
- Pages project: `litzas`, subdomain `litzas.pages.dev`
- R2 bucket (assets): `pub-8c4898b448c84fa9a36cf230c13c60e3.r2.dev`, path prefix `litzas-v2/`
- Phone (SLC): 801·359·5352
- Phone (Midvale): 801·561·2171
