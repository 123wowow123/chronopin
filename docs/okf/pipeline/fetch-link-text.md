---
type: Reference
title: Fetch a link's text
description: How web pages, YouTube videos, X posts and podcast pages are read, and when a link is not fetched at all.
resource: ../../../src/server/scrape/sourceText.ts
tags: [pipeline, scraping, youtube, podcast]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T02:00:00Z }
---

# Kinds

`sourceKind(url)` in [sourceKind.ts](../../../src/lib/sourceKind.ts) decides the kind from the host:

| Kind | Hosts | Text |
| --- | --- | --- |
| `youtube` | youtube.com, youtu.be, music.youtube.com | Title, channel, date and description from the Data API, plus the caption transcript when there is one ([transcript.ts](../../../src/server/scrape/transcript.ts)) |
| `tweet` | x.com, twitter.com | The post's text from oEmbed, with its links written out |
| `podcast` | Apple Podcasts, Spotify episodes/shows, Overcast, Pocket Casts, Podbean and others, or a URL ending `.mp3`/`.m4a`/... | The episode page (its show notes). An audio file itself fails with "Audio files are not transcribed" |
| `web` | everything else | A plain fetch (15s), converted from HTML to text. If that gives under 500 characters, the page is loaded in headless Chrome instead |

Text is capped at 240,000 characters, about a two-hour transcript. PDFs and other non-HTML types fail as "Unsupported content type".

# When nothing is fetched

- The scraper (`GET /api/scrape`) keeps the page text it has already loaded (`Source.rememberText`), so saving the pin doesn't load the page a second time.
- A link whose wiki is `ready` is never fetched again unless it is refetched.
- A refetch whose text hash matches the stored text keeps the wiki as it is. The monthly re-read in [Lint the wikis](../playbooks/lint-the-wikis.md) also ignores changes that aren't about the wiki's subject.
