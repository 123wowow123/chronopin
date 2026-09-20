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
* **A market pin says how much money is on it.** Owner, 2026-09-20: prediction-market scraping records the market's dollar volume, the pin page shows it, and the timeline's weighting leans on it. Quote it beside the odds in the pin's own words, and let the app keep the stored figure ([Strategy](strategy.md#decision-rules)).
* **Do not add write-ups to the root README.**

## 2026-09-20 - Coverage gaps: four categories, eclipses, tournaments and a trends reader

Asked what was missing rather than what to scrape next, so this entry starts
with the measurement and then the three jobs it justified.

* **Learned**
  * **The gap is not a category, it is 2027-2029.** Measured over 1,963 live
    pins: 424 were in the future, and after April 2027 the timeline ran at
    single figures a month for two years (2027-05 had 2, 2027-07 had 3,
    2028-01 had 1). Anime alone was 657 pins, a third of the corpus.
  * **A category can be busy and still be dead.** Counting future pins per
    category found verticals with a full past and no future at all: `AI Models`
    45 pins but 2 ahead, `Automotive` 39 and 2, `Computing & Semiconductors` 29
    and 2, `Consumer Electronics` 69 and 7, and `Food & Beverage`, `Robotics`
    and `Climate & Environment` with none. Total pin count hides this; the pair
    of numbers is the one worth watching.
  * **Sneaker pins had no home.** All six Nike Caitlin 1 colorways sat in
    `Sports` because no clothing category existed, which [Vertical
    recipes](verticals.md) had already hedged as "`Sports` (or the product's
    own)". Added `Fashion & Apparel`, `Telecom & Networking`,
    `Defense & Military` and `Education & Academia`.
  * **A new category needs a dev-server restart, not just a save.** `PUT`s that
    set `Fashion & Apparel` silently came back `['Sports']`: `parseCategories`
    drops a name that is not on the list, and the running `next dev` still had
    the old module. Touching the route did not clear it. The function tested
    correct in isolation the whole time, which is what identified it.
  * **Eclipses are the answer to the far calendar.** NASA's catalogue is
    computed to the second for the next thousand years; 35 central solar
    eclipses from 2027 to 2050 went in on the first run, against a corpus that
    had about one pin a year after 2030.
  * **Google Trends is a signal, not a source** - see [Nightly jobs](nightly-jobs.md#google-trends).
* **Feedback**
  * "what other pins is interesting to post or missing categories to post" -
    answered with the measurement above rather than a list of ideas, then the
    gaps were filled.
  * "also check google search trends and find interesting things to pin from
    there" - built `npm run trends:discover`; it shortlists, it does not post.
  * "Add this to nightly scraping job strategy OKF" - added to the roster and
    given its own section on [Nightly jobs](nightly-jobs.md).
* **Changed** [Nightly jobs](nightly-jobs.md) (three jobs added, Google Trends
  section, refreshed numbers), [Vertical recipes](verticals.md) (eclipse,
  tournament and trends recipes), `src/lib/categories.ts` and all six
  `src/lib/i18n/messages/*.ts`. Pins 2121-2163, `backup:data` run.

### The eclipse job (`npm run astronomy:eclipses`, 35 pins, @ScienceDesk)

* Only central eclipses are pinned. A partial has no central path, so NASA
  publishes no point of greatest eclipse and there is nowhere to put the pin.
* **The decade table's clock is TD, the path page's is UT**, and they differ by
  delta-T - about 72 seconds this century. The pin wants UT, which is what a
  clock at the eclipse reads. The first run used TD and every pin was ~72
  seconds late, fixed by `--refresh`.
* The UT label is written two ways across the site, `Greatest Eclipse: Time =`
  and `Instant of Greatest Eclipse : Time =` with a space before the colon. A
  regex without `\s*` before the colon matched some pages and silently fell
  back to TD on the rest.
* **A few path pages are stubs** with no table at all - 2043 Apr 09 and 2043
  Oct 03 - and every one is a non-central eclipse where the shadow's axis
  misses the Earth. The five-millennium catalogue still has their position, but
  only to the whole degree, so the pin says so.
* NASA's regions are a fixed-width shorthand ("n N. America", "w & s Africa",
  "midwest US", "N.Z."). Expanded into English for the title and the
  description; the compass word in front of an ocean is part of its name (the
  South Pacific) and in front of a continent is not (South America, never "the
  South America").
* **The head of NASA's central-path list is not where the eclipse is deepest.**
  The list runs west to east, so the 2030 annular reads "Algeria" first while
  its greatest eclipse is in Siberia. The title names the country holding the
  point of greatest eclipse, and falls back to the head of the list only when
  that point is at sea.
* `--refresh` re-saves the pins the job owns by `PUT` of the whole body, and
  leaves an eclipse pinned by hand (239 Luxor, 241 Sydney) alone.

### The tournament job (`npm run sports:tournaments`, 6 pins, @SportDesk)

* Wikipedia dates a tournament in its opening sentence in about five shapes
  ("from 4 October to 21 November 2027", "from July 14 to 30, 2028", "from 10
  to 19 September 2027"), and sometimes without the year, which then comes from
  the article title.
* **A bare "in <Month> <Year>" is not the tournament's date.** The 2034 World
  Cup article says "In December 2024, Saudi Arabia was formally confirmed as
  the host", which a loose month-only rule pinned as the tournament - ten years
  early. The rule now requires scheduling language in the same clause and a
  year not before the article's own.
* **The already-pinned test has to carry the year.** Matching the event name
  alone made "2032 Summer Olympics" find the 2028 pin and "2034 FIFA World Cup"
  find the 2030 one: every edition looked already pinned.
* **Not every stadium article has coordinates**, in the REST summary or the
  query API - the Narendra Modi Stadium and Peru's National Stadium both lack
  the template. The chain is summary, then query API, then Nominatim by name,
  and Nominatim needs the local name ("Estadio Nacional, Lima, Peru" finds it,
  "National Stadium of Peru" does not).
* Wikipedia's REST summary answers 429 after about a dozen quick calls and
  stays cross, so every call is spaced 1.6s with a backoff.
* A tournament with no announced dates (2031 Rugby World Cup, 2031 Women's
  World Cup, 2034 World Cup) is skipped rather than guessed, and picked up
  whenever the job is next run.

* **YouTube transcripts should feed the wikis.** Owner, 2026-09-19: pull transcripts for wiki generation. (Blocked for now by YouTube's 429; see below.)

# Log

## 2026-09-20 - Dollar volume on market pins

The odds on a market pin said what traders think; nothing said how many of them
there are. Kalshi's 30% on a book that has turned over $15M and Polymarket's 30%
on $900 read identically on the page, and weighed the same on the timeline.

* **What the exchanges give.** Polymarket reports dollars outright (`volume` on
  the event and on each market, plus `volume24hr`/`1wk`/`1mo`). Kalshi does not:
  it counts contracts, as `volume_fp` on each nested market, which becomes money
  only as contracts x `last_price_dollars`. That product is an estimate at
  today's price - the contracts traded in March changed hands at March's prices -
  and it is worth saying so rather than implying the cent. Polymarket US
  publishes no volume at all, on either object.
* **The nested-market trap again.** As with prices, the volume fields only come
  back from the single-event read (`GET /events/{ticker}?with_nested_markets=true`);
  the events *list* returns them null, so a scan that reads the list alone finds
  no volume anywhere and quietly concludes there is none.
* **Where it lives.** `Pin.marketVolume` (schema 0053) is the dollars across every
  market the pin's source and references link. It is written after each save and
  edit, kept up as anyone watches the pin's odds (the read is already paid for),
  and refreshed in bulk by `npm run markets:volume -- --apply`. No author sets it:
  it is a reading of the exchanges, so it stays out of the form, out of the write
  SQL and out of `seedPins.json` (the script reads it again after a refresh).
* **What it changed.** The pin page carries a "$3.9M traded" pill beside the
  ratings, each market box shows its own figure (Kalshi's was blank before this),
  and `bagWeight` multiplies a pin by 1 + half a point per tenfold above $10k,
  capped at 2.5x - $100k x1.5, $1M x2, $10M and up x2.5. A market pin no longer
  needs to have been opened to earn a place on a crowded day; the money on it
  says so.
* **A Kalshi figure can go down.** Contracts only accumulate, but the price they
  are valued at moves, so a refresh of an unchanged market can read a little
  lower ($302,559 -> $301,242 an hour later on the Anthropic IPO ladder). That is
  the estimate being honest, not a bug; Polymarket's reported dollars only rise.
* **The first backfill** covered 50 pins, from $186 (a thin Kalshi ladder) to
  $15.1M (Ethereum's year-high book). Two IPO pins share a figure because they
  genuinely cite the same two markets, which is the right answer, not a cache bug.


### `AI Models` had a past and no future (`npm run ai:retirements`, 11 pins, @TechDesk)

45 pins, 2 of them ahead of today - the worst ratio in the corpus, and for the
flagship vertical.

* **The reason is structural.** Nobody announces a model launch in advance, so
  the category can only ever be retrospective from launches. Vendors *do*
  announce a model's death in advance, because developers must migrate, which
  makes deprecation pages the one reliable future-dated AI source. 11 pins,
  September 2026 to February 2027; `AI Models` future went 2 -> 13.
* **One pin per announcement, not per model.** 17 snapshots going off on one
  morning is one event.
* **Only OpenAI could be pinned.** Its page anchors each announcement, so each
  pin gets an honest unique `sourceUrl`. Anthropic and Azure list their future
  retirements in one status table with a single anchor - the Nobel schedule
  page problem again. Anthropic would be worth about ten more pins.
* **A model cell carries the model and its aliases**, so the item is the first
  identifier in it; counting the whole cell read one retirement as three.
  A staged platform shutdown puts a *sentence* in that column instead, which
  made "3 Evals Platform" - an identifier has no trailing full stop and at
  most three words.
* **Placement is not automatic outside the screen categories.** The first run
  produced 11 pins with `address: null`, invisible on the map, because the
  company-HQ placement only runs for film, TV, anime and games. The job now
  calls `lookupStudioLocation` on the vendor's article itself, the same way
  `health:trials` does for its sponsors.
* These pins carry no media, on purpose: a docs page has no pictures and one
  logo across eleven pins is padding.

### PDFs enter the pipeline (`src/server/scrape/pdfText.ts`)

[Sources](sources.md) had carried the row "PDFs - no poppler locally - decode
by hand when a filing is the only source" since the page was written. Poppler
and tesseract were installed on the machine, so the row was acted on.

* **It was worse than "by hand".** `pageText()` threw `Unsupported content
  type application/pdf`, and the fetch is the one stage that may fail a whole
  scrape, so a PDF link did not degrade to a thin pin - it killed the job.
* **Plain `pdftotext`, never `-layout`.** Measured on a three-column Federal
  Register notice: `-layout` preserves the geometry and interleaves the
  columns line by line, so every sentence reads as three unrelated
  half-sentences. Plain mode does the reading-order analysis and returns each
  column whole. `-layout` is right only for a document that really is a table.
* **Trust the bytes, not the content type.** The local test server served a
  PDF as `application/octet-stream` and the reader refused it - which is
  exactly what a lot of agency servers do. Anything that is not a web page now
  has its first bytes checked for `%PDF`, which also catches the reverse case,
  a block page served as `application/pdf`.
* **Adding a `SourceKind` is not a one-line change.** `'pdf'` had to be added
  to the `CK_Source_kind` CHECK constraint (0051) or the save would fail after
  a successful fetch, and to two exhaustive `Record<SourceKind, string>` maps
  in `extract/wiki.ts` (`KIND_LABEL`, `ROOT_TYPE`), which the compiler caught.
  `extract/references.ts` has a **different** type of the same name and needs
  nothing.
* OCR costs about five seconds a page, so it runs only when the text layer is
  under 200 characters and only over the first 5 pages. A 3-page scan took 15s
  end to end against 0.4s for a born-digital filing of the same length.
* The text carries a prefix saying what was read - `[Scanned PDF, 12 page(s);
  OCR of the first 5]` - so a summary written from it is not taken for the
  whole document.
* **This adds a host dependency, and the deploy was updated for it.**
  [Docker/Dockerfile](../../../Docker/Dockerfile)'s runtime stage now installs
  `poppler-utils tesseract-ocr tesseract-ocr-data-eng` beside chromium.
  Verified in the real base image (`node:24-alpine`): all four binaries
  resolve, `pdftotext` reads a Federal Register filing in reading order and
  `pdftoppm` + `tesseract` OCR an image-only PDF back to its text. Measured
  cost: **+72MB** to the image.
  * `tesseract` ships **no language data of its own** - without
    `tesseract-ocr-data-eng` it installs and then reads nothing.
  * `hasBinary()` shells out to `which`, which busybox provides on Alpine;
    checked rather than assumed.
  * **The migration does not ride along.** The image is the Next.js standalone
    output and carries no `scripts/`, so 0051 has to be applied to the target
    database separately (`npm run create:db` from a machine that can reach it).
    On the greenfield refresh it is simply part of a fresh schema.
  * `SCRAPE_PDF_OCR=0` turns OCR off without touching the image, for when that
    CPU is not wanted; the text layer is always read. It is optional, so the
    `env-file` ConfigMap needs no change to deploy this.

## 2026-09-20 - Six new verticals, and the nightly-job roster

Asked what was worth pinning next, then told to do all of it. Coverage was
measured first: `Anime` + `Anime Movie` was 42% of 1,855 pins, while `TV
Series` had 2, `Science & Research` 5 and `Health & Medicine` 6; Oct 2026 and
Jan 2027 were dense and Feb-Nov 2027 nearly empty. Six verticals were picked
to fix both at once, and 112 pins were created (1994-2110).

* **Learned - Nobel week.** Five prizes were missing (only Peace was pinned, by
  @OddsDesk). One schedule page covers all six and the route rejects a
  duplicate `sourceUrl`, so each prize's own YouTube announcement live stream
  became its source. The February press release beats the schedule page: it
  gives the hall and street address. Literature had no category, so
  `Arts & Literature` was added - and adding a category means adding its label
  to all six message files, which `Elections` and `Macroeconomics` had been
  missing since they were added earlier the same day.
* **Learned - a new category is picked up without restarting dev.** The pin
  route accepted `Arts & Literature` immediately; Next's dev server reloaded
  the changed module. The restart rule is for new lib *exports* and event
  listeners, not for a changed array.
* **Learned - launches.** `spacex:launches` was one `lsp__name=SpaceX` away
  from covering everyone, so it became `scripts/launches/upcoming.ts` with a
  `--provider` flag (`npm run spacex:launches` keeps its old behaviour). Only
  10 of the next 60 launches worldwide are dated to the day: SpaceX publishes
  a firm manifest and most other providers sit at month or quarter precision,
  which is the case for running it nightly. Threading is now per provider -
  one chain across providers interleaves Electron and Falcon 9 into a story
  neither is telling.
* **Learned - Launch Library files an unannounced launch as "Unknown Payload"
  with a "Details TBD" description.** Two such pins were created and deleted;
  the job now waits until a launch has a name.
* **Learned - the orbit guess needed widening carefully.** Progress to the ISS
  was drawn at 53 degrees by the bare "low earth orbit" fallback, which is
  SpaceX-shaped. Station visitors now get their station's inclination (ISS
  51.6, Tiangong 41.5) whoever launched them, and any guess below the pad's
  own latitude is refused outright, because no rocket can fly it.
* **Learned - TVmaze.** One call to `/schedule/full` returns every future
  episode. Its episode counts for a *future* season are partial and must not
  be published: 23 of the first 30 pins had a count like "The Simpsons season
  38, 2 episodes" that had to be cleared. Its forward schedule is also
  near-term - 202 premieres in October 2026 against about seven in all of 2027.
* **Learned - a streaming brand has no headquarters.** Wikidata files "Prime
  Video", "Disney+" and "Apple TV" as services with no P159, so 17 TV pins
  landed nowhere until each pointed at its owner's article. While fixing it,
  `lookupStudioLocation` turned out to reject a country centroid but accept a
  *state* one - FX was placed in the middle of Texas. It now refuses any
  headquarters place that sits inside nothing (no P131), which is a country or
  a top-level region either way.
* **Learned - ClinicalTrials.gov.** A good keyless health calendar: phase 3
  primary completion dates, which are the sponsor's own estimate and are
  pinned `estimated`. Two traps: asking for a `fields` list strips each
  intervention's `type`, so filtering on it silently returns zero rows; and
  naming the study drug is genuinely hard, because the shortest name gives the
  comparator (tamoxifen over camizestrant) and skipping digits gives it too
  (Truvada over MK-8527). First non-placebo arm, skipping dose lines, is right.
* **Learned - a ticker note belongs to the company, not the pin.** `stocks[].note`
  is stored on `Company.tickerNote`, so "runs the trial" was written onto ten
  pharma companies and had to be replaced with standing descriptions.
* **Learned - PDUFA dates cannot be scraped keylessly.** The FDA's advisory
  committee calendar renders its table client-side and serves no rows; PDUFA
  action dates live in company press releases. It needs a search-driven job.
* **Learned - sport fixtures are the best filler for a far calendar.** Governing
  bodies date tournaments years out, so six of nine pins landed between April
  and November 2027, the emptiest stretch. Wikipedia's opening sentence gives a
  quotable date and the venue article gives coordinates and a photograph.
* **Learned - deleting a pin leaves its duplicate suggestions behind.** The
  save-time check had already paired the two "Unknown Payload" launches; after
  both were deleted the `PinDuplicate` row survived and showed up in
  `duplicates:suggest`. Cleaned by hand.
* **Feedback.** "put this strategy in OKF for nightly scrape jobs" - the
  coverage analysis and the job roster are not chat, they are a page:
  [Nightly scrape jobs](nightly-jobs.md), linked from the scraping index.
* **Changed.** Added [Nightly scrape jobs](nightly-jobs.md); four new recipes
  in [Vertical recipes](verticals.md); this entry.
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

## 2026-09-20 - San Diego construction projects (5 pins, @BuildDesk, no API credit)
* **Learned**
  * A "what is being built in <city>?" scrape starts from the city's own authorities, not the trade press: SANDAG, NCTD, the airport authority, the university and the city each publish a dated project page, and each is a distinct `sourceUrl`. One broad WebSearch ("<city> major construction projects <years> opening completion milestone") is enough to name the projects; the dates then come from each owner's page.
  * **Official pages go stale in the opposite direction to the press.** NCTD's own Downtown COASTER Platform page still said "construction is expected to start in fall 2025" and "open to passengers in early 2027" after the Union-Tribune reported a spring 2026 groundbreaking. Two sources disagreeing that way is a `delayed` pin, not an `estimated` one: the owner's page gives `originalStartDate`, the newer reporting gives the current date, and `delayReasoning` quotes both.
  * Wikipedia is the better source where the history matters. Its Otay Mesa East article carries the whole slip ("as early as 2017" -> late 2024 -> 2028) in one paragraph, which is exactly what `originalStartDate` + `delayReasoning` need; the authority's page carries only today's promise.
  * Cost figures need the side named. The Otay Mesa East article's "2 billion Mexican pesos (about 99 million US dollars)" is the Mexican half of a binational crossing, not the project, so `price` stays null rather than understating it by an order of magnitude ([[feedback-pin-cost-figure]]).
  * sandag.org renders its project pages client-side and answers `/projects/<slug>` with a 404 body at HTTP 200; find the real path by grepping the homepage for `href="[^"]*<slug>"`. UC San Diego's Plan Design Build page is accordions (`href="#"`), so per-project deep links do not exist - use health.ucsd.edu for the project's own page.
  * No local PDF tooling (no poppler, no pypdf), so a fact sheet only published as a PDF cannot be quoted; drop that candidate rather than pin a soft date. Pure Water San Diego Phase 1 was left out for this reason.
  * Pictures: Commons search for "<airport> Terminal 1" returns Terminal 2 photos, so take the English Wikipedia article's own lead image (`prop=pageimages&piprop=original`) instead. A trade article's own photo is under `wp-content/uploads/<year>/<month>/`; the site's og:image is its logo.
* **Changed** Pins 2163-2167 (SAN Terminal 1 phase 2, Otay Mesa East, Downtown COASTER platform, UC San Diego Hillcrest, Kindred Apartments), `backup:data` run.

## 2026-09-20 - 32 cities of construction projects (131 pins, @BuildDesk, 16 parallel agents)

* **Learned**
  * **Read the search endpoint's sort before concluding anything from it.** `/api/pins/search` defaults to `sort=date`: it takes the semantic hit pool and orders it by *event date*, so a query for "Eglinton Crosstown" answers with Victorian railways and the pin you wanted sits far down the list. All sixteen agents read that and reported "nothing already covered"; the index had the pins all along. **Add `&sort=relevance`** and the same query returns the right pins first. A duplicate check without it is worthless.
  * The label terms are the other half: `user:BuildDesk`, `posted:<day>` and `tag:` resolve in SQL and are always current, so they page the corpus reliably. Free text alone never does. A title regex straight against the database is the surest check of all.
  * **The built-in duplicate check only catches same-day pairs.** `duplicates:suggest` pairs on FAISS >= 0.80 **and** +/-1 day, and found 0 of the 7 real duplicates this run produced, because a re-pinned project carries a *different estimated date* (Sydney Metro West at 2032-12-31 against an existing 2032-06-01). Cross-author duplicates also slip `rejectDuplicateSourceUrl`, which scopes to `userId`. Word-overlap over titles, scored and sorted, found all seven.
  * `search:refresh` rebuilds the index from **seedPins.json**, not the database, so it belongs *after* `backup:data`, never before.
  * **The media pipeline rejected large pictures outright** (`maxMemoryUsageInMB limit exceeded`) because `shrinkImage` decoded the full bitmap before resizing and jpeg-js caps at 512MB / 100MP. Fixed in `src/server/image.ts`. The first attempt at the fix did nothing: **`Jimp.read` drops its options when its input is a Buffer** and forwards them only when it fetched a URL itself, so the call had to move to `Jimp.fromBuffer`. There is a test on that difference.
  * Owner pages go stale in the opposite direction to the press, everywhere: the Port Authority still promised JFK T1 for 2026, Mass General still said 2027, VTA still said "Spring 2025", NCTD still said "early 2027". That disagreement is the `delayed` shape, and it produced 31 of the 131 pins.
  * A delay needs **both** halves quoted. Narita's third runway and Hong Kong's 11 SKIES were dropped precisely because the owner would not state the original date ("commercially sensitive"), and no source named a new one.
  * **WebFetch invented a cost figure** - "93.889 billion yuan" for Shanghai Metro Line 19, which appears nowhere in the article's wikitext - and mangled a Unicode filename so the image 404'd. Take numbers and image URLs from the raw API, never from a WebFetch summary.
  * Wikipedia's `api.php` 429s within about three rapid calls under parallel load, and returns plain text rather than JSON when it does. A real `User-Agent` plus ~6s spacing fixes it; batching titles (`titles=a|b|c`) helps more.
  * Currency: expand crore/lakh and 億/억, keep the source's own currency, never convert. Japanese fiscal years resolve to 1 April and the pin says so in `dateConfidenceReasoning`.
  * **PDFs read fine here.** The repeated "no PDF tooling on this box" note in this run's reports was wrong: poppler is installed and `pdftotext` is on PATH. It came from a shell test of the shape `command -v x && x ... || fallback`, which also takes the fallback when the command *runs and fails*. Owner PDFs then settled two questions no HTML page could - Mitsubishi Estate's own release gives Torch Tower "completion at the end of March 2028" against Wikipedia's uncorroborated "On hold" (pin 2251 moved to the release and 31 March), and Port Houston's October 2025 release confirms its own dredging is done while the 2029 date belongs to the whole of Project 11 (pin 2175 was right; the release is now a reference).
  * The pipeline reads PDFs itself since today ([pdfText.ts](../../../src/server/scrape/pdfText.ts), another session). Six sources still carried the **old** `Unsupported content type application/pdf` failure and were simply retryable: `wiki:refetch-blocked --apply --id ...` read all six (an FDA approval letter, a Sydney Metro document, two investor releases, a landfill fact sheet, Hillingdon's committee papers). Sweep for that error string after any reader change.
  * `pdfinfo` prints an absent title as a bare `Title:` label, and the title regex's `\s+` walked over the newline into the line below, so every untitled PDF came back titled "Author:". Fixed to `[^\S\n]+`, parser split out as `parsePdfInfo` and tested.
  * There was **no house convention for a bare year** - 12-31 (61), 01-01 (53) and 06-01 (26) were all in use - so this run's agents split too. Ian settled it: **a span takes its last day, so a bare year is 31 December**, and a period the event runs *from* takes its first. Now in the extraction prompt. Only 7 pins could be moved safely: matching on reasoning text alone would have dragged Angkor Wat to December 1150 while missing genuine bare years whose wording differed, so the rest are marked instead.
  * New `imprecise` okf:lint check (0051): every future pin dated to a year alone is a standing candidate for a better reference, because one later article naming the month retires a whole year of uncertainty. 153 pins on the first run. Past pins are left out - a bare year on something from 1150 is as good as it gets.
* **Changed** Pins 2163-2295 less 7 folded duplicates = 131 kept (46 estimated, 43 confirmed, 31 delayed, 11 scheduled); `src/server/image.ts` decode ceiling + tests; `backup:data` then `search:refresh` run in that order.

## 2026-09-20 (later) - fixing what the 32-city run exposed

* **Learned**
  * **The search was never stale.** `/api/pins/search` has a branch for a request with no `sort` at all, which called `searchPins` - hardcoded to date order. Sixteen agents read a date-ordered list of semantic hits, saw Victorian railways, and concluded the corpus was empty. Free text now ranks by relevance in both paths; a pure label search (`user:`, `tag:`, `posted:`) still answers by date, having nothing to rank by. One missing query parameter cost a whole run its duplicate checking.
  * `rejectDuplicateSourceUrl` scoped to `userId`, so a second curator could pin a page another had already pinned. Now global, with a different message when the pin is someone else's.
  * **A +/-1 day duplicate window cannot catch a re-scrape.** The same project pinned a year apart carries a different *estimated* date, which is the normal case, not the edge case. The window now follows the date's precision: 1 day for a firm date, a year for `estimated`/`delayed`. It found 30 pairs the old rule missed - Burj Azizi pinned twice 13 months apart, the Chuo Shinkansen, Bogota Metro, Rogun Dam, an exact-duplicate Grand Ethiopian Renaissance Dam - against 0 before. Title similarity still has to clear 0.80 and a person still confirms, so a wider window costs a suggestion, not a mistake.
  * **The oversized-picture bug is raised, not cured**, and cannot be cured this way: jpeg-js decodes the whole image before anything scales it, so the memory it wants grows with the *original's* pixels however small the thumbnail. 2GB covers about 45MP; a 174MP Commons scan still fails, and lifting the ceiling past the process's memory only trades a clean error for an OOM kill. It now fails with a message naming the remedy - ask the host for a smaller rendition (`iiurlwidth=1920` on Wikimedia's API; hand-built `/thumb/.../1024px-` URLs 400). The first attempt at the fix did nothing at all because **`Jimp.read` drops its options whenever its input is a Buffer**; it had to move to `Jimp.fromBuffer`.
  * The `imprecise` check first flagged any pin landing on 1 January or 31 December, which permanently listed events that genuinely fall on those days (a line opening on New Year's Day, a statutory deadline on the 31st). It now takes only `estimated` and `delayed` dates: a `scheduled` one is a day somebody announced.
  * Applying the convention needed reading, not matching. A regex over reasoning text wanted to drag Angkor Wat to December 1150 while missing bare years phrased differently, so only the 7 pins whose reasoning says in so many words that the source gave a year were moved, and the remaining ~146 are marked for a better reference instead.
* **Changed** Search sort default; global sourceUrl guard; precision-scaled duplicate window; 10 duplicates folded (7 from the run, 3 found by the new window); pin 224 re-dated and the Olympics duplicate folded; 7 spare pins posted (2296-2302); 5 dates sharpened by evidence; **130 OKF wikis written by hand and applied**, taking sources ready from 2,893 to 3,023 and leaving 8 of this run's 135 pins without one.

## 2026-09-20 (later still) - the OKF backfill, and what grounding a summary exposes

* **Learned**
  * **1,190 wikis written by hand** across 36 agent batches took sources `ready` from 2,893 to 4,109. 264 are marked failed, each with a reason that says whether retrying is worth it.
  * **Finishing the wikis unlocked the next stage**: summaries went from 2 due to 375, and contradiction checks from 750 to 1,074, because both need their pin's wikis first. Expect that cascade rather than treating the three job kinds as independent.
  * **The summary stage is an audit.** Forcing every bullet to carry a citation is what exposes a claim no source supports - nothing else in the pipeline does. About two dozen pins turned out to assert things their own sources do not, in four repeatable shapes:
    1. **A price read as a probability** (6 pins, all prediction markets - see [Vertical recipes](verticals.md)).
    2. **A figure computed rather than stated** - pin 2184's "$865 million" is a $45M and an $820M authorisation added together, which no page prints.
    3. **Absence asserted against presence** - three pins say "no opening venue announced" where the source names the venue in its infobox.
    4. **The right number at the wrong reference point** - an eclipse duration *at greatest eclipse* quoted as the maximum, which on pin 2132 is 0m48s against a true greatest duration of 01m25.9s.
    Plus plainly contradicted facts: pin 2224 reports a win where the source records a 2-2 draw.
  * Agents were told to **record disagreements rather than reconcile them**, and that discipline is what made the audit possible. A wiki that had silently picked one of three budgets would have hidden the pin's error instead of surfacing it.
  * **Domain knowledge prevents false positives.** Eclipse path pages use Universal Time and saros catalogues use Terrestrial Dynamical Time; TD - ΔT reconciles them exactly. One agent said so in all 18 of its summaries so the contradiction pass would not flag 18 pins for a difference that is not one.
  * Two host families serve one page for every URL and so produce identical captures that each look plausible alone: **wpcentral.com** (homepage) and **clinicaltrials.gov** (glossary shell). A `GROUP BY md5(text) HAVING COUNT(*) > 2` finds them; see [Sources](sources.md). **`wiki:refetch-blocked` cannot tell a wrong page from a blocked one** - it "recovered" 14 wpcentral links straight back to the same homepage.
  * Batch by **bytes, not job count**: the first split put 240KB Wikipedia articles and 2KB YouTube pages in equal-sized batches. Re-budgeting cut 735 remaining jobs from 25 batches to 9.
  * Applying results while agents still run is safe but confusing - three agents reported their output directory being "wiped" when it was the parent's own `mv`. Verify against the **database**, not the file layout: one sweep found 22 wikis written but never applied, stranded by an apply that threw midway.
* **Changed** Sources ready 2,893 -> 4,109; ~1,190 wikis and 375 pin summaries written by hand and applied; 264 dead captures marked with reasons; 75 eclipse `sourceModifiedDate` values cleared (a bare unlabelled footer date is not a stated date).

## 2026-09-20 - what grounding 375 summaries found: a triage list

Every bullet of a pin summary must end in a citation of a link that says it.
That one rule turned the summary pass into an audit of the pins themselves, and
it found three different problems that want three different fixes. Conflating
them would be a mistake: only the first group means a pin is wrong.

### 1. Contradicted - the linked source says something else

| Pin | The pin says | The source says |
| --- | --- | --- |
| 2292 CDG Express | Infra co owned by SNCF + Paris Aeroport; EUR 1.7bn state loan; Alstom trains; RATP Group | Equal thirds Groupe ADP / SNCF Reseau / Banque des Territoires; "financed the entire project without public subsidies"; **CAF France**; RATP **Dev** |
| 2224 Inter Miami | Beat Austin FC | A 2-2 draw |
| 2170 O'Hare Concourse 1 | SOM with Ross Barney, JGMA, Arup; $8.5bn | SOM and **Norviska**; ~$12bn now, completion 2034 |
| 889 Pirelli P Zero | Launched 1987 on the Ferrari F40 | First appeared **1985 on the Lancia Delta S4 Stradale** |
| 1862 Boeing 777-9 | Emirates expecting May/June 2027 | Late 2027; **Lufthansa** is launch customer |
| 2295 Tour Triangle | 42 floors | "35 des 44 etages" |
| 2258 Shanghai East | 14 platforms | 15 platforms, 30 tracks |
| 2259 Versova-Bandra | 9.6 km, two connectors | 9.8 km, four connectors |
| 346 Klipsch | Seven models | Six |
| 2212 A's ballpark | "Largest cable-net window in the world" | "One of the largest cable-glass windows in **North America**" |
| 2204 Phoenix light rail | B Line serves south Phoenix | Runs from Metro Parkway in **north-west** Phoenix |
| 2283 Finch West | 10.3 km | "Almost 11 kilometres" |

**A whole class of its own: a market price read as a probability.** A Kalshi or
Polymarket row shows a Chance, a Yes price and a No price - three different
numbers. Pins 1951, 1959, 1969, 1971, 1973, 1975, 1979(1988), 1983, 1993, 1679
and 1972 took a price for a chance. Pin 1971 gives Paxton 41%, his Buy No price,
against a 42% chance; pin 1959 quotes a player who **has no row at all**. Now
warned about in [Vertical recipes](verticals.md).

**And one of measurement, not fact:** an eclipse duration *at greatest eclipse*
quoted as the maximum (2126, 2132, 2155 - pin 2132 says 0m48s where the greatest
duration is 01m25.9s), and pins naming countries the NASA pages never name, they
give coordinates only (2123, 2126, 2150).

### 2. Unsupported - true or not, no linked source carries it

Around fifty pins state a figure, a date or a participant that appears in none of
their references: 2163, 2169, 2171-2172, 2176, 2179-2183, 2185-2186, 2188,
2190-2191, 2194, 2198, 2201, 2203, 2205-2206, 2208, 2220-2223, 2225-2226,
2228-2229, 2231, 2234, 2236, 2241-2242, 2244-2247, 2255-2256, 2261-2262, 2265,
2270, 2272, 2274, 2279, 2286, 2290-2291, 2293-2294, 568, 580, 591, 597, 807.

This is usually **not** a wrong claim. A scrape reads several pages and pins only
one as `sourceUrl`, so the facts are real but the evidence never made it into the
pin. The fix is a reference, not an edit - and it is why a scrape should add the
pages it actually read, not just the one it chose to cite.

### 3. Broken capture - the source cannot vouch for anything

- **2230 Cosm Atlanta** - the only source captured its headline and nothing else
  (a Next.js page whose body is in `__NEXT_DATA__`), so every figure on the pin is
  uncorroborated and its summary is correctly null. Re-fetch before re-running.
- **554 / 2304 Merdeka 118** - the stored capture of
  `skyscrapercenter.com/building/merdeka-118` is **entirely about Midtown East,
  Tokyo**. Two agents found it independently from both sides.
- **2205 TSMC Fab 2** - a Focus Taiwan paywall stub; backs the schedule and
  nothing else.

### What it means for the pin-writing prompt

The wiki and summary prompts say "record only what the source says" and the
citation rule enforces it. The pin extraction prompt has no equivalent pressure,
and the result is agents reaching past the page - summing figures, naming
architects, strengthening "one of the largest in North America" into "largest in
the world". Worth giving pin writing the same discipline.
