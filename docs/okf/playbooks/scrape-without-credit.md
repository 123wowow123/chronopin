---
type: Playbook
title: Scrape without credit
description: How a Claude Code session does the scraper's Claude stages by hand - extraction, references, summary - using the app's own prompt and schema, and saves the pin through the real API.
resource: ../scraping/strategy.md
tags: [playbook, scraping, claude, fallback]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T20:00:00Z }
---

# When

The app's key has no credit or no key is set. `GET /api/scrape` still runs the headless browser, the page's own metadata and every keyless lookup, and returns a draft with a title, description, media and any date the markup states, plus `llm: "session"` and `llmTasks`: the two Claude calls it could not make (`extract` and `references`), each with the app's system prompt, JSON schema and input. Do not wait: the session is the LLM, and only those calls are done by hand. The stages, quality bar and rules are in the [Scraping strategy](../scraping/strategy.md); this is the procedure.

# Steps

1. **Scrape.** `GET /api/scrape?url=...` (signed in) returns the draft and `llmTasks`. Everything else in it is already done; check the media, and skip step 2's fetch. If a source is blocked or not the article, find another source for the same event.
1a. **Classify and fetch by hand** only for a source the scrape could not read. Decide the kind and vertical ([Sources](../scraping/sources.md)). Fetch with `curl -A "<browser UA>"` or the app's own reader (`fetchSourceText` in [sourceText.ts](../../../src/server/scrape/sourceText.ts)); for a rendered page use the scraper. Check the text is the article ([recognising a useless fetch](../scraping/sources.md#recognising-a-useless-fetch)); if it is blocked, find another source for the same event and cite the original only as a reference. For an embedded trailer, grep the raw HTML for `<iframe ... youtube ...>`.
2. **Extract the fields** (the `extract` task). Its `system`, `schema` and `input` are the app's own; otherwise read [systemPrompt.ts](../../../src/server/extract/systemPrompt.ts) and `SCHEMA` in [extract/index.ts](../../../src/server/extract/index.ts), then produce the same JSON object from the first 60,000 characters of the page: title, description, price, place, `dateConfidence` with quoted reasoning, delay fields, company and its Wikipedia URL, categories from the fixed list, `workTitle`, purchase links only when certain, `stocks`, `tags`, `longFormSummary`. Verify the enums and date formats.
3. **Find references** (the `references` task, with its `input` and record schema). Search for the official announcement first, then independent coverage; fetch each candidate and read it. Keep those at confidence 70 or more, at most 5, never the source, never a URL you did not fetch. Write `references` as `{url, title, confidence, publishedDate, startDate: null, endDate: null, reasoning}`. To top up an existing pin: `npm run references:list` then `npm run references:apply -- --id=N --file=refs.json`.
4. **Summary.** An HTML `<ul><li>` list drawn from the source and the references, each point ending with its citation, `[S]` for the source and `[n]` for reference n (the save converts them to keyed citations). After the pin exists, `npm run wiki:export` / `wiki:apply` rebuild it from link wikis instead ([Without API credit](without-api-credit.md)).
5. **Enrich by hand** what the keyless stages did not: media, best effort to reach 3 by working down every source ([Enrichment](../scraping/enrichment.md#images-and-media)), studio HQ for a film, series, anime or game (Wikidata, else a fetched page), trailer and ratings (`npm run media:screen`, read the dry run), stocks (`stocks` in the body; company relations with `npm run stocks:sync -- --company X --relate "SYM:related|supplier:note"`).
6. **Save through the real API.** Sign in as the vertical's curator (`POST /auth/local`, or a token signed from the session secret), then `POST /api/pins` with the JSON. Body fields: `title`, `description`, `sourceUrl`, `longFormSummary`, `address`, `latitude`, `longitude`, `price`, `priceCurrency`, `dateConfidence`, `dateConfidenceReasoning`, `utcStartDateTime`, `utcEndDateTime`, `allDay`, `originalStartDate`, `delayReasoning`, `company`, `companyWikiUrl`, `categories`, `tags`, `stocks`, `media` (`{type: 1 image | 2 tweet | 3 YouTube, originalUrl, originalWidth, originalHeight}`), `references`, `ratings`, `merchants`, and `parentId` (omit it to thread automatically, `null` for none). The route rejects a malformed reference, a delayed pin missing its delay fields and a duplicate `sourceUrl`.
7. **Persist.** `npm run backup:data` (never edit the seed JSON by hand). Restart `npm run dev` after adding an event listener.
8. **Learn.** Add what surprised or failed, and any owner correction, to [Learnings](../scraping/learnings.md) and fold it into the page it belongs to.

# Running it at scale

Split the work across agents in batches of about 30 items, each with a **unique scratch prefix** and told not to edit shared files. Give them a shared instructions file and a batch file of ids, have them write one result file per id, validate every result parses, then apply all of them with one script. A blocked source gets a marker file, never a fabricated result. WebSearch has a pooled quota of roughly 200 calls across all agents, so spend searches on pins with a real event and use fetches for the rest.

# Guard rails

- Every reference, image and purchase URL must come from a fetch or search in this run.
- Return `null` for a field the source does not state; keep an existing summary when your material is thinner than it.
- Local dev database only; production writes need confirming.
