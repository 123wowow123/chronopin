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

`sourceKind(url)` picks `youtube`, `tweet`, `podcast`, `pdf` or `web` from the host and path ([Fetch a link's text](../pipeline/fetch-link-text.md)); a `.pdf` path is a `pdf`, and a page that turns out to be one is caught by its bytes (below). A web page is fetched plainly first (15 seconds, HTML converted to text); under 500 characters it is loaded in headless Chrome instead. The scraper always renders in Chrome, with the user agent `HeadlessChrome` replaced by `Chrome` because Cloudflare's challenge holds the former (help.openai.com among others), keeps the tab on the page asked for (redirects and script navigation away are blocked), presses PageDown and scrolls to wake lazy players, then reads body text, images, embeds and headings.

# By site

| Source | Works | Blocked or unreliable | Do this |
| --- | --- | --- | --- |
| **Wikipedia and Wikimedia** | Plain `curl` and the API; `og:image` gives the poster or lead photo | The image CDN answers 429 to a client with a browser-like User-Agent. A **year-less title silently redirects to the wrong year**: `State_visit_by_Xi_Jinping_to_the_United_States` answers 200 and serves the **2015** visit, so a reference taken on the status code alone cites the wrong event | Send a User-Agent that names the client and a contact (`ChronoPin/1.0 (https://chronopin.com; tech@chronopin.com) image fetch`): the same image is 200 with it and 429 without. The downloader does this for wikimedia.org and waits out a `Retry-After` of up to 90 seconds once. Always grep the fetched `<title>` for the year you meant before citing an article |
| **Wikipedia election calendars** | `List of elections in <year>` is populated and footnotes each date to the electoral commission | `<year> national electoral calendar` is a stub - its month sections are empty | Take the list page as wikitext and read `election_date` from each election's own infobox; an election with no article of its own is not sourceable |
| **Commons building searches** | `incategory:"<building>"` scoped searches, and the building article's `pageimages` on the **local-language** Wikipedia | Free-text search drifts to another country for generic names ("White House Bishkek" -> the US and Moscow; "Parliament Buildings Nairobi" -> Hungary, British Columbia); `pageimages` on a legislature article returns a seal or a seat-composition SVG | Scope by category, filter the file title for the city or country, then pick by pixel size; fall back to the square or plaza in front of the building |
| **vaalit.fi** (Finnish Ministry of Justice) | WebFetch reads the full statutory election schedule | **403 to `curl`** with any UA tried | Cite it as a reference on the strength of the WebFetch read; do not write a wiki from a blocked capture |
| **skao.int** | PDFs under `/sites/default/files/documents/` with a browser UA, read by `pdftotext` (one timeline per telescope: `Sciops_timeline_low_ppt.pdf`, `Sciops_timeline_mid_ppt.pdf`) | The HTML pages **403 to both `curl` and WebFetch** | Go straight to the PDFs; they carry the AA1/AA2/AA*/Cycle 0 dates the HTML pages describe |
| **federalreserve.gov FOMC calendar** | The page lists every meeting date for years ahead | **No per-meeting URL until a meeting has happened** - future meetings are table rows only, so a batch of pins off it would share one `sourceUrl` and 409 | Use the calendar as the date's reference and take the per-meeting `sourceUrl` from Kalshi's `KXFEDDECISION` series, whose strike times match it |
| **Kalshi `KXFEDDECISION`** | One open event per FOMC meeting (`KXFEDDECISION-27JAN` ...), keyless, with nested markets, `*_dollars` prices and `volume_fp` | kalshi.com 429s to `curl`, as ever | Verify a link with `parseMarketUrl` + `oddsFor` in a `tsx` script; the 2027 books are thin ($1.4k-$23.5k) so quote the volume |
| **whitehouse.gov briefings** | Everything under `briefings-statements/<yyyy>/<mm>/<slug>/` reads with a plain browser UA. A `congressional-bill-h-r-NNNN-signed-into-law/` statement gives the weekday, date, bill number, the act's name and what it funds and until when, and its **Related** list indexes the neighbouring signings. A **state visit** statement gives the official hour-by-hour schedule - which day the President meets the guest at Joint Base Andrews, the arrival ceremony, the military review and flyover, the state dinner and the departure | Its `og:image` is the generic `WH47-Social-Share-Card.jpg`, never the story's own picture | The primary source for the date a funding bill became law or a state visit's schedule, better than any news copy. Walk the Related list to collect a run of signings in one fetch; get pictures elsewhere |
| **thehill.com** | Nothing | A **HUMAN Security** challenge: 403 to WebFetch, and an "Access to this page has been denied" shell to `curl` with a browser UA | Take the same story from The Center Square, Federal News Network (AP copy) or the outlet's own release; do not wiki the challenge page |
| **reuters.com** | **The app's own headless scraper reads the whole article**, byline, dateline, timestamps and the tickers Reuters tags inline (`Amazon (AMZN.O)`) | **401 to `curl`** with a browser UA (a 771-byte body) and "unable to fetch" to WebFetch - so a session's own tools see nothing | Do not judge Reuters by `curl`. Let the pipeline fetch it: `GET /api/scrape`, or post the pin and read the captured text back out of `npm run wiki:export`. While working by hand beforehand, `WebSearch` the headline - the same wire copy is republished in full by ABC News (the AP version), usnews.com and mvariety.com - and keep the Reuters URL as `sourceUrl` under the IMDb rule |
| **scmp.com** | WebFetch reads the article in full, including detail the wire copy drops (the expected arrival time of a state visit); the app's headless scraper reads it too (see the robotics-newsroom row) | **403 to `curl`** with any UA tried, so a link checked by status code alone looks dead when it is not | Cite it on the strength of the WebFetch read, as with vaalit.fi and ebu.ch; do not drop an SCMP reference because `curl` 403s |
| **fmprc.gov.cn** (Chinese foreign ministry) | Plain `curl` **and** WebFetch both read the English announcements under `/eng/xw/zyxw/<yyyymm>/t<yyyymmdd>_<id>.html` | - | The authoritative source for the dates of a Chinese state visit, and it names the inviting head of state. Better than any news copy; find the URL with `WebSearch` since the index pages are not worth walking |
| **Fiscal policy outlets** (crfb.org, thecentersquare.com, federalnewsnetwork.com, epicforamerica.org, chds.us, nado.org, vcresearch.berkeley.edu) | All read fully with a browser UA; CRFB's `blogs/appropriations-watch-fy-<year>` is a live tally of the twelve bills, the votes and the current deadline | - | CRFB's Appropriations Watch is the best single `sourceUrl` for "where the budget stands"; agency and university shutdown guidance pages date a lapse from the inside |
| **congress.gov** | Nothing | **403 to `curl` and WebFetch alike** for `/crs-product/` pages | Cite the CRS report through `everycrsreport.com/reports/<id>.html`, which mirrors the same text and reads fine; confirm the mirror carries the sentence before relying on it |
| **ebu.ch** | WebFetch reads the full announcement | 403 to `curl` | Same shape as vaalit.fi: cite it on the strength of the WebFetch read |
| **Trade-show organiser sites** | For an annual show the **homepage is the current edition's page** - `gamescom.global/en` and `edfringe.com` carry the 2027 dates in plain HTML | `computextaipei.com.tw` renders its dates in JavaScript (a plain fetch shows none); `computex.biz` does not resolve | Grep the raw HTML for the year before using the homepage as `sourceUrl`; if it is not there, use the headless scrape or drop the candidate |
| **Wikidata** | Keyless API for HQ (`P159`), review scores, episode counts (`P1113`, finished when `P582` is set), entity labels | - | First choice for studio HQ and IMDb/RT/Metacritic scores |
| **IMDb** | Nothing: an AWS WAF challenge (HTTP 202 empty body, 403 to fetch tools) blocks curl and WebFetch alike | Every request | Do not retry. Use `WebSearch "<title> imdb"` for the real `imdb.com/title/tt.../` URL as `sourceUrl` (a URL found by search but never fetched is still valid) and Wikipedia for facts and the poster. An `imdb.com/news/ni.../` item is a **syndicated copy** of another outlet's article, blocked the same way: `WebSearch` the bare news URL to get its title, search the title to find the publisher's original (CBR, Deadline, Variety, ...), and cite **that** - a blocked link can only ever hold a dead wiki |
| **MyAnimeList** | Page text through the browser; the app's scrape | Jikan (`api.jikan.moe`) 504s constantly | Prefer AniList by MAL id; retry Jikan with backoff; a page for an unaired title lists dates as "Not available" |
| **AniList** | GraphQL, keyless | Blocks python-urllib (use curl); one missing `idMal` nulls a whole batched query; Cloudflare 1015 rate limit under load; 429s within minutes when a backfill runs several workers at once, and then answers nothing for every pin | Query one id at a time, slowly |
| **YouTube** | oEmbed (validates embedding), Data API with `YOUTUBE_API_KEY`, page text | Caption downloads answer **429** from an address that fetched many at once, even from a real browser (2026-09-19) | Throttle (`npm run wiki:transcripts`, 4s apart, backs off), retry after a long cooldown; the player call still works, so a video's tracks can be listed. Without a transcript a video's wiki is description-only |
| **X / Twitter** | oEmbed for the post text; links written out | The linked pages may be blocked | Use the linked article as the reference |
| **Apple Podcasts / iTunes** | Search API keyless; episode page show notes | Apple's own transcripts need an Apple ID (do not lift tokens) | Transcript = the RSS `podcast:transcript`, else the show's full YouTube upload read through the caption reader |
| **Kalshi** | `events/{TICKER}?with_nested_markets=true` keyless; catalogue at `series?category=` (`Economics`, `Crypto`, `Science and Technology`, `Companies`, `Financials`, `World`, `Climate and Weather` - plain `Technology`/`Science` return null) | Per-title series (429s); empty top-level `markets` on some events; the **`events?status=open` list returns every price as `null`**; thin ladders quote out of order; kalshi.com itself 429s to curl | Use the KXRT/KXMC series; strike date is the decision time; scan by series then re-read each event for `*_dollars` prices; verify a web link with `parseMarketUrl` + `oddsFor`, not by fetching the page |
| **Ticketmaster** | The `discover.` announcement subdomain (plain `curl`, `og:image` is the tour press shot); the **artist** page's raw HTML, whose `schema.org` `Offer` per show carries the event URL, venue and local start time | The per-event page `/<slug>/event/<id>` - `GET /api/scrape` returns nothing but `{"type":"web"}`, and `curl` gets the SPA shell | Read the dates off the artist page; use the per-event URL as `sourceUrl` without fetching it (the IMDb rule) |
| **Polymarket** | Gamma `events?slug=` keyless | Empty-subscription firehose on the sockets | Market page as `sourceUrl`; a companion market is a reference |
| **GSMArena, SamMobile** | Plain `curl` with a browser UA, and the app's scraper; `og:image` is the article's own lead photo | - | Good for a vendor date a global press release omits - but say whose newsroom it came from: a Samsung Thailand post is one country's schedule until another portal repeats it |
| **Cloudflare / bot-check sites** (Bloomberg, GameSpot, Kickstarter, Neowin, TechPowerUp, eWeek, Britannica, Axios, dpreview, and many trade sites) | Sometimes with the plain-Chrome user agent | "Just a moment...", "Sorry, you have been blocked", robot checks, 403 | The fetched text is worthless: do not write a wiki from it. Try the site's RSS or an archived copy, else record the source as blocked and rely on another reference |
| **Windows Central, MSN and similar aggregators** | - | Return the current front page, not the old article | Treat as blocked (the page is not the article the URL names) |
| **openai.com, help.openai.com** | help.openai.com with the plain Chrome UA; the community forum (Discourse) for launch announcements | openai.com answers 403 to curl and WebFetch | Use the forum announcement and the help-centre release notes |
| **gameranx.com, IGN news listings** | Server-rendered: extract links with `grep -o` on the raw HTML; IGN body from the `<article>` block | WebFetch cannot reach ign.com; WebFetch's markdown drops `<iframe>` embeds | `curl -A "<browser UA>"`, then grep raw HTML for `<iframe ... youtube ...>` |
| **sandag.org, and agency sites like it** | The real path, found by grepping the homepage for `href="[^"]*<slug>"` | A guessed `/projects/<slug>` returns a 404 body at HTTP 200, and the body is nav, not content | Prefer Wikipedia for the project's history and the agency page only for today's promise |
| **gonctd.com, san.org, health.ucsd.edu, plandesignbuild.ucsd.edu** | WebFetch reads all four | UCSD's Plan Design Build page is accordions (`href="#"`), so it has no per-project deep link | Use the owner's own project page as `sourceUrl`; for UCSD that is health.ucsd.edu, not the listing |
| **cbs8.com** | - | 403 to WebFetch | Use the outlet the story came from, or Wikipedia |
| **californiaconstructionnews.com** | Plain WebFetch | Its og:image is the site logo | The article's own photo is under `wp-content/uploads/<year>/<month>/` in the raw HTML |
| **Transit and airport authorities** (mta.info, atl.com, flydenver.com, flysfo.com, changiairport.com, naa.jp, chicago.gov, engineering.lacity.gov) | The matching press release on a government or operator mirror - governor.ny.gov carries MTA's releases verbatim | 403 (Akamai/Cloudflare), or a nav-only body with the dates on another page | Take the date from the mirror, or from Wikipedia where the slip history lives |
| **News paywalls** (japantimes.co.jp 402, lasvegassun.com 402, reviewjournal.com, cbc.ca, torontolife.com, theengineer.co.uk, railjournal.com, seatrade-cruise.com, dailyherald.com) | Headline and lede only | The body | Find the same story at an outlet that answers, or drop the candidate |
| **cosm.com, and Next.js sites like it** | Nothing useful from the HTML | The reader captures the headline and stops - the article body lives in `__NEXT_DATA__` as Markdown content blocks, so a source comes back ~90 characters long | Check for a `__NEXT_DATA__` script before believing a short capture; a 90-character "article" is a rendering problem, not a thin page |
| **wpcentral.com** | Nothing - the domain is retired | Every URL redirects to the Windows Central front page | Dead as a source. 15 stored links were byte-identical homepage captures; they are marked blocked. Use a web archive if a pin really needs one |
| **clinicaltrials.gov** | The **API v2**, which the drug-readout vertical already uses | The study page renders its record in JavaScript, so a fetch captures the glossary and nav shell - identical for every study | Never wiki a study from its web page; 23 stored links were the same boilerplate and are marked blocked |
| **PDFs** | Read by the pipeline since 2026-09-20 ([pdfText.ts](../../../src/server/scrape/pdfText.ts)): `pdftotext` for the text layer, `pdftoppm` + `tesseract` OCR when there is none | A PDF over 40MB, or one that is a scan beyond its first 5 pages | Nothing by hand. Needs poppler and tesseract on the host (`brew install poppler tesseract`); the reader names the missing binary rather than failing obscurely |
| **Robotics makers' newsrooms** (figure.ai, bostondynamics.com, agibot.com, 1x.tech, investor.nvidia.com, aboutamazon.com, globenewswire, scmp.com, robotstart.info) | All read fully by `GET /api/scrape`, with dated bodies and Open Graph media | agibot.com's own article image is missing from the rendered image list; automate.org 403s to WebFetch though the app's scraper reads it | Take the date from the page, not a search summary; where the article's picture is absent, use a reference article's lead image |
| **Contentful image CDN** (`images.ctfassets.net`, used by figure.ai) | The bare asset URL | A `?fm=webp` variant fails the thumbnailer with "Mime type image/webp does not support decoding", 500ing `POST /api/pins` after the pin row is written | Strip the query string before saving, and `PUT` the whole pin back to repair one that was created without its media |
| **Aerospace manufacturers and agencies** (boeing.mediaroom.com, airbus.com, nasa.gov, aerospacetestinginternational.com, aircargonews.net, militarytimes.com, airandspaceforces.com, rafmuseum.org.uk, airandspace.si.edu, aerospacebristol.org, thisdayinaviation.com, aerotime.aero) | All read fully by plain `curl` with a browser UA and by `GET /api/scrape`; NASA and Boeing release pages carry dated bodies and large Open Graph photos | `baesystems.com` is behind **Incapsula** - every heritage page is 923 bytes of iframe shell; `museumofflight.org` refuses the connection outright; `aviationa2z.com` began answering **522** mid-run | Use the manufacturer's or agency's own release where there is one. For BAE heritage subjects go to the RAF Museum or Aerospace Bristol instead; the Smithsonian's collection-object pages are the best record for an airframe it holds |
| **siae.fr** (Paris Air Show) | Loads, and the dates are in the markup | The whole page is 393 characters - a date banner and a cookie notice, no prose | Enough to date the pin and nothing else: take the organiser, venue history and scale from the Wikipedia article as a reference |
| **`.jpg.webp` image CDNs** (`s44864.pcdn.co` and other WordPress/PCDN hosts) | Dropping the trailing `.webp` returns the underlying `image/jpeg`, which the thumbnailer takes | The `.webp` itself fails the thumbnailer, like the Contentful case above | Strip the suffix. Where the file is *natively* `.webp` (`aviationa2z.com/.../Airbus-A350F.webp`) there is nothing underneath and the picture is unavailable |
| **Paywalled pages** | The teaser (headline and lede) | The body | A short wiki from the visible opening is acceptable; do not invent |

# PDFs

A filing, docket, environmental statement or regulator letter is often the only
source a pin has, and until 2026-09-20 the reader refused them outright - the
fetch stage is the one stage that may fail a whole scrape, so a PDF link killed
the job. [pdfText.ts](../../../src/server/scrape/pdfText.ts) now reads them.

* **The text layer first, OCR only as a last resort.** `pdftotext` is
  milliseconds; OCR is about five seconds a page. It runs only when the text
  layer is under 200 characters - which is a header and a page number, not a
  document - and only over the first 5 pages.
* **Plain `pdftotext`, never `-layout`.** `-layout` preserves the geometry,
  which is right for a table and wrong for everything else: on a three-column
  Federal Register notice it interleaves the columns line by line, so every
  sentence reads as three unrelated half-sentences. Plain mode does the
  reading-order analysis and returns column after column.
* **Trust the bytes, not the content type.** A PDF is regularly served as
  `application/octet-stream`, and a block page is occasionally served as
  `application/pdf`. Anything that is not a web page has its first bytes
  checked for `%PDF`.
* The text is prefixed with what was read - `[PDF, 340 pages; text of the
  first 50]`, `[Scanned PDF, 12 page(s); OCR of the first 5]` - so a summary
  written from it is not taken for the whole document.
* Caps: 40MB, 50 pages of text, 5 pages of OCR at 300 dpi.

# Recognising a useless fetch

`looksBlocked(text)` in [sourceText.ts](../../../src/server/scrape/sourceText.ts) flags a short page (under 1,500 characters) that says "Just a moment", "Attention Required", "Access Denied", "You have been blocked", "Are you a robot", "403 Forbidden", "Too Many Requests", "page not found" and the like. The reader no longer accepts such text: it loads the page in the headless browser as plain Chrome (the `HeadlessChrome` user agent is what Cloudflare holds), waits up to 12 seconds for a JavaScript challenge to clear, and fails the link with `Blocked: ...` if it is still a block page, so no wiki is written from it. `npm run wiki:refetch-blocked` reads the already-stored blocked and failed links again this way (in the first check, 3 of 5 read).

Treat the text as **not the article** (record it as blocked, do not summarise it) when it is: a Cloudflare, Akamai or CloudFront challenge; a 403, 404 or 400 page; a login or age gate; a site homepage, index or listing where the URL names an article; a cookie or navigation shell with no facts about the pin's event; or the page for a different event that shares a name (a disambiguation page, a redirect to a broader article).

# WebFetch is not a source

WebFetch's summary is a paraphrase, and it has been caught inventing a figure that appears nowhere in the page (a cost for Shanghai Metro Line 19) and mangling a Unicode filename so the image URL 404'd. Quote numbers, dates and file names from the raw markup or the site's API, never from what WebFetch says about them. It also drops `<iframe>` embeds entirely ([Learnings](learnings.md)).

# Finding a site that serves one page for every URL

A host that has retired its archive, or that renders records in JavaScript,
answers every URL with the same shell - and each capture looks plausible on its
own. They are obvious in the aggregate:

```sql
SELECT COUNT(*), substring(min("url") from '^https?://(?:www\\.)?([^/]+)')
FROM "Source" WHERE length("text") > 500
GROUP BY md5("text") HAVING COUNT(*) > 2 ORDER BY 1 DESC;
```

Identical text across many distinct URLs means the fetch is worthless whatever
it says. Run this before fanning wiki work out: it found wpcentral.com and
clinicaltrials.gov, 38 links between them, which would otherwise have become 38
wikis about the wrong thing.
