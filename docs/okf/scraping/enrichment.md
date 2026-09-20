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
- **Yield (2026-09-19 check):** non-anime pins yield real press-release and trade references. Anime pins yield only weak Wikipedia series pages that restate MyAnimeList, so leave them.

# Images and media

The target is **3 media per pin, by best effort, at least 1 of them a picture**: keep going down the list below until there are 3, and save fewer only when every source is exhausted (record what was tried). Pictures come first, then any video. [mediaTarget.ts](../../../src/lib/mediaTarget.ts) holds the rule: `picturesNeeded(media, images) = max(3 - media, 1 - images, 0)`, so a page whose only media is a video is topped up with two pictures, and a pin with three media and no picture is topped up with one. `GET /api/scrape/images?have=<media>&images=<pictures>` applies the same rule for a release-notes entry (`images` defaults to `have`). When the extractor gave no title (no key or credit), the top-up searches with the page's own `<title>`; that keeps best effort going but can return a loosely related Wikipedia photo, so review it.

[findImages.ts](../../../src/server/scrape/findImages.ts) tops a pin up by `picturesNeeded`, in this order, and stops when it has enough: (1) the company's own announcement on its Discourse forum (also cited as a reference; the announcement can come weeks ahead but not after), (2) the lead image of each referenced article from the pin's day, (3) Wikipedia photos for the work, the title, else the company ([wikiImages.ts](../../../src/server/scrape/wikiImages.ts): photo formats only, large enough for a card, largest first). Page images smaller than 150x150 are dropped. A tweet's pictures come from the preview image of the pages it links to; a video's from its stills (`hqdefault`, `hq1`-`hq3`).

**Backfill:** `npm run media:top-up` (dry run by default; `--apply`, `--min` for pins with no picture, `--limit`, `--offset`, `--pin`, `--delay`) tops existing pins up to three media with the same keyless sources, pins with no picture first, storing each through the app's medium code with retry. **By hand:** `og:image` from the source or a Wikipedia article (decode `&amp;`); download through the app's medium code, not the raw CDN. Wikimedia needs a User-Agent that names the client and a contact ([Sources](sources.md)).

# Film, TV, anime and game extras

[screen.ts](../../../src/server/scrape/screen.ts) and [scoreMarkets.ts](../../../src/server/scrape/scoreMarkets.ts), all keyless:

- **Trailer:** YouTube's own search results page (an AniList entry's listed trailer first for anime), checked through oEmbed, which also refuses videos whose owner turned embedding off. A page that already embeds a video keeps that one. Read the dry run of `media:screen` before applying: a trailer is picked by title and can be a fan upload, an episode, or a different adaptation with the same name (the 1999 One Piece anime versus the live-action series).
- **Ratings:** AniList; MyAnimeList through Jikan by the MAL id AniList gives; Wikidata's review-score statements for IMDb, Rotten Tomatoes and Metacritic (imdb.com itself blocks scripts). A work counts as found only when a title matches exactly after normalising case, punctuation and "2nd Season"/"Season 2", and its year fits the pin's.
- **Episode counts by id:** a pin that cites MyAnimeList (most anime pins do) is looked up by that id first - AniList's `Media(idMal:)`, then Jikan - because a pin titled "Gintama Season 2 Premieres" matches no catalogue title but its MAL link names the work outright. `malIdOf` reads the id from the source URL and the references; a MAL page scrape passes its own URL.
- **Episode counts:** how many episodes an episodic work has, for a pin whose category is `Anime` or `TV Series` (never `Movies` or `Anime Movie`: Wikidata's title search happily answers "Supergirl" or "Masters of the Universe" with the series of the same name, which would give the film pin its episodes). AniList first (`episodes` with `status`, else `nextAiringEpisode.episode - 1` for a long-running show with no announced total), then MyAnimeList through Jikan, then Wikidata `P1113`, where an end time (`P582`) is what makes a count `complete`. The page's own count wins over all three: the article knows which season the pin is about. A count of one is no count.
- **Kalshi score forecast:** KXRT (Rotten Tomatoes) and KXMC (Metacritic) events. While open it prices P(score > N) into a market-implied "Kalshi RT forecast", kept as its own rating, never averaged with the site's. Once settled, the event's `expiration_value` is the site's actual score.
- **Backfill:** `npm run media:screen` (dry run by default, `--apply`, `--ids`, `--skip-trailer`, where `--skip-trailer all` looks up nothing but ratings and episode counts). A pin that already has an episode count keeps it.

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
