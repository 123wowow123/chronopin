---
type: Readme
title: Link wikis and the Open Knowledge Format
description: How every link a pin cites becomes an OKF wiki, and how pin summaries are rebuilt from those wikis without fetching the links again.
tags: [okf, wiki, ingest, summary]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T02:00:00Z }
---

# Link wikis and the Open Knowledge Format

Every link a pin cites (its `sourceUrl` and each reference) gets a **wiki**: Claude reads the link once and writes it up as a small tree of pages. A pin's long-form summary is then written **from those wikis alone**. When a new link arrives, only that link is fetched and written up; the summary is rebuilt from its wiki plus the wikis the pin already had.

The wikis follow Google's [Open Knowledge Format](https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md) (OKF v0.2), so they can be exported as a bundle that any OKF tool or agent can read. These docs are an OKF bundle too: each page has frontmatter, and its `resource` points at the code it describes.

## How it fits together

```
pin saved/updated ──► refresh the pin ──► 1. sync links     one Source row per link, PinSource rows in step
  (events.ts)          (sourceWiki.ts)    2. write wikis    fetch text (unless kept), Claude writes the page tree
                                          3. rebuild        only if a link was added/dropped or a wiki rewritten
```

* [Refresh a pin](pipeline/refresh-a-pin.md): the three steps and when each one runs
* [Fetch a link's text](pipeline/fetch-link-text.md): web pages, YouTube, X posts, podcasts
* [Write a wiki](pipeline/write-a-wiki.md): the page tree, and how long transcripts are split into parts
* [Rebuild the summary](pipeline/rebuild-the-summary.md): composing from wikis, and citations

## Things to know

- **Links are shared.** A wiki is written about the link itself, not about any one pin, so two pins citing the same article share one wiki. Links are matched by `urlKey` (host without `www.`, path without a trailing slash, query kept).
- **Existing summaries are kept.** The first time a pin's links are synced, if it already has a summary (the scraper writes one), its links count as already taken in. A backfill never rewrites summaries that exist.
- **A hand-edited summary is replaced** the next time a link is added or dropped.
- **No API credit? Nothing is lost.** The Claude steps wait until they can run, or can be done by hand in a Claude Code session: see [Without API credit](playbooks/without-api-credit.md).
- **Failures are recorded, not lost.** Each link keeps its `status`, `attempts` and `lastError`. A failure on the link's side (a 404, an unreadable page) uses up one of its 3 tries. A failure on Anthropic's side (no credit, bad key, rate limit, outage) is noted but uses up nothing. See [Catch up and retry](playbooks/catch-up-and-retry.md).
- **Podcast audio is not transcribed.** Only the episode page (its show notes) is read. YouTube transcripts are read when the video has captions.
- **Restart `npm run dev` after changing the save hook.** The pin event listeners register once per process.

## Commands

| Command | What it does |
| --- | --- |
| `npm run wiki:sync` | Write wikis for links that need one, retry failed links with tries left, rebuild summaries that are behind. `--pin N`, `--all`, `--retry-failed`, `--refetch`, `--rebuild`, `--limit N`, `--dry-run` |
| `npm run okf:lint` | Check and maintain the wikis: OKF conformance, stale links, orphans, quality, contradictions between a pin's links. `--fix`, `--check`, `--pin`, `--dir`. See [Lint the wikis](playbooks/lint-the-wikis.md) |
| `npm run wiki:export` / `wiki:apply` | With no API credit, write out the Claude jobs, do them in a Claude Code session, and save the answers. See [Without API credit](playbooks/without-api-credit.md) |
| `npm run okf:export` | Write an OKF bundle of pins and their link wikis to `./okf-bundle/`. `--pin N` (repeatable), `--out DIR` |
| `npm run backup:data` | Also writes `scripts/backup/seedSources.json` and, on its own because of its size, the fetched text as `seedSourceTexts.json.gz` |

## Admin API

| Endpoint | What it does |
| --- | --- |
| [`GET /api/pins/:id/sources`](api/pin-sources.md) | Each link behind the pin: status, error, wiki pages |
| [`POST /api/pins/:id/sources`](api/pin-sources.md) | Run the pipeline now: `rebuild`, `retryFailed`, `refetch` |
| [`GET /api/pins/:id/okf`](api/pin-okf.md) | The pin and its links as an OKF bundle, or one file with `?path=` |

## Tables

[Source](tables/source.md) (one per link), [SourceWiki](tables/source-wiki.md) (its page tree) and [PinSource](tables/pin-source.md) (which links a pin cites, and what its summary has taken in) come from [0026_source_wiki.sql](../../scripts/db/schema/0026_source_wiki.sql). [OkfLintFinding](tables/okf-lint-finding.md) and OkfLintScan come from [0027_okf_lint.sql](../../scripts/db/schema/0027_okf_lint.sql).

## Not built yet

From the README's OKF to-do list: the admin screen (the API above is ready for it, lint findings included), the relationship graph view, and per-user preference wikis.
