---
type: Strategy
title: Scraping strategy
description: How a URL or topic becomes a finished pin - the stages, the decision rules at each one, the quality bar, and what a stage does when the API is unavailable. The basis for the Scraping API and for a Claude Code session doing the same work by hand.
resource: ../../../src/server/scrape/index.ts
tags: [scraping, strategy, pins, fallback]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T20:00:00Z }
---

# Goal

Turn one source (a web page, YouTube video, X post, market page, or a topic to research) into **one pin**: a dated event with a place, a cost when it has one, its company, pictures, several independent references, a cited summary and its tags. The same stages run whether the app's Anthropic key has credit or a Claude Code session does the reasoning by hand, so every stage below has a **contract** (inputs and output shape) that either driver can satisfy. See [Scrape without credit](../playbooks/scrape-without-credit.md) for the by-hand driver and [Scraping API](../api/scraping-api.md) for the service built on these stages.

# Principles

1. **One pin per event, not per article.** The pin is the thing that happens (an opening, a launch, a release), dated to when it happens. The article is only its source. A roundup or listicle becomes many pins, each with its own deep link or product page as `sourceUrl`, never the shared article.
2. **Report only what a page supports.** Null is the right answer for a field the source does not state. The one exception is a delay with no new date, where the date is estimated and labelled `Estimated:` (see [Fields](fields.md)).
3. **Never type a URL from memory.** A reference, image or purchase link must have been returned by a fetch or search in this run. `sourceUrl` may be a URL found by search but never fetched (IMDb), and nothing else may be.
4. **Cost, date and place belong to the pin's own event.** A phase gets the phase's cost, the newest revision wins, and a place is where the thing is, not where its operator sits.
5. **Only the LLM calls wait for a session.** Everything that is not a Claude call runs the same with or without credit: the headless browser (rendered text, images larger than 150x150, embedded videos, headings), the page's own metadata (Open Graph, meta tags, JSON-LD), every keyless lookup (Wikipedia and Wikidata, AniList, Jikan, YouTube oEmbed and search, Kalshi), image top-up, studio HQ, threading and the save. The two Claude calls (field extraction, reference search) come back from the scrape as `llmTasks` for a Claude Code session to answer; see [Scraping without credit](no-credit-mode.md) and [Scrape without credit](../playbooks/scrape-without-credit.md).
6. **Every stage fails soft.** A failed image, reference, rating or lookup adds nothing and never aborts the scrape. Only the fetch of the source and the final save may fail the whole job.
7. **Use the real API to save.** A direct-SQL insert skips the live feed, search sync, duplicate checks, threading and tag sync. Save through `POST /api/pins`.
8. **Curators are per vertical.** Each content vertical posts as its own curator account (@GameDesk, @FilmDesk, @AnimeDesk, @TechDesk, @OddsDesk), so a batch is attributable.

# Stages

| # | Stage | Input | Output | Fails soft? | Detail |
| --- | --- | --- | --- | --- | --- |
| 0 | **Classify the source** | URL | `web` / `youtube` / `tweet` / `podcast` / `pdf` / `market` and the vertical | no | [Sources](sources.md), `sourceKind()` |
| 1 | **Fetch** | URL | Page text (body text of the rendered page), embedded YouTube/X media, page images larger than 150x150, headings; a PDF's text layer, or OCR of its first pages when it is a scan | no | [Sources](sources.md#pdfs) |
| 2 | **Extract the fields** | source URL + text (first 60,000 characters) | One JSON object: title, description, price, place, dates and their confidence, delay, company, categories, tags, stocks, work title, purchase links, summary | no (null without a key) | [Fields](fields.md) |
| 3 | **Find references** | source URL + text (first 20,000 characters) | Up to 5 references at confidence 70 or more, and a cited summary | yes | [Enrichment](enrichment.md#references) |
| 4 | **Screen details** | work title, category, year | Trailer, ratings (AniList, MAL, IMDb, Rotten Tomatoes, Metacritic), Kalshi score forecast | yes | [Enrichment](enrichment.md#film-tv-anime-and-game-extras) |
| 5 | **Place** | company, category | Studio headquarters for film, TV, anime and games with no place of their own | yes | [Enrichment](enrichment.md#place-and-company) |
| 6 | **Media** | pin so far | **Best effort to reach 3 media, at least 1 a video and 1 a picture**: the page's own pictures and embeds first, then the company's announcement, referenced articles' lead images, Wikipedia, video stills. Keep looking down the list until there are 3; save fewer only when every source is exhausted | yes | [Enrichment](enrichment.md#images) |
| 7 | **Awards and tags** | work title | Awards the work won or was nominated for, as tags | yes | [Enrichment](enrichment.md#awards-and-tags) |
| 8 | **Thread** | pin, source URL | `respondTo`: the previous season (anime) or model version (AI models) | yes | [Enrichment](enrichment.md#threads) |
| 9 | **Entries** | page headings | A release-notes or changelog page's dated entries, one pin each | yes | [Enrichment](enrichment.md#release-notes-pages) |
| 10 | **Review** | draft pin | A pin that meets the [quality bar](#quality-bar) | no | below |
| 11 | **Save** | draft pin + stocks + tags + categories | `POST /api/pins` (sources, wikis, summary and duplicate checks follow from the save) | no | [Scraping API](../api/scraping-api.md) |
| 12 | **Persist** | database | `npm run backup:data` so the seed data keeps it | no | - |

A `market` source carries one more reading through the save: the dollars traded on every market the pin links, stored on the pin by stage 11 and refreshed afterwards (see [How much money is on a market](#decision-rules)).

Stages 2 to 5 run in parallel where they do not depend on each other: the extractor and the reference search start together, and the screen details start as soon as the extractor has named the work. Stage 6 waits for the references (it takes pictures from the day's articles) and stage 8 waits for the extracted fields.

# Decision rules

**Which URL is the source.** Prefer the publisher's own page for the event. A video is rarely the event: pin the thing it covers, dated from the official schedule, and cite the video as a reference or the source. When a scrape finds a video or article whose subject already has a pin, add it to that pin as a reference instead of making a second pin (duplicates are suggested and confirmed, see the duplicate checks).

**Which date.** `startDateTime` is when the event itself happens, not when construction began or the article ran. A scheduled event uses its official time (`scheduled`). A year alone is its last day (`estimated`, all day, `2027-12-31`), a month its last day. A rumour or report pin with no fixed date is anchored to the article's `article:published_time`. A prediction market's date is the day its daily market prices highest (`estimated`) or its strike time when scheduled. Dates are UTC; an all-day pin starts 00:00Z and ends at the exclusive 00:00Z after its last day.

**Which cost.** The headline cost fully expanded (`CA$6.4 billion` is `6400000000`, `CAD`), matched to what the title says is happening: a programme's total for a programme, a part's own figure for a phase, line, terminal or building. Take the newest estimate, the midpoint of a range, and never trade volume, revenue or budgets. A film or game release carries no price (budgets and grosses go in the summary). Null when genuinely costless.

**How much money is on a market.** A prediction-market pin records what the market has traded, in dollars, as well as what it prices. Volume is how a reader tells a market that means something from a market with four bets on it, and a market with $15M behind its 30% is a stronger claim about the world than one with $900. So:

- **Quote it in the summary or description**, beside the odds it supports ("traders give $3,500 a 30% chance on a book that has turned over $15M"), and quote it per market when the pin cites more than one. A figure under about $10,000 is worth saying out loud as a caveat rather than left for the reader to find.
- **Where it comes from.** Polymarket reports dollars directly (`volume` on the event and on each market in the Gamma API; `volume24hr`, `volume1wk` and `volume1mo` say how much of it is recent). Kalshi counts **contracts**, not dollars: `volume_fp` on each nested market, which becomes money as contracts x their last price (`last_price_dollars`) - an estimate at today's price, and the figure the site and the pin page both show. Polymarket US publishes no volume at all, so a pin citing only that exchange has none to quote.
- **Never pass volume off as the pin's `price`.** The cost rule above stands: a market's turnover is not the event's cost, and a market pin has no `price`.
- **The pin carries the figure itself.** Once saved, `Pin.marketVolume` holds the dollars across every market the pin's source and references link (schema 0053, [pinMarketVolume.ts](../../../src/server/services/pinMarketVolume.ts)). It is written on save and edit, kept up as anyone watches the pin's odds, and refreshed in bulk by `npm run markets:volume -- --apply`; nothing an author types sets it. The pin page shows it beside the pin's other facts, and the timeline's bag weight lifts a pin for it ([bagSample.ts](../../../src/lib/bagSample.ts)), so a busy market earns its place on a crowded day. That is automatic - the curator's job is only to pick markets worth citing and to say what they have traded.
- **Prefer the liquid market** when two exchanges list the same question, and when a ladder's rungs quote out of order, the liquid rungs are the ones to date the pin from.

**Which company.** The single organisation the event is chiefly about or done by: a product's maker, a project's owner or operator, an agency for a mission. For film, TV, anime and games it is the studio or developer, never the publisher, broadcaster or streamer. Reuse an existing company by exact name (a rename is merged into the older row).

**Which category.** Only from the fixed list in [categories.ts](../../../src/lib/categories.ts), closest fit first. Never "Other": add a specific new category to the list instead. Films are `Movies`, TV shows `TV Series`, anime `Anime` and anime films `Anime Movie`.

**Which references.** Official announcement or press release first, then filings and government pages, then established news or trade press. Skip the source itself, aggregators, forums, social posts and SEO farms, and anything that only rewrites other coverage. A reference's `startDate`/`endDate` move the pin's dates, so leave them null unless the page firmly dates the event.

**Which media.** Make a best effort to reach **3 media** on every pin, **at least 1 of them a video and at least 1 a picture**: work down the sources in order and do not stop at the first one that adds a single picture. The page's own picture stays the default heading and the rest follow it. A video is a medium too and is now required: take one embedded on the page, else the maker's own launch or keynote video, a trailer or a verified-channel demo found with YouTube search (verify the channel and that it is the right work; a fan channel or the wrong title is worse than none), and add its still as a picture when the page had none. If every source is exhausted with fewer than 3, or with no video, save what was found and record in the job what was tried; never pad with a URL that was not fetched, an unrelated stock picture or a duplicate.

**Which pins respond to which.** Dated variants of one product (the colorways of a shoe, the trims of a car) form one linear chain ordered by date, oldest first: each pin's `parentId` is the previous pin, and the first has `parentId: null`. Pins on the same day keep the source's own order. Post them all first, then set the chain with a `PUT` per pin that carries the full pin body (media and references are re-saved wholesale, so send them back). Same rule as [series](../../../src/server/scrape/prequel.ts): one chain, never a branch. This holds for any run of pins about one recurring thing, not only products: a schedule of dated launches (SpaceX) is one chain across rockets in launch-time order but **newest first**: the latest launch is the head and each launch answers the one *after* it, so the oldest launch has the highest response number (the owner's rule for schedules; product variants and story series stay oldest first). Re-running the scrape re-chains, so a launch pinned later slots into place; a scraper that sets the chain itself does it after all the pins exist, by a `PUT` of each whole pin (`chainLaunches` in [launches.ts](../../../scripts/spacex/launches.ts)); never a direct `UPDATE` of `parentId`, which skips the page cache and left the head of the chain showing no thread.

**Where extra pictures come from.** Google Images cannot be scraped (no API, results are blocked), so widen the search through pages that carry the pictures: the retailer or blog page for that exact item (`og:image` from a plain `curl -A "<browser UA>"`; skip a site's generic placeholder image, e.g. Nice Kicks' `IMG_1350.png`), the maker's own launch coverage, and the lead image of each referenced article. The featured `og:image` is the cropped upload (`...-scaled-e<digits>.jpg`), not the `srcset` thumbnails.

# Quality bar

A draft is ready to save when:

- `title` names the event ("... Opens", "... Premieres"), under about 80 characters, without a site name.
- `description` is one or two plain sentences leading with the concrete detail a reader would remember.
- `utcStartDateTime` and `dateConfidence` are set, and `dateConfidenceReasoning` quotes the wording that decided it.
- A delayed event carries `originalStartDate` and `delayReasoning` (`Stated:` or `Estimated:`).
- `categories` has at least one value from the list, and `company` is set when a single organisation fits.
- `sourceUrl` is the source's own URL, not a shared roundup.
- `references` holds every reference at confidence 70 or more (never more than 5), and none is the source.
- 3 media reached by best effort, with at least 1 video and at least 1 picture among them; fewer, or no video, only when every source was tried, with what was tried noted.
- A prediction-market pin says what its markets have traded, in dollars, next to the odds it quotes.
- The `longFormSummary` is an HTML bulleted list whose every point cites what backs it.

# When the API is out of credit

Only stages 2 and 3 call Claude. Without a key or credit the scrape still runs every other stage. Stage 2's fields fall back to what the page's own markup states ([metadata.ts](../../../src/server/scrape/metadata.ts): the title with the site name stripped, the description, an Event's start date as `scheduled` or the publish date as `unknown`, an Event's place, a Product's price, keyword tags; never a company, category or coordinates). The scrape response then carries `llm: "session"` and `llmTasks`: the extraction and the reference search, each with the app's own system prompt, JSON schema and input. A Claude Code session answers them and saves through the same route: [Scrape without credit](../playbooks/scrape-without-credit.md).
