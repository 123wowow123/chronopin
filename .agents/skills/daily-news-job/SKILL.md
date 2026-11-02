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
  predictionMarkets incl. Brent/WTI, earthquakes, stormTracks, layoffs, hiringJobCreation, modelScores,
  modelRubrics, horoscopes, industryForecasts, sentiment).
- **Housekeeping:** create/update pins as the tasks require, write the `docs/okf/scraping/news-YYYY-MM-DD-{am,pm}.md`
  run note and pass `npx vitest run src/lib/okfLint.test.ts` before `finish_job`.

If a task truly cannot be done (API failure, run limit, session limit), name that task and the reason in the
`finish_job` report. "Ran out of time" or "too large" is not an acceptable skip; keep working.

### Split across sessions (owner, 2026-11-01)

One session cannot do all 24 tasks at full depth, so a news run is worked in lanes, one lane per session,
until every lane is done for that 06:00 / 18:00 slot. Lanes:

1. **Maintenance:** revisits (every mark, including AI-model rubric/review marks), weekReview, freshSources, pinGangHandoff (`scripts/jobs/pingang_handoff.py --apply`; see daily-jobs.md#pinganghandoff).
2. **Event info:** 40 pins (20 calls), hand-set rows handled by the admin PUT above.
3. **Markets and new events:** predictionMarkets (incl. Brent/WTI), threadPredicted, breakingNews, earthquakes,
   stormTracks, layoffs, hiringJobCreation.
4. **Scores and rubrics:** modelScores, modelRubrics, horoscopes, industryForecasts, sentiment.
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
