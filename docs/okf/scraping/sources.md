---
type: Reference
title: Source-by-source fetching notes
description: What works and what is blocked for each kind of source and site, with the working workaround - so a scrape, by the API or by hand, does not rediscover it.
resource: ../../../src/server/scrape/sourceText.ts
tags: [scraping, fetching, blocked, workarounds]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T20:00:00Z }
---

Kept current from real runs. See [Learnings](learnings.md) for the dated log; add a row here when a site's behaviour becomes known.

# How the app fetches

`sourceKind(url)` picks `youtube`, `tweet`, `podcast` or `web` from the host ([Fetch a link's text](../pipeline/fetch-link-text.md)). A web page is fetched plainly first (15 seconds, HTML converted to text); under 500 characters it is loaded in headless Chrome instead. The scraper always renders in Chrome, with the user agent `HeadlessChrome` replaced by `Chrome` because Cloudflare's challenge holds the former (help.openai.com among others), keeps the tab on the page asked for (redirects and script navigation away are blocked), presses PageDown and scrolls to wake lazy players, then reads body text, images, embeds and headings.

# By site

| Source | Works | Blocked or unreliable | Do this |
| --- | --- | --- | --- |
| **Wikipedia and Wikimedia** | Plain `curl` and the API; `og:image` gives the poster or lead photo | The image CDN answers 429 to a client with a browser-like User-Agent | Send a User-Agent that names the client and a contact (`ChronoPin/1.0 (https://chronopin.com; tech@chronopin.com) image fetch`): the same image is 200 with it and 429 without. The downloader does this for wikimedia.org and waits out a `Retry-After` of up to 90 seconds once |
| **Wikidata** | Keyless API for HQ (`P159`), review scores, episode counts (`P1113`, finished when `P582` is set), entity labels | - | First choice for studio HQ and IMDb/RT/Metacritic scores |
| **IMDb** | Nothing: an AWS WAF challenge (HTTP 202 empty body, 403 to fetch tools) blocks curl and WebFetch alike | Every request | Do not retry. Use `WebSearch "<title> imdb"` for the real `imdb.com/title/tt.../` URL as `sourceUrl` (a URL found by search but never fetched is still valid) and Wikipedia for facts and the poster |
| **MyAnimeList** | Page text through the browser; the app's scrape | Jikan (`api.jikan.moe`) 504s constantly | Prefer AniList by MAL id; retry Jikan with backoff; a page for an unaired title lists dates as "Not available" |
| **AniList** | GraphQL, keyless | Blocks python-urllib (use curl); one missing `idMal` nulls a whole batched query; Cloudflare 1015 rate limit under load; 429s within minutes when a backfill runs several workers at once, and then answers nothing for every pin | Query one id at a time, slowly |
| **YouTube** | oEmbed (validates embedding), Data API with `YOUTUBE_API_KEY`, page text | Caption downloads answer **429** from an address that fetched many at once, even from a real browser (2026-09-19) | Throttle (`npm run wiki:transcripts`, 4s apart, backs off), retry after a long cooldown; the player call still works, so a video's tracks can be listed. Without a transcript a video's wiki is description-only |
| **X / Twitter** | oEmbed for the post text; links written out | The linked pages may be blocked | Use the linked article as the reference |
| **Apple Podcasts / iTunes** | Search API keyless; episode page show notes | Apple's own transcripts need an Apple ID (do not lift tokens) | Transcript = the RSS `podcast:transcript`, else the show's full YouTube upload read through the caption reader |
| **Kalshi** | `events/{TICKER}?with_nested_markets=true` keyless | Per-title series (429s); empty top-level `markets` on some events | Use the KXRT/KXMC series; strike date is the decision time |
| **Polymarket** | Gamma `events?slug=` keyless | Empty-subscription firehose on the sockets | Market page as `sourceUrl`; a companion market is a reference |
| **Cloudflare / bot-check sites** (Bloomberg, GameSpot, Kickstarter, Neowin, TechPowerUp, eWeek, Britannica, Axios, dpreview, and many trade sites) | Sometimes with the plain-Chrome user agent | "Just a moment...", "Sorry, you have been blocked", robot checks, 403 | The fetched text is worthless: do not write a wiki from it. Try the site's RSS or an archived copy, else record the source as blocked and rely on another reference |
| **Windows Central, MSN and similar aggregators** | - | Return the current front page, not the old article | Treat as blocked (the page is not the article the URL names) |
| **openai.com, help.openai.com** | help.openai.com with the plain Chrome UA; the community forum (Discourse) for launch announcements | openai.com answers 403 to curl and WebFetch | Use the forum announcement and the help-centre release notes |
| **gameranx.com, IGN news listings** | Server-rendered: extract links with `grep -o` on the raw HTML; IGN body from the `<article>` block | WebFetch cannot reach ign.com; WebFetch's markdown drops `<iframe>` embeds | `curl -A "<browser UA>"`, then grep raw HTML for `<iframe ... youtube ...>` |
| **PDFs** | Flate streams decode with a zlib script | No poppler locally | Decode by hand when a filing is the only source |
| **Paywalled pages** | The teaser (headline and lede) | The body | A short wiki from the visible opening is acceptable; do not invent |

# Recognising a useless fetch

`looksBlocked(text)` in [sourceText.ts](../../../src/server/scrape/sourceText.ts) flags a short page (under 1,500 characters) that says "Just a moment", "Attention Required", "Access Denied", "You have been blocked", "Are you a robot", "403 Forbidden", "Too Many Requests", "page not found" and the like. The reader no longer accepts such text: it loads the page in the headless browser as plain Chrome (the `HeadlessChrome` user agent is what Cloudflare holds), waits up to 12 seconds for a JavaScript challenge to clear, and fails the link with `Blocked: ...` if it is still a block page, so no wiki is written from it. `npm run wiki:refetch-blocked` reads the already-stored blocked and failed links again this way (in the first check, 3 of 5 read).

Treat the text as **not the article** (record it as blocked, do not summarise it) when it is: a Cloudflare, Akamai or CloudFront challenge; a 403, 404 or 400 page; a login or age gate; a site homepage, index or listing where the URL names an article; a cookie or navigation shell with no facts about the pin's event; or the page for a different event that shares a name (a disambiguation page, a redirect to a broader article).
