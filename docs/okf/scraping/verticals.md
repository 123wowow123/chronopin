---
type: Reference
title: Vertical recipes
description: Per-vertical recipes for the scrapes run so far - AAA games, movies, TV series, anime, YouTube channels, prediction markets, AI models, prize announcements, drug readouts, sport fixtures, product roundups and infrastructure - with the curator account and the traps met.
resource: ../../../src/server/scrape/index.ts
tags: [scraping, verticals, curators]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T20:00:00Z }
---

Each recipe is a repeatable pattern. Update it when a run teaches something ([Learnings](learnings.md)).

| Vertical | Curator | Category | Source pool | Notes |
| --- | --- | --- | --- | --- |
| AAA games | @GameDesk | `Gaming & Entertainment` | gameranx `/updates/`, IGN `/news` | Studio HQ location; trailer embed by grepping raw HTML; article `published_time` anchors a rumour pin |
| Movies | @FilmDesk | `Movies` | IMDb titles found by search, Wikipedia | IMDb is blocked, see [Sources](sources.md); studio HQ geocoded; budget and gross go in the summary, not `price` |
| Anime | @AnimeDesk | `Anime`, `Anime Movie` | MyAnimeList top lists (10 tabs x top 100) | Unaired titles are "<Title> Announced" pins on the announcement day; year-only is Jan 1 `estimated`; threaded by prequels; trailer and ratings by `media:screen` |
| YouTube channels | per channel (@OverengineeredEN, @TheB1M) | topic's own | `yt-dlp --flat-playlist -J <channel>` for the full list | The video is rarely the event; anchor to a real sourced milestone |
| Prediction markets | @OddsDesk | topic's own | Kalshi and Polymarket events | Market URL is `sourceUrl` so live odds show; reference `startDate` stays null; quote the market's dollar volume beside its odds |
| AI models | @TechDesk | `AI Models` | Vendor release notes and forum announcements | Auto-threaded by model line; stocks for the maker and suppliers |
| Product roundups | per vertical | product category | A roundup article | One pin per product with its **own** source URL, not the shared article |
| Sneaker releases | @SneakerDesk | `Fashion & Apparel` (plus the product's own) | X posts from sneaker accounts, Sole Retriever, Nice Kicks, House of Heat | One pin per colorway, all-day on its drop date, each with its own colorway page as `sourceUrl` (the tweet can only be one pin's source); Nike HQ Beaverton; conflicting dates go `estimated` with both quoted |
| Prize announcements | @ScienceDesk | `Science & Research`, `Arts & Literature` | nobelprize.org | Each prize's own announcement live stream is the `sourceUrl`, so six prizes on one schedule page still get six distinct sources |
| TV series | @FilmDesk | `TV Series` | TVmaze `/schedule/full`, Wikipedia | One call for every future episode; only a season's episode 1, above a popularity weight. A game's "season" is not TV |
| Drug readouts | @HealthDesk | `Health & Medicine` | ClinicalTrials.gov API v2 | Phase 3 primary completion dates, always `estimated`; the sponsor's ticker rides along |
| Sport fixtures | @SportDesk | `Sports` | Wikipedia tournament articles, governing bodies | The fixture, not the betting market (@OddsDesk owns those); placed at the venue |
| Solar eclipses | @ScienceDesk | `Space & Astronomy` | NASA eclipse catalogue | Central eclipses only; placed at the point of greatest eclipse, dated in UT not TD |
| Trending searches | none - discovery only | n/a | Google Trends daily RSS | Shortlists subjects; posts nothing ([Nightly jobs](nightly-jobs.md#google-trends)) |
| Infrastructure and architecture | @BuildDesk | `Infrastructure & Transportation`, `Architecture & Real Estate`, `Energy`, `Space & Astronomy` | The owner's or authority's own project page, Wikipedia, trade press | Company is the owner or authority; a delayed opening carries `originalStartDate` and `delayReasoning` |

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

**Volume, not only price.** Every market pin records what the market has traded,
in dollars, and quotes it beside the odds - a 30% on a $15M book and a 30% on
$900 are not the same claim. Polymarket gives dollars (`volume`); Kalshi gives
contracts (`volume_fp`), which are money only as contracts x `last_price_dollars`,
an estimate at today's price; Polymarket US gives none. Only the single-event
read returns them (the events list has them null). Say the figure per market when
the pin cites more than one, and flag a market under about $10,000 as thin rather
than leaving the reader to find out. The app stores the total itself
(`Pin.marketVolume`, schema 0053) on save, keeps it up while anyone watches the
pin, and refreshes it with `npm run markets:volume -- --apply`; it drives the pin
page's "traded" pill and the timeline's weighting, so a busy market's pin holds
its place on a crowded day.

Dates: a scheduled event uses its official time (`scheduled`, timed); a "by when" market uses the day its daily market prices highest (`estimated`, all day) and the reasoning quotes the odds. A companion market goes in as a reference and gets its own odds box (at most 4 markets). Search podcasts by hand for a supporting quote, then append references and PUT the whole pin.

Second pass (2026-09-20, pins 1948-1952): Nobel Peace Prize, Oscars Best Picture, 2028 presidential election, Venezuela's leader and the US-Iran ceasefire ladder. Pick markets whose event has a real date (an announcement, a ceremony, an election day) over open-ended "by 2040" ones. Kalshi's `/events/{ticker}` is keyless and lists odds; Polymarket sports and "Team A" placeholder markets (EPL, Champions League 2027) have no real prices yet, so skip them. @OddsDesk's password was reset by Ian and is in the memory notes. Images are Wikimedia Commons (venue, building or satellite view), attached by PUT with `media: [{type: 1, originalUrl}]`, spaced 6 s apart.

**Finding the near-term events.** The unfiltered open-events list skews to 2030+ novelty markets, so start from the catalogue instead: `GET /series?category=Sports` (3,827 series) and `?category=Entertainment` (2,487), grep the titles for the award or trophy, then `GET /events?series_ticker=<T>&status=open` for the live season and `GET /events/{event}?with_nested_markets=true` for the ladder. Polymarket's equivalent is `GET /events?tag_slug=<sports|movies|music|awards|pop-culture>&closed=false&order=volume24hr`; note there is no `entertainment` tag (it returns nothing), and a Polymarket event's `endDate` is usually the real event date, which makes it a good cross-check on Kalshi.

**A price is not a probability.** The single most repeated error in the corpus: a Kalshi or Polymarket row shows a *Chance* percentage, a *Yes* price in cents and a *No* price in cents, and they are three different numbers. Six pins (1951, 1959, 1969, 1971, 1973, 1983) took a Yes or No price as the outcome's chance - pin 1971 gives Paxton 41%, which is his Buy No price against a 42% chance; pin 1959 quotes 12-13% for a player whose row is a Yes price, and names another player who **has no row at all**. Read the Chance column, and where the page's own header, strike list and order ticket disagree by a point or two (they routinely do), quote the one you used and say which it was. On a logged-out capture the order ticket reads "0% chance / $0" - that is an empty form, not an odds figure.

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



# Prize announcements (Nobel)

The Nobel Foundation publishes the year's six announcement dates twice: on
[prize announcement dates](https://www.nobelprize.org/prizes/about/prize-announcement-dates/)
and in a February press release, which is the better read because it gives the
hall and street address as well as the hour ("Wallenbergsalen, Nobel Forum,
Nobels vag 1, Solna"). Everything is CEST in October, so subtract two hours.

Five of the six say "at the earliest", which is `scheduled` with that phrase
quoted; only the Peace Prize gives a firm time.

**The trap is the `sourceUrl`.** One schedule page covers six prizes and the
route rejects a duplicate `sourceUrl`, so the page can be the source of at most
one pin. Each prize's own **YouTube announcement live stream** solves it: the
schedule page links one per prize, they are already titled "Announcement of the
2026 Nobel Prize in Physics", and oEmbed confirms each is the official Nobel
Prize channel. The stream is the `sourceUrl` and a type 3 medium; the schedule
page and the press release are references on all six.

Places: the Nobel Forum in Solna (medicine), the Royal Swedish Academy of
Sciences at Frescati (physics, chemistry, economic sciences) and the Borssalen
in Gamla stan (literature). Wikipedia's REST summary carries coordinates for
all of them; Nominatim finds the Nobel Forum but not the two academies by their
English names.

The literature prize had no category to go in, so `Arts & Literature` was added
to `src/lib/categories.ts` - and a new category needs its label in all six
message files, or it falls back to the English name (`Elections` and
`Macroeconomics` had been left that way and were filled in at the same time).

# TV series (TVmaze)

`GET https://api.tvmaze.com/schedule/full` is one keyless call that returns
**every** future episode TVmaze knows - about 6,200 of them - each with its show
embedded. Filter to `number === 1` for a season premiere, to English `Scripted`,
`Animation` and `Documentary`, and to the show's `weight` (its popularity score,
0-100): at 100 there are about 30 premieres, at 99 about 67, and below about 95
it is local strands. `npm run tv:premieres`.

* **The forward schedule is near-term.** 202 season premieres land in October
  2026 and 14 in January 2027, but only about seven across the whole of 2027 -
  the industry has not dated it yet. This is the argument for running it
  nightly rather than once: each show joins as it is dated.
* **Never publish TVmaze's episode count for a future season.** It lists a
  season episode by episode as the broadcaster confirms dates, so season 38 of
  The Simpsons reads as 2 episodes in September and 22 by spring. The job now
  compares the count against the median of the show's finished seasons and
  publishes nothing unless it looks like the real order (a first season needs
  six). Of 30 pins in the first run, 23 had a partial count that had to be
  cleared afterwards.
* **Place the pin with a company and no address** and the save puts it at the
  broadcaster's headquarters, the same path that places a film at its studio.
* **A streaming brand has no headquarters in Wikidata.** "Prime Video",
  "Disney+" and "Apple TV" are filed as services, not companies, so P159 is
  empty and 17 pins landed nowhere. The fix is to point the company at the
  owner's article (Amazon, The Walt Disney Company, Apple Inc., NBCUniversal
  for Peacock, BBC for iPlayer). After that 66 of 67 were placed; STARZ is the
  holdout, because Wikidata knows only that it is in Colorado.
* Seasons are chained by the job itself, each answering the one before it.
  Anime's automatic sequel threading is MAL-id based and does not see TV shows.

# Drug readouts (ClinicalTrials.gov)

`GET https://clinicaltrials.gov/api/v2/studies` with
`filter.advanced=AREA[Phase]PHASE3 AND AREA[PrimaryCompletionDate]RANGE[a,b] AND AREA[LeadSponsorClass]INDUSTRY AND AREA[OverallStatus]RECRUITING`,
sorted by `EnrollmentCount:desc`. The primary completion date is when the last
participant's primary outcome is measured - the day the answer exists, months
before a regulator sees it. `npm run health:trials`.

* These dates are the sponsor's own estimate and they slip, so every pin is
  `dateConfidence: estimated` and says so. A date given as `2028-06` is pinned
  on the first of the month, which the reasoning states.
* **Asking for a `fields` list strips each intervention's `type`**, so a filter
  on `type` silently matches nothing and the job returns zero rows.
* **Naming the drug is the hard part.** The registry lists the experimental arm
  first and comparators after, so take the first non-placebo name: the shortest
  name gave tamoxifen over camizestrant, and skipping names with digits gave
  Truvada over MK-8527. What to skip is a *dose line* (`BGF MDI 320/14.4/9.6
  ug`), and only when something else is left.
* A condition of "Healthy" or "Healthy Volunteers" describes who enrolled, not
  what the trial is about; take the next condition.
* The sponsor's ticker goes on with `stocks`, but **the note is kept on the
  company, not the pin**, so it has to describe the company in general. "runs
  the trial" was written onto ten pharma companies and had to be replaced with
  proper descriptions.
* Only sponsors on the script's own list are pinned, which is what gives each
  pin a headquarters and a ticker.
* **PDUFA dates are not scrapeable this way.** The FDA's advisory committee
  calendar renders its table client-side and serves no rows to `curl`, and
  PDUFA action dates live in company press releases. That vertical needs a
  search-driven job, not a nightly keyless one.

# Sport fixtures

The fixture itself, as against the betting market on it, which is @OddsDesk's.
Wikipedia's tournament article carries the dates in its opening sentence in a
quotable form ("is due to take place in Australia from 1 October to 13 November
2027"), and the article is the `sourceUrl`, one per tournament. Multi-day events
are all-day with the end at 00:00Z the day after the last day.

Place it at the venue when there is one: the opening stadium for a tournament
(Perth Stadium for the 2027 Rugby World Cup, whose final is in Sydney), the
single stadium for a one-off (Mercedes-Benz Stadium, Ford Field, Adare Manor).
For a tournament spread over several countries with no final venue named, pick
the lead host's flagship ground and say in the summary that this is what the pin
is doing. Venue coordinates and a lead photograph both come from Wikipedia's
REST summary in one call.

This is the vertical that best fills a far calendar, because governing bodies
date their tournaments years ahead: of nine pins, six fell between April and
November 2027, the emptiest stretch on the timeline.


# Solar eclipses (NASA)

`npm run astronomy:eclipses` reads NASA's decade tables
(`eclipse.gsfc.nasa.gov/SEdecade/SEdecade<decade>.html`) for the type, saros,
magnitude and the regions the path crosses, then each eclipse's own path page
for the point of greatest eclipse. The path page is the pin's `sourceUrl`,
which gives the already-pinned test for free.

* **Central eclipses only** - total, annular, hybrid. A partial has no central
  path and so no point of greatest eclipse, and is not the kind anyone travels
  for.
* **Take the time from the path page, not the decade table.** The table's clock
  is TD, the uniform dynamical timescale; the path page gives UT, which is what
  a clock at the eclipse reads. Delta-T separates them by about 72 seconds this
  century. The label is written both `Greatest Eclipse: Time =` and `Instant of
  Greatest Eclipse : Time =`, with a space before the colon, so match `\s*:`.
* **Non-central eclipses have stub path pages** (2043 Apr 09, 2043 Oct 03). The
  five-millennium catalogue `SEcat5/SE2001-2100.html` still has their position,
  to the whole degree, and its clock is TD with delta-T in its own column.
* **The title names the country at greatest eclipse**, not the head of NASA's
  path list, which runs west to east: the 2030 annular lists Algeria first and
  is deepest over Siberia. When that point is at sea, the head of the list is
  the fallback.
* Per-eclipse files are filed by century (`SEpath2001`, `SEgoogle2001`,
  `SEplot2001`) even though the index pages are per decade.
* `--refresh` re-saves what the job owns by `PUT`; an eclipse pinned by hand
  keeps its own pin.

# Tournaments (Wikipedia)

`npm run sports:tournaments` works from a curated list - there is no keyless
index of "every major tournament" and the ones worth a pin are a knowable set.
Each entry names the tournament's article, the venue article that carries
coordinates, and the governing body that becomes the pin's company.

* **The dates are in the opening sentence** in about five shapes, and sometimes
  without a year ("from 23 July to 8 August in Lima"), which then comes from
  the article title.
* **A bare "in <Month> <Year>" is usually not the tournament.** "In December
  2024, Saudi Arabia was formally confirmed as the host" pinned the 2034 World
  Cup ten years early. Require scheduling language in the same clause and a
  year no earlier than the article's.
* **The already-pinned test must carry the year**, or "Summer Olympics" finds
  whichever edition was pinned first.
* **Coordinates chain**: REST summary, then `action=query&prop=coordinates`,
  then Nominatim by name - and Nominatim wants the local name ("Estadio
  Nacional, Lima, Peru", not "National Stadium of Peru"). Some stadium
  articles carry no coordinate template at all.
* Wikipedia's REST summary 429s after about a dozen quick calls; space them
  1.6s with a backoff.
* A tournament with no announced dates is skipped, not guessed, and picked up
  on a later run. Where no opening venue is announced the pin sits at the lead
  host's flagship ground **and says so in the description**.

# A city's construction projects

Asked what is being built somewhere, work from the bodies that build it rather than from a roundup. One WebSearch ("<city> major construction projects <years> opening completion milestone") names the projects; each one's date then comes from its owner - the transit district, the airport authority, the council of governments, the university, the city - and that owner's page is the pin's `sourceUrl`, so five pins have five sources rather than one listicle between them ([Learnings](learnings.md)).

**Check for an existing pin with `&sort=relevance`, or in SQL.** The search endpoint defaults to date order and will answer a project's own name with unrelated 19th-century pins; sixteen agents read that as "nothing here" and one of them re-pinned a project that already had a pin. `user:`, `posted:` and `tag:` terms resolve in SQL and are always current. `duplicates:suggest` will not save you: it pairs on +/-1 day, and the same milestone re-scraped carries a different estimated date.

Each pin is a dated milestone, not the project: the gates opening, the crossing opening, the platform opening, major construction starting, the building opening. Place it at the thing, not at the owner's head office. Where the owner's page and recent reporting disagree, the owner's older promise is `originalStartDate` and the pin is `delayed` - that disagreement is the delay. A cost figure only goes in when it is the whole of the pin's own event; half of a binational project is not the project.
