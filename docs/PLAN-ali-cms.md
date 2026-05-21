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

---

## v2 Expansion (2026-05-21, same day) — SHIPPED TO PRODUCTION

Scott asked for: edit more than homepage, visual hierarchy in editor, blog
creation + live blog, Ali's own named login, hours editor with holiday overrides.
Decision: build it all in one go. Done and live.

### Editor (worker ali-cms v2, edit.fosterlabs.org)
- **Visual hierarchy**: fields render by ROLE — headlines in Anton big/bold, eyebrows
  uppercase, buttons as gold pill chips, body normal; colored role badges; each page
  section is a labeled card with emoji + plain-English title ("🍕 Hero — the big top banner").
- **All pages**: 📄 Pages tab with horizontal page chips (Home, Story, …); SECTION_META
  maps key-prefixes to friendly section cards per page.
- **Blog**: ✍️ Blog tab — post list + writer (title, summary, body, category),
  Save draft / Publish, delete. Author = logged-in user's display_name.
- **Hours**: 🕒 Hours tab — per-day open/close inputs with Open/Closed toggle,
  plus "+ Add special day" holiday rows (date + note like "Closed" or "11am-3pm").
- **Login**: named users (users table, salted sha256). Ali = username `ali`,
  display "Ali Foster", role admin. Shared-password fallback retained.

### Store (D1 ali-cms 62538589-78f4-4f31-8d0f-5fdbac4050bb)
- New tables: `users`, `posts`. Hours/holidays ride in `content` as structured
  JSON (type=hours / type=holidays), one row per location.
- Seeded: Home 29 keys, Story 24 keys, Hours 4 (2 locations × hours+holidays),
  1 published post. Ali admin user created.

### Renderer (litzas main)
- Story page wired to `t('storypg.*')`; italics preserved via `emphasize(value,[phrases])`
  for "Fresh Hot Pizza" + "Opportunity Knocks Twice". Story renders byte-identical.
- `hoursFor(locId, fallback)`: builds {days,time} rows from structured store hours,
  collapses consecutive same-time days into ranges (plain hyphen), appends holidays.
  Falls back to locations.json. Wired at locations + homepage.
- Blog: `data/posts.json` (pulled by fetch-content.mjs from /api/posts/litzas).
  blogIndexPage + blogPostPages merge store posts (priority by slug, newest first,
  markdown-lite body) with the 3 hardcoded SEO posts.

### Verified live (litzas.wickowaypoint.com)
- Home/locations hours store-driven & correctly grouped ✓
- Blog index + post page (HTTP 200) show Ali's post ✓
- Story italics intact, byte-identical ✓
- 7/7 contract tests pass ✓

### Ali's login
- URL: https://edit.fosterlabs.org
- Username: `ali`  Password: `litzas1965` (rotate anytime)

### Still open
- Hires renderer not yet wired to store (10 keys seeded, needs t() seam + publish.yml).
- Links/images editing (order URLs, hero photos) — same key/value model, deferred.
- Multi-staff logins (schema supports; needs user-mgmt UI).
