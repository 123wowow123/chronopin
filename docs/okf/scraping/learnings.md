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
* **A law or other thing in force gets a start *and* an end.** Owner, 2026-09-21,
  on pin 2401: "For law and relevant pins. Should have effective start and end
  date", confirmed as standing: "current approach is good. do this going
  forward". Keep the start on the pin's own event (the signing) and take the end
  from the **operative clause**, quoted in the date reasoning; the end is the
  exclusive 00:00Z boundary. Covers laws, stopgaps, contracts, authorisations,
  mandates, bans with a sunset and fiscal years. Null only when genuinely
  open-ended; a deadline, a vote or a budget presentation stays a single day.
  It uses the existing `utcEndDateTime` - **no new field**, and the owner has
  agreed not to add one, so do not propose an `effectiveStartDate` column.
  Details in [Fields](fields.md).
* **Persist seed data with `npm run backup:data`**, never by hand-editing the seed JSON.
* **When the API key has no credit, use the session LLM.** Do the LLM stages by hand with the app's own prompts and schemas and apply them through the same scripts (`wiki:export`/`wiki:apply`, `references:apply`, `POST /api/pins`); never wait for credit.
* **Get 3 media on every pin, best effort, with at least 1 image.** Owner, 2026-09-19: the media stage should keep looking until a pin has 3 media (a video counts), not stop at the first source, and a pin always gets at least one picture. Built: `src/lib/mediaTarget.ts` replaces the pictures-only `TARGET_IMAGES`. Fewer is acceptable only when every source is exhausted, and never padded with unfetched or unrelated pictures.
* **A market pin says how much money is on it.** Owner, 2026-09-20: prediction-market scraping records the market's dollar volume, the pin page shows it, and the timeline's weighting leans on it. Quote it beside the odds in the pin's own words, and let the app keep the stored figure ([Strategy](strategy.md#decision-rules)).
* **Do not add write-ups to the root README.**
* **A video embedded in a reference belongs to the pin.** Owner, 2026-09-20: pin 315 should carry the YouTube video that its own reference article embeds - as a reference *and* on the pin's media. Best effort: get the product video and bring it to both.
* **A released product cites its MSRP from the company's own page.** Owner, 2026-09-20: for a released or on-sale product, check the company's product/store page for the MSRP and add that page as a reference.
* **Tags should be relevant and catchy.** Owner, 2026-09-21: pin 2389 (US Fiscal Year 2028) was tagged `Appropriations, Federal budget, Fiscal year, United States` and was missing the thing anyone would actually search for - `Government Shutdown`. Tag the consequence and the familiar name people know the event by, not just the procedural vocabulary of the source, and title-case them (`Federal Budget`, `Fiscal Year 2028`).

## 2026-09-21 - The government shutdown story, six pins (2398-2403, @EconDesk)

* **Learned - "add more pins for <topic>" starts with reading what the topic
  already holds, and the tag search is `/api/pins/search`.**
  `GET /api/pins?q=tag:"Government Shutdown"` answers 200 with an ordinary
  timeline page - the timeline route ignores `q` - so it reads like a broken
  search rather than the wrong endpoint. `GET /api/pins/search?q=tag:"..."`
  is the one that filters. The tag had exactly one pin behind it (2389, where
  Ian had asked for the tag), and it now returns seven in date order.
* **Learned - the tag was a topic with no events under it.** Fiscal 2026 had
  **three** funding lapses and not one was pinned: 43 days from 1 October to
  12 November 2025 (the longest ever, over expiring ACA subsidies), four days
  from 31 January to 3 February 2026 across half the government, and 76 days
  for **DHS alone** from 14 February to 30 April 2026, the longest shutdown of
  a single agency. A tag the owner asks for is usually a chain of events, not
  one pin; look for the whole chain before composing.
* **Learned - a shutdown is a range, not a day.** The three lapse pins carry
  `utcEndDateTime` at the exclusive 00:00Z boundary (2025-11-13, 2026-02-04,
  2026-05-01), which is what `allDay` wants, and the deadline pins (the
  2 September signing, the 1 October rollover, the 11 December expiry) are
  single days with a null end.
* **Learned - whitehouse.gov's briefings index is the primary source for "when
  was it signed".**
  `whitehouse.gov/briefings-statements/<yyyy>/<mm>/congressional-bill-h-r-NNNN-signed-into-law/`
  reads with a plain browser UA and states the weekday, date, bill number, the
  act's full name and what it funds and until when. Its **Related** list is a
  crawlable index of the neighbouring signings: one fetch gave H.R. 5371
  (12 Nov 2025), H.R. 7148 (3 Feb 2026), H.R. 7147 (30 Apr 2026) and H.R. 6500
  (2 Sep 2026) - every date this batch needed.
* **Learned - thehill.com is blocked** by a HUMAN Security challenge (403 to
  WebFetch, and a "Access to this page has been denied" shell to `curl` with a
  browser UA). `thecentersquare.com`, `federalnewsnetwork.com` (which runs the
  AP copy), `crfb.org`, `epicforamerica.org`, `chds.us`, `nado.org` and
  `vcresearch.berkeley.edu` all read fully with a browser UA, so the fiscal
  beat has plenty of unblocked sources.
* **Learned - Kalshi lists shutdown markets that nobody has traded.**
  `KXGOVTSHUTDOWN-26OCT01` and `KXNUMSHUTDOWNS-27JAN01` come back `active` with
  every bid, ask, last price and volume `null`, so a link to them would draw an
  empty odds panel. Polymarket's `government-shutdown-by-october-1-...` had
  real prices (about 2 percent for yes on ~$15.7k) and was used instead. Check
  for prices, not just an open event, before citing a market.
* **Learned - a market link rides on a *reference*, not only `sourceUrl`.**
  `pinMarketRefs` reads the source URL and every reference, so pin 2402 got
  live odds as an @EconDesk fiscal pin: the save set `marketVolume`
  15721.74 from the Polymarket read. That avoided a separate @OddsDesk market
  pin on 1 October, which would have been a duplicate of the rollover pin.
* **Learned - the fiscal-year pins want the fiscal year's own character.**
  2389 is "US Fiscal Year 2028 Begins"; the new one is "US Fiscal Year 2027
  Begins on a Stopgap", because that is what the 1 October 2026 rollover is -
  not a single one of the twelve bills had passed both chambers.
* **Feedback - a law pin needs the window it covers.** Owner, on pin 2401:
  "For law and relevant pins. Should have effective start and end date." The
  signing was a single day; it now runs 2 September to 11 December 2026, the
  date named in section 106(3) of the enrolled text. Fixed the same way: pin
  661 (the IIJA, in force from its signing until its FY2022-FY2026
  authorisations expired on 30 September 2026 - the very authorities H.R. 6500
  then extended, so the two pins now abut) and the fiscal-year pins 2402 and
  2389, which now run October to September. Asked whether this needed a new
  field, the owner confirmed the existing `utcEndDateTime` is the right home:
  "current approach is good. do this going forward". Now a standing rule above.
* **Feedback**: the standing scrape-without-sign-off rule covered the batch,
  and the standing catchy-tags rule shaped every tag list - `Government
  Shutdown`, `Shutdown Deadline`, `DHS Shutdown`, `Obamacare Subsidies`,
  `Federal Workers` rather than `Appropriations` alone.
* **Changed**: [Sources](sources.md) - rows for whitehouse.gov briefings,
  thehill.com and the fiscal-policy outlets; [Vertical recipes](verticals.md) -
  a US fiscal calendar and shutdown recipe.

## 2026-09-21 - Three new categories, and religious observances as markers (pins 2390-2397)

* **Learned - where the taxonomy's real gaps were.** `Other` is used **zero**
  times, every pin carries a category and nothing is mis-filed, so the 38-name
  list had no cleanup to do; the gaps were whole domains with no home. Three
  were added: **`Religion & Belief`**, **`Labour & Employment`** and
  **`Mining & Materials`**. Each was seeded in the same pass, because an empty
  category is a dead entry in the tag cloud.
* **Learned - Religion & Belief lands exactly on the corpus's weak points.**
  Hajj 2027 falls **14-16 May** in Mecca and the Nashik Kumbh's first Shahi Snan
  **2 August 2027**, with World Youth Day in Seoul **3-8 August**. That is the
  two thinnest forward months in the two thinnest map regions, which no other
  candidate domain managed. Religious calendars also renew themselves forever,
  so the vertical never runs dry.
* **Learned, then corrected.** Adding a category is **seven files**, not one:
  `categories.ts` plus all six translation dictionaries. The first write-up of
  this said `Messages = Shape<typeof en>` enforced it; **checking that claim
  showed it does not**. `Shape` requires of the other five languages only what
  `en.ts` itself declares, so a category added to `categories.ts` and to no
  dictionary at all is required of nobody - `tsc` passes and `categoryLabel`
  falls back to the raw English name in every language, silently. A **rename**
  is worse: the old key stays behind in all six files, nothing complains, and
  every language falls back to English while a dead key lingers. Verified by
  experiment, not by reading the types: an invented `Quantum Computing`
  category rendered as English in Japanese with a clean build.
* **Fixed.** A `category labels` block in
  [i18n.test.ts](../../../src/lib/i18n/i18n.test.ts) now holds the two lists
  together - every category named in every dictionary, no dictionary keeping a
  label for a category that no longer exists, and English repeating the category
  name exactly. Each assertion was checked against the failure it is meant to
  catch by breaking the tree three ways and watching it fail, then restoring.
  [Fields](fields.md#adding-a-category) carries the corrected checklist.
* **Learned - date-holidays is a partial fit for religious markers, and it is
  worth knowing exactly how.** The `DateTime` markers table held 1,931 rows and
  almost no religious observance (Christmas Day alone) because it is seeded from
  `new Holidays('US')`. The library *does* compute the Hijri, Hebrew and
  Easter-linked calendars correctly, but names them in the source country's
  language, so each observance has to be taken from the country whose calendar
  defines it and renamed. Traps found:
  - **Mawlid is returned two or three times a Gregorian year with impossible
    spacing** (5 Jan, 14 Aug *and* 25 Dec 2027), so it is left out.
  - **Vesak comes back only sporadically** - 4 hits across 17 years - so it is
    left out too.
  - **Indonesia lists Eid over two days and Israel lists Rosh Hashanah over
    two**; the marker is the observance, so only its first day is kept.
  - **The Hijri calculation has a range limit**: Indonesia answers for 2050 and
    returns nothing for 2100, which is why the generated set stops at 2040
    rather than following the holidays block to 2100.
  - **India's set has no Hindu festivals at all** - Diwali and Holi are not in
    the `public` list - so Hindu observances need another source and were left
    to pins rather than markers.
* **Built.** `scripts/backup/religiousDays.json`, 223 markers over 2024-2040
  across 13 observances (Eid al-Fitr, Eid al-Adha, Islamic New Year, Passover,
  Shavuot, Rosh Hashanah, Yom Kippur, Sukkot, Epiphany, Good Friday, Easter
  Sunday, Ascension, Pentecost), seeded by [data/index.ts](../../../scripts/data/index.ts)
  beside the solstice and equinox files so a `db:refresh` keeps them. Two
  independent cross-checks passed: Easter 2027 is 28 March in both the Vatican
  set and the general calendar, and Eid al-Adha 2027 is 16 May in both the
  library and the Hajj research done for pin 2390.
* **Learned.** The category change was picked up by a **concurrent session**
  within the hour: pins 2398-2401 are another session's government-shutdown
  batch, posted as @EconDesk and two of them already filed under
  `Labour & Employment`. Worth remembering when counting a category's pins in
  the same session that created it - `Labour & Employment` read 5, not the 3
  posted here.
* **New curator.** **@FaithDesk** (327) for religious observances and
  pilgrimages. `Labour & Employment` went to @EconDesk and
  `Mining & Materials` to @BuildDesk, which already owns Energy and
  infrastructure, rather than opening two more desks.
* **Changed.** This page, [Fields](fields.md) (the add-a-category checklist),
  [Vertical recipes](verticals.md) (a Religion & Belief recipe and rows for all
  three categories).

## 2026-09-21 - Trade shows, budget calendars and product launches (pins 2378-2389)

* **Learned - the three seams are not equally rich, and it is worth saying which.**
  Aimed at May/Jul/Aug 2027, the months the first two passes never reached.
  **Trade shows and annual festivals are the best seam by a distance**:
  organisers publish dates one to three years ahead on their own sites, and
  those sites are readable. **Budget calendars are precise but few** - the dates
  are statutory or conventional, so they are easy to source and there are only a
  handful per country per year. **Product launches are the thinnest**: the 2027
  games calendar carries ~54 dated titles but they stop dead after April, with
  exactly one dated release later in the year (a Persona 4 port on 20 May).
  Publishers do not date the second half of a year more than about nine months
  out, and consumer electronics is the same. Do not plan a forward-calendar fill
  around product launches.
* **Learned.** Twelve pins: Cannes (11-22 May), the Venice Architecture Biennale
  (8 May - 21 Nov), Eurovision in Burgas (15 May), San Diego Comic-Con (21-25
  Jul), the Edinburgh Fringe (6-30 Aug), gamescom (23-29 Aug), three budget
  dates (India's 1 February convention, the US budget request deadline, the
  start of US fiscal 2028) and three dated games. **May 2027 went 3 -> 6**, July
  7 -> 8, August 7 -> 9, February 20 -> 25. **`Arts & Literature` went 1 -> 5**,
  the largest relative move of the three passes.
* **Learned - a trade show's homepage is its current edition's page.**
  `gamescom.global/en` carries "23-29 August 2027" and `edfringe.com` carries
  "06 - 30 August 2027" in plain HTML, so for an annual show the homepage is a
  legitimate `sourceUrl`, unlike a news site's front page. But **grep the raw
  HTML to confirm the year is really there**: `computextaipei.com.tw` renders its
  dates in JavaScript and a plain fetch showed nothing, and `computex.biz` does
  not resolve at all, so Computex was dropped rather than sourced loosely. June
  2027 was already the healthiest forward month, so nothing was lost.
* **Learned.** `congress.gov` **403s to `curl` and to WebFetch alike**, so a CRS
  report cannot be a `sourceUrl` from there. `everycrsreport.com` mirrors the
  same reports and reads fine - R47088 confirmed "first Monday in February" and
  R47235 confirmed the 1 October fiscal-year start before either was used.
* **Learned.** `ebu.ch` 403s to `curl` but reads fully through WebFetch, the same
  shape as `vaalit.fi`. It gave the venue and all three Eurovision show dates.
* **Learned.** **Search the corpus by title before composing, not after.**
  Metroid Ravenous (28 January 2027) was already pinned as 298 from its
  announcement; a title search caught it while the batch was still a list, which
  is cheaper than discovering it as a 409 after the media and summary are
  written.
* **Learned.** A game pin's picture is the **official trailer's still**
  (`img.youtube.com/vi/<id>/maxresdefault.jpg`), because box art on en.wikipedia
  is a non-free local upload. Pin 84 already does this, and the three game pins
  follow it: still as the picture, the same video as the video.
* **Learned.** Wikidata `P159` overruled the roundup on a studio HQ: the games
  list implies Bellevue for Crystal Dynamics, `P159` says **Redwood City**. The
  studio-location rule means P159 wins.
* **Feedback applied - the wrong-edition video rule held up under pressure.**
  Cannes' own 2026 teaser, gamescom's Opening Night Live 2026 and every SDCC
  2026 walkaround were rejected: an official channel does not make last year's
  edition the right work. Eurovision was the one real exception, and for a
  reason specific to that pin - Bulgaria's winning 2026 performance is *why*
  Burgas hosts in 2027, so it is on-topic rather than a stale edition. Four of
  the twelve pins ship with no video, which is the honest outcome.
* **Learned.** The forward hole after three passes: Nov 2026 32, Dec 45, then
  38 / 25 / 15 / 12 / **6** / 23 / 8 / 9 / 10 / 11 / 4 for Jan-Nov 2027. May
  doubled but is still the thinnest month of 2027, and **November 2027 (4) is
  now the worst** - nothing has been aimed at it yet.
* **Changed.** This page, [Vertical recipes](verticals.md) (a Trade shows and
  annual festivals recipe, a Budget calendars note, and the product-launch
  caveat) and [Sources](sources.md) (congress.gov, ebu.ch, trade-show homepages).

## 2026-09-21 - Three thin categories: the COPs, the Fed's 2027 calendar, big science (pins 2363-2377)

* **Learned.** The second pass at the imbalance measured yesterday, aimed at the
  three thinnest categories with authoritative forward schedules. Fifteen pins:
  COP31 and COP32 (`Climate & Environment` 7 -> 9), the eight 2027 FOMC rate
  decisions (`Macroeconomics` 5 -> 13) and five big-science milestones
  (`Science & Research` 9 -> 14, and `Space & Astronomy` and `Energy` each +1).
* **Learned - the sourcing trap that nearly sank the Fed batch.** The Federal
  Reserve's FOMC calendar publishes all eight 2027 dates on **one page with no
  per-meeting URL**: past meetings get
  `/newsevents/pressreleases/monetary<date>a.htm`, future ones get nothing but a
  table row. Eight pins would therefore have shared one `sourceUrl`, which is
  both the roundup anti-pattern and an automatic 409 from
  `rejectDuplicateSourceUrl`. The fix: Kalshi's **`KXFEDDECISION`** series has
  one event per meeting (`KXFEDDECISION-27JAN` ...) whose strike times match the
  Fed's published dates exactly, so each pin gets its own URL, live odds and a
  dollar volume, with the Fed's calendar as the authoritative **reference** for
  the date. Verified with `parseMarketUrl` + `oddsFor` against the real code,
  per [Sources](sources.md) - all eight resolved 5 outcomes each.
* **Learned.** Those markets are mostly **thin**: $23.5k on January but $1.4k on
  September 2027 and under $10k on six of the eight. Each pin says so in its own
  words rather than leaving the reader to find out, as the volume rule requires.
  `Pin.marketVolume` was written on save without anything being typed.
* **Feedback applied - the event, not the market.** @EconDesk (326) owns the
  FOMC **meeting**; @OddsDesk keeps the market *question* pins (1678, 1980 are
  "Fed Decides Whether to Hike..." - the question; 2365-2372 are "The Fed Sets
  Rates at the ... Meeting" - the event). Same split as @SportDesk/@OddsDesk and
  @PoliticsDesk/@OddsDesk. A market URL as `sourceUrl` is a *sourcing* choice and
  does not by itself make a pin @OddsDesk's.
* **Learned.** The picture-dedupe ([[image-dedupe]], difference hash at
  distance 6) means **N pins about one recurring institution need N distinct
  pictures** - one Eccles Building photo on eight FOMC pins would have stuck to
  the first and been dropped from the rest. Commons has plenty once the 1930s
  Library of Congress construction series and the NARA drawings are filtered
  out: FOMC meeting photographs, Powell press conferences and recent
  building shots gave eight distinct ones.
* **Learned.** A **409 is often a prompt to find a better source.** The SKA-Mid
  pin was rejected because pin 250 already cites the Square Kilometre Array
  Wikipedia article. SKAO publishes a *separate* per-telescope timeline -
  `Sciops_timeline_mid_ppt.pdf` beside `Sciops_timeline_low_ppt.pdf` - which is
  the primary source for the AA2 dates anyway (Mid: AA2 2029, AA* 2031; Low:
  AA2 2027, AA* 2029, Cycle 0 2030). The rejected pin came back stronger.
* **Learned.** `skao.int` HTML **403s to both `curl` and WebFetch**, but its PDFs
  under `/sites/default/files/documents/` serve fine to a browser UA and read
  cleanly with `pdftotext`. Do not write the site off on the HTML alone.
* **Learned.** A Wikipedia infobox field can be stale while the lead is right:
  both the COP31 and COP32 articles carry `date = November 2025`, which is
  simply wrong. The lead sentences ("from 9 to 20 November 2026", "to be held in
  Addis Ababa") match UNFCCC and were what the pins used. Read the prose, not
  one infobox field.
* **Learned.** Checked and **dropped** the Nancy Grace Roman Space Telescope as a
  2027 filler: it launched **30 August 2026**, ahead of its "by May 2027"
  commitment, so its launch is a past event and its "science operations at the
  beginning of 2027" milestone has no place on the map (it sits at L2). Worth
  re-checking a mission's status before pinning its schedule.
* **Learned.** Rubin's DR1 has **no fixed calendar date by design**: RTN-011 says
  processing a year of LSST data "is estimated to require approximately one
  year", implying "DR1 delivery approximately two years after the effective
  start" (the LSST began 2026-06-29), while warning the boundaries follow
  "survey performance and scientific readiness rather than a fixed calendar
  date". That is exactly what `estimated` is for, and the reasoning quotes it.
* **Learned.** Eight FOMC pins have **no video and will not get one**: there is
  no footage of a meeting that has not happened, and a press conference from a
  previous meeting is the wrong event - the same rule that rejected
  previous-election explainers yesterday. The other seven took their project's
  or host government's **own** channel (SKAO, Rubin, iterorganization, ESO, and
  Türkiye's Climate Change Directorate for COP31).
* **Learned.** The forward hole is closing slowly, and the honest numbers are:
  Nov 2026 31 -> 32, Jan 2027 35 -> 38, Mar 13 -> 15, Apr 9 -> 12, Jun 18 -> 23,
  Jul 6 -> 7, Sep 9 -> 10, Oct 9 -> 10. **May 2027 is still 3 pins** and
  Jul/Aug 2027 still 7 - neither batch reached them. Dec 2027's 32 is mostly
  year-end `estimated` pins landing on 31 December, not real density.
* **New curators.** **@ClimateDesk** (325) for climate summits and environment
  milestones; **@EconDesk** (326) for central-bank decisions and macroeconomic
  releases.
* **Changed.** This page, [Vertical recipes](verticals.md) (Climate summits,
  Central-bank decisions and Big-science milestones recipes plus table rows),
  [Sources](sources.md) (skao.int, the Fed calendar, Kalshi `KXFEDDECISION`)
  and [Enrichment](enrichment.md) (the N-pins-N-pictures dedupe note).

## 2026-09-20 - The 2027 forward calendar, and national elections (pins 2350-2362)

* **Learned.** The corpus is lopsided three ways, and only one of them matters
  much. By **category**, `Anime` plus `Anime Movie` is 778 of 2,185 pins (36%)
  against twelve categories on nine pins or fewer. By **place**, the anime pass
  put 737 pins in Japan/Korea against 18 in South America and 41 in
  Africa/the Middle East. But the damaging one is **time**: the timeline held
  ~100 pins a month through October 2026 and then fell off a cliff - 31 in
  November, and 19, 13, 9, **2**, 18, 6, 5 and 9 across February to September
  2027. A timeline product runs dry about six weeks out, which no category
  count would have shown.
* **Learned.** The three imbalances have one cheap common fix: a vertical that
  is thin *and* has an authoritative forward schedule *and* is spread over the
  whole map. **National elections** are all three. Thirteen pins (2350-2362)
  took `Elections` from 12 to 25 and `Geopolitics` from 20 to 33, and landed in
  Nigeria, Kyrgyzstan, El Salvador, Micronesia, The Gambia, Finland, Spain,
  Mexico, Guatemala, Mongolia, Kenya, Angola and Argentina.
* **Learned.** Thirteen pins do **not** fix the forward hole, and the numbers
  should be read honestly: May 2027 went from 2 pins to 3. Filling
  November 2026 - September 2027 needs several more passes of this size, not
  one. The geographic needle barely moved either (Africa 41 -> 45, South
  America 18 -> 19) because a 737-pin concentration does not shift by 13.
* **Learned.** `Medium.type` is **1 = image, 2 = twitter, 3 = youtube**, and a
  YouTube medium is stored as the **embed** URL
  (`https://www.youtube.com/embed/<id>`). This is *not* the `MediumType`
  table's numbering, which reads 1 = youtube, 2 = image, 3 = twitter - the
  table is a decoy. Posting a watch URL as `type: 1` 500s the whole `PUT` with
  `Could not find MIME for Buffer`, because the thumbnailer tries to decode the
  HTML page as an image.
* **Learned.** That failure is also a clean confirmation that `Pin#update` is
  transactional now: eight pins took the bad `PUT`, all eight 500'd, and every
  one still had its picture afterwards. The pre-2026-09-16 bug would have
  wiped the media before the failing write.
* **Learned.** Wikipedia's **`2027 national electoral calendar`** page is a
  stub - its per-month sections are empty. The populated, cited page is
  **`List of elections in 2027`**, whose entries carry the electoral
  commission's own announcement as a footnote. Four candidates had no article
  at all (Estonia, the Northern Ireland Assembly, Papua New Guinea,
  Switzerland) and were dropped rather than sourced from memory.
* **Learned.** Reconstructing a URL from truncated console output is a
  reliable way to save a dead link: 3 of 19 references 404'd that way
  (Forbes Mexico, republica.com, mongoliaweekly - each real URL had an extra
  slug or a different tail). Re-extract the full URL from the source and
  **live-check every link before the save**. The check also caught the
  Wikimedia 429s, which clear with the contact User-Agent already in
  [Sources](sources.md).
* **Learned.** Commons free-text search drifts to the wrong country on generic
  building names: "White House Bishkek" returns the US and Moscow ones,
  "Parliament Buildings Nairobi" returns Hungary's and British Columbia's.
  Scope with `incategory:"..."` and filter the file title for the city or
  country before picking by pixel size. Four venues (Bishkek, San Salvador,
  Guatemala City, San Lazaro) only resolved through the building article's own
  `pageimages` on the **Spanish** Wikipedia, or through Ala-Too Square as the
  place rather than the building.
* **Learned.** `vaalit.fi` (the Finnish Ministry of Justice's election service)
  **403s to `curl`** but reads fully through WebFetch - worth a reference, not
  worth a wiki from a blocked capture.
* **Corrected a pin.** 1976 "France Votes in the 2027 Presidential Election"
  was dated **11 April 2027**, derived from the constitutional window because
  Polymarket said only "around April 2027". The French government announced the
  real date after a cabinet meeting on 30 June 2026, and
  `service-public.gouv.fr` now states "April 18 and May 2, 2027". The pin is
  now 18 April, `scheduled`, with the government page as a reference. A market
  pin dated by inference is worth re-checking once the organiser announces.
* **New curator.** **@PoliticsDesk** (id 324) posts elections and referendums -
  the vote itself, the way @SportDesk owns the fixture and @OddsDesk the market
  on it. The thirteen pins are all its.
* **Changed.** This page, [Vertical recipes](verticals.md) (a National
  elections recipe and its table row), [Sources](sources.md) (Wikipedia
  election calendars, Commons building searches, vaalit.fi) and
  [Enrichment](enrichment.md) (the medium type numbering).

## 2026-09-20 - Aerospace, a vertical with almost no future (pins 2334-2349)

* **Learned.** `Aerospace` held 22 pins, 21 of them from one @BuildDesk YouTube
  pass and **exactly one dated after today** (the 777-9 delivery, 1862). The
  past-against-future measure in [Nightly jobs](nightly-jobs.md) is what caught
  it: the total looked healthy and the vertical was finished. Sixteen pins fixed
  both ends - ten landmark firsts that were simply missing (Wright Flyer 2334,
  Lindbergh 2335, He 178 2336, Bell X-1 2337, Comet into service 2338, 747 2339,
  Concorde 2340, A300 2341, A380 2342, 787 2343) and six recent or forward
  milestones (X-59 supersonic 2344, 737-7 certification 2345, A350F first flight
  2346, Paris Air Show 2027 2347, B-21 at Ellsworth 2348, GCAP demonstrator 2349).
* **Learned.** A Wikipedia *aircraft type* article is a good source for a first
  flight: the infobox dates it and the development section gives the pilot, the
  airfield and the duration. Everything the ten historical pins claim came from
  the page's own words, and the place was always named on it - Warton, Paine
  Field, Toulouse-Blagnac, Marienehe, Muroc - so none needed a guess.
* **Learned.** `media:videos` matched **none** of the sixteen. Its filter wants
  most of the pin's distinctive title words in the video title, and a pin titled
  for its event ("The Boeing 747 Makes Its First Flight") shares almost nothing
  with a video titled "747 FIRST FLIGHT 1969 - BOEING 747 - FEBRUARY 1969". The
  fix was a YouTube Data API search per pin and a hand pick from a verified or
  archival channel, stored exactly as `media:videos` stores one (`Medium`,
  `addThumb`, `save`). Fifteen of sixteen got one: British Movietone, British
  Pathe and AP Archive for the newsreel events, Airbus and NASA Armstrong for
  their own aircraft, CNBC and Sky News for the news ones.
* **Learned.** **A `.jpg.webp` image is a JPEG with a suffix.** The Contentful
  webp trap from the robotics pass has a cheap fix where the CDN names the file
  that way: `aerospacetestinginternational.com` serves
  `...-0316x9-1.jpg.webp`, and dropping `.webp` returns `image/jpeg` that the
  thumbnailer takes. Where the file is natively `.webp` (aviationa2z), there is
  nothing to strip and the picture is simply unavailable.
* **Learned.** `media:top-up`'s **Wikipedia fallback is still worse than
  nothing** on a page it cannot illustrate, and this run is the sharpest
  evidence yet: it hung a *Mars helicopter* on the Wright Flyer pin, a Heinkel
  **He 118** dive bomber on the He 178 pin, a Boeing 787 on the de Havilland
  Comet pin, an A330 on the A350F pin and a MAX 8 on the 737-7 pin. Five of
  seventeen top-ups were wrong subjects. **Always read back what it added** -
  the filenames alone give it away - and remove the wrong ones
  (`Medium#deleteFromPin`, the same path `media:dedupe` uses). Commons
  `list=search&srnamespace=6` then found the right picture for three of them
  (the Flyer's fourth flight, the Bundesarchiv He 178, a BOAC Comet 1 at
  Heathrow); for the 737-7 and the A350F, Commons has **no photograph of the
  variant at all**, so those two stay at 2 media rather than take a lookalike.
* **Learned.** `media:top-up`'s dry run prints only the count - it returns
  before the per-pin loop - so there is no way to preview what it will attach.
  Run it with `--apply` and audit afterwards.
* **Learned.** Wikimedia answers 429 after about six pins even at `--delay 7`;
  four pins came back empty and a re-run at `--delay 25`, after a 90-second
  pause, got all four.
* **Learned.** A newer trade source beat the search summary on GCAP: search said
  the demonstrator flies in 2027 (Janes, July 2025), but the programme's own
  August 2026 update says "aircraft ready by the end-2027 with flight test
  starting from early 2028". The pin took the 2028 date and both earlier pieces
  became references whose reasoning says they record the older target.
* **Learned.** A budget is not a cost, again: the B-21 article offers $4.5bn of
  fiscal 2025 funding and a $6.1bn fiscal 2027 request, and the GCAP article a
  GBP4.6bn design contract. None is the cost of the event being pinned, so all
  three pins carry no `price`.
* **Learned.** Walls met: `baesystems.com` is behind Incapsula (923 bytes of
  iframe shell for every heritage page), `museumofflight.org` refused the
  connection outright, and `aviationa2z.com` began answering 522 mid-run. The
  show's own site, `siae.fr`, loads but carries almost no text - 393 characters,
  enough to date the pin ("14.20 JUNE 2027") and nothing else - so Wikipedia
  carried the organiser, venue history and scale as a reference.
* **Learned.** One pin knowingly has no video: nothing exists yet about the 2027
  Paris Air Show, and a 2025 highlights reel would be the wrong event. Three
  pictures and no video is the honest answer there.
* **Changed.** [Vertical recipes](verticals.md) gained the Aerospace recipe,
  [Sources](sources.md) the new walls and the `.jpg.webp` note, and
  [Enrichment](enrichment.md) the read-back rule for `media:top-up`.

## 2026-09-20 - Robotics, a near-empty vertical (pins 2324-2333)

* **Learned.** `Robotics` held three pins before this run (Unimate 1961, a
  burger-robot piece and Tesla Optimus V3), so ten major events filled 2026
  end to end: Boston Dynamics' production Atlas at CES (2324), Amazon retiring
  Blue Jay (2325), AgiBot's 10,000th humanoid (2326), Figure's one-robot-an-hour
  ramp at BotQ (2327), 1X's Hayward NEO factory (2328), NVIDIA's Isaac GR00T
  reference humanoid (2329), Unitree's STAR Market debut (2330), the World
  Humanoid Robot Games (2331), ugo Nova in Tokyo (2332) and Atlas at Hyundai's
  Metaplant by 2028 (2333, threaded under 2324).
* **Learned.** The pin is the *milestone*, not the robot: a humanoid has no
  single date, but a production rate, a factory opening, a unit count, a listing
  or a withdrawal does. Amazon's Blue Jay is the useful shape here - the event
  is an "Update February 25, 2026" line inside an October 2025 announcement
  saying the robot is no longer in operations, which is `confirmed` on the
  company's own wording and dated to the update, not the article.
* **Learned.** Robotics makers publish well: figure.ai, bostondynamics.com,
  agibot.com, 1x.tech, investor.nvidia.com, globenewswire, aboutamazon.com and
  scmp.com all came back from `GET /api/scrape` with full text and Open Graph
  media. But the page's own date beats a search summary - search put NVIDIA's
  GR00T announcement on 31 May at GTC Taipei; the release says June 01.
* **Learned.** Place the pin where the event was, not at the parent's HQ:
  the Las Vegas Convention Center for a CES reveal, the Shanghai Stock Exchange
  for a listing, BotQ's North First Street address for a production ramp.
  Wikipedia's `prop=coordinates` returns the exchange and the Metaplant
  outright; a plant with no article needs its street address from a property
  report.
* **Learned.** A four-organiser event (the World Humanoid Robot Games) takes
  `company: null` rather than one of the four, and RoboCup's own events page
  corroborates the dates and venue.
* **Trap.** Contentful's `?fm=webp` image variants fail the thumbnailer
  ("Mime type image/webp does not support decoding"), a 500 on `POST /api/pins`.
  Create is still not transactional, so pin 2327 was written without media;
  the fix is to strip the query and `PUT` the whole pin back, never to re-POST
  into a duplicate `sourceUrl`.
* **Trap.** The scraper's Wikipedia image fallback can be actively wrong on a
  page it cannot illustrate - the Unitree IPO page returned a photo of a OnePlus
  One, the Hyundai release a Waymo car. Read the media stage's output before
  saving it. Conversely agibot.com's own article image is absent from the
  rendered image list, so a reference article's lead image carried that pin.
* **Trap.** `npm run companies:logos -- --all` 429s on Wikipedia partway
  through, which is harmless (it fills gaps, it does not clear existing logos -
  418 with logos after, against 415 in the committed seed), but a company with
  no Wikipedia article needs `websiteUrl` set by hand first: ugo -> ugo.plus.
* **Learned.** Stocks only where a US ticker is genuinely in the story: NVDA as
  company (GR00T), AMZN as company (Blue Jay), GOOGL as *related* on the Atlas
  pin because DeepMind's models go into the robot. Hyundai, Unitree, Figure, 1X,
  AgiBot and ugo are not US-listed and those pins carry none.
* **OKF backfill, same day.** The app key has no credit (`llm: "session"`), so
  the link wikis were done by hand through `wiki:export`/`wiki:apply`: 24 wiki
  jobs (all single-part) over the 27 pin-source pairs, then a second round of 10
  contradiction checks. No summaries were due, because these pins were saved
  with a hand-written `longFormSummary` rather than waiting for one to be
  composed from the wikis. Three rounds took the backlog to zero.
* **Learned.** The contradiction check earns its place. Eight findings, all
  minor, and two of them are the same fact twice: automate.org gives Atlas a
  66 lb payload where Boston Dynamics' and Hyundai's own releases both say
  110 lb / 50 kg, and Hyundai's release prints the operating range as
  "(20C to 40 Celsius)" against Boston Dynamics' "-20 to 40 C" - a dropped
  minus sign, caught because the Fahrenheit range matches in both. The Unitree
  pin's finding is the useful kind: [S] reports the open (+629%, $66bn) and the
  reference the close (+460%, ~$50bn) of the *same session*, so the pin's
  headline valuation is the higher of two true numbers.
* **Trap.** `wiki:export` **crashes when nothing is due** - the endpoint the
  playbook tells you to run to - because `prompts.md` is written
  unconditionally while the output directory is only ever created as a side
  effect of writing a job file, so a 0-job run dies on `ENOENT ... prompts.md`
  instead of reporting "0 wiki(s), 0 summary(ies), 0 contradiction check(s)".
  Fixed with an `mkdirSync(out)` after the `rmSync` in
  [export.ts](../../../scripts/wiki/export.ts).
* **Learned.** A source's wiki can have more pages than the source has: a page
  covering several distinct things gets topic pages, so the 27 pin-source pairs
  hold 37 `SourceWiki` rows - robotstart's seven-company summit alone is 7.
* **Changed.** [Vertical recipes](verticals.md) gained a `Robotics` row and a
  full recipe section.

## 2026-09-20 - Pin 315 (Mac mini M6): the video its references were hiding

One pin, fixed by hand after the owner noticed a video that the scrape had
walked past.

* **Learned**
  * **A reference article's embed is invisible in the text.** Pin 315's two
    references (MacRumors, 9to5Mac) each embed a video, and neither showed up
    in anything the pipeline reads: the markdown conversion drops iframes.
    `curl -A '<plain Chrome UA>' | grep -oE 'youtube(-nocookie)?\.com/(embed|watch)[^"]*'`
    found them in seconds. MacRumors' page also lists ten `watch?v=` URLs in
    its sidebar JSON - the `embed/` src with a `?si=` is the in-article one.
  * **The embed was the best reference on the pin.** Apple's own upload,
    "The new Mac mini with M6" (channel `UCE_M8A5yxnLfW0KghEeajjw`,
    2026-08-25), is first-party at 85, above both articles at 74 and 72.
    9to5Mac's embedded "Overtime Episode 079: The $899 Mac mini" is the
    publisher's own podcast on the pin's subject: a reference at 72, not media.
  * **oEmbed and `PUT /api/pins/:id` are enough to add a video by hand.**
    `youtube.com/oembed?url=...&maxwidth=800&maxheight=450` gives `html`,
    `author_name`, `author_url`; `originalUrl` is the iframe `src` up to the
    `?`. GET the pin, append the medium, PUT it back: `update()` diffs media by
    `originalUrl`, `addThumb` fetches the video's still by itself, and the
    references route is `POST /api/pins/:id/references` (add-only, notifies the
    author, moves an all-day pin's dates only if the reference is more
    confident - send `startDate`/`endDate` null to leave them alone).
  * **Apple prices nothing on the marketing page.** `apple.com/mac-mini/`
    carries only the financing-example dollar figures ($1,199 iPhone, $399
    Watch), which a naive price grep would take. The store page
    `apple.com/shop/buy-mac/mac-mini` has the real MSRP in its page JSON as
    `"currentPrice":{"amount":"$899.00","raw_amount":"899.00"}` - $899 base,
    $1,699 M5 Pro, confirming the figure the pin already held.

* **Feedback**
  * "should have youtube reference as it's in the references reference" - an
    embed inside a cited article is evidence the pin should cite itself.
  * "product video should be best effort gotten and brought to pin media and
    reference" - not either/or: the product video goes in both places.
  * "for released products, should check company product page for MSRP price
    and add as reference".

* **Changed** [Enrichment](enrichment.md) (MSRP reference, reference-embedded
  video in both places, grep raw HTML for the embed), standing feedback above.

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

## 2026-09-20 - "Already available" is not a release date (71 pins on one day)

Three contradiction batches independently tripped over pins parked on
**2026-09-08** matching nothing in their own links. The date was not two bad
pins: **71 pins**, every one @GameDesk, **65 of them `confirmed`**, all sharing
that single start date. The busiest real day in the surrounding four months has
twelve.

- **Where it came from.** All 71 were scraped from one Gear Patrol *"September
  Week 2, 2026"* roundup. The extractor said so itself, in
  `dateConfidenceReasoning`, 65 times over: *"Listed as already available in Gear
  Patrol's September Week 2, 2026 roundup."*
- **The error.** "Already available" is a **bound**, not a day - it says the
  release had happened by press time. The extractor converted it into a release
  date, and resolved the roundup's *week* to its Monday. Pin 310 (iPhone 18 Pro)
  ended up dated **the day before** Apple's own newsroom announced it; pin 315
  (Mac mini) sat two weeks after an announcement its own references date to
  25 August.
- **Why nothing caught it.** The sources are manufacturer **store pages**
  (`apple.com/shop/buy-iphone/...`, Sony, Marantz, Sonos, JBL, Yamaha), which
  carry no event date at all. With nothing on the page to date, the extractor
  reached for the only date in sight - the article's own publication period -
  and, because the roundup stated availability flatly, called it `confirmed`.
  A date inferred from *when the article ran* was being laundered into a fact
  about the product.
- **The tell, for next time.** One date shared by dozens of pins from six
  unrelated manufacturers is never a real date. A `GROUP BY` on start date
  across a scrape is a cheap check and would have caught this on day one; it is
  worth running after any roundup job.

**Fixed in `src/server/extract/systemPrompt.ts`**: a roundup, week-in-review or
shopping guide listing something as out now gives the *latest* the release could
be, so the pin takes that period's last day, `allDay`, `estimated` at best - and
a date inferred from an article's publication date is never `confirmed`.

This is the same family as the grounding rule above: the page did not state the
fact, and the extractor supplied it anyway. Here it supplied a date rather than
a figure, which is harder to notice, because a wrong date still looks like a
date.

**Outcome (same day).** All 71 re-dated from their own references by three
agents, none left on 2026-09-08: **35 confirmed, 31 estimated, 5 unknown**. The
corrected spread is the point - the roundup had made 65 of them `confirmed`.

- **The references already held the right answer.** In most cases the pin's own
  links stated the availability plainly and the extractor overrode them with the
  roundup week. Thirteen of one agent's 24 pins carried a **month-only**
  availability line ("available from September 2026", "December in North
  America") that simply needed the period's last day.
- **The roundup was wrong about availability itself, not just the day.** Several
  products it listed as "already available" had not shipped at all: pin 309
  (iPhone Duo) ships **2026-10-23**, six weeks *after* the date it carried as
  `confirmed`; pin 384 (Razer x Xbox) 20 October; pin 367 (Ruka TD-1) is a
  pre-order for **2027**. So a corrected date is as likely to move later as
  earlier - do not assume the roundup date is an upper bound either.
- **Do not batch siblings from one announcement onto one date.** A single Marantz
  press release covered three receivers and gave the Cinema 70s (pin 372)
  15 September where its two siblings got 12 August.
- **"Available now" in a single article is the same bug in miniature.** Where
  that was the only wording, the honest answer was the announcement date at
  `unknown` (pins 338, 351, 356, 361, 332), not a confirmed release.

Reasoning that still names Gear Patrol is now fine, and eight pins do: they cite
a **dated article with a quoted availability claim**, which is evidence. It was
the undated *week* label that was not.

## 2026-09-20 - Ruling: a figure in a video title is a headline, not a claim

Nearly every contradiction batch filed the same shape, and one asked outright for
a ruling: a B1M or Free Documentary YouTube page captured as **metadata only, no
transcript**, whose sole checkable "fact" is a cost in the video's own title -
`$100BN`, `$40BN Kansai`, `$2.8BN Silvertown`, `AUD $125BN Suburban Rail Loop` -
sitting against a proper figure from a text source.

**The ruling: a figure that appears only in a video title is a headline, not a
sourced claim.** Do not file it as a contradiction against a text source. Video
titles are written to be clicked on, and they are routinely at a different scope
from the pin: the `$2.8BN` Silvertown title against New Civil Engineer's £179M is
an order of magnitude, and the `AUD $125BN` Suburban Rail Loop title covers
Melbourne's whole metro programme where the pin is one line.

**The exception, which is the case actually worth catching:** where a *pin's own*
headline figure traces back to nothing but a video title, that is the pin
treating a marketing number as fact, and it should be reported. Pin 610 is the
example - its "$125BN Suburban Rail Loop" has no support but the title, against
Wikipedia's $31-58bn for the scope the pin describes.

**How big the class is** (measured 2026-09-20): 523 YouTube captures are `ready`,
**104 of them thin enough to hold no transcript**, and 104 pins cite at least one.
Only **one** pin rests solely on such captures, so the usual damage is a pin with
one fewer usable reference rather than a pin with no evidence - less dire than
the batch reports suggested, but it does mean a "second source" on those pins is
often not a second source at all.

The fix that would retire the class is transcripts (`npm run wiki:transcripts`),
still blocked by YouTube's 429s. Until then, treat a transcript-less video as
corroborating nothing.

## 2026-09-20 - A wrong date hides a duplicate

Running `npm run duplicates:suggest` after the 71 re-dated pins landed produced
**12 new pairs across 2,146 pins**, and seven of them were the same Apple
products pinned twice: @ThePinGang's "AirPods 5 Release", "Apple Watch Ultra 4
Release", "iPhone Duo Release" (from MacRumors) against @GameDesk's "Apple
AirPods 5", "Apple Watch Ultra 4", "Apple iPhone Duo" (from apple.com store
pages).

They had been invisible for a simple reason: the duplicate check compares pins
**within a day of each other**, and the roundup pins were all parked on
2026-09-08 while their twins sat on the real release dates. Correcting the dates
dropped each pair onto the same day - 18 September, 23 October - and the check
saw them immediately.

**So a date error does not just mis-place a pin, it conceals a duplicate.** Worth
running `duplicates:suggest` after any job that corrects dates in bulk; it is
cheap and it only ever adds suggestions, which people confirm.

Two related notes from the same run:

- **Suggestions only run on save.** A pin is never re-checked against pins added
  later, which is why Jeddah Tower had three live pins (134, 219, 448) with no
  suggestion between any of them until the job was run by hand.
- **Widening the day window is the wrong lever.** Adding `scheduled` to
  `SOFT_DATES` in `services/duplicatePin.ts` (274 pins, currently a one-day
  window) was tried and reverted: measured against the corpus it took visible
  pairs from 5 to 49, and what it surfaced was OpenAI model-retirement pins,
  Nike colorway releases and consecutive eclipses - all distinct by design. The
  periodic `duplicates:suggest` run gets the real pairs without the noise.

**Cross-checking the findings by source URL is a second duplicate detector.** Of
657 source URLs named in the 431 contradiction findings, only 7 were implicated
across more than one pin - and every one was a near-duplicate pair (Chuo
Shinkansen, Jeddah Tower, Bogota Metro, Australia 108) except Second Avenue
Subway, where Phase One and Phase 2 correctly share one Wikipedia article.

## 2026-09-20 - A wrong season in the title costs a pin its ratings

Pin 1131 was titled "Mushoku Tensei: Jobless Reincarnation **Season 2** Part 2
Premieres", but its MyAnimeList link (anime/45576), its date (4 Oct 2021) and
its whole summary were season 1's second cour. Everything downstream of the
title then went wrong, quietly:

- **No ratings.** `findScreenDetails` matches on exact normalised title *and*
  year. The title sent it to the real Season 2 Part 2 (2024), the year check
  rejected that, and the pin matched nothing at all - the dry run's `as "-": no
  ratings` is exactly this and nothing else.
- **The wrong trailer.** An earlier run had matched the title it was given and
  attached Crunchyroll's *Season 2 Part 2* trailer (`wwKZYTsxIhk`) to a 2021
  pin. Nothing flags a trailer that matched a title the pin should not have had.

Fixing the title to "... Part 2 Premieres" (PUT through the real API) and
re-running `media:screen --ids 1131 --apply` gave it AniList 85 / MAL 8.6 and
the right trailer (`vPBU0xBjFFY`, "Cour 2"). To re-pick a trailer, first PUT the
pin with the video dropped from `media` - the backfill only searches when the
pin has no video.

**Check a screen pin's title against its own sourceUrl and start year before
blaming the rating sources.** A season number is the easiest thing to get wrong
and the most expensive.

### The gap the wrong title was papering over

There were no pins for Season 2 (Jul 2023) or Season 2 Part 2 (Apr 2024) at all,
so the thread ran S1 -> S1 Part 2 -> S3. Both were added as @AnimeDesk through
`POST /api/pins` with an explicit `parentId` (the scrape's `respondTo` answered
1131 for *both*, which would have branched). `reslotSequels` then moved Season 3
onto the new Part 2 by itself, leaving one line: 1106 -> 1131 -> 2314 -> 2315 ->
1080.

## 2026-09-20 - AniList does not list every work MyAnimeList does

Pin 1564 (Gensou Mangekyou: The Memories of Phantasm, a Touhou doujin anime) had
no score, and could never have had one: `findScreenDetails` only fetched the
MyAnimeList rating *through* an AniList match, and AniList 404s on this work by
MAL id and returns nothing for its title, romaji or native. The pin's own
sourceUrl names the MAL id outright - the code already trusted a cited id for
the episode count, just not for the score. `src/server/scrape/screen.ts` now
falls back to the cited id for the rating too, covered by two tests that stub
`fetch` (the second asserts the empty case, so a 504 from Jikan stays silent).

**Jikan goes down for everything, not just one title.** While fixing this it
answered `504 Jikan failed to connect to MyAnimeList` for every id tried, having
worked minutes earlier. Do not read a 504 as "this work is unknown".

**When a source is unreachable, the fetched page text is already in the
database.** `Source.text` holds what the link fetcher stored (`seedSourceTexts.json.gz`),
so 1564's score came out of its own cited MAL page as captured on 19 Sep -
`SELECT "text" FROM "Source" WHERE "url" LIKE '%anime/55315%'` and grep for
`Score:`. Better than a blocked re-fetch, and it is the source the pin already
cites.

## 2026-09-20 - Side stories go in the chain, at their release date

Ruling from Ian: an OVA, special, bonus episode or side-story entry **belongs on
the timeline chain**, not parked as a standalone root. Mushoku Tensei's Blu-ray
OVA (1511, "Cour 2 - Eris the Goblin Slayer", Mar 2022) had been left rootless
while the TV seasons chained around it. It now sits in release order:

    1106 (Jan 2021) -> 1131 (Oct 2021) -> 1511 (Mar 2022 OVA)
      -> 2314 (Jul 2023) -> 2315 (Apr 2024) -> 1080 (Jul 2026)

The chain is ordered by **release, not story**, and never branches, so slotting a
side story in costs nothing - inserting it means re-parenting just the one entry
that follows it. "This would branch" is therefore not a reason to leave a side
story out; it only would if it were hung off the same parent as its neighbour.

Re-parent with PUT (send the whole pin back with `parentId` set), from the root
down so no cycle exists in between. PUT does not re-thread - only `POST` runs
`reslotSequels` - so an explicit parent set this way stays put.

## 2026-09-20 - A pin with one rating showed no score on its card

`PinCard` rendered `<RatingAverage compact>`, which by design draws nothing below
two sources ("an average would just restate the single chip beside it"). On a
card there is no chip beside it, so **319 pins - every pin with exactly one
rating - had a blank where their score should be**, while the same pin's page
and thread rows showed it.

`RatingSummary` already solved this for thread rows: average when there are two
or more, otherwise the single source's own score, labelled so it never reads as
a consensus of one. The card now uses it. Checked both ways afterwards - pin
1500 (AniList only) shows `76%`, pin 1131 (two sources) still shows `86%` titled
"Average of 2 ratings".

**Worth remembering:** a missing score on a card is not always missing data.
Check `GET /api/pins/:id` for `ratings` before re-running any backfill.

## 2026-09-20 - Acting on the warnings: a third of them were wrong

The sweep's 88 `warning` findings are the ones putting a pin's own claim in
doubt. 51 are on curator accounts and were worked through by three agents told
to **verify each finding before acting on it**, with "the finding is mistaken"
named as a perfectly good outcome.

**34 pins fixed, 17 findings rejected.** A third of the findings did not survive
checking. That number is the reason the instruction matters: an agent told to
"fix these 51 pins" would have introduced seventeen errors into pins that were
already right.

**What the rejections looked like** - the pin was right and the *source* was
wrong, or the two sources described different events:

- **827 MSC Divina** - Wikipedia says delivered at Marseille; the trade press,
  reporting the ceremony, has her handed over at Saint-Nazaire. Wikipedia's own
  infobox contradicts its text. The pin follows the better source.
- **1640 Chibi Maruko-chan** - Japanese sources confirm the 8 January 1995
  premiere the pin carries; AniList's August record is simply bad.
- **2032 Harry Potter** - HBO's own release says "premiering Christmas 2026";
  TVmaze's "premiering 2027" status line is stale.
- **705 China's skyscraper ban** - the finding said the 250 m restriction came
  from a 2021 order; the pin's own source video states the April 2020 notice
  carried both. The finding had not read the pin's source.
- **798 / 808 / 499** - the pin already disclosed the disagreement in its own
  summary, so it was never asserting the disputed figure.

**Where the pin really was wrong, the fixes were worth having:** a US-format
dateline read as D/M (802, 1 July -> 7 January); a date taken from the practical
completion of *a different building* (709, 20 Hanover Square); an airship pinned
in Akron that was built and flown in California (444); a complex's opening day
standing in for a tower's completion (635); "opens Phase 1" for what the source
calls a ceremonial technical opening (456).

**Two habits worth keeping.** Where a figure was disputed and nothing settled it,
the fix was to **drop the claim rather than swap in another unverified number** -
pin 915's carillon had three bell counts (48/70/72), so the pin now gives none.
And where a date could not be established, the pin was made **honest rather than
precise**: pin 709 moved to an end-of-2020 `estimated` with the uncertainty
written into `dateConfidenceReasoning`, rather than inventing a day.

Fixed pins need no finding cleanup: `contradictionSignature` covers the title,
description and dates, so editing a pin changes its signature and the next
contradiction run replaces its findings.

## 2026-09-20 - Kaiju No. 8 Season 2 (pin 2316, @AnimeDesk)

MAL 59177 -> pin 2316: aired 19 Jul - 27 Sep 2025, 11 episodes, Production I.G,
placed at the studio's Musashino HQ, AniList 78. Scrape returned `llm: "session"`
again, so the description and summary were written by hand from the cited page.

**The trailer search picked a re-uploader over the show's own channel.** The dry
run chose "KAIJU NO.8 Season 2 - Official Main Trailer | English Sub" by
**AnimeSelect**, a verified but aggregating channel, because `pickTrailer` scores
`official`(+2) + `trailer`(+1) and then subtracts `rank * 0.25` - and AnimeSelect
held the top two search results while TOHO animation's own uploads sat at ranks
3-6. The official 【Official】 titles scored the same on words and lost on rank
alone.

Fixed by hand: `--apply --skip-trailer 2316` for the ratings, then attaching
TOHO animation's main PV (`86pUz-brRJQ`, the video AniList itself lists for the
season) through `Medium#saveWithThumb`. Note `--skip-trailer` skips the whole
trailer block, **including** the AniList-listed fallback, so there is no flag
that means "use AniList's trailer, not the search's".

Worth watching whether this recurs: if an aggregator routinely outranks the
production company's channel, the fix is to score a channel named after the
work's studio or distributor above rank, not to keep skipping by hand.

### Threading: `reslotSequels` did the sequel, the side story needed a hand

Posting 2316 moved 1770 ("Final Chapter Announced", Dec 2025) onto it by itself.
But 1690 ("Narumi's Week at Work", Sep 2026) stayed a root, because **AniList
lists no prequel edge for it at all** (`63138 -> prequels []`) - the side-story
short is related to the show in its catalogue but not in the chain the threading
walks. Per the side-story ruling it was re-parented by hand onto 1770, giving one
line: 2316 -> 1770 -> 1690.

So `threads:prequels` cannot be the whole answer for side stories. It only ever
follows PREQUEL edges, and a special, short or OVA often has none.

### A 429 makes `threads:prequels` report "0 pins" with no error

Running the full 776-pin dry run and then a scoped one back to back rate-limited
AniList, and every relation lookup afterwards returned `AniList relations 429`.
`findPrequelPin` treats a failed `loadRelations` the same as "no prequel found",
so the run still prints a confident **"Would thread 0 pins"**. The up-front
prefetch throws on failure, but the per-pin walks after it do not.

**Do not trust a 0 from this script unless the run was the first AniList traffic
in a few minutes.** Wait for the limit to clear (30s polls; it took ~90s here)
and re-run before concluding nothing needs threading.

## 2026-09-20 - The same picture twice, on 292 pins

Pin 1564 (Gensou Mangekyou) carried its MyAnimeList poster twice: the page's
own `.../anime/1729/135900l.jpg` at 356x500 and, from the top-up that read the
`og:image` of the reference, `.../135900.jpg` at 225x316. Same file, two sizes,
two of the pin's three media slots - **"practically the same. need to skip
these as they don't add value"**.

Hashing every picture in the catalogue (a 64-bit difference hash off each
thumb) and pairing them up per pin put numbers on it:

| bits apart | pairs | what they are |
| --- | --- | --- |
| 0-6 | 292 | one picture: a poster at two sizes, or with a title band added |
| 7-13 | 105 | still mostly one picture (AniList's cover against MyAnimeList's poster), but two photos of one event are in range by 8 |
| 14+ | 1,040 | different pictures, with the odd same-artwork pair still hiding among them |

So **6 is the limit a rule can carry**: every pair below 7 that was looked at
was one picture. Sorting 7-13 out needs eyes, and is left to
`npm run media:dedupe -- --distance N` when someone wants to.

Three things came out of it, all in [Enrichment](enrichment.md#images-and-media):
`sameImageKey` for the URL case (a CDN's size suffix), a hash check in the
model so a create, an update or a top-up cannot store a picture the pin already
has, and `npm run media:dedupe` for the 292 that predate it.

Two things that did **not** work:

* **A finer hash.** 256 bits (16x16) does not separate the one false positive -
  the Intel Core 3 and Core 5 badges on pin 110, which differ in a single glyph
  - from true repeats: the badges sit at 8 and two sizes of one MyAnimeList
  poster reach 10. Global hashes read shape, and those two shapes are the same.
* **Judging by source.** "An AniList cover and a MyAnimeList poster are the same
  key visual" holds often enough to be tempting and fails often enough to lose
  real pictures. The hash is the honest test.

## 2026-09-20 - The info findings, and who the sweep is actually good at judging

The 236 curator-authored `info` findings (the minor ones - heights, costs, floor
counts) were worked through by six agents on the same verify-first brief as the
warnings, with one extra rule: **two sources disagreeing is not by itself a
defect in the pin.**

**52 of 189 pins changed. Roughly four findings in five did not warrant a change.**
That is the right answer, not a failure: the pin was usually already following
the stronger source, or already disclosing the disagreement in its own
`longFormSummary`. Agents reported that pattern over and over - "the pin's own
summary already said so".

**A useful observation from one batch:** in *every* pin it changed, the
`longFormSummary` was already correct and only the short `description`, the
title or the date had drifted. The bad figures look like damage at extraction
time to the summary line, not bad sourcing. The summary is the more reliable
artefact.

**What did warrant a change** was mostly a pin stating a figure no link carries:
a 283 m dredger that is 223 m, a pyramid tallest for 3,800 years that Wikipedia
says 3,700, Stonehenge's sarsens "roughly 20 miles" away against English
Heritage's 15, a limestone facade that is terracotta, a 30 m station box that is
39 m. Several were the named video-title exception - a pin's own headline figure
resting on nothing but a B1M title (Seine-Nord's EUR 7BN against the partners'
EUR 5.1bn, Allegiant Stadium's $1.8BN against a $1.97bn final accounting).

### The sweep is far more accurate on old pins than on new ones

The same findings were checked read-only against the 37 pins on the owner's own
accounts, and the split is nothing like the curator pins:

| Set | Findings that survived checking |
| --- | --- |
| Curator `warning` findings | 34 of 51 (two thirds) |
| Curator `info` findings | about 1 in 5 |
| Owner's own pins (`warning`) | **34 of 37** |

The reason is structural, not luck. The owner's pins are the oldest in the
corpus and nearly every one is dated **to the year a source predicted something
would finish**, or to an arbitrary day near the article, rather than to the event
its own title describes. That is one habit showing up thirty-odd times, so there
was little for the sources to exonerate. Newer curator pins were written against
a prompt that had already been tightened, so their findings are mostly
source-vs-source noise.

**The measurable form of that habit: 100 live pins sit on the *first* of a month
with an `estimated`, `scheduled` or `delayed` date**, where the house rule puts a
month, quarter or half-year on the period's **last** day - 41 of them on the
owner's account, 34 on @BuildDesk. `YYYY-MM-01` is not a house placeholder for
anything. Worth a sweep of its own, and a candidate for the `imprecise` lint,
which today only looks at 31 December and 1 January.

# 2026-09-20 - Google Trends, run as a discovery job for the first time

`npm run trends:discover` scored 10 of 100 terms across ten geographies as
pointing at something dated. Three of those ten turned out to be real,
unpinned, dated events; the other seven were a footballer's name, a
same-day La Liga match, a currency lookup, a minister's food poisoning, a
dance-show birthday, a tribute card at the end of a TV finale, and one term
(`asteroid`) the job itself already flagged as pin 242. **A ~3% end-to-end
yield is what the feed is worth**, and the job's job is to spend a session's
attention on those three rather than on the hundred.

### A trending term can be dateless even when it looks scheduled

`landman season 3` scores well - a named sequel with a season number - and
survives the filter, but there is no date to pin. Paramount+ renewed the show
in December 2025 and filming only starts in September 2026, so every
"release date" article is a guess at mid-to-late 2027. The lesson is that the
filter is doing its job by shortlisting it; the session's job is to check that
the thing the crowd is searching for **has a date**, not merely a future.
A "when does X come out" article is a strong signal that X has *no* date.

### Ticketmaster's artist page carries every show's start time in its markup

The per-event pages (`ticketmaster.com.au/<slug>/event/<id>`) are useless to
both `curl` and the scraper - the app's own `GET /api/scrape` came back with
nothing but `{"type": "web"}`. The **artist** page
(`/calvin-harris-tickets/artist/1149552`) is different: its raw HTML carries a
`schema.org` `Offer` per show with the event URL, the venue and the local
start time (`"Calvin Harris - Australia Tour 2027 | Thursday 18 Feb 2027,
6:00 pm | Langley Park, Perth"`). That is where a tour's clock times come
from, and the per-event URL it hands over is a valid `sourceUrl` even though
the page behind it will not open - the same rule as IMDb.

### A tour is one pin per show, not one pin per tour

Four dated pins at four venues beat one pin for the tour: each is a real
event with its own place on the map, its own on-sale URL and its own night.
The press shot can only ride on one of them, because the difference hash
([[image-dedupe]]) drops the same picture from the second pin onward - so the
other three take their venue's own Wikipedia photo, which is better for a map
anyway, plus one official video each from the artist's Vevo channel.

### A rollout schedule reads like a launch schedule

One UI 9 went in as two pins threaded newest-first: the 28 September date for
the Galaxy S25 and Z7 foldables is the head, and the confirmed 16 September
S26 rollout answers it. The two dates that came from a single regional
newsroom post (21 September global, October for the S23 FE) stayed in the
summary rather than becoming their own pins - one source's claim about one
country does not support three pins, and GSMArena and SamMobile both hedge it.

## 2026-09-20 - Every game pin was missing its video, and "gameplay" was why

Pin 1869 (Diablo IV, Season of Hell's Legacy) had three pictures and no video,
though the search for one runs on every pin with none (`topUpVideo`). Running
the search by hand showed what it had thrown away: result 0 was
**"Diablo IV | Season of Hell's Legacy | Gameplay Trailer"**, from the verified
`@Diablo` channel, with every distinctive word of the pin's title in it.

`pickProductVideo` and `pickTrailer` shared one `NOT_A_TRAILER` list, and that
list had `gameplay|game` on it. For a film or show that is right - a video with
"gameplay" in the title is not that film's trailer. For a game it rules out the
only thing the studio ever publishes: a game's own announcement is almost
always titled "Gameplay Trailer", and the press re-uploads (IGN, GameTrailers,
PlayStation, Xbox, GameStop) all copy the phrasing. Of the catalogue's 86
Gaming & Entertainment pins, **66 had no video at all**.

The list is now split: `COMMENTARY` (reaction, review, breakdown, explained,
recap, fan-made, parody, analysis, ...) rules a video out of both searches,
because it is someone talking about the work rather than the work; `A_GAME_VIDEO`
(`gameplay|game`) only applies to the screen search, where it belongs. Test in
`src/server/scrape/productVideo.test.ts`.

### The backfill: 23 of 66, and seven rounds of saying no

`npm run media:videos` (`scripts/media/productVideos.ts`, dry run by default,
`--category`, `--pin`, `--limit`, `--offset`, `--delay`) runs that same search
over pins that have none. It leaves a film, series or anime to
`npm run media:screen`, whose search matches the work's own title instead.

The first dry run over the 66 game pins offered a tutorial upload, two IGN news
clips, an "everything we know" roundup and a BlizzCon **2026** esports match on
a **2017** StarCraft Remastered pin. Each round of the dry run bought one rule,
and the rules are worth more than the backfill:

| what got in | the rule |
| --- | --- |
| IGN covering the news | the video announces itself (trailer, teaser, reveal, announce) **or** comes from the company's own channel |
| "The Final Preview", "Exclusive Hands-On Preview - IGN First" | `preview` announces a film, not a game - it is the press playing it early |
| Diablo III's trailer on a Reaper of Souls pin | title overlap 0.6, then 0.7 |
| Xbox's console trailer on a Razer accessory pin | the video must carry the pin's **leading** word, the name of the thing |
| "BlizzCon 2026 Classic Cup" on a 2017 pin | a year in the video title must be within one of the pin's; esports words out |
| "Elden Ring: **Tarnished Edition**" on the 2022 launch pin | an edition word the pin does not have is a different product |
| Diablo **III**'s trailer on the Diablo **V** pin | `distinctiveWords` dropped one-character words, so "Diablo V" was just "diablo" - numerals are kept now |

The overlap threshold only worked once the **headline's furniture was
stopworded**. Half of these pins are titled "<Game> Review - IGN", and counting
`review` and `ign` as words the video had to carry scored a real trailer at 3/5
- the same as a sibling product's. With those words out, the right trailer
scores 1.0 and 0.7 became a threshold that separates rather than one that
merely trims.

Rejecting the press previews **improved** six pins rather than emptying them:
the official trailer was further down the same results page and won once the
preview was out of the way.

**21 pins kept a video**, all official trailers or the company's own upload.
The rest got nothing, which is the right answer for a 2014 pin headlined "Xbox
One to launch in Japan" - there is no official video of a news item, and the
channels that rank for it are all commentary.

Two were taken back off on Ian's call: pin 169 had a post-launch "Challenges of
the Forbidden West" trailer and pin 181 a 2023 Xbox release-date trailer, both
on 2022 review pins. **Right game, wrong moment** - and no rule here catches
that. The year check allows a year either side, because a December trailer for
a January launch is the normal case, and a post-launch trailer names no year at
all. A later `media:videos` run can offer these two again; that is the honest
cost of a search that reads titles rather than release dates.

**The search is not deterministic.** Pin 1871's apply run took Diablo III's
trailer where the dry run minutes earlier had found the Diablo V teaser -
YouTube reorders results between requests. A dry run is a sample of what will
happen, not a promise, so the apply output is worth reading too.

### The same artwork, reframed, is not a repeat the hash can see

The same pin also carried the season's key art twice: the full 1920x1080
painting from GamesRadar, and a 2560x1440 frame from the trailer that zooms
into the middle of that same painting. They are **24 bits apart** - a
difference hash reads framing, and reframing is exactly what changed - and a
sweep of 25 crops of the wide one gets no closer than 8, which is inside the
range where two genuinely different photos of one event live (see
[the 292-pin entry](#2026-09-20---the-same-picture-twice-on-292-pins)). No
threshold catches this pair and still keeps real pictures, so the repeat came
off by hand. A frame lifted from the trailer beside the art the trailer is made
of is worth a look on any pin that gets both.

## 2026-09-20 - An IMDb news link for DanMachi season 6 (pin 1727, @AnimeDesk)

* **Learned**: `https://www.imdb.com/news/ni65700881/` was handed over to be
  pinned. The news path is behind the same AWS WAF as the rest of imdb.com
  (HTTP 202, empty body, to curl with a browser UA), but an IMDb news item is
  only a **syndicated copy** of another outlet's story, so it does not have to
  be read: `WebSearch` on the bare URL returned its title ("DanMachi:
  Crunchyroll's Hit Action Fantasy Anime Officially Confirms Season 6"), and
  searching that title found the publisher's own copy on CBR, which `curl`
  serves in full with `article:published_time`. Cite the publisher's URL, not
  the IMDb one - a blocked link can only ever hold a dead wiki - and say in the
  reference's reasoning where the syndication was seen.
* **Learned**: the story's subject already had a pin (1727, the 7 February 2026
  "Aedes Vesta" announcement), so this went in as a **fourth reference** rather
  than a second pin, per the standing rule.
* **Learned**: `PUT /api/pins/:id` re-saves references wholesale, so adding one
  by hand means sending the pin's whole body. Running the stored pin through
  `pinToForm` -> edit -> `formToPin` (the edit modal's own round-trip) is the
  safe way: the dry run showed the day key, the thread parent, the media and
  the tags all coming back unchanged, where a hand-built body drops whatever it
  forgets.
* **Learned**: with no credit on the app key, the new link's wiki failed on
  save (`credit balance is too low`) and the pin's summary went stale. The
  no-credit route needs **two** `wiki:export` rounds: the first offers only the
  wiki job, and the summary and contradiction jobs appear only on a second
  export, after `wiki:apply` has stored that wiki.
* **Learned**: the rebuilt summary turned up a false contradiction worth
  recording as such - ANN's "October 4, 2024 at 24:30" and Wikipedia's and
  CBR's "October 5, 2024" are one late-night broadcast, not two dates. Filed
  `minor` with a note saying so, which is what the check is for.
* **Feedback**: none; this was the standing scrape-without-sign-off rule.
* **Changed**: [Sources](sources.md) - the IMDb row now covers `/news/ni.../`
  items and the syndication workaround.
