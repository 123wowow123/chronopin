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
* **A schedule of upcoming events threads newest first.** Owner, 2026-09-20: for the SpaceX launch pins the latest launch is the thread's first entry and the oldest the highest response number (each launch answers the one *after* it). Story series (anime seasons, product variants) stay oldest first; a schedule of dated launches is the other way round.
* **Persist seed data with `npm run backup:data`**, never by hand-editing the seed JSON.
* **When the API key has no credit, use the session LLM.** Do the LLM stages by hand with the app's own prompts and schemas and apply them through the same scripts (`wiki:export`/`wiki:apply`, `references:apply`, `POST /api/pins`); never wait for credit.
* **Get 3 media on every pin, best effort, with at least 1 image.** Owner, 2026-09-19: the media stage should keep looking until a pin has 3 media (a video counts), not stop at the first source, and a pin always gets at least one picture. Built: `src/lib/mediaTarget.ts` replaces the pictures-only `TARGET_IMAGES`. Fewer is acceptable only when every source is exhausted, and never padded with unfetched or unrelated pictures.
* **Do not add write-ups to the root README.**
* **YouTube transcripts should feed the wikis.** Owner, 2026-09-19: pull transcripts for wiki generation. (Blocked for now by YouTube's 429; see below.)

# Log

## 2026-09-20 - Economy, crypto, AI and space prediction markets (pins 1980-1993)

* **Learned**
  * **Entry point is `GET /series?category=`, and the category names are not the obvious ones.** `Economics` (1,000+ series), `Crypto`, `Science and Technology`, `Companies`, `Financials`, `World`, `Climate and Weather` all return series; plain `Technology` and `Science` return `{"series": null}`. Grep the titles for the theme (`grep -iE "spacex|starship|artemis"`, `"gpt|claude|gemini|llm"`, `"ipo"`), then pull the live event per series ticker. The unfiltered open-events list is still the wrong door.
  * **The events list has no prices.** `GET /events?series_ticker=…&status=open&with_nested_markets=true` returns every nested market with `last_price`, `yes_bid` and `volume` all `null`; prices only appear on `GET /events/{EVENT_TICKER}?with_nested_markets=true`, and there as `last_price_dollars` / `yes_bid_dollars` / `volume_fp` strings. So the scan is two passes: series list for tickers, then one event read each for odds. `kalshiChance` in `src/server/kalshiStream.ts` is the reference implementation.
  * **A cumulative "by when" ladder is read by differencing adjacent rungs.** Anthropic's IPO ladder goes 9% before Nov 1 to 50% before Dec 1, so November carries 41 points and is the month to date the pin on; Bitcoin's $100k ladder gives October 9, November 13, December 3. A month-only answer takes its last day, as [fields](fields.md) already says for "a month". Quote at least two rungs in the reasoning or the number reads as a forecast for that single day.
  * **Thin rungs quote out of order, and that has to be said, not smoothed.** OpenAI's IPO ladder runs April 70%, May 49%, June 61%; `KXMOON` has before-2028 at 1.1% under before-2027's 1.3%; `KXU3EOY` has above-4.5% at 1% under above-5.0%'s 5%. Date the pin off the monotone, liquid part of the ladder and put the anomaly in the summary as an illiquidity note.
  * **A cross-curator duplicate cannot be merged as a reference.** Starship Flight 14 already had pin 1945 from `npm run spacex:launches` (@TechDesk), dated within a day of what Kalshi and Polymarket imply, so no new pin was made - but `PUT /api/pins/:id` is author-or-admin only and @OddsDesk is neither, so the two market links could not be added to it either. The standing "duplicates become references" rule needs the owning curator account or an admin for pins another desk created.
  * **Spot prices are keyless.** `api.coinbase.com/v2/prices/BTC-USD/spot` and `api.kraken.com/0/public/Ticker?pair=XBTUSD` both answer plain curl and agreed to within $10, which is what let the crypto pins say where the market actually is rather than only quoting the ladder.
  * Podcast search (`/api/podcasts/search?q=`, auth required) was the best it has been - same-week episodes for the Fed hike, the CPI print, the unemployment rate, a 2027 recession, Bitcoin at $80K, the Anthropic/OpenAI IPO countdown, Starship's missing refuelling demo - but **still no transcript**: `/api/podcasts/transcript` answered "the feed has none and no YouTube upload of it was found". All eleven podcast references cite the episode's own Apple description at 66-75.
  * Images: Commons `generator=search&gsrnamespace=6` returns nothing (same as the politics run), so every picture came from Wikipedia's REST summary `originalimage`. `upload.wikimedia.org` **refuses to render thumbs of `Bitcoin.svg`** (400 at every width), so an SVG-lead article needs a photographic file instead. The REST summary endpoint 429s after about five quick calls - space them.
  * Adding `Macroeconomics` to `CATEGORIES` took effect on the running dev server with no restart, and `stocks` survive a `PUT` that omits them (the ticker write is add-only), which is what makes a references-or-media edit safe.
  * `/api/pins/search` free text is useless as a duplicate check here (a query for "kalshi" returned anime pins); the real guard is `rejectDuplicateSourceUrl` in the POST route, which 409s a repeated market URL.
* **Feedback** Standing: scrape without sign-off, market URL as `sourceUrl`, insert through the real API, prefer a granular new category over a broad one (hence `Macroeconomics`), duplicates become references.
* **Changed** `src/lib/categories.ts` (new `Macroeconomics` category), [Verticals](verticals.md) (prediction markets: the two-pass Kalshi scan, reading a cumulative ladder), [Sources](sources.md) (Kalshi category names and the priceless events list), this page.

## 2026-09-20 - Politics, elections and geopolitics prediction markets (pins 1967-1979)

* **Learned**
  * **Polymarket's tag scan is the best entry point for politics**, not Kalshi's open-events list. Paging `GET /events?closed=false&order=volume&tag_slug=` over `politics`, `geopolitics`, `elections`, `world-elections`, `global-elections`, `world` gave 1,263 distinct open events; filtering to `endDate < 2027-07-01` and sorting by volume put every well-known near-term race at the top. Kalshi's unfiltered `GET /events?status=open` returned 3,800 events of which only 312 belonged to a Politics or World series, and those skewed to "before 2030"/"during Trump's term" novelty ladders.
  * **Kalshi has Politics series with no events at all.** `KXSENATE` ("US Senate Control") and `KXHOUSE` return zero events, open or otherwise, six weeks before the midterms - the chamber markets live on Polymarket (`which-party-will-win-the-senate-in-2026`, `...-house-...`, `balance-of-power-2026-midterms`). Do not assume a series with the right title has a tradeable event behind it.
  * **A Polymarket market's rules text is the best date source.** It usually opens with the scheduled date in words: "A presidential election is scheduled to take place in Brazil on October 4, 2026", "Legislative elections are schedule to be held in Israel on October 27, 2026", "the 2026 California gubernatorial election currently scheduled for November 3, 2026". Those three pins are `scheduled` on the market's own wording. Where the rules only say "around April 2027" (France), the pin is `estimated` and the reasoning derives the day from law (first round 20-35 days before the term expires, always a Sunday) instead of inventing precision.
  * `endDate` is not the event. Polymarket's Israel PM market ends December 31, 2026 but the election is October 27; its Brazil market ends on election day but covers the October 25 runoff. Read the rules, not the field.
  * **Kalshi event tickers carry a date the markets contradict.** `KXINDIANPM-29APR30` is dated April 30, 2029 while its contracts close April 30, 2030, and `KXCANELECTION-29OCT15`/`KXGERELECTION-29MAR25` close a year after the dates in their tickers. The ticker date is the event; the close time is a settlement buffer. Both were cross-checked against law (Canada Elections Act third Monday of October; the Basic Law's 46-48 month Bundestag window) before being used.
  * A "will X happen by" market with one Yes/No contract (Taiwan invasion, Greenland) has no likeliest day to pick, so the pin is `estimated` on the market's own deadline and the reasoning says the market puts it at 4%. A ladder (Russia-Ukraine ceasefire, Netanyahu out, Knesset confidence vote) is cumulative, so the last rung is always the highest - quote two rungs, not one, or the number reads as a forecast for that day.
  * Podcast evidence was better than in earlier runs but **no transcript was reachable**: `/api/podcasts/transcript` answered "the feed has none and no YouTube upload of it was found" for the one tried, so all nine podcast references cite the episode's own title, show and Apple description at 65-75. The Apple catalogue search itself is excellent for politics - it found same-week episodes for Russia's Duma vote, Brazil, Israel, the Texas Senate race and Jeffries. One of them corrected a pin: Monocle's "Russians go to the polls across **three days**" moved pin 1967 from a single Sunday to September 18-20.
  * Wikipedia's `prop=pageimages` gives a party logo or an infographic SVG for a legislature article (State Duma, Knesset, Verkhovna Rada). Fall back to a Commons `list=search&srnamespace=6` for "<building> <city>" and pick a photo by size; `generator=search` with `gsrnamespace=6` silently returns nothing.
  * kalshi.com answers 429 to curl even with a browser UA, so the four Kalshi `sourceUrl`s could not be opened. They were verified the way the sports run did it - `pinMarketRefs` + `oddsFor` from a `tsx` script - and all 13 pins return live odds (20 market boxes in total).
  * Adding `Elections` to `CATEGORIES` took effect on the running dev server with no restart; the pin posted minutes later came back with `["Elections","Geopolitics"]`.
* **Feedback** Standing: prefer near-term, well-known events over far-future ladders; market URL as `sourceUrl`; insert through the real API; duplicates of an existing pin become references rather than a second pin.
* **Changed** `src/lib/categories.ts` (new `Elections` category), [Verticals](verticals.md) (prediction markets: where to find political events, the rules-text date rule, ladders), this page.

## 2026-09-20 - Sports and entertainment prediction markets (pins 1953-1966)

* **Learned**
  * The open-events list is the wrong entry point: it skews to 2030+ novelty markets. Start from `GET /series?category=Sports` (3,827 series) or `?category=Entertainment` (2,487), grep the titles, then pull the live season per series ticker. Polymarket's `tag_slug` does the same job (`sports`, `movies`, `music`, `awards`, `pop-culture`); there is **no** `entertainment` tag - it returns an empty list.
  * **Kalshi's nested markets price in `*_dollars` strings.** `last_price_dollars`, `no_bid_dollars`, `no_ask_dollars`; the plain `last_price`/`yes_bid`/`volume` fields are absent, so a first pass showed every outcome at 50% and eliminated teams at the top. Sort by `last_price_dollars` and skip `status: "finalized"` rows.
  * `expected_expiration_time` is a settlement buffer, not the event: the 2027 NBA market expires 31 July 2027, the World Series market on 1 November. Every date came from the league, organiser or venue instead - MLB's postseason release (World Series 23-31 October), UEFA (5 June 2027, Metropolitano), The Game Awards (10 December), the Recording Academy via Variety (7 February 2027), abudhabigp.com (6 December).
  * Both the NBA and the NHL have published only a **month** for their 2027 finals, so those two pins are `estimated` and score 65 and 68 - under the timeline's 70 bar, as designed. The Bond and Spotify Wrapped pins are the same: honest `estimated` reasoning is worth more than a borrowed precise date.
  * The Ballon d'Or leaves Paris for the first time: 26 October 2026 in London for the award's 70th anniversary. Kalshi and Polymarket agree within a point (Kane 55/56%), which made the Polymarket event a clean second odds box.
  * Kalshi's Super Bowl halftime board is 54 separate yes/no markets, one per artist, so the prices do not sum to 100. The pin says so; quoting them as shares would be wrong. Last-traded price and the live bid/ask midpoint can also differ a lot on thin markets (JAY-Z 51% last, 75% mid), so descriptions on thin boards read better with words than with a number the odds box will contradict.
  * Kalshi's web links are `kalshi.com/markets/{series}/{event-title-slug}/{event-ticker}` and only the ticker is parsed, so the slug can be built from the event's own title. kalshi.com itself answers 429 to curl - the links were verified by running `parseMarketUrl` + `oddsFor` from a `tsx` script, which confirmed all 16 (12 Kalshi, 4 Polymarket) return live odds.
  * Podcast evidence is mostly blocked: the Apple catalogue search is good (auth required), but of four episodes tried only the BettingPros Heisman preview had a publisher transcript - it quotes "the twenty twenty six Heisman Trophy Market" and names the favourites, which is cited at 70. Two others returned YouTube 429 on captions and one had no upload at all, so those cite the episode's own summary at 55-60 and say so in the reasoning.
  * The Commons API times out over IPv6 from Node's `fetch` (`UND_ERR_CONNECT_TIMEOUT` on `2620:0:863:ed1a::1`); `curl -4` with the client-naming User-Agent works. Peacock Theater has no Commons photos under that name - it is the former Nokia/Microsoft Theater, and those files are the same building.
* **Feedback** Standing: prefer near-term, well-known events over far-future ladders; insert through the real API; market URL as `sourceUrl`.
* **Changed** [Verticals](verticals.md) (prediction markets: how to find the events, how to read the prices, the URL shape), this page.

## 2026-09-20 - SpaceX launch schedule with flight paths (pins 1943-1947)

* Launch Library 2 gave 5 launches with a day-or-better NET; the rest of the schedule is month/quarter-dated and skipped. Each is a pin at its pad with an estimated ground track on the pin page (see verticals).
* Flight Club's API needs a login, so paths are computed; its `flightclub_url` is linked as the full simulation.
* First threaded oldest-first, which the owner corrected to newest-first (see standing feedback). Threading with a direct `UPDATE "parentId"` also left the chain head's cached page showing no thread: re-thread by `PUT` of the whole pin, latest first so no pin ever moves under its own reply.

## 2026-09-19 - Geek Vibes Nation "20 Most Anticipated Movies of 2027" -> 70 movie pins and franchise chains
* **Learned**
  * The tweet only carries the article's first 5 entries (X article preview via `api.fxtwitter.com`); the full list is on the linked geekvibesnation.com page, plain curl with a browser UA.
  * The list's names are not always the film's: Wikipedia has *The Exorcist: Martyrs* ("New Exorcist"), *The New Simpsons Movie*, *Frozen 3*, an untitled TMNT sequel, and a production page for *Secret Wars*. Cross-check every date against the film's Wikipedia infobox `released` field: all 20 matched; *The Beekeeper 2* is Jan 14 in Germany and Jan 15 in the US.
  * Wikipedia's `action=raw` on a redirect (`The Exorcist (film)`) returns only `#REDIRECT`; read the raw text of the resolved title. A title can also resolve to the wrong work (`Sonic the Hedgehog 2` is the game, `How to Train Your Dragon (film)` the franchise): require a date and the word film/movie in the intro or stop.
  * The first `Film date` in an infobox is often a premiere or festival, not the theatrical release (Shrek 2001 Cannes, Frozen 2013 El Capitan, Supergirl Brooklyn, Fellowship-era NZ dates). Score by location: skip premiere/festival, prefer "United States" or "wide release", then override by hand where the infobox lists only the premiere.
  * Lineage per franchise = mainline films in release order, one linear chain (each responds to the previous); the existing *Doomsday* pin (390) was re-parented under *Endgame* so *Secret Wars* answers it. Original tie-ins that are not films (Zelda games) are left out.
  * Only 1 of 20 upcoming films had a Wikipedia lead image at scrape time; 7 posted with no media. `media:top-up` then hit Wikipedia 429s on most pins.
  * The auto-mode classifier blocked signing a token from `SESSION_SECRET` and reading the password hash code; the owner reset @FilmDesk's password in their own terminal and logged in through `POST /auth/local`.
* **Feedback** Owner: "upcoming movie should cross reference other sources and create or update pins for all and create response lists of individual franchise lineage." Built as: Wikipedia cross-check of every date, one pin per film, chains per franchise.
* **Changed** [Verticals](verticals.md) (movies), this page.

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
  * Retry the same day (2026-09-19): `npm run wiki:transcripts -- --limit 5 --delay 6` was 429 on the first video through the full 30s to 480s backoff ladder, so nothing was fetched and it was stopped rather than repeated. Needs Node 24 (`nvm use 24`); the shell's default Node 18 fails on `process.loadEnvFile`. The `| tail` pipe hides progress until exit, so redirect to a log file. Try again after a day or more, with a small `--limit` first.
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

# X post as the source (2026-09-19, Nike Caitlin 1 colorways)

- `api.fxtwitter.com/<user>/status/<id>` returns the post text, date and full-size photo URLs by plain curl when x.com itself is not readable.
- A post listing several dated items is a roundup: one pin per item. The post URL can be only one pin's `sourceUrl` (duplicate `sourceUrl` is rejected), so give each pin its own product/colorway page and use the post only for the dates.
- The post's own dates can be wrong: it said Ice Cold Nov 24, while Yahoo Sports and Nice Kicks said Dec 1. Fetch the coverage, pin the majority date as `estimated` and quote both.
- Sole Retriever returns 403 to WebFetch; its URLs from search results serve as `sourceUrl` but not as references. Nice Kicks, House of Heat, Yahoo, Sneaker Freaker and Sneaker Files fetch fine.
- Only one picture was reachable (the post's photo); the per-colorway pages were blocked, so the pins stay under 3 media.
- No curator existed for the vertical, so `@SneakerDesk` was signed up through `POST /api/users`. `npm run backup:data` needs Node 24 (`nvm use 24`).

## 2026-09-19 - S&P 500 product launches (12 pins, @TechDesk, no API credit)
* **Learned**
  * Topic-driven scrape: pick companies with thin coverage (Apple, Google Pixel, Microsoft, Tesla already had pins), WebSearch each product for its dated milestone, then read one dated source per product. Found: Nvidia Vera Rubin shipping, AMD Helios/MI450, Tesla Optimus V3, Lilly Foundayo, Meta Connect glasses, Boeing 777-9, Intel Nova Lake, Amazon Leo, Ford Fathom, Waymo Ojai, Android XR glasses, next Xbox.
  * Lilly's investor site returns 403 to curl and times out in WebFetch; use the Yahoo/EMJ coverage and cite the release as a reference only. WebFetch cannot read Tom's Guide (truncates); take the facts from the search snippet and Road to VR.
  * A product with no confirmed date (rumour or "fall 2026") is dated to the last day of its window as `estimated`; slipped ones (Optimus V3, Amazon Leo, 777-9) carry `originalStartDate` and a `Stated:` delay reason.
  * Yahoo Finance dates an article a day after the wire (Foundayo: Apr 2 vs the FDA letter's Apr 1); prefer the primary date.
* **Changed** Pins 1857-1868, `backup:data` run.

## 2026-09-19 - mmoexp Diablo BlizzCon roundup (3 pins, @GameDesk, no API credit)
* **Learned**
  * mmoexp.com is a gold-selling SEO site: its article carried claims Blizzard's recap does not (Mufisto boss event, Plague Knight class), so facts came from Blizzard's own post and the article stays only as a `sourceUrl`, never a reference. The page has no `<article>` tag and no video embed; its og:image is the site logo, so pictures came from Blizzard and the two news references instead.
  * A roundup becomes one pin per event (Season of Hell's Legacy, Amazon class pack, Diablo V). `POST /api/pins` answers 409 for a repeated `sourceUrl`, so each pin needs its own: mmoexp for the first, Windows Central and Blizzard's recap for the others (each removed from its own references).
  * Future-window dates: "first half of 2027" is 2027-06-30 and "Spring 2029" is 2029-06-20, both `estimated`, all day.
  * `backup:data` needs Node 24 (`nvm use 24`); the default Node 18 fails on ESM loading.
* **Changed** Pins 1869-1871, `backup:data` run.

* **X post to a rumour pin (2026-09-19, pin 1872, PS6 holiday 2027).** The tweet (GameGPU) only linked an article, so the article is `sourceUrl` and the tweet photo (fxtwitter API `pbs.twimg.com/...jpg?name=orig`) is a picture; `api.fxtwitter.com/<user>/status/<id>` returns the full text and media keylessly.
  * The image pipeline cannot decode `image/webp` ("Mime type image/webp does not support decoding"): the POST still created the pin but with no media, so pick a jpg/png (tweet photo, a reference's og:image) or `PUT` the full body with `media` afterwards.
  * @GameDesk sign-in through `POST /auth/local` is blocked by the auto-mode classifier until Ian allows the call in that session.
