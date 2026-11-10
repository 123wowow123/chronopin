# "Problem it solves" backfill (PinPurpose, 0255)

Fills the widget shown above the title on pins about something built or proposed. Table: `docs/okf/tables/pin-purpose.md`.

## Scope (local DB, 2026-11-10)
First pass done, then a verification pass: 359 purpose rows locally; all 8 dam pins (20912-20919) are done. Pin 20917 (Prado) was saved from a safety-study article, not the county page, which states no reason. Most skipped pins state no rationale, which is a research gap, not an error. Local only: nothing is on prod and no translations were run.

## Remainder work (not done)
Roughly 2,000 pins still have no row (`PinProject` 626 and `PinFactory` 1,419 were the starting pools; a few were already filled by overlap). Do these in order:

1. **Unread pins first.** About 80 pins in the last factory lane were never fetched (WebFetch rate limit, 403s): 16001, 16354, 17114, 17116, 15893, 15867, 16315, 17092, 15884, 15887-15889, 15934, 15813, 15815, 15820, 15824, 15827, 15833, 15940, plus the "not attempted" set (15834-16013 range, 16306-16345, 16400, 16434, 16482, 16486, 17082, 17102) and queue-record pins 17080, 17081, 17087-17090, 17093, 17094, 17098-17101 that were skipped on their IDs alone, not read. Also 18976, 18974, 18977, 18979, 18800 (not found locally; check whether the IDs are stale).
2. **Skipped only because a fetch failed** (403, 404, blocked, unreadable PDF, rate limit, YouTube-only `sourceUrl`): use curl or Chrome. Examples: 15884, 15940, 15989, 15933, 16001, 18696, 2279, 2287, 2290, 2294, 2295, UC Regents PDFs 20876 and 20878.
3. **Closest-to-usable skips** (a reference read may state a rationale): Pennrose 7055, 7093, 7081, 7059, 7116, 7128, 7129, 7117, 7178; 18539 Muscatine Solar One (coal retirement); permit or PUC filings for 17346, 17164, 17331, 18046; desalination 18253, 18266, 18237, 18241; stadium and airport pins 478, 575, 685, 701, 711.
4. **Bulk with no rationale expected** (EIA/interconnection-queue entries, trackdatacenters/Epoch listings, hotel and resort openings 15274-15303, YouTube-only milestone pins): leave blank unless a developer or regulator page is found. Do not accept generic AI-demand or jobs/tax wording.

## Cleanup before any prod push
Spot-check of 44 weak saves done 2026-11-10 (each read against its cited page): about 19 kept, 14 fixed to match the source, 8 deleted (20123, 18317, 18319, 678, 16434, 7147, 7168, plus 18387 and 16412 whose sources were dead or generic). Deleted pins have no row; a source that states only a fact (delay, opening, jobs, generic AI demand) is not a need.
* Still unverified, rows kept: 18329 (clenera 404), 18330 (Dominion 403), 18341 (mn8 404), 7187 (housingfinance.com blocked; the row's "fallen into disrepair" is unsupported, retry in Chrome or delete). Repoint 18088's `sourceUrl` to the solarpowerworld article (oati.com 404s).
* Rows written from a pin's own description, not the cited page, were the weakest: other such saves not in the 44 may have the same problem (invented specifics such as "Section 8", "seismically obsolete", unsupported contracts). Sample a few more before prod.
* Overlap: `PinProject` and `PinFactory` share pins (Pennrose housing 7021-7240 and others). Dedupe lane lists before splitting work, and GET `/api/pins/:id/purpose` (204 = none) before every PUT, because a PUT replaces the row. The first pass overwrote some rows this way.
* Run lanes with their own scratch dirs. Shared `save.py`/`saved.txt` files were clobbered between lanes.
* WebFetch's per-domain safety check rate-limits under many parallel lanes: run at most about 8 lanes, and fall back to curl or Chrome.
* Prod: only on the owner's ask, one pin at a time (see Rules).

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
