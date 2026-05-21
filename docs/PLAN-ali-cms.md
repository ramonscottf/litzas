---
title: Foster Content Store (Ali CMS) — editable site text across all properties
date: 2026-05-21
status: PILOT LIVE (Litzas homepage); rollout pending
owner: Scott + Skippy
supersedes: orphaned ali-cms attempt (pre-2026-05, never shipped an editor)
---

# Foster Content Store ("Ali CMS")

## Problem
Ali needs to edit website text herself, across multiple sites (Litzas, Hires,
future). Not a page builder — just text (and later: links, images). A prior
attempt built a D1 schema + seeded Hires copy but never shipped an editor; it
got demoted to _backup tables and was never written down. Scott: "we started
and it was not working well. so we stopped."

## Architecture (Cloudflare-native)
- **Store:** D1 `ali-cms` (62538589-78f4-4f31-8d0f-5fdbac4050bb), table `content`
  `(site,key,value,type,label,hint,page,sort,updated_at,updated_by)`,
  PK `(site,key)`. Plus `content_history` (full audit/undo trail).
- **Editor + API:** Worker `ali-cms` at **edit.fosterlabs.org**.
  - `GET  /api/content/:site`  → flat `{key:value}` JSON (public, build-time read)
  - `POST /auth`              → password (EDITOR_PASSWORD secret) → signed cookie
  - `GET  /api/admin/:site`   → full rows (authed)
  - `POST /api/admin/:site`   → save changes + history (authed)
  - `POST /api/publish/:site` → fire GitHub Actions publish.yml (authed)
  - `/` → mobile-first editor UI (login → pick site → edit fields → Save → Publish)
  - secrets: EDITOR_PASSWORD, GITHUB_PAT
- **Renderer seam:** each site's render-site.mjs imports `data/content.json` and
  uses `t(key, fallback)`. `scripts/fetch-content.mjs` pulls live content at
  build; falls back to committed content.json if store is down (site never breaks).
  `tc()` helper encodes typographic chars so output is byte-identical to prior HTML.
- **Publish flow:** `.github/workflows/publish.yml` (workflow_dispatch). Default
  target=preview → deploys to `ali-preview` branch (preview URL for Scott to
  approve). target=production → deploys to `main`. Repo secret CF_PAGES_TOKEN
  (scoped Pages-write token minted 2026-05-21).

## Pilot status (Litzas) — LIVE
- Wired into the LIVE branch **main** (NOT the stale rescue/from-preview branch —
  see drift note below). 29 homepage keys seeded from main's actual copy.
- Render verified byte-for-byte identical to live main homepage.
- All 7 site-contract tests pass.
- Full loop proven: edit in store → render → HTML changes → publish dispatch →
  ali-preview deploy succeeded (https://<hash>.litzas.pages.dev).
- Hires: 10 copy blocks migrated from the old backup into the store, NOT yet
  wired into the hiresbigh renderer.

## Drift caught this session
- May 17 handoff doc (docs/HANDOFF-2026-05-17.md) advertised
  `rescue/from-preview-2026-05-17` as "the approved source." FALSE as of today:
  the LIVE site deploys from `main`, which got a homepage copy rewrite on May 18
  ("Salt Lake's pizza joint") that the rescue branch never had. Nearly built the
  seam against the wrong (unread, stale) branch. Fixed the handoff doc.

## Next
1. Scott approves ali-preview → promote to production (publish target=production,
   or just merge already-on-main + deploy main).
2. Roll the same seam into hiresbigh renderer using the 10 already-seeded keys.
3. Extend to links (SpotOn order URLs, Amazon root beer) + images — same key/value
   model, type='url'/'image'. No redesign needed.
4. Attach litzaspizza.com to the litzas Pages project (still not attached per
   May 17 handoff).

## Reference
- Editor password: stored as EDITOR_PASSWORD secret on ali-cms worker (rotate via
  `wrangler secret put`). Not in this doc.
- Worker repo: needs a home repo (currently deployed from /home build; SHOULD be
  committed to a ramonscottf/ali-cms repo to avoid drift — TODO).
