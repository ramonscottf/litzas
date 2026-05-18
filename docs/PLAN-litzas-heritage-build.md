---
slug: litzas-heritage-build
status: ⏳ frontend complete, backend pending
owner: Scott
started: 2026-05-17
parent: 2026-05-17-litzas-source-rescue
---

# Litzas Heritage Build — 2026-05-17

Companion plan to the rescue branch `rescue/from-preview-2026-05-17`. Mirrored to
`ramonscottf/skippy-plans/plans/2026-05-17-litzas-heritage-build.md` per the
build-plan persistence rule.

## What this expands

The original rescue (`docs/PLAN-source-rescue.md`) captured the deployed v2
bundle to git. This plan covers the heritage rebuild that followed: a full
multi-page Litzas site with locked brand, real Don Hale story, blog,
catering form, jobs application, and cinematic maps.

## Status snapshot

| Phase | State | Notes |
|---|---|---|
| 1. Foundation (CSS, fonts, nav, render-site.mjs) | ✅ Code shipped | 11 pages render. 7/7 tests pass. 8/8 page sanity passes. |
| 2. Story rewrite | ✅ Code shipped | Real Don Hale origin. Pizza road trips. "Name with a z." |
| 3. New pages (blog, jobs, catering) | ✅ Code shipped | Blog index + 3 posts. Forms point at Hires backend. |
| 4. Maps + native deep links | ✅ Code shipped | Embed iframes + iOS/Android/desktop URL handlers. |
| 5. Hires backend (brand=litzas) | ⏳ NOT started | Diff to be written + reviewed by Scott before push. |
| 6. End-to-end test (form submit → email arrives → dashboard shows) | ⏳ Blocked on Phase 5 | |
| 7. Production promotion | ⏳ Blocked on Phase 6 | Still on `rescue/from-preview-2026-05-17`. Codex preview alias is live. |

## Locked decisions

### Brand system

- **Palette:** `#ae9860` gold + warm black (`#0a0908`) + warm off-white (`#f4ede0`). Nothing else.
- **Type:** Anton (display) + Alfa Slab One (slab) + Oswald (labels) + Inter (body). All from Google Fonts CDN.
- **Nav:** Floating pill, brand-continuous with `hiresbigh.com`. `position: fixed`, `top: 20px`, `backdrop-filter: blur(22px)`, `border-radius: 999px`.
- **No entrance animations on hero sections.** This is a long-standing Scott rule.
- **Hero image per page:** assigned in `data/site-assets.json`.

### Don Hale origin (canonical, do not erase)

Don Hale founded Hires Big H in 1959 and Litzas Pizza in 1965. He loved pizza.
He packed his kids in the car and drove around Utah and neighboring states
trying pizzas, gathering recipes for pizza/spaghetti/salad dressing/garlic
bread. He wanted a name with a `z` because he thought "z" sounded solid.

Same family runs both brands today. Midvale Litzas shares a building with
Midvale Hires. Salt Lake Litzas shares a parking lot with Salt Lake Hires.

There is a book: **"Opportunity Knocks Twice"** by Don Hale & Mark Hale.

### Locations (current truth)

- **Salt Lake City:** 716 E 400 S, SLC, UT 84102 · 801-359-5352 · 40.76078, -111.86432
- **Midvale:** 835 E Fort Union Blvd, Midvale, UT 84047 · 801-561-2171 · 40.62462, -111.87336
- **West Valley:** CLOSED. Do not include anywhere.
- **Daybreak:** Hires-only. Do not include on Litzas.

### Forms wired through Hires backend

```
Litzas /jobs    → POST https://hiresbigh.com/api/jobs       brand=litzas
Litzas /catering → POST https://hiresbigh.com/api/catering   brand=litzas
```

Same recipient (Ali's inbox). Same D1 dashboard. Brand-tagged so Ali can
filter. Scott's call: "they are one company. it just want the front end to
look like Litzas."

## Phase 5 work plan — Hires backend changes (PENDING)

Touch only these two files in the `hiresbigh` repo:

1. `functions/api/jobs/index.js`
2. `functions/api/catering/index.js`

For each:

1. Read `brand` from form data. Default `'hires'`.
2. Validate brand against allow-list: `['hires', 'litzas']`. Reject otherwise.
3. Insert `brand` column on the D1 row.
4. If `brand === 'litzas'`, render the Litzas email template:
   - Subject: `[LITZAS] New Job Application — ${firstName} ${lastName}` (or `New Catering Inquiry`)
   - Header: black background, gold `#ae9860` accent rule, LITZAS wordmark in Anton, EST. 1965 micro-mark
   - Body: same field structure as Hires email, gold accents instead of crimson
   - Footer: link back to Launch Control + small "Same Family. Same Company." note
5. D1 migration (idempotent):
   ```sql
   ALTER TABLE job_applications ADD COLUMN brand TEXT DEFAULT 'hires';
   ALTER TABLE catering_inquiries ADD COLUMN brand TEXT DEFAULT 'hires';
   ```
6. Dashboard pages: show brand badge on each card.

**Hard rule:** Scott reviews the diff before push. He's the safety net.

## Open questions (for the next session)

- Confirm the founding-year question once more with Ali if she's around. The
  current site uses 1965 (matches box, matches the SEO doc Ali approved).
  Skippy memory shows an older note flagging "1959 multi-location lineage"
  vs "1965 single-location Litzas." Both can be true — the 1959 date is
  Hires; 1965 is Litzas. We're sticking with 1965 for Litzas. Re-confirm only
  if Ali surfaces it.
- Decide whether the Litzas footer should link to Hires Big H, and how
  explicitly. Currently links exist on jobs and catering pages — Scott's
  call whether to expand.
- Photo generation: blocked on OpenAI billing.

## How this work was rescued (lessons)

Two Skippy sessions were active in parallel on 2026-05-17:

1. **The Codex session** (separate Skippy via Claude Code) executed the
   heritage build to the working tree on disk, including the locked palette,
   the locked fonts, the Don Hale story, blog, forms, maps deep links — all
   of it. But never committed.
2. **This session** (Skippy via Claude.ai) started a parallel build from
   scratch and almost overwrote the working tree before noticing the
   uncommitted Codex work.

**The save:** running `git status` before writing CSS surfaced the pending
changes. The "never two Claude sessions pushing the same repo" rule held
only because no one ran `git push` until the conflict was visible.

**The principle for future sessions:** if `git status` shows uncommitted
work you didn't write, STOP. Read it. Verify it. Commit it before doing
anything else.

## How to resume

Read this file first. Then the README. Then `docs/HANDOFF-2026-05-17.md`.
The next ~10 minutes of work is the Hires backend diff. Everything else is
ready.
