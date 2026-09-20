---
type: Log
title: Scraping learnings and feedback
description: Dated log of what scraping jobs taught and what the owner corrected, newest first. Update it after every scraping job so the strategy stays current.
resource: strategy.md
tags: [scraping, learnings, feedback, maintenance]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T20:00:00Z }
---

# How to keep this current

After **every** scraping job (a scrape, a backfill, a batch of pins, a reference or wiki round), add an entry below with the date, what was done, and each thing that surprised, failed or was corrected. Then fold it into the page it belongs to: a site's behaviour into [Sources](sources.md), a vertical's recipe into [Vertical recipes](verticals.md), a rule about a field into [Fields](fields.md) or [Enrichment](enrichment.md), a change of approach into the [Strategy](strategy.md), and a contract change into the [Scraping API](../api/scraping-api.md). Record the owner's feedback verbatim in spirit, with the reason, and note how it changes the behaviour. Add a line to [the log](../log.md).

Entry format: `## YYYY-MM-DD - <job>`, then `* **Learned**`, `* **Feedback**` (owner corrections and confirmed approaches) and `* **Changed**` (which page was updated).

# Standing feedback from the owner

* **Scrape without sign-off.** Asked to scrape a URL into a pin, do the whole thing end to end: real `POST /api/pins`, the image, `backup:data`, then report. Local dev database only; production writes still need confirming.
* **Duplicates become references.** When a scrape finds a source whose subject already has a pin, add it to that pin as a reference instead of discarding it or making a second pin.
* **Roundups need per-item sources.** Never give every pin from a listicle the same shared article URL.
* **No "Other" category.** Create a specific category in `categories.ts` rather than force-fit or use Other.
* **Match the cost to the pin's own event.** The phase's figure over the programme's, the newest revision, null when genuinely costless.
* **Series are one chain.** A response series is one linear story-ordered chain; if a branch seems needed, ask.
* **Persist seed data with `npm run backup:data`**, never by hand-editing the seed JSON.
* **When the API key has no credit, use the session LLM.** Do the LLM stages by hand with the app's own prompts and schemas and apply them through the same scripts (`wiki:export`/`wiki:apply`, `references:apply`, `POST /api/pins`); never wait for credit.
* **Get 3 media on every pin, best effort, with at least 1 image.** Owner, 2026-09-19: the media stage should keep looking until a pin has 3 media (a video counts), not stop at the first source, and a pin always gets at least one picture. Built: `src/lib/mediaTarget.ts` replaces the pictures-only `TARGET_IMAGES`. Fewer is acceptable only when every source is exhausted, and never padded with unfetched or unrelated pictures.
* **Do not add write-ups to the root README.**
* **YouTube transcripts should feed the wikis.** Owner, 2026-09-19: pull transcripts for wiki generation. (Blocked for now by YouTube's 429; see below.)

# Log

## 2026-09-19 - Episode counts on episodic pins
* **Learned**
  * Wikidata's `wbsearchentities` answers a film title with the series of the same name often enough to matter: "Supergirl" and "Masters of the Universe" both came back with an episode count (126 and 38) for a film pin, because the title and year checks pass and the review scores that would have exposed the mismatch were missing. Episode counts are now taken only for a pin whose category is `Anime` or `TV Series`, and never from a Wikidata item described as a film.
  * A count alone is ambiguous while a show is going out, so `episodeStatus` says what the number is: AniList's `episodes` is a total that is only `complete` once `status` is `FINISHED`, and a long-running show (One Piece) leaves `episodes` null, so what is out so far comes from `nextAiringEpisode.episode - 1` and reads as `ongoing`. Live checks: Frieren 28 complete, One Piece 1,178 so far, Severance 19 so far (Wikidata, no end time), Dune: Part Two nothing.
  * A count of one is not worth showing, so films and one-episode entries are dropped before they reach the pin.
  * **Do not parallelise this backfill.** Five workers over 640 pins pushed AniList into 429 and it then answered nothing: pins that match perfectly on their own (Gintama Season 2, Attack on Titan Season 2, Fruits Basket The Final Season) were logged as matching nothing, and only 93 of 640 got a count. One worker with a 2s pause matches them. `getText` now waits out a 429's `Retry-After` once (up to 70s).
  * Title matching misses most anime pins anyway, because they are titled by the event ("... Premieres"). The pins carry their MyAnimeList link, so the count is looked up by MAL id first (AniList `Media(idMal:)`, then Jikan) - that reaches the seasons the title search cannot.
* **Feedback** Owner, 2026-09-19: "scraped shows should get and say how many episodes for Tv show, anime, anything these has multiple epsisods". Built as a pin field, not a lookup at render time, so a hand-made pin can carry it too.
* **Changed** `Pin.episodeCount`/`episodeStatus` (schema 0047), the extractor's schema and prompt, `screen.ts`, the pin page and card, and `media:screen --skip-trailer all` for the backfill; [Fields](fields.md), [Enrichment](enrichment.md), [Sources](sources.md), [Verticals](verticals.md).

## 2026-09-19 - Backfill of missing media and blocked links (no API credit)
* **Learned**
  * 1,707 of 1,708 pins had fewer than 3 media and 398 had no picture. `npm run media:top-up` finds pictures with the scrape's keyless sources and stores them; the first run stalled because Wikimedia answered 429 to every download with the app's browser-like User-Agent, while a User-Agent naming the client and a contact returned 200 for the same image. Fixed in `src/server/image.ts`.
  * The link reader accepted bot-check and error text of any length as the article, because it only fell back to the browser for pages under 500 characters. About 100 stored links were such pages. It now recognises them (`looksBlocked`), retries in the headless browser as plain Chrome with a wait for the challenge, and fails the link when it is still blocked. In a first check 3 of 5 blocked pages read.
  * Some blocked pages are not caught by text alone (a site's front page served for an old article URL); those still need the page-is-the-article check by the writer.
  * YouTube still answered 429 to caption downloads several hours after the bulk sync.
* **Noted** The extractor prompt and schema gained `episodeCount` and `episodeStatus` while this ran; [Fields](fields.md) lists them. The metadata fallback leaves them null (a page's markup does not say).
* **Changed** Scraper and scripts: `image.ts` (Wikimedia User-Agent and Retry-After), `sourceText.ts` (`looksBlocked`, browser retry), `media:top-up`, `wiki:refetch-blocked`; [Sources](sources.md), [Enrichment](enrichment.md).

## 2026-09-19 - No-credit scrape: everything but the LLM calls still runs
* **Feedback**
  * "as much of the scraper api web scraping feature should be used without credit so headless scraping to get media should still be used" and "only LLM calls will use session calls": a scrape with no credit must keep every deterministic stage; only the Claude calls go to the session.
* **Learned**
  * The headless browser, media, keyless lookups and image top-up already ran without credit; what was lost was the fields (the title empty, so the top-up had nothing to search) and the two Claude stages, silently.
  * The page's own markup gives a good title and description: `og:title` before an Article's JSON-LD headline (Wikipedia's headline is a short description, "crossing of the Detroit River"), with the site name stripped by `og:site_name` or by the host ("- Wikipedia"). A publish date is a poor event date, so it is stored as `unknown` with the reason.
* **Changed** Scraper: `metadata.ts` (fields from markup), `llmTasks` in the scrape response (`extractTask`, `referencesTask`); [Strategy](strategy.md), [Scrape without credit](../playbooks/scrape-without-credit.md), [Scraping API](../api/scraping-api.md).

## 2026-09-19 - Live scrape check of the 3-media rule (no API credit)
* **Learned**
  * `GET /api/scrape?url=` with no extractor answer still runs the fetch, embeds, images and top-up. A YouTube video-only link came back as 1 video and 2 stills (3 media, pictures included). Before the change to count a video toward the 3, it stopped at 3 stills.
  * With no extractor title the top-up had nothing to search, so a text-only page stayed at 2 low-value site-default images (Federal Reserve press release). The scrape now falls back to the page's own `<title>` as the search term; that reached 3 media, but the Wikipedia match was only loosely related (a Federal Reserve founder's portrait). A top-up from a raw page title is best effort: review it, and prefer the extractor's title, the company's announcement or a referenced article's lead image.
  * A guessed URL can return a site's listing page with dozens of unrelated images (a NASA news URL that no longer exists): check the page is the article before trusting its pictures.
* **Feedback**
  * "add should best effort get 3 medias" then "with at least 1 image": 3 media of any kind, at least 1 a picture.
* **Changed** Scraper (`src/lib/mediaTarget.ts`, `scrape/index.ts`, `api/scrape/images`), [Enrichment](enrichment.md#images-and-media).

## 2026-09-19 - Whole-catalogue OKF backfill and reference run (no API credit)
* **Learned**
  * `wiki:sync --all` registered ~3.7k links; a bulk fetch of 524 YouTube videos made YouTube answer 429 to every caption download from this address, even through a real browser. Throttle and back off; retry after hours.
  * About 10% to 30% of web sources returned bot-check, 403/404, homepage or aggregator-front-page text (Cloudflare on Bloomberg, GameSpot, Kickstarter, Neowin, TechPowerUp, eWeek, Britannica, Axios; Windows Central and MSN return the current front page; IMDb 403). A wiki written from that text is worthless and, worse, drags a rebuilt summary down. Marker files (`results/blocked/<id>.txt`) replaced "no content" wikis; pins with no usable wiki keep their old summary.
  * Job files carry the pin's `existingSummary` so the writer can return `null` (keep) when the new wikis are thinner. Every batch that reported nulls (1 to 8 per 30) did so correctly on pins whose only wiki was a one-line release-notes mention or a blocked page.
  * A single MAL wiki makes a summary that states only what MAL states, so older claims that came from other sources (directors, box office) drop out.
  * Scripted MAL wikis (a parser copying the page's fields into the schema) are a legitimate way to write hundreds of wikis; they are formulaic (titles keep MAL wording, "Related entries" formatting is rough).
  * Agents sharing one work directory overwrote each other's helper scripts (`mk.js`, `w.js`); one ran a cleanup loop over other agents' files. Give every agent a scratch prefix and forbid editing shared files.
  * AniList `429`/Cloudflare 1015 appears under parallel load; Jikan 504s; Wikipedia rate-limits API bursts.
  * Reference yield: non-anime pins gave real press releases and trade reports (21 of 25 sampled pins found something, at about 1 search and ~10 fetches per pin); anime pins gave only Wikipedia series pages at confidence 70 to 78, so the run was limited to non-anime pins at confidence 80 or more.
  * Studio HQ: Wikidata covered ~70% of anime and film studios; the rest needed a by-hand lookup, and Chinese and Korean studios could not be verified by name match alone.
  * A trailer picked by title can be the wrong work (the live-action One Piece for the 1999 anime) or a fan channel; two of seven backfilled trailers were removed after review.
* **Feedback**
  * "never wait for credit is topped and do it using session LLM" - run the LLM stages with agents and the export/apply scripts.
  * "youtube transcripts should be pulled for wiki generation too" - added `npm run wiki:transcripts`.
  * "This should be updated when more scraping jobs are issued and learnings are captured with my feedback" - this page and the standing note exist for that.
* **Changed** [Sources](sources.md) (blocked-fetch recognition, YouTube 429), [Enrichment](enrichment.md) (reference yield, studio HQ by hand, trailer review), [Strategy](strategy.md) (quality bar, marker files).
