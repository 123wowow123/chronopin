---
type: Playbook
title: Catch up and retry
description: Use npm run wiki:sync to backfill wikis, retry failed links, and fix summaries a failed rebuild left behind.
resource: ../../../scripts/wiki/sync.ts
tags: [playbook, retry, backfill]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T02:00:00Z }
---

# Check first

```sh
npm run wiki:sync -- --dry-run          # how many pins would be refreshed
```

For one pin's links, errors and wiki pages, call [`GET /api/pins/:id/sources`](../api/pin-sources.md) as an admin.

# Common runs

| Situation | Run |
| --- | --- |
| After a credit or API outage | `npm run wiki:sync`. Those links were left `pending`, so they're picked up automatically |
| A link failed 3 times and has since been fixed | `npm run wiki:sync -- --retry-failed` (or `--pin N --retry-failed`) |
| A page changed and its wiki should follow | `npm run wiki:sync -- --pin N --refetch` |
| One summary should be rewritten anyway | `npm run wiki:sync -- --pin N --rebuild` |
| First backfill of existing pins | `npm run wiki:sync -- --all --limit 20`. Read the output, then drop `--limit` |

Each new wiki is one Claude call (more for a long transcript), and each rebuilt summary is one more. Existing summaries are kept on a first sync, so a backfill only adds wikis.

# Reading the output

`pin 930: built, unchanged, skipped, failed; summary rebuilt`

- `built`: a new wiki was written.
- `unchanged`: the link was already ready, or a refetch found the same text.
- `skipped`: there is no API key, or Anthropic was unavailable. The link stays pending and uses no try.
- `failed`: the link itself failed and a try was used up. The reason is in `lastError`.

With no API credit, `skipped` links wait for [Without API credit](without-api-credit.md). To go back over wikis that already exist, see [Lint the wikis](lint-the-wikis.md).

# Afterwards

Run `npm run backup:data` so the wikis land in `scripts/backup/seedSources.json`.
