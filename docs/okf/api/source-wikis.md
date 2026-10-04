---
type: API Endpoint
title: Source wikis
description: Send link wikis written elsewhere to the server - GET the links waiting on one, POST the finished wikis, or carry them on a pin posted through the admin API. Admin only.
resource: "../../../src/app/api/admin/source-wikis/route.ts"
tags: [api, admin, fallback]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-04T12:00:00Z }
---

# Why

A pin's links get their wikis when the pin is saved: the server reads each page (headless Chromium) and asks Claude. On production that needs the app's Anthropic key to have credit, and it puts Chromium on the small VM. These endpoints take wikis written **elsewhere** - a Claude Code session on the dev machine, with the same prompts - and store them, so the server fetches no page and calls no model. Same exchange as [Without API credit](../playbooks/without-api-credit.md), over the API and keyed by link instead of by local source id.

A wiki is one item:

```json
{
  "url": "https://example.com/launch",
  "kind": "web",
  "title": "Launch page",
  "text": "the page text the wiki was written from",
  "generatedBy": "claude-code/claude-opus-5",
  "wiki": { "title": "...", "summary": "...", "body": "...", "tags": ["..."], "lastModified": "2026-10-01", "topics": [] }
}
```

`wiki` is one page (the wiki prompt's schema), or `{ "parts": [pages], "root": page }` for a link read in parts, the shape `wiki:apply` takes. `kind`, `title`, `text` and `generatedBy` are optional; `generatedBy` is an OKF actor (default `claude-code/session`). `text` is kept when the link has none, so a later recheck can tell whether the page changed. At most 25 per request.

# POST /api/admin/pins, with `sourceWikis`

A pin posted through [the admin pin API](admin-db.md) may carry `sourceWikis: [item, ...]`, the wikis of its `sourceUrl` and references. They are saved right after the pin, and the save then **skips the wiki pipeline** (no fetch, no API call, no rebuilt summary): the summary the pin carries counts as built from them. Each result lists how every wiki went:

```json
{ "results": [{ "index": 0, "id": 5801, "userId": 22,
  "wikis": [{ "url": "...", "status": "saved", "sourceId": 41835, "version": 1 },
            { "url": "...", "status": "skipped", "message": "no pin cites this link" }] }] }
```

A malformed `sourceWikis` fails that pin before it is saved (nothing is created). A wiki that fails to save afterwards is reported under `wikis` and does not fail the pin. A link the post carries no wiki for stays `pending`, to be filled by the endpoints below or by the pipeline on a later save. Only the wiki pipeline is skipped: a pin's other save work (search, stocks, sentiment, ...) still runs.

# GET /api/admin/source-wikis

The links some live pin cites that are waiting on a wiki. Query: `limit` (default 100, at most 1000), `offset`, `pinId`, `retryFailed=1` (also failed links out of tries). Answers `{ total, sources: [{ id, url, kind, title, status, wikiVersion, attempts, lastError, hasText, pinIds }] }`. A pending link with `wikiVersion > 0` is one whose page changed and is waiting for a rewrite.

# POST /api/admin/source-wikis

`{ "wikis": [item, ...], "rewrite": false }`. Each wiki is saved on the source already kept for its link; answers `{ results: [{ url, status, ... }] }` with `status`:

| status | Meaning |
| --- | --- |
| `saved` | Stored as the next wiki version (`sourceId`, `version`) |
| `unchanged` | The link's wiki is ready already; `rewrite: true` replaces it (and puts every citing pin's summary behind its links again) |
| `skipped` | No pin cites this link |
| `error` | The wiki could not be saved (`message`) |

A pin whose summary was written before its wikis existed (the usual backfill) is **not** rebuilt: its links count as taken in. Bad bodies answer 400 naming the entry (`wikis[3]: ...`).

# The local tool

`npm run wiki:prod` does the dev-machine side (`scripts/wiki/prod.ts`):

```sh
# pins on their way to prod: wikis written first, attached to the drafts, posted with the pin
npm run wiki:prod -- export --out DIR --drafts drafts/            # jobs for every sourceUrl + reference
#   ...a session writes DIR/results/wikis/<n>.json from DIR/wikis/<n>.json, per DIR/prompts.md...
npm run wiki:prod -- attach --dir DIR --drafts drafts/ --by claude-code/claude-opus-5

# links already on the server that are pending
npm run wiki:prod -- export --out DIR --pending [--pin 5777] [--limit 50]
npm run wiki:prod -- push --dir DIR --by claude-code/claude-opus-5
```

`export` reads each page here (the local database's kept text first, else headless Chromium), so the server never does. `--links FILE` exports the links a file names. `--base URL` picks another server; each server keeps its own admin token in `.scrape/`.
