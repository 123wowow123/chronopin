---
type: Process
title: Rebuild the summary
description: A pin's long-form summary is composed from its links' wikis only, cited by link, and rebuilt only when its links change.
resource: ../../../src/server/extract/wiki.ts
tags: [pipeline, summary, citations]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T02:00:00Z }
---

# When

`PinSource.summaryStale(pinId)` is true when either of these holds:

- a link was dropped (`utcRemovedDateTime` is set), or
- a link has a wiki (`wikiVersion > 0`) that the summary hasn't taken in (`summarizedWikiVersion` is null or older).

Links still waiting on a wiki, or failed, are left out until their wiki exists. At that point the summary is stale again and gets rebuilt.

# How

1. The input is each link's wiki as markdown, labelled `[S]` for the pin's source and `[1]`, `[2]`, ... for references, together with the pin's title, description and dates. If the total runs over 120,000 characters, sub-pages are cut to their one-line summaries.
2. Claude writes an HTML bulleted list. Each point ends with the labels of the links that back it, and anything a wiki says that isn't about this pin's event is left out.
3. `citeLabels` ([references.ts](../../../src/server/extract/references.ts)) turns labels into `<cite data-ref="url">` tags. The pin page numbers them, and the OKF export turns them into `[^source-N]` footnotes.
4. The summary is written to `Pin.longFormSummary`, the pin page's cache is expired, and each link's `summarizedWikiVersion` is set. Dropped links' rows are deleted.

When Claude finds too little to summarize, the old summary stays, but the links still count as taken in. That way the same wikis aren't sent again until something changes.
