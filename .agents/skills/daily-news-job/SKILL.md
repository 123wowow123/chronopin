---
name: daily-news-job
description: >-
  Use this skill when running, resuming or repairing the Chronopin daily pin jobs (midnight and the
  06:00 / 18:00 America/Los_Angeles news run): working the revisit queue, scoring sentiment, repairing
  content/identity mismatches (resort vs data-center collisions), resolving review marks, and deciding
  what to queue versus fix.
---

# Daily news job runbook

Authoritative detail lives in `docs/okf/scraping/daily-jobs.md` (see `#keep-pins-right`, `### revisits`,
`### factoryProfiles`, `### modelRubrics`, `### predictionMarkets`). Read the relevant section before acting.
Job pins and edits must reach production (www.chronopin.com), not only local.

## Standing authorizations (AGENTS.md, owner instructions 2026-10-13 and 2026-10-28)

- Apply routine, researched updates **without asking again**: sentiment scores, event/ticket readings,
  verified factual or date corrections, including pins whose author is outside the curator allowlist.
- If the curator helper refuses (allowlist), use the **authenticated admin APIs** and preserve the original author.
- Repair content/identity mismatches during the run, including queued resort/data-center collisions.
  Research both subjects and the existing canonical pins, fix company links and inherited metadata in
  **both environments**, then verify readbacks and pending queues.
- This covers content maintenance only. **Production deployment is a separate explicit request.**

## Always complete the whole run (owner, 2026-11-01)

A news run is not done until every task `begin_job` returns has been worked. Never close it after only
sentiment and a sample. All of these are mandatory every run:

- **Revisits:** research every queued item from opened pages and fix or resolve it (queue only a specific evidence gap).
- **Event info:** read 40 pins per run (the doc's cap), two per `pending_event_info` call, comparing each against
  its saved row. Rows set by hand (`source: hand`) are never replaced by `record_event_info` and so stay at the head
  of the queue: compare them with the pages, correct supported facts, and advance `checkedAt` with
  `PUT /api/pins/:id/event-info` (`source: "hand"`, current `checkedAt`) on local and production. Refresh the tokens with the `admin-login-refresh` skill
  (saved to `.scrape/admin.token` for prod and `.scrape/admin-local.token`). Never print them.
- **Every other task in the list** (weekReview, freshSources, pinAds, holidayAds, adTranslations, personTrades,
  traderPositions, threadPredicted, productLifecycle, productCompetitors, factoryProfiles, breakingNews,
  specialDayFreebies (`.agents/skills/special-day-freebies/`), predictionMarkets incl. Brent/WTI, earthquakes, stormTracks, layoffs, hiringJobCreation, modelScores,
  modelRubrics, horoscopes, industryForecasts, marketImpact, sentiment).
- **Housekeeping:** create/update pins as the tasks require, write the `docs/okf/scraping/news-YYYY-MM-DD-{am,pm}.md`
  run note and pass `npx vitest run src/lib/okfLint.test.ts` before `finish_job`.

If a task truly cannot be done (API failure, run limit, session limit), name that task and the reason in the
`finish_job` report. "Ran out of time" or "too large" is not an acceptable skip; keep working.

### Split across sessions (owner, 2026-11-01)

One session cannot do all 24 tasks at full depth, so a news run is worked in lanes, one lane per session,
until every lane is done for that 06:00 / 18:00 slot. Lanes:

1. **Maintenance:** revisits (every mark, including AI-model rubric/review marks), weekReview, freshSources, pinGangHandoff (`scripts/jobs/pingang_handoff.py --apply`; see daily-jobs.md#pinganghandoff).
2. **Event info:** 40 pins (20 calls), hand-set rows handled by the admin PUT above.
3. **Markets and new events:** predictionMarkets (incl. Brent/WTI), threadPredicted, breakingNews, specialDayFreebies, earthquakes,
   stormTracks, layoffs, hiringJobCreation.
4. **Scores and rubrics:** modelScores, modelRubrics, horoscopes, industryForecasts, marketImpact, sentiment.
5. **Ads and products:** pinAds, holidayAds, adTranslations, personTrades, traderPositions, productLifecycle,
   productCompetitors, factoryProfiles.

Each session names its lane in the run note (`news-YYYY-MM-DD-{am,pm}.md`, one section per lane) and lists the
lanes still open at the top, so the next session starts there. Do not start a new run for a lane; add to the
slot's note. Only one run may be open at a time and a run left open past 3 hours is cut off. Prefer working the lanes inside one open run (no MCP reconnect needed, because the tools are bound to the run); only when the run nears 3 hours close it and open the next with `npm run jobs:run -- --job news --prepare`, then reconnect `chronopin` in the MCP panel.

## Procedure

1. Work the revisit queue first. For each item, research from opened pages (not search snippets).
2. Before scoring a pin, **verify its current text hash**; a stale hash means the text changed since review.
3. When a fresh reading supplies no event details, **preserve** existing event details. Compare local and production native event-info readbacks after replay; empty refreshes may diverge. After researching a hand reading, advance only `checkedAt` if the tool leaves it due.
4. Do not score unrelated text for a company (a resort mention is not data-center sentiment).
5. Save through the real API so live feed, search and duplicate checks fire. Never PUT a partial body: GET
   omits null fields and PUT writes every column, so round-trip the whole pin.
6. Read each saved change back (local and prod), confirm the pending queues drained, **then** resolve review marks.
7. In the sentiment task, `review_research_gaps` also returns `construction`: development pins nearing completion
   or with local news. Add 3-5 dated, scored reaction excerpts (`save_researched_reviews`, `PinCriticReview`; see
   `construction-pin-research` section 6), never comments. Pins keep their excerpts across runs: add new ones only
   for fresh coverage.
8. Run the per-run tasks the doc lists (factoryProfiles, modelRubrics, productCompetitors, predictionMarkets,
   Brent/WTI) and update the run note in `docs/okf/scraping/` (for example `news-YYYY-MM-DD-pm.md`).
   **Every note starts with OKF frontmatter** (`type: Log`, `title`, `description`, `tags`, `generated`; copy the
   header of the previous run note) or `npx vitest run src/lib/okfLint.test.ts` fails. Run that test before finishing.

## What to queue

Queue only: a specific unresolved evidence gap, a conflict between sources, an API failure, or work beyond
run limits. State the reason. **Never queue because of an allowlist mismatch alone.**

## Guardrails

- Owner instruction (2026-10-30): leave pin translations to the translation agent unless explicitly requested in this conversation. Do not run `sync_translations.py`, `/api/admin/translations` or hand pin translations as part of research/editing; report the handoff.

- Citations in `longFormSummary` are `<cite data-ref="URL"></cite>` tags (rendered as numbered references), never
  `<a href>` links labelled with the site name ("Wccftech") and never literal `[1]` text. When you touch a pin whose
  summary has site-name links, convert them (same URL, put the tag after the sentence's period, one tag per source).
  The URL must match one of the pin's references (owner, 2026-11-01, pin 20696); if an anchor's URL is not a
  reference yet, add it as one (`addReferences`) and cite it. Unwrap `(<a>…</a>)` parentheses too. Labelled
  non-citation links (data tables, "Source and gallery", application pages, "See the snack guide") are deliberate
  and stay. To find leftovers: `GET /api/admin/db/Pin?longFormSummary.like=%<a href%` on prod.
- Media: a pin made from article sources carries the images those pages offer (og:image plus body images of each
  cited page, deduped), not just one. Add them with `update_pin` `addMedia` `[{type: 1, originalUrl}]`, skip logos,
  avatars and unrelated sidebar thumbnails, use the full-size file rather than a `-232x232` crop, and when a source
  blocks fetching (VentureBeat 429) take images from the other cited sources. See `pin-media-azure`.
- Fixing one pin of a thread means checking the whole thread (follow `parentId` up and down) for the same defect.
- Keep scraping docs current after every run (living docs).
- Posting load: gate on the homepage response time and pause between posts; see the `posting-pins-to-prod` memory note.
- Do not delete token files after use; other sessions reuse them.
- Any new UI string goes into every `messages/*.ts` locale in the same change.

## Learnings from run 49 (2026-11-02)

- **Event-info reads:** the 20 `pending_event_info` calls return page text; save from it with no extra fetch. Rows with `source: hand` come back "kept the reading set by hand": fetch the pricing page, and when it matches, advance only `checkedAt` with `PUT /api/pins/:id/event-info` on local and prod (refresh tokens first, local expires faster). A prior-edition lineup or price is never recorded; "nothing stated" is a valid, common answer.
- **Model tools in the MCP process:** `save_model_tables` and `save_model_rubric` (also `save_factory_profile`) save locally and then throw `static generation store missing in revalidateTag`, so the production push never runs. Push by hand: find the prod pin by `sourceUrl` via `/api/admin/db/Pin`, `PUT /api/pins/:id/performance` (`{charts, tables}`), `/llm-performance` or `/factory`, then GET to verify. Local data is already saved; do not re-save.
- **Model rubric research:** open the maker page, then Artificial Analysis or press for figures; use the launch-time index value and name it (live pages show a rebased index). Quote a review only after string-matching it on a page `curl` can read (Cloudflare-gated pages cannot be matched). A launch table that names no comparison models gets a spec table and no graph. Two pins for one announcement: rubric one, skip the other.
- **Images:** never type an image URL from memory (a guessed Wikimedia URL 404'd and failed `create_pin` with a 500). Open the File: page and copy the upload URL, then credit author and licence as a reference.
- **Duplicate pins:** a 409 on `create_pin` returns the existing pin id: update it. Check next-month Brent pins with `find_pins` over a long window, and Kalshi has no monthly-close WTI series, so no WTI thread exists until the owner picks a contract.
- **Ads:** `add_pin_ad` needs 100+ reviews and 4.3 stars. When the pin's own product is not on Amazon US, a same-brand accessory with the same maker's name is the fallback; unreadable listings ("HTTP 500", no buy-box) are retried once, not forced.
- **@ThePinGang pins (new task):** run `scripts/jobs/pingang_handoff.py` (dry run, `--apply`) each news run in the maintenance lane, then `scripts/jobs/pingang_enrich_media.py --apply --prod` for held pins with no picture, then the handoff again. A picture shared by 3+ pins is a site-wide card and is dropped. Details in `daily-jobs.md#pinganghandoff`.
- **Seasonal revisits:** when the official page still shows the 2026 edition or only deposits, record "checked, no new evidence" in the run note and leave the mark; do not edit or resolve.
- **Run scale:** one session works lanes in order and writes each lane's note as it finishes; ask for a decision only at lane boundaries.

## Learnings from run 46 (2026-11-05)

- **Subagent lanes work.** One session cannot finish a news run, so spawn one agent per lane (1 maintenance, 2 event info, 3+4 markets and scores, 5 ads and products), then a follow-up wave for the leftovers. Tell each agent: do not call `finish_job`, do not write the run note, no pin translations, pace prod writes. The parent writes `news-YYYY-MM-DD-{am,pm}.md`, runs okfLint and closes with `jobs:run --finish <id> --report <file>`.
- **Queue sizes drift.** `revisit_queue` returned 40 marks when the default `limit` was assumed to be 30; pass a larger `limit` and count them before reporting.
- **Seasonal hand rows never leave the event-info queue by `record_event_info`.** It answers "kept the reading set by hand" for them. Compare the page, correct supported facts, and advance `checkedAt` with the admin `PUT /api/pins/:id/event-info` (`source: "hand"`) on local and prod; a 401 means refresh the tokens with `admin-login-refresh`. With 450+ pending, the 40-pin cap ends the lane, not an empty queue.
- **Amazon ads:** `add_pin_ad` returns HTTP 503 when calls run in parallel while a plain curl gets 200; retry one call at a time with gaps. After removing a holiday ad, read it back on prod.
- **Duplicate pins by source URL:** a `sourceUrl` repoint returns 409 when a canonical pin already uses it (17333 vs 18465, Hope Hull Solar). Do not delete either; keep the cited summary and the EIA reference, leave the mark, and ask the owner whether to merge.
- **Date check from the event-info lane:** a page's own "March 19-21" can expose a pin start off by a day (17781). Hand the finding to the maintenance lane and verify on the official page before editing.
- **Threading across authors:** the same-author rule keeps predicted pins from joining a different author's chain, but check `get_pin` before reporting a pin unthreaded (20708 was already under 1980; two agents disagreed).
- **Unverifiable gaps are not fixable by volume:** competitor marks for far-future or collab items (Diablo V, Kingdom Hearts IV, FFVII Revelation, VANSZA, Trinity) and data-centre building marks found only on Cleanview stay open with "checked, no new evidence"; do not re-research them every run unless a new primary source appears.
- **Reviews:** a critic or review queue entry for a work that releases or airs today has no reviews yet; skip with that reason and retry in a few days. An earnings date is not reviewable.
- **Holiday ads are local reads:** `holiday_ads_check` re-reads and restocks the local `HolidayAd` rows only; prod's rows (`/api/admin/db/HolidayAd?holiday=<id>`) change only when the prod job runs or you edit them. After a removal, check prod by that URL, not by re-running the check (which re-adds a short tier's pick). Run 46: craft/wedding/DIY feather stock (ad 219) was re-added to Brazil's Carnival; `GENERIC_STOCK` in `holidayAd.ts` now rejects craft, DIY, wedding, masquerade and scrapbook titles.

## Media QA after the PinGang helper (run 47, 2026-11-06)

- Treat `pingang_enrich_media.py` candidates as drafts: inspect every image after the helper runs. Its filename filter can admit stock workers, video-call screenshots, community collages and logos that do not show the pin's site. Remove only the helper's unsuitable additions and leave the specific media gap open.
- Thumbnail processing can clear `authorName` / `authorUrl`; the helper's current implementation does not restore them despite its docstring. Restore source credits through the audited Medium API, round-trip the native pin to refresh its page/feed, and verify the native readback. Never claim a photographer when only the source page is known.
- Verify each remaining thumbnail URL. Local development may use the Azurite URL returned by `azureBlob.getBlobUrl`; production uses its public Azure blob. A local Azurite filename is not a production blob path. Verify title, dates and author remained unchanged during media cleanup.

## Learned in run 47 (2026-11-06)

- `pin_ads_check`, `add_pin_ad`, `holiday_ads_check` and `add_holiday_ad` update local ad tables only, even with production configured. Replay changed rows through the authenticated production admin DB API, matching `PinAd` by the pin's verified `sourceUrl` plus ASIN, `ProductAd` by ASIN and `HolidayAd` by holiday plus ASIN. Preserve production numeric IDs, pace writes, and read back each row. Verify holiday removals on production too. Never mark unreadable Amazon listings broken.
- When Amazon search returns 503 through Node or Python requests, a normal `curl` browser-navigation request can return 200. Its body may still be gzip-compressed; decompress before parsing. Use only listing URLs returned by that search, and retain the existing rating/review/brand gates on adds.
- **Verify production identity before deduplication or replay.** Signals and find_pins read local data, while get_pin/create_pin/update_pin can target production. Run 47 found local 20728 = Tesla hub but production 20728 = October CPI. Before creating, check production by source URL and subject/date as well; before sentiment replay, match the source and current text hash rather than assuming IDs agree. Missing production counterparts stay explicitly local-only. If a newly created accidental duplicate is found, preserve the existing canonical author/history, carry verified new evidence to it, and use a reversible native duplicate/archive action; never hard-delete historical pins or pull the DB merely to close the run.
- **prediction_accuracy can under-scan.** Its syncAllRecords query currently applies LIMIT 200 to all estimated pins before filtering market references. A zero-pin result can therefore coexist with dozens of predicted market pins. After verifying that condition, call the same service with a sufficiently large read limit (run 47 used 20,000: 68 market pins, four settlements); preserve the normal recording/settlement logic and never edit PredictionRecord outcomes manually. Production-only new pins can also fail local rubric/revisit FK checks: use native production panel endpoints and retain unresolved gaps in the report.

## Production sentiment coverage (run 48)

A drained local `pending_sentiment` queue does not establish production coverage. Before closeout, read production `GET /api/pins/sentiments` with the admin session; production-only creations may be absent locally. Read each returned pin's native company, title and description, check the source identity and current text hash, then score through `PUT /api/pins/sentiments` in batches of at most ten with the normal two-second pacing. Verify the pending endpoint again. Do not replay a local score by numeric ID without matching text/source, and never use a full pin PUT just to save sentiment.

## Earnings pins and the Earnings Trends panel (2026-11-07)

- **Tag every earnings pin `Earnings`** (a topic tag) when you create or repair one: results, earnings call, quarterly or half-year report, guidance update. The pin page shows the "Earnings Trends" side panel (EPS against the estimate, revenue against earnings) only for pins with that tag, and 19611 (SLB) went without it once. Add it on prod with `POST /api/admin/db/PinTag` `{pinId, name:"Earnings", kind:"topic", source:"user"}` or include it in the pin's `tags`.
- **A US-listed company needs its ticker as `relation: company`** (`PUT /api/pins/:id/stocks {add, relation:"company"}`); the panel reads Nasdaq for that symbol. Class shares use a dot (`BF.B`).
- **No US listing, or an ADR Nasdaq has no income statement for:** the panel falls back to annual revenue and earnings in `src/server/data/earningsAnnual.json`, built from Wikidata by `node scripts/earnings/wikidataAnnual.mjs` (needs 3+ years from the last three; keyed by `Company.name`). Re-run it after earnings pins for a new company, review the diff and commit. A company Wikidata cannot supply shows no panel; add a hand entry (`"source": "manual"`, a `url` to the company's own report, every figure from that report, never estimated) rather than inventing numbers. Do not scrape Yahoo Finance (it is bot-gated); Nasdaq and Wikidata are the sources.
- Deploying the data file and route is the owner's call (`deploy-production`).
