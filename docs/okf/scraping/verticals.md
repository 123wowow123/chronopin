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
| Infrastructure and architecture | the pool's curator | `Infrastructure & Transportation`, `Architecture & Real Estate`, `Energy`, `Space & Astronomy` | Wikipedia, trade press | Company is the owner or authority; a delayed opening carries `originalStartDate` and `delayReasoning` |

# AAA games (and other server-rendered news)

1. List candidates with `grep -o` on the raw listing HTML (both sites render server-side).
2. Fetch each article with `curl -A "<browser UA>"`, never WebFetch (drops iframes, cannot reach IGN).
3. Check for an embedded trailer: `grep -o '<iframe[^>]*youtube[^>]*>'`. IGN uses a native player the pipeline does not ingest.
4. Pull title, description, release wording, developer and studio HQ from the text; use `article:published_time` when there is no fixed release date.
5. Insert through `POST /api/pins` as the curator, then the image through the medium code, then `backup:data`.

# Movies

`WebSearch "<title> imdb"` for the real title URL as `sourceUrl`, Wikipedia (`<Film>_(2026_film)`) by plain curl for facts and the `og:image` poster, the primary studio's actual lot or office as location (Universal City, Burbank lots, Culver City, Santa Monica, Melrose Ave), category `Movies`, no `price`.

# Anime (MyAnimeList)

Parallel agents of about 10 titles each, each posting through the real `POST /api/pins` with a token signed from the session secret (`{id: <curator id>}`, HS256; Node 24). Concurrent agents reuse company rows by exact name. MAL pages are formulaic: the wiki is the page's own fields (info block, statistics, synopsis, background, related entries, themes), so summaries state only what the MAL page states.

# YouTube channels

`yt-dlp -J <video url>` per id gives the upload date, description, tags and categories. Some creators forbid third-party embeds (The B1M) even when `playableInEmbed` is true: flag it. `company` is whatever institution the story centres on (a ministry, a binational authority, an operator); its logo lookup often whiffs, so set `websiteUrl` and the favicon by hand. Give each parallel agent a **unique scratch file name**: two agents that defaulted to the same name in a shared prompt overwrote and even ran each other's inserts.

# Prediction markets

Dates: a scheduled event uses its official time (`scheduled`, timed); a "by when" market uses the day its daily market prices highest (`estimated`, all day) and the reasoning quotes the odds. A companion market goes in as a reference and gets its own odds box (at most 4 markets). Search podcasts by hand for a supporting quote, then append references and PUT the whole pin.

# Roundups

When one article covers many things, prefer per item: a deep link (anchor or "read more"), else the maker's own product page or press release, and only then the shared article, flagged as generic.
