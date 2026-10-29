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

## Procedure

1. Work the revisit queue first. For each item, research from opened pages (not search snippets).
2. Before scoring a pin, **verify its current text hash**; a stale hash means the text changed since review.
3. When a fresh reading supplies no event details, **preserve** existing event details.
4. Do not score unrelated text for a company (a resort mention is not data-center sentiment).
5. Save through the real API so live feed, search and duplicate checks fire. Never PUT a partial body: GET
   omits null fields and PUT writes every column, so round-trip the whole pin.
6. Read each saved change back (local and prod), confirm the pending queues drained, **then** resolve review marks.
7. Run the per-run tasks the doc lists (factoryProfiles, modelRubrics, productCompetitors, predictionMarkets,
   Brent/WTI) and update the run note in `docs/okf/scraping/` (for example `news-YYYY-MM-DD-pm.md`).

## What to queue

Queue only: a specific unresolved evidence gap, a conflict between sources, an API failure, or work beyond
run limits. State the reason. **Never queue because of an allowlist mismatch alone.**

## Guardrails

- Keep scraping docs current after every run (living docs).
- Posting load: gate on the homepage response time and pause between posts; see the `posting-pins-to-prod` memory note.
- Do not delete token files after use; other sessions reuse them.
- Any new UI string goes into every `messages/*.ts` locale in the same change.
