---
type: Reference
title: Extraction fields
description: The single extraction call that fills a pin - every field, its rule, and the exact prompt and schema to reuse when a Claude Code session does the extraction by hand.
resource: ../../../src/server/extract/index.ts
tags: [scraping, extraction, schema, fallback]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T20:00:00Z }
---

# The call

`extractPinFields(sourceUrl, pageText)` is one structured call. Model `claude-opus-5`, adaptive thinking, JSON-schema output, `max_tokens` 16000. The user message is `Source URL: <url>\n\nPage text:\n\n<first 60000 characters>`. A page under 200 characters (a script shell) returns null. The system prompt is [systemPrompt.ts](../../../src/server/extract/systemPrompt.ts) and the schema is `SCHEMA` in [extract/index.ts](../../../src/server/extract/index.ts). **Those two files are the source of truth: a session doing this by hand reads them and follows them exactly, rather than working from this summary.**

# Fields

| Field | Type | Rule in one line |
| --- | --- | --- |
| `title` | string or null | Names the event, not the article ("Gordie Howe International Bridge Opens"); under ~80 characters; no site name |
| `description` | string or null | One or two plain sentences, concrete detail first |
| `price`, `priceCurrency` | number, ISO 4217 | Headline cost fully expanded; the part's own figure for a phase; newest estimate; midpoint of a range; null for a release with no price |
| `placeLabel`, `latitude`, `longitude` | string, number, number | Where the thing is, not the operator's HQ. Null for something with no single place. Film, TV, anime, games: the studio's HQ |
| `dateConfidence` | `confirmed` `scheduled` `estimated` `delayed` `unknown` | Judged from the page's wording about the date, not from how far away it is |
| `dateConfidenceReasoning` | string or null | One sentence quoting the deciding wording; null when `unknown` |
| `startDateTime`, `endDateTime`, `allDay` | ISO UTC, ISO UTC, bool | The event itself. All-day: 00:00Z of the date, end is 00:00Z of the day after |
| `originalStartDate`, `delayReasoning` | `YYYY-MM-DD`, string | First promised date (before the first delay) and how long the delay is; `Stated:` or `Estimated:` |
| `company`, `companyWikiUrl` | string, URL | The one organisation; the disambiguated English Wikipedia article ("Apple_Inc."), null when unsure |
| `categories` | string[] from the fixed list | Closest first; a second only when squarely both |
| `workTitle` | string or null | Only for a film, series, anime or game: its official English title, no "Premieres" wording |
| `episodeCount`, `episodeStatus` | number, `complete` `ongoing` `planned` | Only for a work released in episodes, and only the run the pin is about: that season's count, not the show's. Status says whether the run has finished, is what is out so far, or is an announced total |
| `episodeCount`, `episodeStatus` | number, `complete` `planned` `ongoing` | Only for a work released as episodes (TV series, anime, web or podcast series) and only when the page says the number. The run the pin is about: one season takes that season's count, the whole show takes the show's. `complete` finished airing, `planned` the announced total of a run still to come or airing, `ongoing` episodes out so far with no announced total. Both null for a film, one-off special or non-episodic pin |
| `amazonUrl`, `bestBuyUrl` | URL or null | Only one specific, currently sellable product, from real listings, never constructed |
| `stocks` | `{symbol, name, relation, note}[]` | US-listed only: the company, then at most 3 related and 3 suppliers the page names |
| `tags` | string[] (max 8) | Awards first (body + year), then franchises, people, programmes, places; not the category or company |
| `longFormSummary` | HTML `<ul><li>` or null | Key points as real list markup |

# Hard cases (from the prompt)

- **Cost.** `"roughly CA$6.4 billion"` is `6400000000` / `CAD`. Do not confuse cost with trade volume, revenue, market size or annual budgets. A programme page takes the programme total; a pin about one terminal takes the terminal's cost.
- **Delays.** `originalStartDate` is the date first promised, not the one before the latest slip. Where the page says the event is late but gives no new date, estimate `startDateTime` from the cause and the slip of comparable projects and start `delayReasoning` with `Estimated:`. This is the only place to go beyond the page.
- **Episodes.** A pin about one season or cour counts that season; a pin about the whole show counts the show. `complete` only once the run has finished airing - a total announced for a run still going is `planned`, and a count with more coming and no announced total is `ongoing`. Null for a film or a one-off special.
- **Studio pins.** Company is the studio (MAPPA, Ufotable, Naughty Dog, Paramount Pictures), not the publisher or streamer; `placeLabel` is its HQ, as a street address when known, else its ward or city.
- **Purchase links.** Only from real listing URLs known with confidence. Both null unless the pin is one sellable product.
- **Stocks.** Never an ETF, index or private company (OpenAI has no ticker; Microsoft, its investor, does). `note` is the clause after the company's name, naming the story's company rather than "its", lowercase, no final period.

# What the app does with the answer

`applyExtracted` copies the fields onto the draft pin: the location through `toLocation` (out-of-range coordinates are dropped but the label kept), the price only when finite, `originalStartDate` only as `YYYY-MM-DD`, categories through `parseCategories`, the two purchase links as `Merchant` rows ("Amazon", "Best Buy"), dates as UTC. `stocks` are not stored on the pin: they ride along in the scrape response and the save adds them once the pin exists.

# By hand

With no credit, read the page text yourself and produce the same JSON object, then carry on with the [by-hand playbook](../playbooks/scrape-without-credit.md). Validate the enum values and the date formats before posting; the save rejects a delayed pin without both delay fields and a reference with a malformed date.
