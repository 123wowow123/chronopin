---
type: Reference
title: Scraping enrichment stages
description: References, pictures, film/TV/anime/game extras, place and company, awards and tags, threads and release-notes entries - how each stage works, its keyless sources, and how to do it by hand.
resource: ../../../src/server/scrape/index.ts
tags: [scraping, references, images, media, threading]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T20:00:00Z }
---

# References

[references.ts](../../../src/server/extract/references.ts) runs a web-search call beside the extractor: up to 5 searches, 90 seconds, first 20,000 characters of the source. The model records its picks through a strict `record_references` tool: `{url, title, confidence, publishedDate, startDate, endDate, reasoning}` each, plus a cited `longFormSummary`.

- **Bar:** `MIN_CONFIDENCE` 70, at most 5, strongest first. A URL survives only if it came back in a search or fetch during the call.
- **Confidence scale:** 90-100 an official or primary source stating the event and date as firm; 75-89 reliable independent reporting giving the same date; 50-74 an estimate, window or differing date; below 50 weak or contradicting. The site's own standing then lowers it: a small or hobbyist site, or a thin rewrite, sits at least 15 points below what the page claims.
- **Skip:** the source and its copies, aggregators, forums, social posts, sponsor, affiliate, merch, newsletter and social-profile links. Follow the leads a video description or tweet gives (a "full story" article, credited agencies, architects).
- **By hand:** `npm run references:list -- --below=2 --batch=N --of=M --out=FILE` lists pins short of references; find pages, fetch each one and read it, then `npm run references:apply -- --id=N --file=refs.json`. The apply script loads the whole pin first (the update rewrites every column) and passes candidates through the same bar. Set a reference's `startDate`/`endDate` only when the page firmly dates the event.
- **A released product's MSRP:** for a product pin, check the company's own product or store page and cite it as a reference (Apple's `/shop/buy-mac/...` carries `currentPrice` in the page JSON where the marketing page prices nothing). It is the first-party price, so it both confirms the figure the article quoted and dates well: pin 315 cites `apple.com/shop/buy-mac/mac-mini` at 88 for $899 base / $1,699 M5 Pro.
- **A reference's own embedded video** is a reference too. An article that embeds the company's announcement video is citing it; cite it directly (Apple's own "The new Mac mini with M6" upload, embedded by MacRumors, is a stronger reference at 85 than either article), and put the video on the pin's media as well. The publisher's own podcast episode embedded in its article is worth a reference at the article's level, not media.
- **Yield (2026-09-19 check):** non-anime pins yield real press-release and trade references. Anime pins yield only weak Wikipedia series pages that restate MyAnimeList, so leave them.

# Images and media

The target is **3 media per pin, by best effort, at least 1 a video and at least 1 a picture**: keep going down the list below until there are 3 and both kinds, and save fewer only when every source is exhausted (record what was tried). Pictures come first, then the video. The video: the page's embed, **an embed in one of the pin's reference articles** (grep their raw HTML - the markdown conversion WebFetch and the fetcher do drops iframes, so the video is invisible in the text), a screen work's trailer (`findTrailer`), else `findProductVideo` in [screen.ts](../../../src/server/scrape/screen.ts), run after the picture top-up when the pin still has none. It searches YouTube for the company and title and `pickProductVideo` keeps only a **verified channel** whose title has at least half the pin's distinctive words and is not a reaction, review, leak or "vs" video (a channel named after the company scores higher); oEmbed then drops a video that cannot be embedded. A pin that finds none is saved without one. `videosNeeded(videos)` in [mediaTarget.ts](../../../src/lib/mediaTarget.ts) says whether to look; the video comes on top of the pictures, so a pin can end with 4 media. When the extractor gave no title (no key or credit), the top-up searches with the page's own `<title>`; that keeps best effort going but can return a loosely related Wikipedia photo, so review it.

[findImages.ts](../../../src/server/scrape/findImages.ts) tops a pin up by `picturesNeeded`, in this order, and stops when it has enough: (1) the company's own announcement on its Discourse forum (also cited as a reference; the announcement can come weeks ahead but not after), (2) the lead image of each referenced article from the pin's day, (3) Wikipedia photos for the work, the title, else the company ([wikiImages.ts](../../../src/server/scrape/wikiImages.ts): photo formats only, large enough for a card, largest first). Page images smaller than 150x150 are dropped. A tweet's pictures come from the preview image of the pages it links to; a video's from its stills (`hqdefault`, `hq1`-`hq3`).

**No picture twice:** a picture that is one the pin already has fills a slot without adding anything, and the sources repeat each other constantly - a catalogue's poster on its own page is the same poster its CDN serves at another size, an article's `og:image` is the photo the page itself showed. Two guards, in [imageHash.ts](../../../src/server/imageHash.ts): `sameImageKey` reads a CDN's size out of the URL (MyAnimeList's `l`/`t`/`v` suffix, Wikimedia's `/thumb/.../640px-`, a resizing query) so `findImages` skips the repeat before downloading it, and every picture saved gets a 64-bit difference hash, which `withoutRepeatedPictures` ([medium.ts](../../../src/server/model/medium.ts)) compares against the pin's other pictures as a pin is created, updated or topped up. Within 6 bits is the same picture: measured over this catalogue, one poster at two sizes or with a title band added comes out at 6 or less, and by 10 two different photographs of one event are in range. Only pictures are weighed, only against the same pin's, and a picture that will not download is kept. The false positive to know about is a pair of badge logos that differ in one glyph (Intel Core 3 and Core 5) - a finer hash does not tell those apart either.

**Read back what a top-up attached.** `media:top-up`'s Wikipedia fallback (step 3
above) is worse than nothing on a subject it cannot illustrate, and it fails
silently: on the Aerospace run it put a Mars helicopter on the Wright Flyer pin,
a Heinkel He 118 on the He 178 pin, a Boeing 787 on the de Havilland Comet pin,
an A330 on the A350F pin and a MAX 8 on the 737-7 pin - five of seventeen
pictures, all of them the wrong subject. Its dry run prints only a count (it
returns before the per-pin loop), so the only way to see what it chose is to run
it with `--apply` and then list the pins' picture filenames, which give a
mismatch away at a glance. Take the wrong ones off with `Medium#deleteFromPin`
(the path `media:dedupe` uses) and look the right one up on Commons
(`action=query&list=search&srnamespace=6`, then `prop=imageinfo&iiurlwidth=1280`,
keeping `image/jpeg` and `image/png`). Where Commons has no photograph of the
subject - a variant not yet in service, such as the 737-7 or the A350F - leave
the pin below the target rather than hang a lookalike on it.

**Backfill:** `npm run media:dedupe` (dry run; `--apply`, `--pin`, `--distance`) takes the repeats off pins that collected them before that existed, keeping the first of each - 292 pictures on 292 pins on 2026-09-20. `npm run media:top-up` (dry run by default; `--apply`, `--min` for pins with no picture, `--limit`, `--offset`, `--pin`, `--delay`) tops existing pins up to three media with the same keyless sources, pins with no picture first, storing each through the app's medium code with retry. `npm run media:videos` (dry run by default; `--apply`, `--category`, `--pin`, `--limit`, `--offset`, `--delay`) gives pins with no video the official one through `findProductVideo`, leaving films, series and anime to `media:screen` - 21 of 66 game pins on 2026-09-20, the rest having no official video to find. **By hand:** `og:image` from the source or a Wikipedia article (decode `&amp;`); download through the app's medium code, not the raw CDN. Wikimedia needs a User-Agent that names the client and a contact ([Sources](sources.md)).

# Film, TV, anime and game extras

[screen.ts](../../../src/server/scrape/screen.ts) and [scoreMarkets.ts](../../../src/server/scrape/scoreMarkets.ts), all keyless:

- **Trailer:** YouTube's own search results page (an AniList entry's listed trailer first for anime), checked through oEmbed, which also refuses videos whose owner turned embedding off. A page that already embeds a video keeps that one. Read the dry run of `media:screen` before applying: a trailer is picked by title and can be a fan upload, an episode, or a different adaptation with the same name (the 1999 One Piece anime versus the live-action series).
- **Ratings:** AniList; MyAnimeList through Jikan by the MAL id AniList gives; Wikidata's review-score statements for IMDb, Rotten Tomatoes and Metacritic (imdb.com itself blocks scripts). A work counts as found only when a title matches exactly after normalising case, punctuation and "2nd Season"/"Season 2", and its year fits the pin's.
- **Episode counts by id:** a pin that cites MyAnimeList (most anime pins do) is looked up by that id first - AniList's `Media(idMal:)`, then Jikan - because a pin titled "Gintama Season 2 Premieres" matches no catalogue title but its MAL link names the work outright. `malIdOf` reads the id from the source URL and the references; a MAL page scrape passes its own URL.
- **Episode counts:** how many episodes an episodic work has, for a pin whose category is `Anime` or `TV Series` (never `Movies` or `Anime Movie`: Wikidata's title search happily answers "Supergirl" or "Masters of the Universe" with the series of the same name, which would give the film pin its episodes). AniList first (`episodes` with `status`, else `nextAiringEpisode.episode - 1` for a long-running show with no announced total), then MyAnimeList through Jikan, then Wikidata `P1113`, where an end time (`P582`) is what makes a count `complete`. The page's own count wins over all three: the article knows which season the pin is about. A count of one is no count.
- **Kalshi score forecast:** KXRT (Rotten Tomatoes) and KXMC (Metacritic) events. While open it prices P(score > N) into a market-implied "Kalshi RT forecast", kept as its own rating, never averaged with the site's. Once settled, the event's `expiration_value` is the site's actual score.
- **Backfill:** `npm run media:screen` (dry run by default, `--apply`, `--ids`, `--skip-trailer`, where `--skip-trailer all` looks up nothing but ratings and episode counts). A pin that already has an episode count keeps it.

# Market volume

A pin whose `sourceUrl` or references link Kalshi, Polymarket or Polymarket US carries the dollars traded across those markets ([pinMarketVolume.ts](../../../src/server/services/pinMarketVolume.ts), `Pin.marketVolume`, schema 0053). Like the other enrichments it runs after every save and edit, never from anything an author types.

- **Where the figure comes from:** Polymarket's `volume` in dollars; Kalshi's `volume_fp` contracts priced at `last_price_dollars`, an estimate at today's price that can drift down when the price falls; nothing from Polymarket US, which publishes no volume. A market the exchange will not answer for counts as nothing and leaves the last figure standing.
- **Kept up:** the odds feed stores what it has already read while anyone is looking at the pin (at most hourly, and only when the figure moved more than 2%), so a busy market's pin does not go stale between edits.
- **Backfill:** `npm run markets:volume` (dry run), `-- --apply`, `-- --ids`, `-- --stale 1d` for only the figures older than that. It is left out of `seedPins.json`, so a fresh seed needs one run.
- **What reads it:** the pin page's "traded" pill and each market box's own figure, and the timeline's bag weight ([bagSample.ts](../../../src/lib/bagSample.ts)), which multiplies a pin by 1 + half a point per tenfold above $10,000, capped at 2.5x.

# Place and company

For a film, TV series, anime or game with no place from the page, the pin goes on the map at its studio's headquarters ([studioLocation.ts](../../../src/server/studioLocation.ts)): Wikipedia, then Wikidata's headquarters claim (`P159`) in order of precision: the claim's own coordinates and English street address, the company's own coordinates, then the headquarters place's coordinates labelled "Ward, City, Country". A country-only answer is rejected (the middle of a country is no studio's address). The result is kept on the company (`hqAddress`, `hqLatitude`, `hqLongitude`), so a studio is looked up once. `placeAtStudio` runs after every save; `npm run media:studio-locations` backfills.

**By hand** (studios Wikidata does not know): find the head office from a page you fetched (Wikipedia in the studio's language, official site, ANN or MAL producer page, OSM Nominatim for coordinates), never a country or province centre, and write `hqAddress`, `hqLatitude`, `hqLongitude` and `utcHqCheckedDateTime` on the company, then run the backfill. Beware name collisions between studios. Company logos: `npm run companies:logos`; a company with no Wikipedia article needs `websiteUrl` set first.

# Awards and tags

`awardsFor` matches the work's title against the award bodies' own pages (anime bodies today; film and TV bodies are not in yet) and the save stores them as `PinAward` and award tags. Tags from the extractor are the user's-view tags (awards first, then franchises, people, programmes, places, at most 8); categories are tags of kind `category`, several per pin. `npm run tags:sync` refreshes the derived ones.

# Threads

- **Anime seasons** ([prequel.ts](../../../src/server/scrape/prequel.ts)): each season responds to the one before it, found by MyAnimeList id and AniList's prequels, walking back until a pinned one is found. Pinning a missing season later re-slots the seasons after it. One linear, story-ordered chain: never branch (the thread view only follows ancestors and descendants); if a branch is needed, ask instead of creating the pin.
- **AI model lines** ([modelSeries.ts](../../../src/server/scrape/modelSeries.ts)): a release or update answers the latest earlier pin from the same company about the same model line at the same or an earlier version (GPT-4.1, GPT-5, 5.2 Thinking, 5.4 Thinking and 5.6 Sol are one thread). Only clearly next steps are threaded.
- `POST /api/pins` threads automatically when the body has no `parentId`; `parentId: null` posts the pin on its own.

# Release-notes pages

A page with three or more dated headings (release notes, changelogs) returns `entries`, one candidate pin per heading, each marked when a pin already exists for its URL. The create form posts each through `POST /api/pins`, oldest first, optionally threaded as one series. A launch's pictures are the biggest gap on these pages: the company's forum announcement, then the same-day referenced articles.

# Medium types

`Medium.type` is **1 = image, 2 = twitter, 3 = youtube**, and a YouTube medium
is stored as the **embed** URL (`https://www.youtube.com/embed/<id>`), not the
watch URL. The `MediumType` table reads 1 = youtube, 2 = image, 3 = twitter and
is **not** what the column stores - go by the data, not that table. Posting a
watch URL as `type: 1` fails the whole `PUT` with `Could not find MIME for
Buffer`: the thumbnailer tries to decode the HTML page as an image.
