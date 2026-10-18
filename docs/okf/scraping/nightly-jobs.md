---
type: Reference
title: Nightly scrape jobs
description: The standing roster of scrape jobs that top the timeline up on a schedule - the vertical each one covers, its keyless source, its curator, its cadence, and the rule that stops it making a pin twice.
resource: verticals.md
tags: [scraping, scheduling, verticals, backlog, coverage]
generated: { by: claude-code/claude-opus-5, at: 2026-09-20T19:00:00Z }
---

A one-off scrape fills a hole once. These jobs keep it filled, because every one of
them reads a calendar that the world keeps updating: a fixture list, a release
schedule, a regulator's docket. Each entry says what to read, who posts it, how often
it is worth re-reading, and how the job knows a thing is already pinned.

# Why these verticals

Three numbers decide what a job is worth: how thin its category is, whether it lands
pins in the empty part of the calendar, and - the one that is easiest to miss -
whether its category has any *future* at all.

**Category weight.** Measured 2026-09-20 over 1,963 live pins. `Anime` 657 and
`Anime` and `Movie` 117 are 39% of the corpus, then `Transport` 205,
`Architecture` 183, `Movie` 94, `Gaming` 86.

**Past against future.** A category can look healthy and be finished. Counting the
two separately found `AI` at 45 pins with 2 ahead of today, `Automotive` 39
and 2, `Semiconductors` 29 and 2, `Electronics` 69 and 7, and
`Food`, `Robotics` and `Climate` with a past and no future
whatsoever. This pair, not the total, is what says a vertical needs a job.

**Calendar holes.** 424 of 1,963 pins were in the future, and they bunch: October
2026 had 89 and January 2027 35, but 2027-05 had 2, 2027-07 had 3 and most of 2028
ran at one or two a month. A job that can place pins in mid-2027 and beyond is worth
more than one that adds another October pin, so prefer a source with a long forward
horizon: a fixture list years out beats a news feed about next week, and an
ephemeris beats both.

# The roster

| Job | Vertical | Curator | Source (all keyless) | Cadence | Already-pinned test |
| --- | --- | --- | --- | --- | --- |
| Prize announcements | `Science`, `Art` | @ScienceDesk (304) | nobelprize.org announcement dates, then the API once laureates are named | Weekly Sep-Oct, else yearly | By hand; each prize's announcement live stream is its `sourceUrl` |
| `tv:premieres` | `TV` | @FilmDesk (51) | TVmaze `/schedule/full` | Nightly | The premiere episode's TVmaze URL |
| `launches:upcoming` | `Space` | @BuildDesk (76) | Launch Library 2 `/launches/upcoming/` | Nightly | The launch's own page, else its LL2 record |
| `health:trials` | `Health` | @HealthDesk (305) | ClinicalTrials.gov API v2 | Weekly | `clinicaltrials.gov/study/<NCT id>` |
| Trade shows | `Electronics` | @TechDesk (276) | The show's own site | Quarterly, by hand | The show's site |
| `astronomy:eclipses` | `Space` | @ScienceDesk (304) | NASA eclipse catalogue (`eclipse.gsfc.nasa.gov`) | Yearly | The eclipse's own NASA path page, else any eclipse pin that day |
| `sports:tournaments` | `Sports` | @SportDesk (306) | Wikipedia articles for a curated tournament list | Monthly | The tournament's Wikipedia article, else its name **in its own year** |
| `ai:retirements` | `AI` | @TechDesk (276) | Vendor deprecation pages (OpenAI `platform.openai.com/docs/deprecations`) | Weekly | The announcement's own anchor on the page |
| `trends:discover` | none - it posts nothing | none | Google Trends daily RSS | Daily, read by a session and by the midnight [daily job](daily-jobs.md#trends) | n/a; it reports what is already pinned |

Nightly is for a source whose rows change daily (a launch NET slips, an episode is
scheduled). Weekly is for a calendar that is published once and then only corrected.
Nothing here needs a nightly re-read of a fixture list published two years out.

Six of the eight are scripts and can be scheduled as they are. Two are done by
hand because their sources are pages rather than feeds: the Nobel schedule is
one page a year and a trade show announces next year's dates on its own front
page. `trends:discover` is a script but is not a posting job - it prints a
shortlist a session reads. Each recipe is in [Vertical recipes](verticals.md).

A one-off fixture scrape by hand used to sit in this table; `sports:tournaments`
replaces it, and the tournaments already pinned that way are recognised by name
and year rather than duplicated.

**Why nightly pays even for a far-off calendar.** Only 10 of the world's next
60 launches are dated to the day, and TVmaze has about seven season premieres
in all of 2027 against 202 in October 2026 alone. Both sources fill in
continuously, so a job that runs once captures a fraction of what it will
eventually see.

# The rules every job shares

* **Post through the real API.** `POST /api/pins` against the running app as the
  vertical's curator, never a direct insert, or the pin misses the live feed, the
  search index and the duplicate check ([Strategy](strategy.md)).
* **Identity lives in the `sourceUrl`.** The route already rejects a duplicate
  `sourceUrl`, so a job whose source gives each item a stable URL gets its
  already-pinned test for free. A job whose source does not (a schedule page listing
  six prizes) has to find a per-item deep link before it can run twice - for the
  Nobel prizes that is each prize's own announcement live stream.
* **A slipped date is an update, not a new pin.** Re-reading the source finds rows
  already pinned; the job refreshes what it owns and leaves the rest. `spacex:launches`
  currently refreshes only the flight path and does not follow a NET slip, which is
  the known gap to close first.
* **A second source for a pinned subject becomes a reference**, per the owner's
  standing feedback, never a second pin.
* **Dry run first.** Every job takes `--dry-run` and the run is read before it is
  applied; the anime and screen-media jobs both taught this.
* **Persist.** `npm run backup:data` after a run that wrote pins.
* **Refresh the market figures too.** Pins citing a prediction market carry what it
  has traded (`Pin.marketVolume`), and a market keeps trading whether or not anyone
  is looking at its pin: `npm run markets:volume -- --stale 1d --apply` is a nightly
  read of the exchanges for the stale ones. It writes nothing else, and a seed
  restore leaves the figure empty until it runs.
* **Write down what it taught.** [Learnings](learnings.md), then fold it into the page
  it belongs to ([living docs](learnings.md#how-to-keep-this-current)).

# What the first run cost

Run on 2026-09-20: 112 pins (1994-2110). `TV` went from 2 to 69,
`Health` from 6 to 30, `Sports` from 28 to 38, `Science`
from 5 to 9, and six of the nine sport pins landed between April and November
2027, the emptiest stretch of the timeline. The launch job picked up five
non-SpaceX launches that a SpaceX-only filter had been hiding.

# Model retirements

`npm run ai:retirements`. Nobody announces a model launch in advance, but every
vendor announces a model's *death* in advance, because developers have to
migrate. A shutdown date is a real dated event with consequences, published
months ahead.

* **One pin per announcement, not per model.** Seventeen snapshots switched off
  on one morning is one event; the models are its content. That also settles
  the source URL, because each announcement has its own anchor.
* **Only vendors whose page anchors each announcement can be pinned.** OpenAI
  does. Anthropic and Azure put their future retirements in one status table,
  so they are out until a per-item link exists.
* **A row's model cell carries its aliases too** ("gpt-4-turbo |
  gpt-4-turbo-2024-04-09, gpt-4-turbo-completions"), so the item is the first
  identifier in it. Counting the whole cell turned one retirement into three.
* **A staged platform shutdown puts prose in that column**, not a model id -
  "The Evals dashboard and API are scheduled to shut down." Counting those made
  a three-milestone rollout read as "3 Evals Platform". An identifier has no
  trailing full stop and at most three words.
* **Pin the last date in the section**, because a staged shutdown ends on its
  final date.
* **Place it by hand.** The automatic headquarters placement only runs for
  film, TV, anime and games, so the job calls `lookupStudioLocation` on the
  vendor's Wikipedia article itself; without that the pins had no place at all
  and never appeared on the map.
* **No media.** A documentation page has no pictures, and the same company logo
  on eleven pins is the padding the quality bar forbids.

# Google Trends

`npm run trends:discover` reads Google Trends' daily RSS
(`trends.google.com/trending/rss?geo=<CC>`, free, no key) across ten
geographies. **It posts nothing**, and that is the point of it.

Every other job here reads a calendar, and a calendar row already is a dated
event. A trending search term is not an event: it is a crowd looking at
something. Measured across ten geographies on 2026-09-20, 87 of 100 terms were
that afternoon's sport, a lottery draw, a weather lookup or a name with no
dated event behind it at all - on a Sunday in the NFL season, nine of the ten
US terms were that day's games.

What it is good for is the subject nobody thought to schedule: a car unveiled
this morning, a policy that takes effect next year, a sequel that just got a
date. So the job shortlists and a session decides - since 2026-09-22 usually the
midnight [daily job](daily-jobs.md#trends), which reads the same shortlist
through its `google_trends` tool.

* **It scores rather than blocklists.** A term earns its place by pointing at
  something dated - release, opening, ruling, launch, a month name, a year -
  and loses it for the language of live coverage - scores, "how to watch",
  previews, odds. An earlier version blocklisted sport and kept 61 of 100,
  nearly all of it still football; scoring keeps about 13.
* **The already-pinned test needs loose punctuation.** A search term is typed
  without it ("spider man brand new day") and a title is full of it
  ("Spider-Man: Brand New Day"), so the words are matched with anything
  between them. Matching the term as written reported an unpinned film that
  was already pin 392.
* **Word boundaries matter too.** A plain `ILIKE '%epic%'` claimed the Saudi
  pipemaker EPIC was already pinned, on the strength of some other pin's title
  containing the word "epic".
* It is a daily read because the feed is daily and keeps nothing: what is not
  looked at today is gone tomorrow.
* **Its real yield is about 3%.** Run end to end on 2026-09-20, the ten
  survivors held three unpinned dated events - a first Australian headline
  tour, a Samsung OS rollout and one already-flagged repeat - and seven that
  were not events at all. That is the job working, not failing.
* **A shortlisted term can still have no date.** `landman season 3` scores
  well and is worth the look, but the show has no announced premiere; a page
  headlined "when does X come out" is a strong sign that X has no date yet.
  Check for a date before scraping, not after.

# Not yet scheduled

Worth a job once the six above are steady, in rough order of what they would fix:

* **Drug approval decisions (PDUFA)** - the highest-value health job and the one
  that does not work keylessly: the FDA's advisory committee calendar renders
  client-side and serves no rows to `curl`, and action dates live in company
  press releases. It needs a search-driven job, not a feed reader.

* **Policy and legal** - Supreme Court decision days, EU AI Act phase-in dates.
  `Policy` is 12 pins and both calendars are published years ahead.
* **Climate** - COP sessions, IPCC report windows, statutory emissions and
  combustion-engine deadlines. `Climate` is 5 and none ahead.
* **Vendor roadmaps** - `AI` was 45 pins with 2 in the future, the
  worst ratio on the board; `ai:retirements` took it to 13 ahead of today by
  pinning the one thing vendors *do* announce in advance (see below).
  Launches remain unpinnable until someone dates them. `Automotive` and
  `Semiconductors` are the same shape and their makers date model
  years and process nodes years ahead.
* **The other vendors' retirements.** Anthropic and Azure publish future
  retirement dates in a single status table with one anchor for the lot, so
  no announcement can have its own `sourceUrl` - the Nobel schedule page
  problem, still unsolved for them. Anthropic alone would add about ten pins
  between November 2026 and September 2027 if a per-item link is found.
* **The rest of the sky** - the eclipse job covers central solar eclipses
  only. Lunar eclipses, the 2032 and 2039 Mercury transits and the great
  oppositions are the same kind of source: keyless, exact, and dated centuries
  out.
* **Music** - album release dates and stadium tours. A tour is genuinely map-shaped:
  one pin per venue per night, which no other vertical gives.
* **Demographics and futurism** - census dates and UN population milestones, 1 pin each.
