# Litzas Pizza — Domain Cutover (Squarespace → Cloudflare Pages)

**Status:** Phase 1 COMPLETE (NS migrated). Phase 2 PENDING (site cutover).
**Date:** 2026-07-13
**Domain:** litzaspizza.com
**Registrar:** GoDaddy (stays at GoDaddy — NS-only move, no registrar transfer)

---

## THE CONSTRAINT THAT SHAPES EVERYTHING

Litzas' email runs **Proofpoint Essentials → Microsoft 365**, with a Google MX leg.
The Proofpoint contract is a known political landmine (owned by a relative of the GM).
That investigation is **closed and off the table.**

**HARD RULE: do not touch, "clean up," or "improve" anything in the mail path.**
MX, SPF, DKIM, DMARC, autodiscover, Lync/SIP, verification TXT records —
mirror exactly, never modify. A DNS change that degrades mail flow starts a
conversation nobody wants to have.

There is **no `_dmarc` record** on this domain. That is intentional. Do not add one.

---

## PHASE 1 — NAMESERVER MIGRATION ✅ COMPLETE (2026-07-13)

Strategy: **decouple the NS move from the site cutover.** Mirror the GoDaddy zone
byte-for-byte into Cloudflare (Squarespace A records and all), flip NS, verify nothing
changed. The site cutover then becomes a separate, instantly-revertible DNS edit.

### What was done
1. Inventoried all 28 GoDaddy records (screenshots from GoDaddy DNS panel).
2. Pulled **exact authoritative values** via DNS query rather than trusting OCR
   (the DKIM public key is a split base64 TXT — one wrong character silently breaks
   outbound mail signing).
3. Created 25 records in Cloudflare zone `d5ea12b4f3b5b382d71acfd86ce8e60b`
   (28 minus 2× NS and 1× SOA, which Cloudflare owns).
4. **Verified by diffing** Cloudflare's nameservers against GoDaddy's, record by record.
   Result: exact match on all 15 record groups including DKIM.
5. Scott changed NS at GoDaddy → `oaklyn.ns.cloudflare.com`, `wesley.ns.cloudflare.com`.
6. Confirmed registry delegation + identical resolution across Google / Cloudflare /
   Quad9 / OpenDNS.

### Zone contents (25 records, all DNS-only / grey cloud)
| Type | Count | Notes |
|---|---|---|
| A (@) | 4 | 198.185.159.144/.145, 198.49.23.144/.145 → **Squarespace** (Phase 2 replaces these) |
| CNAME | 9 | `www`→ext-sq.squarespace.com · `autodiscover`, `enterpriseenrollment`, `enterpriseregistration`, `lyncdiscover`, `sip` → Microsoft · `a3t6e8apb29fg3h6t4wf`→verify.squarespace.com · `_domainconnect` (GoDaddy legacy) · `_fa1e90…`→comodoca.com (Sectigo cert validation) |
| MX | 4 | mx1/mx2-us1.ppe-hosted.com (10/20) · alt1.aspmx.l.google.com (120) · litzaspizza-com.mail.protection.outlook.com (160) — **DO NOT TOUCH** |
| TXT | 6 | SPF · PPE verify · MS verifydomain · 2× google-site-verification · **DKIM** `selector-1641859227._domainkey` — **DO NOT TOUCH** |
| SRV | 2 | `_sip._tls`, `_sipfederationtls._tcp` → Lync/Teams |

### Rollback (Phase 1)
Set GoDaddy NS back to `ns39.domaincontrol.com` / `ns40.domaincontrol.com`.
**The GoDaddy zone was never deleted** — it remains fully intact as a rollback target.

---

## PHASE 2 — SITE CUTOVER (PENDING)

The site currently at `litzas.wickowaypoint.com` has been a **dev/preview** site.
Phase 2 promotes it to the real customer-facing domain. Do these in order:

### 2a. Reconnect the Pages project to GitHub ⚠️
CF Pages project `litzas` currently has `source: null` — it is **NOT** GitHub-connected.
Last deploy was a manual `wrangler` push with `commit_dirty: true` (2026-07-10).
Do not let a live restaurant's front door depend on whatever was on the laptop that day.
Reconnect to `ramonscottf/litzas`, production branch `main`.

### 2b. Content pass — THIS IS THE REAL WORK
It was a preview site; now it's the business. Verify against the actual restaurant:
- Hours (incl. holiday hours)
- Full menu + current prices
- Phone number, address(es)
- Online ordering links / third-party ordering integrations
- Anything the Squarespace site does that the new site doesn't

**Copy edits go in D1/CMS** (`ali-cms`, D1 `62538589-78f4-4f31-8d0f-5fdbac4050bb`,
table `content`, `site='litzas'`) — **NOT** `data/content.json`, which the build
re-fetches and overwrites.

Note: Litzas uses the **legacy templated-render-at-build** CMS architecture
(vs. Hires' edge-injection HTMLRewriter model, which is the go-forward product).

### 2c. Redirect map
The Squarespace site ranks — title tag is
*"Best Pizza in Salt Lake City & Midvale | Litzas Pizza"*.
Crawl/export the Squarespace URL list and build 301s for every old path.
Do not throw the SEO away.

### 2d. Add custom domains to Pages
Add `litzaspizza.com` and `www.litzaspizza.com` to CF Pages project `litzas`
(currently only `litzas.pages.dev` + `litzas.wickowaypoint.com`).

### 2e. Flip the web records (the actual cutover — ~30 seconds)
In CF zone `d5ea12b4f3b5b382d71acfd86ce8e60b`:
- **Delete** the 4 apex `A` records (Squarespace)
- **Add** `CNAME @ → litzas.pages.dev`, proxied (CF flattens the apex)
- **Change** `CNAME www → litzas.pages.dev`, proxied

**Touch nothing else.** MX/TXT/SRV/autodiscover stay exactly as they are.

**Rollback (Phase 2e):** delete the 2 CNAMEs, re-add the 4 A records:
`198.185.159.144`, `198.185.159.145`, `198.49.23.144`, `198.49.23.145` (TTL 600),
and restore `www` → `ext-sq.squarespace.com`. Back on Squarespace in one TTL.

### 2f. Post-cutover verification
- Site loads on apex + www, valid cert
- **Send AND receive a test email** on a @litzaspizza.com address (both directions)
- Spot-check redirects from the old Squarespace paths
- Google Search Console: confirm the property still verifies (the
  `google-site-verification` TXT records were preserved, so it should)

### 2g. Only then — cancel Squarespace
Not before 2f passes. The `a3t6e8apb29fg3h6t4wf` → `verify.squarespace.com` CNAME
and `www` → `ext-sq.squarespace.com` can be removed at that point.

---

## KEY IDS
- CF zone `litzaspizza.com`: `d5ea12b4f3b5b382d71acfd86ce8e60b`
- CF Pages project: `litzas` (`litzas.pages.dev`)
- Repo: `ramonscottf/litzas`
- CMS D1: `ali-cms` `62538589-78f4-4f31-8d0f-5fdbac4050bb`, table `content`, `site='litzas'`
- Assigned NS: `oaklyn.ns.cloudflare.com`, `wesley.ns.cloudflare.com`
- GoDaddy account: MH (Scott has access)
