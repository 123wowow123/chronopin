---
type: Process
title: Refresh a pin
description: The three steps a pin save runs - sync links, write wikis, rebuild the summary - and when each one does work.
resource: ../../../src/server/services/sourceWiki.ts
tags: [pipeline, pin, summary]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T02:00:00Z }
---

# Trigger

The pin `save` and `update` events ([events.ts](../../../src/server/events.ts)) call `refreshPin(pinId)` after the response has gone out. That includes `POST /api/pins`, `PUT /api/pins/:id` and `POST /api/pins/:id/references`. The same function runs from [`npm run wiki:sync`](../playbooks/catch-up-and-retry.md) and from [`POST /api/pins/:id/sources`](../api/pin-sources.md).

Runs are serialized per pin and per link within a process, so a pin saved twice in quick succession, or two pins citing one article, share the work instead of doing it twice.

# Steps

1. **Sync links** (`syncPinSources`). It reads the pin's `sourceUrl` and `PinReference` URLs and makes sure each has a [Source](../tables/source.md) row. It then updates the [PinSource](../tables/pin-source.md) rows to match:
   - New links are added.
   - Links that are gone get `utcRemovedDateTime`.
   - Links that come back are restored.
   - A reference that repeats the source URL counts once, as the source.
2. **Write wikis** (`ingestSource`). This runs for each link that is `pending`, or `failed` with tries left. See [Fetch a link's text](fetch-link-text.md) and [Write a wiki](write-a-wiki.md).
3. **Rebuild the summary** (`rebuildSummary`). This runs only when the summary is behind: a link was dropped, or a link has a wiki version the summary hasn't taken in yet. See [Rebuild the summary](rebuild-the-summary.md).

# Options

| Option | Effect |
| --- | --- |
| `rebuild` | Rebuild the summary even when nothing changed |
| `retryFailed` | Also retry links that have used all 3 tries |
| `refetch` | Fetch these links again (`true` = all of the pin's). A wiki is rewritten only if the text changed |
