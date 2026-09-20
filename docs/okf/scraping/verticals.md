---
type: Reference
title: Vertical recipes
description: Per-vertical recipes for the scrapes run so far - AAA games, movies, anime, YouTube channels, prediction markets, AI model releases, product roundups and infrastructure - with the curator account and the traps met.
resource: ../../../src/server/scrape/index.ts
tags: [scraping, verticals, curators]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T20:00:00Z }
---

Each recipe is a repeatable pattern. Update it when a run teaches something ([Learnings](learnings.md)).

| Vertical | Curator | Category | Source pool | Notes |
| --- | --- | --- | --- | --- |
| AAA games | @GameDesk | `Gaming & Entertainment` | gameranx `/updates/`, IGN `/news` | Studio HQ location; trailer embed by grepping raw HTML; article `published_time` anchors a rumour pin |
| Movies | @FilmDesk | `Movies` | IMDb titles found by search, Wikipedia | IMDb is blocked, see [Sources](sources.md); studio HQ geocoded; budget and gross go in the summary, not `price` |
| TV series | @FilmDesk | `TV Series` | Wikipedia, AniList/TVMaze style pages | A game's "season" is not TV |
| Anime | @AnimeDesk | `Anime`, `Anime Movie` | MyAnimeList top lists (10 tabs x top 100) | Unaired titles are "<Title> Announced" pins on the announcement day; year-only is Jan 1 `estimated`; threaded by prequels; trailer and ratings by `media:screen` |
| YouTube channels | per channel (@OverengineeredEN, @TheB1M) | topic's own | `yt-dlp --flat-playlist -J <channel>` for the full list | The video is rarely the event; anchor to a real sourced milestone |
| Prediction markets | @OddsDesk | topic's own | Kalshi and Polymarket events | Market URL is `sourceUrl` so live odds show; reference `startDate` stays null |
| AI models | @TechDesk | `AI Models` | Vendor release notes and forum announcements | Auto-threaded by model line; stocks for the maker and suppliers |
| Product roundups | per vertical | product category | A roundup article | One pin per product with its **own** source URL, not the shared article |
| Sneaker releases | @SneakerDesk | `Sports` (or the product's own) | X posts from sneaker accounts, Sole Retriever, Nice Kicks, House of Heat | One pin per colorway, all-day on its drop date, each with its own colorway page as `sourceUrl` (the tweet can only be one pin's source); Nike HQ Beaverton; conflicting dates go `estimated` with both quoted |
| Infrastructure and architecture | the pool's curator | `Infrastructure & Transportation`, `Architecture & Real Estate`, `Energy`, `Space & Astronomy` | Wikipedia, trade press | Company is the owner or authority; a delayed opening carries `originalStartDate` and `delayReasoning` |

# AAA games (and other server-rendered news)

1. List candidates with `grep -o` on the raw listing HTML (both sites render server-side).
2. Fetch each article with `curl -A "<browser UA>"`, never WebFetch (drops iframes, cannot reach IGN).
3. Check for an embedded trailer: `grep -o '<iframe[^>]*youtube[^>]*>'`. IGN uses a native player the pipeline does not ingest.
4. Pull title, description, release wording, developer and studio HQ from the text; use `article:published_time` when there is no fixed release date.
5. Insert through `POST /api/pins` as the curator, then the image through the medium code, then `backup:data`.

# Movies

`WebSearch "<title> imdb"` for the real title URL as `sourceUrl`, Wikipedia (`<Film>_(2026_film)`) by plain curl for facts and the `og:image` poster, the primary studio's actual lot or office as location (Universal City, Burbank lots, Culver City, Santa Monica, Melrose Ave), category `Movies`, no `price`.

Roundup of upcoming films (Geek Vibes Nation style): one pin per film with its Wikipedia page as `sourceUrl` and the roundup as a reference, then the franchise's earlier mainline films as pins in release order, each responding to the previous. Skip premiere dates, use the US wide release ([Learnings](learnings.md)).

# Anime (MyAnimeList)

Parallel agents of about 10 titles each, each posting through the real `POST /api/pins` with a token signed from the session secret (`{id: <curator id>}`, HS256; Node 24). Concurrent agents reuse company rows by exact name. MAL pages are formulaic: the wiki is the page's own fields (info block, statistics, synopsis, background, related entries, themes), so summaries state only what the MAL page states.

# Episodic works (TV series, anime)

A pin about a series, a season or a cour carries how many episodes that run has (`episodeCount`) and what the number counts (`episodeStatus`: `complete`, `ongoing`, `planned`). Take it from the page when the page says it - the article knows which season the pin is about - and let the scrape fall back to AniList, MyAnimeList and Wikidata. A film pin never gets one. `npm run media:screen -- --apply --skip-trailer all` backfills existing pins and leaves any count already there alone.

# YouTube channels

`yt-dlp -J <video url>` per id gives the upload date, description, tags and categories. Some creators forbid third-party embeds (The B1M) even when `playableInEmbed` is true: flag it. `company` is whatever institution the story centres on (a ministry, a binational authority, an operator); its logo lookup often whiffs, so set `websiteUrl` and the favicon by hand. Give each parallel agent a **unique scratch file name**: two agents that defaulted to the same name in a shared prompt overwrote and even ran each other's inserts.

# Prediction markets

Dates: a scheduled event uses its official time (`scheduled`, timed); a "by when" market uses the day its daily market prices highest (`estimated`, all day) and the reasoning quotes the odds. A companion market goes in as a reference and gets its own odds box (at most 4 markets). Search podcasts by hand for a supporting quote, then append references and PUT the whole pin.

Second pass (2026-09-20, pins 1948-1952): Nobel Peace Prize, Oscars Best Picture, 2028 presidential election, Venezuela's leader and the US-Iran ceasefire ladder. Pick markets whose event has a real date (an announcement, a ceremony, an election day) over open-ended "by 2040" ones. Kalshi's `/events/{ticker}` is keyless and lists odds; Polymarket sports and "Team A" placeholder markets (EPL, Champions League 2027) have no real prices yet, so skip them. @OddsDesk's password was reset by Ian and is in the memory notes. Images are Wikimedia Commons (venue, building or satellite view), attached by PUT with `media: [{type: 1, originalUrl}]`, spaced 6 s apart.

**Finding the near-term events.** The unfiltered open-events list skews to 2030+ novelty markets, so start from the catalogue instead: `GET /series?category=Sports` (3,827 series) and `?category=Entertainment` (2,487), grep the titles for the award or trophy, then `GET /events?series_ticker=<T>&status=open` for the live season and `GET /events/{event}?with_nested_markets=true` for the ladder. Polymarket's equivalent is `GET /events?tag_slug=<sports|movies|music|awards|pop-culture>&closed=false&order=volume24hr`; note there is no `entertainment` tag (it returns nothing), and a Polymarket event's `endDate` is usually the real event date, which makes it a good cross-check on Kalshi.

**Reading Kalshi prices.** With `with_nested_markets=true` the price fields are strings named `*_dollars` (`last_price_dollars`, `no_bid_dollars`, `no_ask_dollars`), not `last_price`/`yes_bid`, so a naive read silently gets `undefined` and every outcome looks like 50%. Sort by `last_price_dollars` and ignore `status: "finalized"` rows - an eliminated team keeps a stale 1 c price and no bid/ask. `expected_expiration_time` is a settlement buffer, not the event date (NBA 2027 expires 31 July), so date the pin from the league or organiser, never from the market.

**The web URL is `kalshi.com/markets/{series}/{event-title-slug}/{event-ticker}`**, all lowercase; only the third segment is read (`parseMarketUrl` takes `parts[3]`), so the middle slug is cosmetic and slugifying the event's own `title` is enough. kalshi.com answers 429 to curl, so verify a link by running `parseMarketUrl` + `oddsFor` in a `tsx` script against the real code rather than fetching the page.

**Politics, elections and geopolitics** (2026-09-20, pins 1967-1979): Russia's Duma vote, Brazil's first round, the Knesset election, the California governor's race, the Texas Senate seat, China-Taiwan, a Russia-Ukraine ceasefire, the next UN Secretary-General, the next House Speaker, France 2027 and the Canadian, German and Indian national elections.

- **Find them on Polymarket, not Kalshi.** Page `GET /events?closed=false&order=volume&ascending=false&tag_slug=<t>` over `politics`, `geopolitics`, `elections`, `world-elections`, `global-elections` and `world`, then keep the ones whose `endDate` is inside the next year and sort by volume. Kalshi's `status=open` list is mostly "during Trump's term" ladders, and some Politics series with the right title (`KXSENATE`, `KXHOUSE`) have **no events at all** - the 2026 chamber markets are Polymarket's.
- **Take the date from the market's rules text**, which usually names it outright ("scheduled to take place in Brazil on October 4, 2026"). That earns `scheduled`. `endDate` is not the event: Polymarket's Israel PM market ends December 31 for an October 27 election. When the rules only say "around April 2027", the pin is `estimated` and the reasoning derives the day from law rather than borrowing precision.
- **A Kalshi event ticker carries its own date** (`KXCANELECTION-29OCT15`) which its contracts can outlive by a year - use the ticker date, cross-checked against the country's election law, and treat the close time as a settlement buffer.
- **Ladders are cumulative**, so the last rung is always the dearest. Quote two rungs ("15% by December 31, 5% by October 31") so the headline number does not read as a forecast for that one day. A single yes/no "by when" market has no likeliest day: date the pin to its deadline and say the market gives it 4%.
- Elections get the `Elections` category (added 2026-09-20) alongside `Geopolitics`; a conflict or diplomacy market gets `Geopolitics` alone. Place the pin at the legislature, capitol or presidential palace the vote decides.
- Images: `prop=pageimages` on a legislature article returns a logo or a seat-composition SVG, so fall back to Commons `action=query&list=search&srnamespace=6` for "<building> <city>" and pick by pixel size.
- Podcasts: Apple's catalogue search finds same-week episodes for a major race, but transcripts are usually missing, so cite the episode's own title, show and description at 65-75. One of them corrected a pin - Monocle's "Russians go to the polls across three days" turned a one-day pin into September 18-20.

**Economy, crypto, AI and space** (2026-09-20, pins 1980-1993): the December FOMC decision, the September CPI print, the year-end unemployment rate, a 2027 recession, Bitcoin's closing price and its return to $100k, Ethereum's 2026 high, the Anthropic and OpenAI IPO announcements, the next Gemini Pro model, the top AI model of 2026, SpaceX's launch count, two Starships docking and NASA's next crewed Moon landing.

- **Kalshi's catalogue for these is `GET /series?category=`** with `Economics`, `Crypto`, `Science and Technology`, `Companies`, `Financials`, `World` and `Climate and Weather`. Plain `Technology` and `Science` return `{"series": null}`, so grep the `Science and Technology` list for both the space and the AI tickers. Then one `GET /events/{EVENT}?with_nested_markets=true` per candidate.
- **Scan in two passes, because the events list has no prices.** `GET /events?series_ticker=…&status=open&with_nested_markets=true` returns every nested market with `last_price`, `yes_bid` and `volume` `null`; the `*_dollars` prices and `volume_fp` only come back from the single-event read. Use the series list for tickers and titles, then read each event for the ladder.
- **Difference a cumulative ladder to find the date.** Anthropic's IPO ladder rises 9% -> 50% across November, so November carries 41 points and the pin is `estimated` on its last day; Bitcoin's $100k ladder gives October 9, November 13, December 3. Say two rungs in the reasoning, and say what the market gives the whole question (26% for $100k before 2027) so the date does not read as a prediction.
- **Ignore rungs that quote out of order and name the problem in the summary.** OpenAI's IPO ladder runs April 70%, May 49%, June 61%; `KXMOON` has before-2028 below before-2027; `KXU3EOY` has above-4.5% below above-5.0%. Date from the monotone, liquid part.
- A settlement instant *is* a date: a year-end price, a year's high, a launch tally or a year-end ranking are `scheduled` on the market's own terms (all-day on December 31, or timed when the market names an instant such as 12:00 a.m. ET on January 1). A macro release is `scheduled` on the agency's published calendar - BLS CPI and Employment Situation at 8:30 a.m. ET, the FOMC statement at 2:00 p.m. ET - which Kalshi's close time sits minutes before.
- Macro pins get the `Macroeconomics` category (added 2026-09-20), crypto `Cryptocurrency`, an IPO `Corporate & Finance`, a model release `AI Models`, a launch or mission `Space & Astronomy`. Place them at the institution that produces the number: the Eccles Building, the BLS's Postal Square Building, the NBER in Cambridge, the company's HQ, the pad.
- **Quote spot from a keyless exchange**, `api.coinbase.com/v2/prices/BTC-USD/spot` or Kraken's public ticker, so a crypto pin says where the market is and not only what the ladder pays.
- Give a company pin its `stocks` by hand (Anthropic -> GOOGL, AMZN related; OpenAI -> MSFT, ORCL related and NVDA supplier; Google -> GOOGL as the company). A later `PUT` that leaves `stocks` out keeps them, because the ticker write is add-only.
- **A pin another desk already created cannot take the market links.** Starship Flight 14 was already pin 1945 from `npm run spacex:launches`, so no second pin was made - but `PUT /api/pins/:id` is author-or-admin only, so @OddsDesk could not add the Kalshi and Polymarket links to it as references either. Hand that merge to the owning curator or an admin.
- Images: Commons `generator=search` with `gsrnamespace=6` returns nothing, so take Wikipedia's REST summary `originalimage` and space the calls (it 429s after about five). An article whose lead is an SVG can be unusable - `upload.wikimedia.org` refuses every thumb width of `Bitcoin.svg` with a 400 - so pick an article with a photograph instead.

Sports and entertainment pass (2026-09-20, pins 1953-1966): World Series, Super Bowl LXI, NBA Finals, Stanley Cup, Champions League final, Ballon d'Or, Heisman, F1 constructors, The Game Awards, the Grammys, the Super Bowl halftime headliner, 2026's highest-grossing film, Spotify Wrapped and the next James Bond. Place a title race at the league's headquarters when the venue is not known yet (best-record host, undecided finalists) and at the stadium, circuit or theatre when it is. A market with one yes/no contract per name (Kalshi's halftime headliner) does not sum to 100 - say so in the summary rather than presenting the prices as shares.

# Roundups

When one article covers many things, prefer per item: a deep link (anchor or "read more"), else the maker's own product page or press release, and only then the shared article, flagged as generic.

# Rocket launches (SpaceX)

`npm run spacex:launches` reads Launch Library 2 (`ll.thespacedevs.com`, keyless, ~15 calls/hour) and posts one pin per launch with a day-or-better NET, at the launch pad, through the real API. The pin page draws a `flightPath` (table `PinFlightPath`, 0049) from the pad. Flight Club (`flightclub.io`) has the real trajectories but its `api.flightclub.io` needs a login, so the line is an **estimated ground track** (`src/lib/groundTrack.ts`: circular orbit at the target inclination, Earth turning under it, slow first ~9 minutes) and the pin links the launch's Flight Club page (`flightclub_url` from LL2). Heavens-Above tracks satellites, not launches. Inclination is a rule of thumb (`src/lib/launchOrbit.ts`): ISS 51.6, SSO 97.5, Starlink 53 (70 for group 15 from California), Starship 26. Missions it cannot place (GTO, lunar, unknown orbit) get a pin and no path. An already-pinned launch has only its path refreshed, so NET slips are not followed yet.

