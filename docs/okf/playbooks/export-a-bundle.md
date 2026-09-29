---
type: Playbook
title: Export an OKF bundle
description: Write pins and their link wikis out as an Open Knowledge Format v0.2 bundle for other tools and agents.
resource: ../../../scripts/okf/export.ts
tags: [playbook, okf, export]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T02:00:00Z }
---

# Run

```sh
npm run okf:export                          # every pin that cites a link, into ./okf-bundle (gitignored)
npm run okf:export -- --pin 930 --pin 716   # just those pins and their links
npm run okf:export -- --out /tmp/bundle
```

The output directory is replaced each time. For a single pin over HTTP, use [`GET /api/pins/:id/okf`](../api/pin-okf.md).

# Layout

Rendered by [okf.ts](../../../src/lib/okf.ts):

```
index.md                                  okf_version: "0.2"
log.md                                    wiki writes, newest day first
pins/<id>-<slug>.md                       type: Event
sources/<id>-<slug>.md                    type: Web Page | YouTube Video | Social Post | Podcast Episode
sources/<id>-<slug>/<n>-<slug>.md         type: Topic | Source Part (nests the same way)
```

# How the fields map

| OKF field | From |
| --- | --- |
| `type`, `title`, `description`, `tags` | SourceWiki `type`, `title`, `summary`, `tags` (for a pin: `Event`, title, description, category and company) |
| `resource` | The link, or the pin's page URL |
| `generated: { by, at }` | `Source.generatedBy`, `Source.utcBuiltDateTime` |
| `stale_after` | When the link was last read plus the admin's [re-read days](lint-the-wikis.md#re-reading-links). Left out while the days are set to never |
| `sources` | A link's pages: the link itself, with `last_modified` from `sourceModifiedDate`. A pin: its links, pointing at their concepts where a wiki exists (so the bundle graph has the edge), else at the URL |
| `[^source-N]` footnotes | The summary's `<cite data-ref>` tags, keyed by source id rather than position |
