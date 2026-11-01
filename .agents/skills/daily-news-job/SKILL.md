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
- **Event info:** drain the whole `pending_event_info` queue, batch after batch, until `remaining` is 0
  (or the run limits in `begin_job` are hit; then say how many remain and why).
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

1. **Maintenance:** revisits (every mark, including AI-model rubric/review marks), weekReview, freshSources.
2. **Event info:** drain `pending_event_info` to 0, batch after batch.
3. **Markets and new events:** predictionMarkets (incl. Brent/WTI), threadPredicted, breakingNews, earthquakes,
   stormTracks, layoffs, hiringJobCreation.
4. **Scores and rubrics:** modelScores, modelRubrics, horoscopes, industryForecasts, sentiment.
5. **Ads and products:** pinAds, holidayAds, adTranslations, personTrades, traderPositions, productLifecycle,
   productCompetitors, factoryProfiles.

Each session names its lane in the run note (`news-YYYY-MM-DD-{am,pm}.md`, one section per lane) and lists the
lanes still open at the top, so the next session starts there. Do not start a new run for a lane; add to the
slot's note. Only one run may be open at a time, and a run left open past 3 hours is cut off, so close the run
at the end of each lane and open the next with `npm run jobs:run -- --job news --prepare`.

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

- Keep scraping docs current after every run (living docs).
- Posting load: gate on the homepage response time and pause between posts; see the `posting-pins-to-prod` memory note.
- Do not delete token files after use; other sessions reuse them.
- Any new UI string goes into every `messages/*.ts` locale in the same change.
