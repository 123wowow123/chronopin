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

It happened again on 2026-09-21, across the weather and restaurant batches, and
the failure mode is worth naming: **the fallback matches on a word of the title,
not on the subject.** "Chubby Cattle" fetched two portraits of **Chubby
Checker**; "Australia Burns Through the Black Summer" fetched **Wes Borland of
Limp Bizkit** (Black Light Burns); "Lake Nyos" fetched **Walden Pond**; the IPCC
cities report fetched **ground elder**. Others were subtler and just as wrong -
Hurricane **Laura**'s damage on the Katrina pin, Cyclone **Catarina** on two
different cyclone pins, the **1793** burning of Cap-Francais on the 2010 Haiti
earthquake, and a generic Apollo 17 Earth on two separate earthquakes. 21
pictures over 15 pins came off. A single-word overlap is the tell: check the
filename against the pin's *subject*, not against its title.

**A removal is not durable.** `findImages` only skips pictures the pin already
has (its `skip` argument), and nothing anywhere records that a picture was
rejected - so the next `npm run media:top-up` over those pins will attach Chubby
Checker again. Until there is a rejection list, re-run the top-up only with
`--pin` for pins you are about to read back, never in bulk over pins that have
already been cleaned.

**Backfill:** `npm run media:dedupe` (dry run; `--apply`, `--pin`, `--distance`) takes the repeats off pins that collected them before that existed, keeping the first of each - 292 pictures on 292 pins on 2026-09-20. `npm run media:top-up` (dry run by default; `--apply`, `--min` for pins with no picture, `--limit`, `--offset`, `--pin`, `--delay`) tops existing pins up to three media with the same keyless sources, pins with no picture first, storing each through the app's medium code with retry. `npm run media:videos` (dry run by default; `--apply`, `--category`, `--pin`, `--limit`, `--offset`, `--delay`) gives pins with no video the official one through `findProductVideo`, leaving films, series and anime to `media:screen` - 21 of 66 game pins on 2026-09-20, the rest having no official video to find. **By hand:** `og:image` from the source or a Wikipedia article (decode `&amp;`); download through the app's medium code, not the raw CDN. Wikimedia needs a User-Agent that names the client and a contact ([Sources](sources.md)).

# Film, TV, anime and game extras

[screen.ts](../../../src/server/scrape/screen.ts) and [scoreMarkets.ts](../../../src/server/scrape/scoreMarkets.ts), all keyless:

- **Trailer:** YouTube's own search results page (an AniList entry's listed trailer first for anime), checked through oEmbed, which also refuses videos whose owner turned embedding off. A page that already embeds a video keeps that one. Read the dry run of `media:screen` before applying: a trailer is picked by title and can be a fan upload, an episode, or a different adaptation with the same name (the 1999 One Piece anime versus the live-action series).
- **Who published it beats where YouTube put it.** Only verified channels are considered, but an aggregator is verified too, and on title and rank alone AnimeSelect and Anime World beat the studio's own channel twice in one day. `pickTrailer` now scores the channel as well: **+3** for a channel whose name carries a distinctive word of the work, or the pin's company (the studio or licensor - "TOHO animation" for a Madhouse or Production I.G title, "Crunchyroll Collection", "ONE PIECE Official"), **-3** for a name built only from generic words, which is enough to outweigh the whole rank spread. It demotes rather than drops, so a work whose only verified upload is an aggregator's still gets a trailer. The generic test runs **first**: a filler word is sometimes the work's own name too ("World Trigger" against "Anime World"), and the channel is an aggregator either way.
- **Gap - a company's own launch video may not be badged verified.** `pickProductVideo` returns early on `!candidate.verified`, and YouTube's search page carried no verified badge for Anthropic's own `@anthropic-ai` upload of "Introducing Claude Fable 5.1" - the top result for the query. The channel scoring above cannot rescue it, because the verified gate runs first. Until a channel matching the pin's company counts as verified enough, a company launch video is a hand pick (pin 2693 took one).
- **Adaptation source:** AniList's `source` becomes a tag on the pin (`Manga Adaptation`, `Light Novel Adaptation`, `Original Work`, `Game Adaptation`, ...) through `adaptationTag`. `ANIME` and `OTHER` map to no tag. The `Adaptation`/`Work` suffix is not decoration: a bare `Manga` is a **category** name, so `tagKind` files it as one and `replace` drops it from a tag write without a word - the family is named so no member can collide, and a test asserts it. `media:screen` backfills it with `PinTag.addUserTags`, which appends rather than replacing, so a curator's own tags survive.
- **Ratings:** AniList; MyAnimeList through Jikan by the MAL id AniList gives; Wikidata's review-score statements for IMDb, Rotten Tomatoes and Metacritic (imdb.com itself blocks scripts). A work counts as found only when a title matches exactly after normalising case, punctuation and "2nd Season"/"Season 2", and its year fits the pin's.
- **By the cited id, first:** a pin that cites MyAnimeList (most anime pins do) is looked up by that id **before any title search** - one AniList call that settles the score, the episode count and the adaptation source without a title match. It has to come first, not last: `findScreenDetails` shares one 60-second budget across every call a pin makes, and a pin citing an id is usually one whose title matches nothing, so the title searches both fail and spend the budget before the decisive request runs. It is AniList's `Media(idMal:)`, with Jikan the fallback only for a show AniList leaves open, and it is what saves a pin titled "Gintama Season 2 Premieres", which matches no catalogue title while its MAL link names the work outright. `malIdOf` reads the id from the source URL and the references; a MAL page scrape passes its own URL.
- **Episode counts:** how many episodes an episodic work has, for a pin whose category is `Anime` or `TV` and not also `Movie` - an anime film carries `Anime` and `Movie` both, and `Movie` is what a lookup goes by (never a film: Wikidata's title search happily answers "Supergirl" or "Masters of the Universe" with the series of the same name, which would give the film pin its episodes). AniList first (`episodes` with `status`, else `nextAiringEpisode.episode - 1` for a long-running show with no announced total), then MyAnimeList through Jikan, then Wikidata `P1113`, where an end time (`P582`) is what makes a count `complete`. The page's own count wins over all three: the article knows which season the pin is about. A count of one is no count.
- **Kalshi score forecast:** KXRT (Rotten Tomatoes) and KXMC (Metacritic) events. While open it prices P(score > N) into a market-implied "Kalshi RT forecast", kept as its own rating, never averaged with the site's. Once settled, the event's `expiration_value` is the site's actual score.
- **Where to watch:** "Watch on Netflix/Crunchyroll/HBO Max..." buttons are `Merchant` rows labelled with the service, told apart from purchase links by host in [streaming.ts](../../../src/lib/streaming.ts) (Netflix, Crunchyroll, HBO Max, Disney+, Hulu, Prime Video, Apple TV, Peacock, Paramount+, HIDIVE; anything else is dropped). Sources, both keyless: AniList `externalLinks` of type `STREAMING` for anime (matched or cited-id entry; old `http://` slugs are upgraded and redirect), then the matched Wikidata item's service id properties through `wbgetentities` (SPARQL timed out on the extra query). A **season** pin ("Emily in Paris Season 6") matches no item with ids, so the show's own series item gives the links - links only, never its scores. Neither source says which country a title streams in, and Wikidata's Apple TV id can be a buy/channel page rather than Apple TV+ (Yellowjackets). The backfill adds a service only when the pin has no link for it. Prime Video links earn: `affiliateUrl` sends primevideo.com title pages to amazon.com/gp/video/detail/<same id> with the Associates tag (amazon.com shows the same title for that id).
- **Backfill:** `npm run media:screen` (dry run by default, `--apply`, `--ids`, `--skip-trailer`, where `--skip-trailer all` looks up nothing but ratings, episode counts and adaptation tags). A pin that already has an episode count keeps it. Ratings are insert-or-refresh, so the run is free to repeat. **A rating-less pin has failed the title match, and Jikan then fails to rescue it.** Both have to go wrong: `findAniList` needs an exact title match (a Chinese donghua, an arc, a recap film matches nothing), and the cited-MAL-id fallback went through Jikan, which 504s constantly - 1,036 times in one 943-pin run. `aniListByMalId` now closes that: AniList answers **by MAL id** for the score, the link and the adaptation source with no title match at all, and it is up when Jikan is not.

# What the timeline's pick weighs

A crowded day shows two rows and keeps the rest behind "View all", so which
cards those are is a weighted random pick ([bagSample.ts](../../../src/lib/bagSample.ts)).
Four things multiply into a pin's weight, and a scrape can move three of them:

1. **What the card earns.** Opens and watches over times seen on the timeline,
   with a prior so a new pin starts level with a well-liked one.
2. **The money on the markets it cites** (`Pin.marketVolume`, above): from
   x1 at $10,000 to x2.5 at $10M and up.
3. **How well its own sources back it** - `pinConfidence` over its references,
   the same number the card's badge shows. The home timeline already hides
   anything under `TIMELINE_MIN_CONFIDENCE` (**70**), so the curve is drawn
   across the band a reader sees: **70 counts for x1, 100 for x1.6**, and
   below 70 it keeps falling on the same slope to a floor of x0.5 rather than
   off a cliff - a thinly sourced pin should be rarer on a crowded day, not
   absent from it. **An unscored pin weighs x1**, neither helped nor buried,
   which is the rule the confidence filter already keeps.
4. **How well its thread is sourced** - `threadConfidence`, the mean
   confidence of the *other* pins in its chain, on the same curve at a third
   of the strength: a perfect thread is worth **x1.2**. A chain corroborates a
   pin without being its own evidence, so it nudges rather than decides, and
   the pin's own confidence is left out of it because that is already counted.

So the practical effect for a scrape: **a pin's references decide how often it
is the card a busy day shows**, and a pin posted into a well-referenced chain
inherits some of that chain's standing. It is a sampling weight, never a
filter - nothing is hidden by it.

`threadConfidence` is the one of the four the client cannot work out for
itself, because the rest of a thread is rarely on the same page. The timeline
query sends it (`threadConfidenceOf` in [pins.ts](../../../src/server/model/pins.ts)),
seeded by the page's own ids so the cost follows the page and not the corpus -
a recursive walk both ways over `IX_Pin_parentId`, under 5ms for a page of 40
across the longest chains here. Search and the thread view do not get it: they
show every match rather than picking among them.

# Market volume

A pin whose `sourceUrl` or references link Kalshi, Polymarket or Polymarket US carries the dollars traded across those markets ([pinMarketVolume.ts](../../../src/server/services/pinMarketVolume.ts), `Pin.marketVolume`, schema 0053). Like the other enrichments it runs after every save and edit, never from anything an author types.

- **Where the figure comes from:** Polymarket's `volume` in dollars; Kalshi's `volume_fp` contracts priced at `last_price_dollars`, an estimate at today's price that can drift down when the price falls; nothing from Polymarket US, which publishes no volume. A market the exchange will not answer for counts as nothing and leaves the last figure standing.
- **Kept up:** the odds feed stores what it has already read while anyone is looking at the pin (at most hourly, and only when the figure moved more than 2%), so a busy market's pin does not go stale between edits.
- **Backfill:** `npm run markets:volume` (dry run), `-- --apply`, `-- --ids`, `-- --stale 1d` for only the figures older than that. It is left out of `seedPins.json`, so a fresh seed needs one run.
- **What reads it:** the pin page's "traded" pill and each market box's own figure, and the timeline's bag weight ([bagSample.ts](../../../src/lib/bagSample.ts)), which multiplies a pin by 1 + half a point per tenfold above $10,000, capped at 2.5x.

# Place and company

For a film, TV series, anime or game with no place from the page, the pin goes on the map at its studio's headquarters ([studioLocation.ts](../../../src/server/studioLocation.ts)): Wikipedia, then Wikidata's headquarters claim (`P159`) in order of precision: the claim's own coordinates and English street address, the company's own coordinates, then the headquarters place's coordinates labelled "Ward, City, Country". A country-only answer is rejected (the middle of a country is no studio's address). The result is kept on the company (`hqAddress`, `hqLatitude`, `hqLongitude`), so a studio is looked up once. `placeAtStudio` runs after every save; `npm run media:studio-locations` backfills.

**By hand** (studios Wikidata does not know): find the head office from a page you fetched (Wikipedia in the studio's language, official site, ANN or MAL producer page, OSM Nominatim for coordinates), never a country or province centre, and write `hqAddress`, `hqLatitude`, `hqLongitude` and `utcHqCheckedDateTime` on the company, then run the backfill. Beware name collisions between studios. Company logos: `npm run companies:logos`; a company with no Wikipedia article needs `websiteUrl` set first.

**Product pictures.** The company search's Major products panel shows each product line with a picture from its newest pin that has one. A product none of whose pins has a picture gets one looked up ([productPicture.ts](../../../src/server/productPicture.ts), `ProductPicture` 0079): the lead image of the product's own Wikipedia article (free licences only, so an English-only fair-use logo or building photo is skipped), then Google image search when `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID` are set. The lookup only ever runs on the dev machine. A local scrape gets it from the dev server once the sentiment pass names the pin's product; `npm run products:pictures` catches up the rest. **After a prod batch**, run `npm run products:pictures -- --prod --token-file <token file>` from the Mac with the batch's curator token: it asks prod which of its products lack a picture, looks them up locally and sends prod only the URLs (a curator can set only products it has pinned; an admin token sets any). Prod never looks one up itself. Pass `--token-file` once per curator token: each picture goes with the first token prod accepts, and products pinned by @ThePinGang need Ian's admin token. **The session is the fallback** for what the sources miss (no Google key yet, or no free Wikipedia image): `--export misses.json` writes them out, the session finds each one by hand (the product's own page or press image, then Commons, downloaded and viewed before it is kept, null rather than a logo or a generic photo), and `--apply found.json` stores them (source `hand`). A miss is recorded only when every source was tried, so an unfound product comes back on the next run.

# Awards and tags

`awardsFor` matches the work's title against the award bodies' own pages (anime bodies today; film and TV bodies are not in yet) and the save stores them as `PinAward` and award tags. Tags from the extractor are the user's-view tags (awards first, then franchises, people, programmes, places, at most 8); categories are tags of kind `category`, several per pin. `npm run tags:sync` refreshes the derived ones.


# Live data series

A pin whose event moves a published series carries that series, so the pin page
draws the publisher's own chart beside the story with the pin's week marked -
the SPR pins show the reserve's stock level falling away from the week each
drawdown was ordered.

**Only the handle is stored.** `PinSeries` (0062) holds the publisher and its
series id; the numbers come from the publisher when someone opens the pin, with
an hour's cache ([eiaSeries.ts](../../../src/server/eiaSeries.ts),
`GET /api/pins/:id/series`). That is the same rule as the place's review scores
and the market odds: a value copied into the database is a stale claim about
the world within a week, and the point of a live chart is that it is live.

| | |
| --- | --- |
| **Attach** | `npm run series:attach -- --tag SPR --series WCSSTUS1` (or `--id`), `--remove` to take one off, `--dry-run` to look first |
| **Check** | the script asks the publisher for the series before saving, so a pin never points at a series that would draw an empty chart |
| **Publishers** | `eia` today - the US Energy Information Administration's weekly petroleum series, read off its own `LeafHandler` page ([Sources](sources.md)) |
| **Seed** | `scripts/backup/seedSeries.json`, written by `npm run backup:data`; without it a `db:refresh` leaves the pins with no chart |
| **Window** | three years before the pin's date to two years after (or today), so the step the event made is readable; the full history is one click away on the publisher's page |
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

# One picture per pin, even in a run

The picture dedupe (a CDN-suffix check plus a difference hash at distance 6)
keeps a pin from being given a picture another pin already has. So **a run of N
pins about one recurring thing needs N distinct pictures** - eight FOMC meetings
at the same building cannot share one photograph of it, because the hash drops
it from the seven that follow. Gather the set up front: for a building, Commons
usually has enough once the archival construction series and architectural
drawings are filtered out.
