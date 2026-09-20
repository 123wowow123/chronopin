# Update Log

## 2026-09-20
* **Update**: [Verticals](/scraping/verticals.md), [Sources](/scraping/sources.md) and [Learnings](/scraping/learnings.md) cover the economy, crypto, AI and space prediction-market pass (pins 1980-1993): Kalshi's `series?category=` names, the two-pass scan around a priceless events list, differencing a cumulative "by when" ladder to date a pin, non-monotonic thin rungs, keyless spot prices, and the new `Macroeconomics` category.
* **Update**: [Verticals](/scraping/verticals.md) and [Learnings](/scraping/learnings.md) cover the politics, elections and geopolitics prediction-market pass (pins 1967-1979): finding political events through Polymarket's `tag_slug` rather than Kalshi's open list, taking the date from a market's rules text, the date a Kalshi event ticker carries, how to quote a cumulative ladder, and the new `Elections` category.
* **Update**: [Verticals](/scraping/verticals.md) and [Learnings](/scraping/learnings.md) cover the sports and entertainment prediction-market pass (pins 1953-1966): finding near-term events through the Kalshi series catalogue and Polymarket `tag_slug`, the `*_dollars` price fields, why `expected_expiration_time` is not the event date, and the Kalshi market URL shape.

## 2026-09-19
* **Update**: [Learnings](/scraping/learnings.md) and [Verticals](/scraping/verticals.md) cover the 2027 movie roundup: 70 pins, franchise chains, Wikipedia redirect and premiere-date traps.
* **Update**: [Fields](/scraping/fields.md), [Enrichment](/scraping/enrichment.md), [Sources](/scraping/sources.md) and [Verticals](/scraping/verticals.md) cover the episode count an episodic pin now carries (`episodeCount`, `episodeStatus`), its three sources and why a film never gets one.
* **Update**: [Sources](/scraping/sources.md), [Enrichment](/scraping/enrichment.md) and [Learnings](/scraping/learnings.md) cover the Wikimedia User-Agent fix, blocked-page detection and the `media:top-up` and `wiki:refetch-blocked` backfills.
* **Creation**: Added [Scraping without credit](/scraping/no-credit-mode.md): what a scrape still does with no key or credit, the metadata fields and the `llmTasks` response.
* **Update**: [Strategy](/scraping/strategy.md), [Scrape without credit](/playbooks/scrape-without-credit.md) and the [Scraping API](/api/scraping-api.md) now say that only the LLM calls wait for a session: a no-credit scrape returns page-metadata fields and `llmTasks`.
* **Update**: [Learnings](/scraping/learnings.md) records the live check of the 3-media rule and the page-title fallback for the picture top-up.
* **Update**: The [strategy](/scraping/strategy.md) and [enrichment](/scraping/enrichment.md) pages now make reaching 3 media on every pin, with at least 1 picture, a best-effort target; the scraper counts a video toward the 3 ([mediaTarget.ts](../../src/lib/mediaTarget.ts)).
* **Creation**: Added the [scraping](/scraping/index.md) group ([strategy](/scraping/strategy.md), [fields](/scraping/fields.md), [enrichment](/scraping/enrichment.md), [sources](/scraping/sources.md), [verticals](/scraping/verticals.md), [learnings](/scraping/learnings.md)), the [Scrape without credit](/playbooks/scrape-without-credit.md) playbook and the [Scraping API](/api/scraping-api.md) design.
* **Creation**: Added [UserWiki](/tables/user-wiki.md), the per-user preference wiki that weighs the timeline's pick on crowded days, with its admin toggle.
* **Update**: [Lint the wikis](/playbooks/lint-the-wikis.md) now covers the nightly re-read and its two admin options, which can be on together: viewed pins (on by default) and every N days since the last read (never by default).
* **Creation**: Added [Lint the wikis](/playbooks/lint-the-wikis.md), [Without API credit](/playbooks/without-api-credit.md) and [OkfLintFinding](/tables/okf-lint-finding.md).
* **Creation**: Wrote the [README](/README.md), the [pipeline](/pipeline/refresh-a-pin.md), [playbooks](/playbooks/catch-up-and-retry.md), [tables](/tables/source.md) and [API](/api/pin-sources.md) concepts.

## 2026-09-18
* **Creation**: Link wikis (0026) and the OKF export were added. The Claude calls had not run yet, because the app's API key had no credit.
