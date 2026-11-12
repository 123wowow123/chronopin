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
- Tag every pin `Predicted`; set `dateConfidence: 'estimated'`, dated to the **predicted event onset**, never the
  market close or settlement buffer.
- Quote dollar volume and odds **with the observation date**.
- Thread to candidate parents (`parentId`) whenever an earlier event in the series, flight-test programme,
  election cycle or franchise exists. A response series is one linear chain; no branching.
- Check for duplicates with `GET /api/pins/search?q=...` first. Each reference needs a per-item `sourceUrl`.

## Monthly Brent and WTI pins
- One pin per commodity per month: tag `Predicted`, `dateConfidence: 'estimated'`, dated to the month's
  **settlement date**, quoting the modal strike distribution and dollar volume, under `@EnergyDesk` or `@EconDesk`.
- Thread to the prior month's pin in that commodity's chain (`parentId`), same author throughout.
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
