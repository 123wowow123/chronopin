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
| `startDateTime`, `endDateTime`, `allDay` | ISO UTC, ISO UTC, bool | The event itself. All-day: 00:00Z of the date, end is 00:00Z of the day after. A span takes its **last** day - a bare year is 31 December, a quarter or season its final day - unless the page says the event runs *from* it, which takes the first |
| `endDateTime` for a **thing in force** | ISO UTC | Owner, 2026-09-21: "For law and relevant pins. Should have effective start and end date." A law, stopgap, contract, authorisation, ban, mandate or fiscal year is a *period*, not a day: give it the end of the window it covers, not just the day it was signed or began. The end is the **exclusive** 00:00Z boundary, so a law in force through 11 December 2026 ends `2026-12-12T00:00:00Z` - the same convention a shutdown's last day uses. Quote the operative clause in the reasoning (H.R. 6500 section 106(3); the IIJA's FY2022-FY2026 authorisation). Leave it null only when the thing is genuinely open-ended (a ban with no sunset), and keep single-day pins single-day when the pin *is* the moment: a signing you are pinning as an event, a deadline falling due, a vote, a budget being presented |
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

# Adding a category

A category name lives in **seven files**: `categories.ts` and all six
translation dictionaries.

1. `src/lib/categories.ts` - the entry in `CATEGORIES`, placed beside its
   neighbours rather than appended, since the list's order is the tag cloud's.
2. `src/lib/i18n/messages/{en,de,es,fr,ja,zh}.ts` - the `categories` block, keyed
   by `slugify(name)` (`'Religion & Belief'` -> `religion-belief`). English
   repeats the category name exactly; the others follow their own convention -
   German and Chinese keep the ampersand form (`Religion & Glaube`,
   `宗教与信仰`), Spanish and French spell out the conjunction
   (`Religión y creencias`, `Religion et croyances`), Japanese uses the middle
   dot (`宗教・信仰`).

**What enforces it is the test, not the types.** `Messages = Shape<typeof en>`
requires of the other five languages only what `en.ts` itself declares, so a
category added to `categories.ts` and to no dictionary at all is required of
nobody: `tsc` passes and `categoryLabel` quietly falls back to the raw English
name in every language. A **rename** is worse - the old key stays behind in all
six files, nothing complains, and every language falls back to English while a
dead key lingers. The `category labels` block in
[i18n.test.ts](../../../src/lib/i18n/i18n.test.ts) is what actually holds the
two lists together: every category is named in every dictionary, no dictionary
keeps a label for a category that no longer exists, and English repeats the
category name exactly. Run `npm test` after the edit - a forgotten language
fails there by name, and only *then* does `tsc` add its own error if you got as
far as `en.ts`.

Nothing else needs touching: the extractor's schema, the pin form, the tag cloud
and the `category:` search term all read the same list. The dev server picks the
new list up without a restart, and `POST /api/pins` accepts the name
immediately.

**Do not add a category you are not going to fill.** An empty category is a dead
entry in the tag cloud; seed each new one in the same pass that adds it.
