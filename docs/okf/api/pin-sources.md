---
type: API Endpoint
title: Pin sources
description: GET a pin's links with status, errors and wiki pages; POST to run the wiki pipeline for it now. Admin only.
resource: "../../../src/app/api/pins/[id]/sources/route.ts"
tags: [api, admin]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T02:00:00Z }
---

# GET /api/pins/:id/sources

Returns `{ pinId, summaryStale, lintFindings, sources: [...] }`. `lintFindings` lists the [lint findings](../playbooks/lint-the-wikis.md) about the pin and its links, errors first. Each source has `id`, `url`, `kind`, `role`, `title`, `status`, `attempts`, `lastError`, `wikiVersion`, `summarizedWikiVersion`, `removed`, `utcBuiltDateTime` and `wiki`, which is the page tree or null. It answers 401 or 403 unless the caller is an admin, and 404 for an unknown pin.

# POST /api/pins/:id/sources

Runs [Refresh a pin](../pipeline/refresh-a-pin.md) and answers with the GET body plus `ingested` (source id to outcome) and `rebuilt`. `maxDuration` is 300s.

```json
{ "rebuild": true, "retryFailed": true, "refetch": [12, 14] }
```

All fields are optional. `refetch` can also be `true` for all of the pin's links. Anything else answers 400.
