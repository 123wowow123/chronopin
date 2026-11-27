---
name: prediction-market-pins
description: >-
  Use this skill when creating or updating Predicted pins from Polymarket and Kalshi in the 06:00/18:00 news
  job, including the monthly Brent and WTI crude oil commodity threads and their post-settlement updates.
---

# Prediction market pins

Docs: `docs/okf/scraping/daily-jobs.md#predictionmarkets`, `### threadPredicted`. Pins go through the real API
and must reach production.

## Event pins (owner instruction 2026-10-15)
- Scrape interesting, high-volume markets across politics, tech/AI, space, macroeconomics, sports championships,
  culture, plus immediate weekly resolutions.
- Every pin must read as `Predicted`: set `dateConfidence: 'estimated'` (dated to the **predicted event onset**, never
  the market close or settlement buffer) and cite the Kalshi/Polymarket link as `sourceUrl` or a reference. The site
  then adds the `Predicted` tag itself (page, card, `tag:Predicted`). It is a derived reserved tag: the API drops it
  from `tags`, so a pin JSON without it is not a missing tag. Check on the pin page or with `tag:Predicted` search.
- Quote dollar volume and odds **with the observation date**.
- Thread to candidate parents (`parentId`) whenever an earlier event in the series, flight-test programme,
  election cycle or franchise exists. A response series is one linear chain; no branching.
- Check for duplicates with `GET /api/pins/search?q=...` first. Each reference needs a per-item `sourceUrl`.

## Predicted date updates (owner, 2026-11-25; every 06:00 and 18:00 run)
Run `predicted_date_checks` and work every pin it returns (`missed`, `resolved`, `ladder`). Without the tool (no open
job run), read the pin's market (`gamma-api.polymarket.com/events?slug=<slug>`) and apply the same rules.
- **New date:** the first day of the likeliest window still ahead (cumulative ladder: subtract neighbouring lines to
  get each window's share); its last day if that window is under way. Say it is an estimate, not an announced date.
  For "begins by" / ceasefire / "effective by" ladders this is the **most likely effective end date**: the end of the
  window with the biggest share, never the last priced line just because its cumulative odds are highest (the cumulative
  figure always grows with the date). Quote both lines in `dateConfidenceReasoning`. Pin 20946 (US-Iran ceasefire,
  2026-11-26): Nov 23-30 added 16 points (57.5% to 73.5%), Dec 1-31 added 9 (to 82.5%), so the date is Nov 30; Dec 31 was
  set once on the owner's request and was the wrong rule.
- **Missed date** (the pin's day passed, no event, moved later): set `originalStartDate` to the missed day **only when
  it is empty**, and `delayReasoning` starting `Estimated:`. The start bar shows that date and each later one pushed
  back as separate segments, labelled under the bar (from the update log, `missedDates` in `src/lib/delay.ts`). Later
  slips only move `utcStartDateTime` (and refresh `delayReasoning`); never overwrite `originalStartDate`.
- A date only brought forward, or shifted before it arrived on a pin that never missed one, sets neither field.
- **Also update:** a dated odds bullet on top of `longFormSummary` (with the move), `description`,
  `dateConfidenceReasoning`, `marketVolume` and the market reference's reasoning. `resolved`: the actual date from the
  primary source and `dateConfidence: 'confirmed'`.
- Save with `update_pin` (or a whole-pin `PUT`, see `daily-news-job`), production matched by `sourceUrl`, then read
  back date, `originalStartDate`, author, tags, media, parent. Translations stay with the translation agent.
- Worked example: pin 15613 (next Claude Opus): Nov 30 estimate (Oct 15), brought to Nov 1 (Oct 21, not a slip),
  Nov 1 missed, moved to Dec 1 (Nov 25) with `originalStartDate` 2026-11-01.

## Unconfirmed reports panel (owner, 2026-11-25)
- The scrape's reference search records them for any new pin, and every 06:00/18:00 run looks for them on each pin it researches (daily-news-job skill, "Unconfirmed reports on every pin"). While updating a predicted pin, look for fresh leak or unnamed-source reports about the event.
- Add each as a reference: `confidence` under 50 (40), `publishedDate`, **no** `startDate`/`endDate`, `reasoning` =
  `Unconfirmed report: <who reported what, when, and on what basis; that the company has not confirmed it>`. Write it
  for readers (no notes about our process); at most one or two sentences, only what the page says.
- It shows under the market odds (`PinUnconfirmedReports`) and is left out of the article rewrite. Never put the claim
  in the title, description, summary or date reasoning. Confirmed or disproved: drop the prefix and re-rate it.

## Pictures must match the title (owner, 2026-11-25)
- **Open and look at the picture** before saving it, and again on every pin the date check returns. Any words, model or
  version number, team, person or year in it must agree with the title. Pin 15613 ("Next Claude Opus Model") showed
  "Claude Sonnet 5.5": the previous release's announcement art.
- An unreleased product has no art of its own: use the product line's official picture with **no version in it**, never
  a sibling's or an earlier release's announcement card. Anthropic: the `og:image` of `anthropic.com/claude/opus`
  (or `/sonnet`, `/haiku`), a plain "Claude Opus" wordmark; other makers: the product line's own page.
- Replace it (do not just add a second one): whole-pin `PUT` without the wrong medium, credit the new one
  (`pin-media-azure`), `POST /api/admin/pins/expire`, then view the pin page on production.

## Refresh championship pins (2026-11-25)
- Long-dated "who will win" pins (NBA, Super Bowl, World Series, World Cup, elections) go stale: pin 1955's
  newest snapshot was a month old. Each run, update any whose newest snapshot is over 7 days old with
  `update_pin`: a new dated bullet on top of `longFormSummary` (top teams, volume, move since the last one), a
  fresh `description` starting with year + top-three odds + as-of date (meta cuts near 155 characters), and a
  search-wording title ("2027 NBA Champion Odds: Who Will Win ..."). Old slugs 308 to the new one.
- Polymarket: `gamma-api.polymarket.com/events?slug=<slug>` (`outcomePrices[0]` per market, `volume`).

## Monthly Brent and WTI pins
- One pin per commodity per month: tag `Predicted`, `dateConfidence: 'estimated'`, dated to the month's
  **settlement date**, quoting the modal strike distribution and dollar volume, under `@EnergyDesk` or `@EconDesk`.
- Thread to the prior month's pin in that commodity's chain (`parentId`); any author may be in the chain (threads are no longer limited to one author, 2026-11-26).
- After realization: write the final settlement value, set `dateConfidence: 'confirmed'`, and add reasoning on
  why the prediction hit or missed against the drivers (OPEC+ quota compliance, Hormuz/geopolitical risk premia,
  commercial and SPR inventories, global refinery demand).

## Music-contest pins (Eurovision, song contests)
A market on a song contest's winner gets a **Contenders** panel with each entry's song, listed and playable.
- Save the entries with `PUT /api/pins/:id/candidates` (replaces the list; author or admin). Row: `category: "entry"`,
  `rank` (1 = market favourite), `name` = the **song**, `artist` = `"Performer · Country"`, `odds` (cents, from the
  market, read on `asOf`), `oddsLabel: "winner"`, `sourceUrl` = the market, `previewUrl` = a direct ~30 s audio
  preview, `workPinId` when the song has its own pin. Schema: `0146` + `0257`; code: `PinCandidates`,
  `EntryTracklist`, `src/server/model/pinCandidate.ts`.
- One list per pin: the card is full width, and each row carries the album control's round play button (same queue
  and global player bar as a music pin's album), rank, song · performer, and the price bar. Never add a second
  tracklist box for the same songs.
- Preview audio: iTunes Search (`itunes.apple.com/search?term=<performer song>&entity=song`), taking `previewUrl`
  only when track and artist both match. No match: leave `previewUrl` null (no play button on that row). Never
  invent a URL, a song or an entry; list every country in the contest, not only the ones with odds.
- Songs come from the organiser's entry list; cite it. Cross-check titles and performers in a second source (Wikipedia's
  participants table, the broadcaster's artist guide). Spell titles as the organiser does; for a two-country-spelling
  case (Bhutan "Lhayi Semo") use the organiser's.
- Prices: the market page's Yes price in cents on the day you read it, `asOf` that day (the page may show a rounded
  percentage that differs from the price; use the price). Rank by price, favourite first.
- iTunes traps: a fuzzy search returns a different song (Thailand's "Aroma" first matched "Pos Ronda Aroma
  Misteri"); retry with the performer's other stage name or the `th`/`vn`/`kr` storefront. Accept a stage-name
  variant (Laos "Thinla" is "Thinlamphone", Thailand's is "MANG & Daou Pittaya") only when the title matches.
- Media (three per pin): the contest's own press images, not Commons first. Official site images are served from the
  organiser's CMS (`cms.eurovisionasia.com/api/media/file/...`, send the site as `Referer`): the trophy, the running-
  order graphic, an on-stage or rehearsal shot of an entry. View each; skip a portrait you cannot tie to a named
  entry. Credit "(EBU / <contest>)" with the organiser's news page as `authorUrl`; store in Azure (`pin-media-azure`).
- Template for the whole backfill (candidates + Azure upload + credits + readback):
  `scripts/markets/eurovision-asia-backfill-2026-11-11.mjs` (dry run by default, `--apply` writes to production).
  Re-run it on contest day to refresh prices, and after the final write the result in the pin.
- Translations stay with the translation agent.

### Setlist markets (which songs a headliner plays; Jay-Z Super Bowl LXI, pin 20934)
Same panel and control, with `category: "setlist"` and `oddsLabel: "played"` (migration 0258; heading "Setlist songs",
subtitle "Market price to be played"). List **every** song the market offers (25 for Jay-Z), `name` as Polymarket
spells it (masked profanity stays masked), `artist` as the credited recording on iTunes (a feature is credited to the
lead: Rihanna's "Umbrella", Beyoncé's "Crazy in Love"). Illiquid songs show stale last prices (92¢ with $0 volume):
use the page's **displayed percentage**, which is the midpoint, never the raw cent price. Media: the announcement
photo (Roc Nation, via JamBase, `Photo via Roc Nation`) and the venue (Commons, CC BY 2.0, credited); the NFL/Apple
newsroom pages had no downloadable press photo. Script: `scripts/markets/jayz-halftime-backfill-2026-11-11.mjs`
(`--local` writes to localhost; production needs 0258 and the setlist code deployed first).

### Artist-ranking markets (Spotify top artist of the year, pin 1965)
`category: "ranking"` (migration 0259; heading "Artists in the running", price label "to win"). `name` = the artist,
`artist` = the track the row previews, `previewUrl` = an iTunes preview of **one well-known track** (a signature
song, not a claim about their most-streamed track). List every named artist on the market, favourite first, with the
page's displayed percentage. Media: the publisher's newsroom chart, labelled as the previous year's ranking when it is
(Wrapped 2025 top artists for the 2026 market). Script: `scripts/markets/spotify-top-artist-backfill-2026-11-11.mjs`.

## Track record (/predictions)
After creating pins, call `prediction_accuracy` (`apply: true`): it records each market's odds once and settles closed
ones; the page shows hit rate, Brier score and calibration. Never edit `PredictionRecord.outcomes` by hand: the page
is only trustworthy while the recorded odds are the ones the pin was written with.

## Checks
Citations `[n]` must be within the reference count; no reference repeats the sourceUrl; scan for eaten `$`
amounts; company stock lines must match the company ticker note exactly. Live odds panels use Kalshi/Polymarket
(`PinSeries`/market odds); see memory notes prediction-market-scraping and kalshi-score-markets.

## Music-contender traps (from the 2026-11-11 backfill)

- `PinCandidate.category` is `varchar(8)`: new category names must fit (`setlist` 7, `ranking` 7).
- `oddsLabel` values are `nominee`, `winner`, `played`. A new one needs the CHECK constraint, `candidatesProblem`, the type in `src/lib/candidates.ts` and the subtitle in `PinCandidates`.
- iTunes search returns look-alike songs: accept a match only when title and artist both agree (Thailand's "Aroma"). Unconfirmed: Laos "BAE" is assumed to be Thinla (iTunes artist "Thinlamphone").
- Use Polymarket's displayed percentage (`outcomePrices` mid), never the Yes cent price; illiquid outcomes show stale cents.
- `addMedia` through `PUT` drops credits: the scripts PATCH `/api/admin/db/Medium` afterwards and read back.
- Refresh by editing the odds in `scripts/markets/*-backfill-*.mjs` and re-running `--apply` (prod by default, `--local` for localhost): Eurovision Asia final 14 Nov 2026, Spotify Wrapped about 3 Dec 2026, Super Bowl LXI 14 Feb 2027. After the result, write it into the pin text.
- Not backfilled: pin 1963 (headliner resolved; 20934 covers it) and 1961 (Game Awards GOTY: not music, needs a plain contenders list with covers).
