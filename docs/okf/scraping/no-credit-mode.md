---
type: Reference
title: Scraping without credit
description: What a scrape still does with no API key or credit - every stage except the two Claude calls - how the page's own markup fills the fields, and the llmTasks a session answers.
resource: ../../../src/server/scrape/metadata.ts
tags: [scraping, fallback, metadata, llm-tasks]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T21:00:00Z }
---

# The rule

**Only the LLM calls wait for a session.** Everything else in a scrape runs the same with or without credit. The LLM is "unavailable" when there is no key, the key has no credit, or the call failed (the extractor returned null); the scrape then carries on and hands the two Claude calls back as tasks.

| Stage | Without credit |
| --- | --- |
| Fetch: headless Chrome, rendered text, images over 150x150, embedded YouTube and X media, headings | Runs |
| Page metadata: Open Graph, meta tags, JSON-LD | Runs, fills the fields below |
| Image top-up (company announcement, day's articles, Wikipedia, video stills) | Runs, searching with the extractor's title, else the page's own title |
| Trailer, ratings, awards, Kalshi score | Run when the category and work title are known (they come from the extractor or the session) |
| Studio HQ, threading, release-notes entries, save | Run |
| **Field extraction** | **Task `extract`** for a session |
| **Reference search and cited summary** | **Task `references`** for a session |

# Fields read from the page's own markup

[metadata.ts](../../../src/server/scrape/metadata.ts) reads what [inPage.ts](../../../src/server/scrape/inPage.ts) collects (`IN_PAGE_META`) and fills only what the markup states. It never invents a company, category or coordinates.

| Field | From | Rule |
| --- | --- | --- |
| `title` | JSON-LD `Event.name`, else `og:title`, `twitter:title`, an Article's `headline`, the first `h1`, then `<title>` | `og:title` beats an Article `headline` (Wikipedia's headline is a short description). The site name is stripped when it is the segment after or before ` \| `, ` - `, ` – `, ` — `, ` :: ` or ` · ` and matches `og:site_name` or a name the host carries ("Wikipedia" on en.wikipedia.org). At most 120 characters |
| `description` | `Event.description`, else `og:description`, the meta description, an Article's `description` | Markup stripped, at most 400 characters |
| `startDateTime`, `endDateTime`, `allDay` | An `Event`'s `startDate` / `endDate`; else `article:published_time`, `datePublished` or the `date` meta | A bare date is an all-day UTC day, a datetime is timed |
| `dateConfidence` | | An Event's own start is `scheduled`. A publish date is **`unknown`**, with the reason "Only the page's publish date (...) was found without reading the article; the event's own date needs review." A publish date is a poor event date, so a session should replace it |
| `placeLabel` | An `Event`'s `location` name and address | Label only; no coordinates |
| `price`, `priceCurrency` | A `Product`'s `offers.price` / `lowPrice` and `priceCurrency` | Only a positive number |
| `tags` | The keywords meta and `article:tag`, up to 8 | Duplicates and long strings dropped |

`company`, `categories`, `workTitle`, `stocks`, `amazonUrl`, `bestBuyUrl`, coordinates, delay fields and `longFormSummary` stay empty until the session answers the extract task.

# The response

`GET /api/scrape?url=...` (signed in) answers the draft pin as before and, when the LLM was unavailable, two more keys:

```json
{
  "title": "Federal Reserve issues FOMC statement",
  "media": [ ... ],
  "llm": "session",
  "llmTasks": [
    { "stage": "extract",    "system": "<the extractor's system prompt>", "schema": { ... }, "input": "Source URL: ...\n\nPage text:\n\n<first 60000 characters>" },
    { "stage": "references", "system": "<the reference finder's prompt>", "schema": { ... }, "input": "Source (web page): ...\n\n<first 20000 characters>" }
  ]
}
```

- `extract`: `system` is [systemPrompt.ts](../../../src/server/extract/systemPrompt.ts), `schema` is `SCHEMA` in [extract/index.ts](../../../src/server/extract/index.ts), `input` is the user message the call sends. Answer with one JSON object matching the schema.
- `references`: `system` is the reference finder's prompt, `schema` is the `record_references` tool's input schema, `input` is its user message. Answer by searching and fetching, then `{ references: [...], longFormSummary }`. Keep only URLs actually fetched, at confidence 70 or more, at most 5, never the source.
- A tweet or a YouTube link gets only the `references` task (its fields come from oEmbed and the Data API, not the extractor). No tasks are returned when the LLM worked, or when the page had under 200 characters of text.

# Doing the tasks

1. Answer `extract` and merge it over the draft: the session's values win, except keep the media the browser found and the metadata fields the session leaves null.
2. Answer `references` and add them with `npm run references:apply` after the save, or in the POST body.
3. Run the enrichment the fields unlock: trailer and ratings (`npm run media:screen`), studio HQ (`npm run media:studio-locations`), threading (automatic on `POST /api/pins`).
4. Save through `POST /api/pins` and `npm run backup:data`. Full steps: [Scrape without credit](../playbooks/scrape-without-credit.md).

# Limits

- Without the extractor a page has no category, so the trailer, ratings, awards and Kalshi score do not run until the session supplies one.
- A page with no Open Graph tags and no JSON-LD gives a title from `<title>` or the first `h1` and little else.
- The top-up from a raw page title can return a loosely related Wikipedia photo; review it ([Learnings](learnings.md)).
