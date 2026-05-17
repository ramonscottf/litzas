# Litzas Pizza

Website for Litzas Pizza — Salt Lake City and Midvale. A Utah classic since 1965.

Production: https://www.litzaspizza.com (not yet attached)
Preview:    https://preview.litzas.pages.dev
Pages project: `litzas` (Cloudflare)

---

## Source rescue — 2026-05-17

This repo was sitting empty (only the Skippy-Capture workflow) while a fully
designed v2 preview was live on Cloudflare Pages, deployed via direct upload
from a Claude Code session (`claude/migrate-litzas-pizza-ykXcE` branch, never
pushed). Source had no git home — a power-out on the build machine would have
taken the site with it.

This branch (`rescue/from-preview-2026-05-17`) captures the deployed bundle:

```
index.html              homepage (single page currently real)
css/style.css           Brand v2 — Black / Bone / Gold, no red
                        Oswald (display) + Inter Tight (body) + Fraunces (editorial)
js/main.js              interactions + easter eggs
_r2-snapshot/litzas-v2/ local backup of R2 assets referenced by the page
```

The `_r2-snapshot/` folder is **not served** — it's a backup so the rescue is
self-contained if the R2 bucket ever goes away. Live assets continue to be
served from `pub-8c4898b448c84fa9a36cf230c13c60e3.r2.dev/litzas-v2/` per the
HTML markup.

### What's NOT here yet

The nav links `/menu/`, `/locations/`, `/order/`, `/blog/` resolve to the
homepage on the live preview (SPA fallback). Those pages are unbuilt stubs.

If the original session produced source files using a build tool (Astro,
Eleventy, etc.) that source is on whatever machine ran the Claude Code session
and is not captured here. This rescue is the **output bundle only**.

### Next steps after this branch merges

1. Wire Pages project `litzas` to this GitHub repo (currently direct-upload)
2. Decide whether to localize R2 assets into `/assets/` or keep R2 references
3. Build out `/menu/`, `/locations/`, `/order/`, `/blog/` (or remove from nav)
4. Attach `litzaspizza.com` custom domain

### Project metadata

- Cloudflare account: `77f3d6611f5ceab7651744268d434342`
- Pages project: `litzas`, subdomain `litzas.pages.dev`
- R2 bucket (assets): `pub-8c4898b448c84fa9a36cf230c13c60e3.r2.dev`, path prefix `litzas-v2/`
- Phone (SLC): 801·359·5352
- Phone (Midvale): 801·561·2171
