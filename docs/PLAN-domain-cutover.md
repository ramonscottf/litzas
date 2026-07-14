# Litzas Pizza — Domain Cutover (Squarespace → Cloudflare Pages)

**Status:** ✅ **COMPLETE — litzaspizza.com is live on Cloudflare Pages (2026-07-14).**
Remaining: cancel Squarespace (after a live mail check), submit sitemap to GSC, flip SpotOn when ready.
**Domain:** litzaspizza.com · **Registrar:** GoDaddy (NS-only move; no registrar transfer)

---

## THE CONSTRAINT THAT SHAPED EVERYTHING

Litzas' email runs **Proofpoint Essentials → Microsoft 365**, with a Google MX leg.
The Proofpoint contract is a known political landmine (owned by a relative of the GM).
That investigation is **closed and off the table.**

**HARD RULE: never touch, "clean up," or "improve" anything in the mail path.**
MX, SPF, DKIM, DMARC, autodiscover, Lync/SIP, verification TXT — mirror exactly, never
modify. A DNS change that degrades mail flow starts a conversation nobody wants.

There is **no `_dmarc` record** on this domain. That is intentional. Do not add one.

✅ Verified post-cutover: MX 4/4, SPF, DKIM (419 chars), SRV 2/2, and all 8
Microsoft/verification CNAMEs byte-identical to their pre-migration values.

---

## PHASE 1 — NAMESERVER MIGRATION ✅ (2026-07-13)

Strategy: **decouple the NS move from the site cutover.** Mirror the GoDaddy zone
byte-for-byte into Cloudflare (Squarespace A records and all), flip NS, verify nothing
changed. The site cutover then became a separate, instantly-revertible DNS edit.

1. Inventoried all 28 GoDaddy records.
2. Pulled **exact authoritative values** via DNS query rather than OCR from screenshots
   (the DKIM key is a split base64 TXT — one wrong character silently breaks mail signing).
3. Created 25 records in CF zone `d5ea12b4f3b5b382d71acfd86ce8e60b` (28 − 2 NS − 1 SOA).
4. **Diff-verified** Cloudflare's nameservers against GoDaddy's, record by record. Exact
   match on all 15 groups including DKIM.
5. NS flipped at GoDaddy → `oaklyn.ns.cloudflare.com`, `wesley.ns.cloudflare.com`.

**Why GoDaddy's zone was left fully intact:** during the 6-hour registry delegation TTL,
recursors still on the old delegation kept resolving via GoDaddy. Because that zone still
held the Squarespace A records, those users saw the *old, working* site rather than
NXDOMAIN. Graceful rollout, zero outage — and it remains the rollback target.

---

## PHASE 2 — SITE CUTOVER ✅ (2026-07-14)

### ⚠️ CORRECTION to the Phase-1 writeup
Phase 1 claimed the Pages project was "not GitHub-connected / manual wrangler deploys"
because the CF API reports `source: null`. **That was wrong.** `source: null` only means it
isn't using Cloudflare's *native* Git integration. The repo has its own pipeline:

`.github/workflows/publish.yml` → push to `main` → `fetch-content.mjs` (pull CMS from
`cms.wickowaypoint.com`) → `render-site.mjs` → `wrangler pages deploy`.

Push-to-deploy works and has for months (verified: every commit has a matching successful
run + production deployment). It's *better* than native Git integration here, because the
CMS fetch must run before the render. **Do not "reconnect" it.**

### 2a. Order box + popup → call-to-order ✅
SpotOn ordering is **not live**. The FAB previously said "Order Now," opened a modal, and
offered two **disabled** buttons — a dead end on a restaurant's front door.

- Order picker: heading → "Call to Order"; each location is a tap-to-call `tel:` link
  (SLC **801-359-5352**, Midvale **801-561-2171**) + "Online ordering is coming soon."
- Locations page: dead "Coming soon" button → "Call to Order" `tel:` link.
- **Box art / FAB animation untouched.**
- The live SpotOn branch is untouched and takes over **automatically**: set
  `data/order-links.json` → `"enabled": true` + paste the two `orderUrl`s, push. That
  restores "Order Online", the open/closed logic in `js/main.js`, and the picker heading.
  No code change required.

### 2b. SEO / cutover correctness ✅
The site was about to answer on **three** hosts (`litzaspizza.com`,
`litzas.wickowaypoint.com`, `litzas.pages.dev`) with identical content and no canonical.

- `<link rel="canonical">` + `og:url` on all 24 pages → `https://www.litzaspizza.com`.
  Injected at the single write-loop choke point (with a `</head>`-uniqueness assertion)
  rather than threading a `path` through 24 `layout()` call sites.
- **www stays canonical.** Every indexed Squarespace URL is `www.litzaspizza.com/*` and
  Squarespace already 301'd apex → www. Changing the canonical host at cutover would have
  thrown away the exact thing being protected.
- `og:image` made absolute (a relative `og:image` is invalid and was being ignored).
- `sitemap.xml` is now **generated** from the real page list. The committed one had gone
  stale *and* pointed at the dev domain. `robots.txt` sitemap line fixed likewise.
- **`404.html` added (noindex).** Pages had no 404, so it fell back to `index.html` with a
  **200 for every unmatched path** — `/home`, `/garbage`, anything. That would have turned
  every legacy Squarespace URL into a soft-404 duplicate homepage and silently defeated the
  entire redirect map. Sharpest hidden edge in the whole cutover.
- Fixed a pre-existing red test: the image-existence check didn't strip cache-buster query
  strings, so it looked for a file literally named `box-closed.png?v=1`. Red since the box
  art shipped. **7/7 green** — a permanently-red test is one nobody believes when it goes
  red for real.

### 2c. Redirect map ✅ (`_redirects`)
From the live Squarespace sitemap. All verified 301 in production:

| Old (Squarespace) | New |
|---|---|
| `/home`, `/order`, `/order-1` | `/` |
| `/salt-lake-city`, `/midvale` | `/locations/` |
| `/blog/looking-for-pizza-in-salt-lake-city-…` | `/blog/best-pizza-salt-lake-city/` |
| `/blog/what-keeps-a-pizza-place-busy-for-60-years-…` | `/story/` |

`/menu`, `/locations`, `/blog` deliberately **not** listed — Pages already 308s those to
their trailing-slash form (verified), so rules would only duplicate it.

### 2d–2e. Domains + DNS flip ✅
- Added `litzaspizza.com` + `www.litzaspizza.com` to CF Pages project `litzas`.
- Deleted the 4 Squarespace apex `A` records; apex + `www` → `CNAME litzas.pages.dev`,
  **proxied**. A programmatic guard fingerprinted all 20 non-web records before/after and
  confirmed zero drift.
- Zone-level **Single Redirect**: `http.host eq "litzaspizza.com"` → 301
  `https://www.litzaspizza.com` + path, query preserved.
- **Note:** the apex Pages custom domain stays `pending` **by design** — the redirect rule
  fires before Pages, so Pages' validation probe gets a 301 and never validates. The apex
  works correctly (301 → www). Do not "fix" this by deleting the redirect rule.
- Universal SSL active for `litzaspizza.com` + `*.litzaspizza.com` before the flip.

### 2f. Verified in production ✅
apex 301→www · www 200 · all 8 pages 200 · all 7 legacy redirects 301 · `/garbage` → **404**
· canonical → www.litzaspizza.com · sitemap 24 urls, 0 dev-domain leaks · popup shows "Call
to Order" + both `tel:` links + box art intact · **mail path byte-identical** · all four
public resolvers (Google/Cloudflare/Quad9/OpenDNS) converged.

---

## STILL OPEN

1. **🔑 Rotate the GitHub PAT** — printed in cleartext in chat during this session (a
   `git remote -v` that included the embedded token). Revoke on GitHub, regenerate, update
   `SKIPPY_KV` key `github_pat` (namespace `228b8d9d75e8443fa4ad8c5b687913f8`).
2. **Send + receive a test email** on a `@litzaspizza.com` address, both directions. DNS
   says the mail path is untouched, but a live round-trip is the only real proof.
3. **Google Search Console** — submit `https://www.litzaspizza.com/sitemap.xml`. The
   `google-site-verification` TXT records were preserved, so the property should still verify.
4. **Cancel Squarespace** — only after (2) passes. Then `www` → `ext-sq.squarespace.com` and
   `a3t6e8apb29fg3h6t4wf` → `verify.squarespace.com` can be dropped.
5. **SpotOn** — when Ali finishes setup: `order-links.json` → `enabled: true` + the two URLs,
   push. Everything flips automatically.

## ROLLBACK
Delete the 2 CNAMEs, re-add the 4 A records — `198.185.159.144`, `198.185.159.145`,
`198.49.23.144`, `198.49.23.145` (TTL 600) — and set `www` → `ext-sq.squarespace.com`. Back
on Squarespace within one TTL. GoDaddy's zone is still fully intact as a second net.

## KEY IDS
- CF zone `litzaspizza.com`: `d5ea12b4f3b5b382d71acfd86ce8e60b`
- CF Pages project: `litzas` (`litzas.pages.dev`) · Repo: `ramonscottf/litzas`
- CMS D1: `ali-cms` `62538589-78f4-4f31-8d0f-5fdbac4050bb`, table `content`, `site='litzas'`
  — **copy edits go here, NOT `data/content.json`** (the build re-fetches and overwrites it)
- NS: `oaklyn.ns.cloudflare.com`, `wesley.ns.cloudflare.com`
- Phones: SLC **801-359-5352** · Midvale **801-561-2171**
