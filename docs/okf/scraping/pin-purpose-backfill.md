# "Problem it solves" backfill (PinPurpose, 0255)

Fills the widget shown above the title on pins about something built or proposed. Table: `docs/okf/tables/pin-purpose.md`.

## Scope (2026-11-10)
All 8 dam pins (20912-20919) done. Local DB holds 411 purpose rows; prod holds 396 (the other 15 are held back, see below). No translations were run.

Rounds done: first pass over `PinProject` and `PinFactory` (about 2,050 pins); verification of all saved rows against their cited pages (44 weak + 80 sampled + the remaining 235, i.e. every first-pass save); a second pass over 124 unreadable pins; a read-the-sources pass over 513 skipped pins that had a news, developer or regulator `sourceUrl` (80 saved, about 40 deleted again as weak). Verification changed or deleted roughly a third of first-pass rows (worst: Pennrose housing, where most rows had invented specifics), nearly always an invented number, name or "because", or a source that states only a fact (delay, opening, jobs, tax, generic AI demand, "optimized for AI", a state renewable target, "closer to customers") instead of a need. 14 rows had `sourceUrl` cut off mid-URL; repaired from the pin's full URL.

## Prod
Resynced 2026-11-10: prod holds 396 rows, identical to local except the 15 held back below. Matched local->prod by `sourceUrl` plus identical title (pin IDs differ between local and prod; title-only for pins with no `sourceUrl`). The resync pushed 162 changed or new rows and deleted 48 prod rows that were removed locally or held back; a verification rerun showed 0 differences. Later local fixes do not reach prod on their own. To resync: the session's `resync.py` (GET local `/api/admin/db/PinPurpose`, map to prod via `/api/admin/db/Pin`, then `PUT|DELETE /api/pins/:prodId/purpose` with `.scrape/admin.token`); run it as a dry run first, and bulk writes with deletes need the owner's explicit go-ahead.

## Held back from prod (needs a source Chrome can read)
Do not push until a page that states the need is read (Chrome only; do not spoof a browser User-Agent to get past a bot check):
* 18329, 18341, 18377 (developer pages 404), 18330 (Dominion Cloudflare 403), 15710 (esgtoday 403), 7187 (housingfinance blocked; "fallen into disrepair" unsupported), 18088 (purpose holds; repoint `sourceUrl` to the solarpowerworld article), 111 (Ars Technica 403), 474 (travelandtourworld bot check), 2281 (nowtoronto 403), 18390 (Dominion 404), 15672 (catl.com 403), 15690 (mayerbrown 403), 7032 (captcha / 502), 17118 (single developer sentence, provisional).
* Deleted locally as weak: 16384, 20123 (re-saved once by a replayed script; check it stays deleted), 15703, 15723, 18074, 18239, 18389, 20651, 20448.

## Remainder work (not done)
About 1,600 pins still have no row. In order:
1. **Unreadable, retry in Chrome:** the held-back list above, plus pins whose primary pages returned 403/404/captcha and had no readable reference: 15870, 15940, 15989, 15884, 16331, 16350, 2279, 2290, 7081, 17116, 17331, 18046, 17092, 17114, 17164, 17346, 18144, 18146, 18174, 18310, 18323, 18348, 18364-18366, 18371, 18379, 18391, 18398, 18347, 18332, 18401, 18531, 19040, 2301, 2970, 3089, 3167, 4058, 4164, 4940, 20798-20800, 20641-20643, 19330.
2. **Not covered by a source read:** the 578 pins whose only `sourceUrl` is YouTube, EIA, an interconnection queue, trackdatacenters, Epoch, cleanview, infrasure or a Pennrose listing. Leave blank unless a developer or regulator page is found; do not accept generic AI-demand or jobs/tax wording.
3. **Hotel and resort openings** (15274-15303) state no problem; leave blank.
4. **Re-verify new saves** after the next round; the second-pass and read-sources saves were checked only by the saving agent. Spot-check 3504 and 5490 (thin but stated needs), 2248 and 269 (Wikipedia sources).

## Rules for the next round
* Dedupe lane lists first: `PinProject` and `PinFactory` overlap (Pennrose housing 7021-7240 and others). GET `/api/pins/:id/purpose` (204 = none) before every PUT, because a PUT replaces the row; the first pass overwrote some rows this way.
* Give each lane its own scratch directory; shared `save.py`, `g.py` and `saved.txt` files were clobbered between lanes, and a replayed script re-saved a deleted row.
* WebFetch's per-domain safety check rate-limits under many parallel lanes: run at most about 8, read pages with plain curl (no spoofed User-Agent), and use Chrome for blocked ones.
* Every specific in a row (number, name, contract, "because") must appear in the page cited as `sourceUrl`; saving from the pin's own description or summary is the main source of invented details.
* Prod: only on the owner's ask. Pushes that overwrite or delete live rows need the owner's explicit go-ahead for that step.

## Steps per pin
1. Open the pin's own `sourceUrl` (and its references). Read the page; use Chrome if WebFetch is blocked.
2. Write only what the source says about **that** project:
   * `problem`: the need it addresses, 1-2 plain sentences, max 600 chars. Required.
   * `solution`: how the project answers it, max 600. Optional.
   * `beneficiaries`: who it is for, max 300. Optional.
   * `sourceUrl`: the page that states the rationale.
3. Save: `PUT /api/pins/:id/purpose {problem, solution?, beneficiaries?, sourceUrl?}` (author or admin; replaces the row).
4. Force the cache: `POST /api/admin/pins/expire {ids:[...]}`, then reload the pin and check `data-purpose-panel`.

## Rules
* Never invent a rationale. If the source does not say why, leave the pin without a row and record the gap.
* Do not state a risk the source only implies (Anderson Dam's release names the seismic retrofit but not the seismic risk, so the panel does not either).
* Keep it about the pin's own phase or plant, not the whole master plan.
* No model tracking notes in the text. Translations are left to the translation agent.
* Work in lanes (one subagent per desk or project type), post one pin at a time on prod, and only when the owner asks for prod writes.

## Local auth
No valid token: sign up a throwaway `e2e-...@example.com` user via `POST /api/users`, promote it with `npx tsx --env-file=.env.local scripts/data/e2eAdmin.ts <email>`, sign in at `/auth/local`. Keep the token file.
