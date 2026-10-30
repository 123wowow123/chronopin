---
type: Strategy
title: Daily pin jobs
description: The scheduled LLM runs that grow and maintain the pins - the midnight maintenance-and-growth job, the 6am/6pm news check and the monthly low-confidence re-check - what each task reads and does, the tools and drivers behind them, and how a run's learnings feed the next.
resource: ../../../src/server/jobs/index.ts
tags: [scraping, scheduling, maintenance, llm, orchestration, learnings]
generated: { by: claude-code/claude-opus-5-5, at: 2026-09-22T18:00:00Z }
---

The [nightly scrape jobs](nightly-jobs.md) each read one calendar with a script.
These jobs are different: each is one Claude run that reads the app's own
signals (what is thin, what readers open, what they comment on, what is
broken, what someone marked), researches on the web, and then adds pins and
fixes existing ones through the real API. The owner asked for them on
2026-09-22; this page is their standing guidance, and every run reads it
into its instructions, so changing this page changes the next run.

# The jobs

| Job | Default time | Tasks | New pins / updates per run |
| --- | --- | --- | --- |
| `midnight` - maintenance and new pins | 00:00 America/Los_Angeles | Keep pins right: [revisits](#revisits), [pinHealth](#pinhealth), [thinPins](#thinpins), [personCampaigns](#personcampaigns), [restaurantRegions](#restaurantregions). Find new events: [trends](#trends), [thinCategories](#thincategories), [trendingCategories](#trendingcategories), [commentTopics](#commenttopics), [localEvents](#localevents). Beats: [fortune100](#fortune100), [layoffs](#layoffs) | 100 / 250 |
| `news` - morning and evening check | 06:00 and 18:00 America/Los_Angeles | Keep pins right: [revisits](#revisits), [weekReview](#weekreview), [freshSources](#freshsources), [eventInfo](#eventinfo), [pinAds](#pinads), [holidayAds](#holidayads), [personTrades](#persontrades), [threadPredicted](#threadpredicted), [productLifecycle](#productlifecycle), [productCompetitors](#productcompetitors), [factoryProfiles](#factoryprofiles). Find new events: [breakingNews](#breakingnews), [predictionMarkets](#predictionmarkets), [earthquakes](#earthquakes), [stormTracks](#stormtracks). Beats: [layoffs](#layoffs), [hiringJobCreation](#hiringjobcreation). Scores: [modelScores](#modelscores), [modelRubrics](#modelrubrics), [horoscopes](#horoscopes), [industryForecasts](#industryforecasts), [sentiment](#sentiment) | 100 / 250 |
| `monthly` - low-confidence re-check | 03:00 America/Los_Angeles on the 1st of each month | Keep pins right: [lowConfidence](#lowconfidence) | 0 / 250 |
| `weekly` - products page refresh | 04:00 America/Los_Angeles every Monday | Keep pins right: [products](#products) | 0 / 100 |

All are set on **/admin/jobs**: on or off, every day, once a week (on a
weekday) or once a month (on a day from 1 to 28, so every month has it), the times (up to six a day) and
their time zone, which tasks, which driver, and the two limits. A job added
to the defaults after the setting was first saved is added to it, off. They ship
**off** (owner, 2026-09-23: "turn off nightly jobs by default"); turn a job on
there to start it. There is no dry run - every run posts and edits for real
(owner, 2026-09-22: "no dry run needed", "remove dry run option").

**How the clock works.** Every server checks once a minute
([dailyJobSchedule.ts](../../../src/server/services/dailyJobSchedule.ts)); a
job whose local time has just passed is claimed in `JobRun` by its slot key
(`news@2026-09-22T06:00 America/Los_Angeles`), so it runs once however many
servers there are. A slot missed while the servers were down still runs if
they are back within two hours; after that it is let go rather than run late
into the next one. A monthly slot waits a whole day instead, since letting it
go skips a month and it may sit behind a long midnight run. One run at a time, and a run that has not finished after
three hours is closed as failed. "Run now" on the admin page, or `npm run
jobs:run -- --job <id>`, starts one by hand.

# Drivers

Who does the reasoning. Everything else - the tools, the limits, what is
recorded - is the same for both.

* **`api`: the app's Anthropic key** ("Claude credits"). Claude Opus 5 through
  the Messages API with adaptive thinking, its own `web_search` and
  `web_fetch` server tools, and the tools below
  ([drivers/api.ts](../../../src/server/jobs/drivers/api.ts)). Old tool
  results are cleared as the context grows. A run stops at 150 turns or an
  estimated $20 (`JOBS_MAX_USD`). Runs anywhere the app runs.
* **`session`: a headless Claude Code on its own login** ("VS Code session
  credit"). The server starts `claude -p` - the CLI on the `PATH`, else the
  copy the VS Code extension ships, else `CLAUDE_CODE_BIN` - with the app's
  API key removed from its environment, so it runs on whatever account
  Claude Code is logged in with. It uses its own WebSearch and WebFetch, and
  reaches the app's tools through an MCP server it starts
  ([scripts/jobs/mcp.ts](../../../scripts/jobs/mcp.ts)); shell and file edits
  are refused ([drivers/session.ts](../../../src/server/jobs/drivers/session.ts)).
  It needs the binary and the repo, so it is for the machine the code is
  checked out on, not the production image.
* **`auto`** (the default) tries the key first and falls back to a session
  when the key is missing, rejected or out of credit. A run with neither is
  recorded as `skipped` with the reason.
* **By hand in the active LLM session.** Owner, 2026-10-06: run requested
  jobs with whichever LLM is active in the current session, not necessarily
  Claude Code, and do not ask again for permission to run them. The prepared
  prompt and MCP tools are model-independent. `npm run jobs:run -- --job midnight
  --prepare` opens a run and writes its prompt and MCP config; add the server
  it prints (`claude mcp add chronopin -- ... --run <id>`), work the prompt,
  and close it with `--finish <id> --report <file>`. The writes count against
  the same run and show on the admin page.

* **A full run: every job in one go.** `npm run jobs:run -- --all --prepare`
  writes one prompt for all the jobs (the shared instructions once, then each
  job's, in saved order: midnight, news, monthly) and one MCP config; add the
  server it prints and work the prompt in a VS Code session. The server has two
  extra tools: `begin_job` opens that job's run (only then, so a long session
  has no run sitting open past the 3-hour abandoned-run cut-off) and refuses
  while another job or run is open, and `finish_job` closes it with the job's
  report and does what a finished run does (learnings to the OKF log, the seed
  backup after pin writes). Every other tool refuses between jobs. Each job
  keeps its own limits, actions and report on the admin page; schedule and
  enabled flags are ignored, as for "Run now". `--jobs midnight,news` picks
  some. Without `--prepare`, `--all` runs the jobs back to back on their
  drivers (`--driver session` for Claude Code's login), and the admin page's
  "Run all jobs now" does the same inside the server; a job that fails is
  recorded and the rest still run, and the schedule waits until the chain ends.

# Tools

Only what Claude cannot do natively is a tool
([tools.ts](../../../src/server/jobs/tools.ts)). Searching the web, reading a
page or a PDF, and looking at a picture are the model's own. The rest:

| Tool | What it gives | Why it is a tool |
| --- | --- | --- |
| `category_coverage`, `trending_categories`, `most_viewed_pins`, `recent_comments`, `active_user_places`, `traffic_places`, `pins_this_week`, `pins_changed_since_last_run`, `soft_dated_soon`, `low_confidence_pins`, `thin_pins`, `revisit_queue` | The signals each task starts from ([signals.ts](../../../src/server/jobs/signals.ts)) | The app's own data |
| `google_trends` | Trending searches in ten markets, scored for dated events, with `coveredByPin` ([trends.ts](../../../src/server/jobs/trends.ts)) | Same reader as `trends:discover` |
| `prediction_markets` | Kalshi and Polymarket events resolving in the next week and those newly listed since the last run, biggest book first, with odds, dollars traded and `coveredByPin` ([markets.ts](../../../src/server/jobs/markets.ts)) | About 45 pages of exchange listings filtered down to a page: per-game and recurring markets out, an election's props folded together |
| `predicted_pins` | Predicted pins (market-predicted events, `Predicted` tag) with candidate parent threads to join ([threadPredicted.ts](../../../src/server/jobs/threadPredicted.ts)) | The app's own data and thread matching |
| `model_scores` | AI model pins whose model OpenRouter prices but LMArena has not scored (`awaiting`), and scored frontier pins missing the Frontier Model tag (`needsFrontierTag`) ([modelScores.ts](../../../src/server/jobs/modelScores.ts)) | The arena's overall leaderboard, a few pages, plus one pin query |
| `company_coverage`, `tagged_pins` | Where a beat left off: each company's pins and when one was last posted, stalest first; what a tag (`Layoffs`) already holds ([signals.ts](../../../src/server/jobs/signals.ts)) | The app's own data |
| `find_pins`, `get_pin` | The already-pinned test; a pin's full JSON | The app's own data |
| `pin_ads_check`, `pin_ads`, `add_pin_ad`, `remove_pin_ad` | The Amazon ads chosen for pins (`PinAd`, [pinAd.ts](../../../src/server/model/pinAd.ts)): each listing re-read for stock, price, stars and reviews, and a listing's quality gate on every add | A plain fetch of the amazon.com product page (not blocked; a robot check leaves an ad as it was) |
| `pin_health_scan`, `check_pin_health` | Broken pictures, removed or unembeddable videos, deleted posts, dead sources ([health.ts](../../../src/server/jobs/health.ts)) | Dozens of link checks in one call; oEmbed status codes |
| `read_page` | A page as a browser renders it, a YouTube or podcast transcript, a scanned PDF's OCR | **Headless Chrome** and transcript fetchers from the scrape pipeline; web fetch cannot run a page's JavaScript or get past most bot walls |
| `scrape_url` | The app's whole scrape into a draft pin (with `llmTasks` when the app's key has no credit) | Media top-up, screen extras, studio HQ and page metadata are the pipeline's, not the model's |
| `pending_event_info`, `record_event_info` | Upcoming event pins' pages read for performers and tickets, and the readings saved ([eventInfo.ts](../../../src/server/eventInfo.ts)) | **Headless Chrome** plus the page's own Event markup matched to the pin's date; the save holds a ticket link to the links the pages carry |
| `check_image` | A picture's size, type, fingerprint, and whether it repeats one the pin has | The **image processor** (Jimp decode, difference hash at distance 6) |
| `read_okf` | Any page here, or the sections of one that mention a word | The docs are on the server, not the web |
| `create_pin`, `update_pin`, `mark_revisit`, `resolve_revisit` | The writes, through the real API as a curator | See below |
| `record_learning` | Writes down what the run taught | See [Learning](#learning) |

# Writing to production

The owner wants a run's pins and edits on prod (2026-09-29: "this should
always be done on prod"). Set two variables in `.env.local` and a run posts
there itself ([pinApi.ts](../../../src/server/jobs/pinApi.ts)):

* `JOBS_PROD_BASE` - production's address, `https://www.chronopin.com`.
* `JOBS_PROD_SESSION_SECRET` - production's `SESSION_SECRET`, so the run signs
  a curator token for prod exactly as it does locally and handles no password.
  Never commit it.

What goes where. **Reads, scrapes and every signal stay on this machine**
(headless Chrome and the pipeline never run on the small VM). `create_pin`,
`update_pin` and `get_pin` go to prod. Event-info readings and sentiment
scores are saved locally and then replayed on prod as the pin's author
(`PUT /api/pins/:id/event-info`; `PUT /api/pins/sentiments`, skipped
when prod's text is not what was scored). A push that fails is logged and
the local copy stays. Prod-only writes leave the local database as it was, so
the run does not seed from it.

**Keep posting light on production.** Owner, 2026-10-06: post without slowing
prod so much. Never replay a score as a full pin `PUT`: that starts search,
duplicate, media and source-wiki work for a change that needs only a score
row. Use `PUT /api/pins/sentiments`; it checks ownership and the text hash
again on the server. Event readings use their own endpoint too. Do all
research, scraping and product checks locally. The job's production writes
share one queue per process, with a two-second gap after each request and
a 30-second pause after failures. The local-run replay script also paces its
writes and sends scores in batches of at most ten. In a manual session,
publish ads and translations sequentially in small batches with the same
gap; do not launch several publishers together. If page latency rises or a
request times out, pause posting and reread saved rows before retrying.
The source-wiki step also reads nothing while the API has no key or turned
a call away for credit, rate limit or outage (10 minutes,
[wiki.ts](../../../src/server/extract/wiki.ts)).

**Estimated map locations.** A mapped pin whose coordinates are only a city,
neighbourhood, intersection or existing-campus anchor must say so. Prefix
its address with `Estimated: ` and explain what the marker represents in
`longFormSummary`; never call it the verified new building or entrance.
The prefix renders as a searchable Estimated pill (`place:Estimated`).
Migration 0230 also adds this prefix automatically on insert and on address,
summary or coordinate edits when the address explicitly says approximate or
estimated, or the details explicitly describe an approximate map position.
It covers normal pin saves, admin table APIs and imports, preserves the
address/explanation, and does not label pins without map coordinates.
An estimated date, price or job count alone is not location evidence.

**Pull before a run; skip the post-run sync.** Local ids match prod's only
after `npm run db:pull-prod`; pull before a run so ids and the already-pinned
tests agree. Owner, 2026-10-06: do not sync the production database back to
local after a job. Finish by verifying the production writes and saving the
report and learnings. Do not run a database pull, local search rebuild,
thumbnail sync or production seed refresh just to close a production job.
A pin created on prod may remain absent locally until the next needed pull;
production remains the source of truth. Routine pin maintenance, including
pins outside the curator allowlist, has the owner's standing authorization
below; use admin APIs and preserve authorship.

**A run that stayed local** (neither variable set) is replayed afterwards
with `scripts/jobs/post-run-to-prod.sh <run id> [--dry]`, on the admin login
alone: new pins, edits, event info and sentiment scores, each only where
prod's pin is the one the run worked on ([admin table API](../api/admin-db.md#job-results-on-prod)).

# Rules every run follows

* **Write through the real API.** New pins use a curator; maintenance may use
  authenticated admin fallback while preserving the original author. The server signs a token for
  the curator desk (never a password, never a person's account), and the save
  goes through `POST`/`PUT /api/pins`, so the live feed, search, duplicate
  checks, threading and tags all follow ([pinApi.ts](../../../src/server/jobs/pinApi.ts)).
  Pick the desk whose vertical fits (the list is in `create_pin`'s own
  description and [curators.ts](../../../src/server/jobs/curators.ts)).
* **Apply routine updates without asking again.** Owner, 2026-10-13, after
  applying the 83 held news-job reviews: "don't ask this next time, add that
  to notes". Routine researched sentiment scores, event/ticket readings and
  verified factual or date corrections are authorized, including pins whose
  authors are outside the hardcoded curator allowlist. When a curator helper
  refuses, use the authenticated admin APIs: `/api/pins/sentiments`,
  `/api/pins/:id/event-info`, `/api/pins/:id` and `/api/admin/db` as appropriate.
  Keep the original author; do not impersonate a person's account. Check
  current text hashes before scoring, preserve existing event details when
  the fresh reading supplies none, and verify production saves before
  resolving associated review marks. An allowlist mismatch alone is not a
  reason to leave proposals pending or request another confirmation. Queue
  genuine research gaps or conflicting evidence with a specific reason.
  Production deployment still requires a separate explicit user request.
* **New pins are search-ready (owner, 2026-10-26).** Structured data is
  written at render time for every pin ([seo.ts](../../../src/lib/seo.ts):
  Article and Event, plus Product, Restaurant, Hotel or SoftwareApplication
  with a `Review` per stored review), so a new pin gets it with no step of
  its own, provided the data it reads exists. So every `create_pin` must:
  clear the thin floor at creation (900 characters of text, 3 sources, so it
  is indexed and not hidden); put the words people search for in the title
  and the first sentence (the episode, nominee, product or CVE name, the
  year); and, for a product, drink, snack, car, aircraft, AI model, hotel or
  restaurant, save its rubric with the verified independent reviews through
  the rubric endpoints, since the review markup is built from them. Never
  add a rating the sources do not give: no aggregate rating is marked up.
  `create_pin` posts the pin regardless, then returns `needs` ([newPinFlags.ts](../../../src/lib/newPinFlags.ts)) when it is thin or may need a rubric: act on every item before the run ends, or list it in the closing report.
* **Already pinned is checked first.** `find_pins` on the subject's words and
  its source URL before every `create_pin`; the route rejects a repeated
  source URL anyway. A second source for a pinned subject is a reference on
  that pin.
* **The limits are ceilings, not targets.** A run that finds nothing worth a
  pin says so and posts nothing. Quality bar as in the [strategy](strategy.md#quality-bar).
* **Say what was left.** The closing report lists, per task, what was checked,
  changed (pin ids), left and why, and what needs the owner.
* **Persist.** On a development machine a run that wrote pins runs `npm run
  backup:data` itself afterwards, since the seeds are what production is
  rebuilt from.
* **Ad titles are translated on prod.** The `pinAds` and `holidayAds` tasks
  add listings whose titles are English; the API's own translation needs
  credit. After a run from a Claude session, compare prod's working
  `PinAd`/`HolidayAd` rows with `PinAdTranslation`/`HolidayAdTranslation`
  (0115, 0129; a row counts only while its `sourceHash` is the sha1 of the
  current title) and translate what is missing into all 15 languages by hand,
  then upsert through `/api/admin/db/<Table>?upsert=1` in chunks of 150 rows
  or fewer. Locally: `npm run ads:pin|ads:holiday -- titles --export|--apply`.

# Tasks

A job works its tasks group by group, in the order below - the same groups
and order the admin page shows and a run's instructions list.

## Keep pins right

Re-check the pins that exist before adding to them.


**Repair discovered issues in the 6am/6pm run (owner, 2026-10-28).** Both
news runs begin with `revisit_queue` as well as their normal weekly/fresh-source
checks. Work repairable marks, including ones found by a previous news run,
instead of repeatedly describing them as pending. This rule overrides older
curator-only deferral wording below. `update_pin` uses authenticated admin
fallback for authors outside the curator allowlist and preserves the author.

Before sentiment scoring, check that a pin's company, title, description,
source, references, date and tags describe the same entity and event. A resort
linked to a data-center company is a content collision to repair, not neutral
company news to score. Open `get_pin`, research the actual source and search
for existing canonical pins for both subjects. Preserve both real subjects;
never blindly restore an old ID over an unrelated current pin, duplicate an
already recovered project, or clear a company association on title alone.

When supported by the evidence, fix the wrong company link and all inherited
fields (dates/reasoning, references, categories/tags, product classification,
media and subject-specific profiles). Remove invalid old sentiment data and
stale translations; replace unsupported prices/review claims only with verified
evidence. Match production records by unique source URL, not assumed equal
IDs. Save through authenticated management/native APIs in both environments,
preserve authors and unrelated content, and synchronize affected replay
catalogs. A resolved company mismatch may make a hotel ineligible for company
sentiment; do not invent a replacement score merely to empty the queue.

Read back the saved pin and relationships, verify its native detail page and
that the relevant pending queue is clear, and only then resolve its revisit
mark. If a source or API fails, try an appropriate fallback and record the
specific remaining blocker. Queue only genuinely missing/conflicting evidence,
an actual failed save, or work beyond the run limit; an allowlist mismatch or
an existing mark is not a reason to defer an otherwise supported repair. Report
partial environment saves explicitly. See the [resort collision repair](resort-collision-repair-2026-10-28.md)
for an example and the retired fixed-ID seed that caused it.

### revisits

**Reads** `revisit_queue` and `soft_dated_soon`.
**Does** each marked pin in turn: read the reason, re-research the pin
(its source, then fresh coverage), update what the evidence supports, and
`resolve_revisit` with what was done. A soft date (`estimated`, `unknown`,
`delayed`) in the next month is worth checking even unmarked: a firm date
now published moves the pin and its confidence to `scheduled` or
`confirmed`, quoting the wording. A slip is an update with
`originalStartDate` and `delayReasoning`, not a new pin.
**Traps.** Leave a mark open, with a note added, when the answer is not out
yet (a date "to be announced"); resolving it with nothing done hides it.

### weekReview

**Reads** `pins_this_week` (least vetted first).
**Does** make sure every pin happening in the next seven days is right today:
the date and time still hold (events slip in their last week), the place is
the venue, the date confidence reflects the latest word, there are
references beyond the source, and the summary is current. Apply supported
repairs for every author; use admin fallback when needed.
**Traps.** A pin with no reference and `unknown` confidence a few days out
is the most urgent - it will be on everyone's timeline soonest.

### freshSources

**Reads** `pins_changed_since_last_run`, `pins_this_week`, and
`pin_health_scan` for media.
**Does** add the sources published since each pin was last updated (the
official announcement, the filing, the trade press), fix broken media, and
add newer media now available: the official trailer, the livestream page,
the launch photo.
**Traps.** A source dated before the pin's last update was already
considered; do not add it again as "new".

### pinHealth

**Reads** `pin_health_scan`, then `check_pin_health` with references for the
worst.
**Does** fix what is broken on curators' pins: replace a dead picture or
video with a working one from the event's own sources (`check_image` first -
no repeats, nothing tiny), move a dead source to its archived copy or the
publisher's new URL, drop a dead reference or replace it. Then, for the
same pins, look for what is missing: the references published since, a
thread the pin should join (`find_pins` for the previous or next event in
its story, then `parentId`), media up to three. Mark others' pins for
revisiting with the exact fix.
**Traps.** `blocked` (403, 429) is not broken - the site refuses servers,
not readers. A YouTube 401 means embedding was turned off, which does break
the pin. Never replace a picture with one that has not been viewed.

### lowConfidence

The monthly job's task (owner, 2026-09-24: "monthly jobs to rescrape low
confidence pins and update"). A pin scored below the timeline's confidence
bar is hidden from the home page, so firming one up puts it back in front of
readers.
**Reads** `low_confidence_pins`: the pins below the bar, curators' pins
first, then lowest score, then longest unchanged. Pins changed in the last 25
days (last month's run included) or already marked for revisiting are not
listed. Ask again after each batch, passing the ids you looked at and left
alone as `exclude`.
**Does** re-scrape each pin: `scrape_url` on its `sourceUrl` (or
`read_page` when the source is blocked), then search for what has been
published since - the official announcement, the filing, the organiser's
page, the trade press. Update what the evidence supports through
`update_pin`: `addReferences` with each new source's confidence, published
date, start/end dates and reasoning; a firmer `dateConfidence` with its
reasoning quoting the wording; a moved date (a slip is `originalStartDate` +
`delayReasoning`); a dead source moved to its live or archived copy. A
reference's dates do not move the pin through the API (only the edit form
re-picks them), so a firmer date goes in the patch as `utcStartDateTime` /
`utcEndDateTime` too. The
score is recomputed from the references, so independent, dated, confident
references are what lift it - rewording the summary does not. Mark people's
pins for revisiting with the exact fix and its sources.
**Traps.** Do not inflate a confidence to get a pin over the bar: a pin that
is genuinely uncertain (a rumour, a "by 2030" plan) stays low, and the run
leaves it alone and says so in the report. A reference that only repeats the
source (the same wire story on another site) is not independent. A pin whose
event turned out not to happen is marked for revisiting, not deleted.

### restaurantRegions

The midnight job's task (owner, 2026-10-06: "if a new restaurant pin is
created then mark nightly job to include refreshing of the restaurant landing
page for that region"). The page itself lists live pins, so the new pin shows
up on its own; the refresh maintains the database-backed menus, details, tiles
and offers ([restaurant-content API](../api/restaurant-content.md)).
**Reads** `restaurant_regions`: each region with a new restaurant-opening pin
or a shortage in Coming soon, Just opened, Top restaurants or Specials.
China city guides aim for **at least 35 distinct restaurants in each tab**
(owner, 2026-10-11); other guides retain the 12-restaurant target.
The signal includes `targetPerTab`, `counts`, and `needed` for `upcoming`, `new`,
`top` and `discounts`, plus new pins and content check dates. Shortages remain
visible even when no new opening pin has arrived. Regions with new pins come
first, then the largest shortages. Targets are collection minimums, not display
caps. Specials count distinct restaurants with active or upcoming verified
offers, including outside service hours and without a published rating;
expired offers and repeated offers at the same restaurant do not fill gaps.
**Does** for each region: re-check opening dates and status against sources
and new pins, update stale pins (`update_pin`), and research additional distinct
local restaurants for every undersupplied tab. Work toward the region's target
within the run's normal budget; rotate through cities. Search operator
announcements, local reporting, branch-specific menus, ordering pages, linked
PDFs, galleries and verified promotions. Coming soon requires an announced
opening; Just opened requires a verified opening within the existing 90-day
window in the city's time zone. Never widen that window or turn a passed
estimate into an opening to meet the count. Top restaurants count only live
curated guide selections backed by pins. Verify the specific branch, source
facts, actual menu items and photos using
[restaurant-scraping.md](../../restaurant-scraping.md).
Save ordinary menus, visit details and landing tiles through
`/api/admin/restaurant-content`; save offers and offer menus through
`/api/admin/restaurant-specials`. Bundled JSON is a research/import snapshot,
not the runtime authority. Verify the affected pin and landing page after
saving. Do not duplicate restaurants or invent dates, dishes, discounts,
reviews or awards. If the target cannot be verified, keep fewer and report
the remaining shortage and sources checked.
**Traps.** City-tagged Food/Restaurant Opening pins and enabled database
opening tiles reach the guide; archived content and deleted pins do not count.
New top pins need an enabled branch-specific top tile before appearing.

### thinPins

The midnight job's task (owner, 2026-10-04, after AdSense turned the site
down as "low value content"). A thin pin (under 600 characters of summary
text, or citing nothing but its own source:
[searchQuality.ts](../../../src/lib/searchQuality.ts)) tells search engines
"noindex" and stays out of the sitemap while the switch on /admin/search is
on, and every thin page counts against the whole
site. Filling one out puts it back in the index on its own, with no other
step.
**Reads** `thin_pins`: curators' pins first, then the most opened in the
last 30 days (`views`, owner 2026-10-29), then pins both short and
single-sourced, then upcoming before past, then the shortest text. Pins
changed in the last 14 days or already marked for revisiting are not
listed. Work a batch of about 20 a run; ask again passing the ids you looked
at and left alone as `exclude`.
**Does** for each pin: read its `sourceUrl` (`scrape_url`, or `read_page`
when blocked), then search for two or three independent pages on the same
event - the organiser's or maker's own page, the filing, the trade press, a
reference work (Wikipedia, MyAnimeList, IMDb's mirrors) - and through
`update_pin`:
- `addReferences` for each one at confidence 70 or more (never the source
  again, never more than five in all), with its published date, the dates it
  states and its reasoning;
- a `longFormSummary` that meets the [quality bar](strategy.md#quality-bar):
  an HTML bulleted list, original synthesis across the sources, every point
  citing what backs it, with the context a reader comes for (what it is, who
  is behind it, what came before, what to expect, the numbers), well past 600
  characters of text - aim for 1,000 to 1,800;
- a `description` of one or two plain sentences when the old one is missing
  or vague.
Keep the pin's date, place and title unless the new sources show they are
wrong (then fix them as [lowConfidence](#lowconfidence) says). Mark people's
pins for revisiting with the summary and references to add.
**Traps.** Length is not the goal: padding, repeating the title, or
restating one source in more words is exactly what Google calls thin
content, so a pin with nothing more to say stays as it is and the report says
why. A reference that only repeats the source (the same wire story elsewhere,
or the source's own URL) does not count as a second source. An anime season
pin is not filled from the series' general page alone: find what this
season adds (its studio, staff, episode count, where it streams, what it
adapts). No sentence lifted from a source except a short, attributed quote.

### eventInfo

**Reads** `pending_event_info`: the next upcoming pins the site marks as
events people can attend (a conference, a festival, a match, a timed music
show - `isAttendableEvent` in src/lib/seo.ts), never-read first, then any
read more than 20 hours ago. Each comes with its source and two best
references as the browser read them: the text, the links that look like
tickets, and the page's own schema.org Event markup for this date.
**Does** read each by the rules it hands out - who performs, the cheapest and
dearest ticket, whether tickets are on sale, sold out or not yet on sale (with
the on-sale date), and the ticket link - and save **every** pin handed out
with `record_event_info`, empty fields where the pages say nothing (that marks
it checked, so it is not read again until due). Ask again until nothing is
left or 40 pins have been read. The pin page shows these as Performing and
Tickets lines, and its Event markup gives them to search as performer and
offers (Google Search Console asked for both, 2026-09-26).
**Venues (2026-10-10).** Pins with a place and a venue tag (museum, theme
park, zoo, stadium, theater, ... - `isTicketedVenue`, `VENUE_TAGS` in
src/lib/seo.ts) are handed out too, with `kind: "venue"`, even after opening
and until they end: the reading is the standard paid admission and the
admission-page link, no performers, and the pin page keeps the ticket button
after the start date.
**Price tiers (0149).** When the pages list more than one named price
(adult, senior, child; seating sections) the reading also carries `tiers`
`[{ label, price, note? }]`; lowPrice/highPrice span the paid ones, and the
pin page shows a table instead of the range. The same field is accepted by
`PUT /api/pins/:id/event-info`.
**When.** In the news job, twice a day, so a sell-out or a new on-sale date
shows by the next run. `npm run events:refresh` does the same from a
terminal (with `--export`/`--import` for a session when the key has no
credit).
**Traps.** Only this edition, this date, this venue: a tour page lists every
night, a festival's site still describes last year's lineup, a league page
every match. A finalist, headliner or keynote the pages do not yet name is
left out, not guessed. The organizer, promoter, sponsor or venue is never a
performer. "Sign up for updates", "save the date" or "register your interest"
is not on sale and not PreOrder either - leave availability empty. A price is
a ticket price the page quotes for this edition, never a past year's, a
resale price, or a kids' ticket sold only with an adult one. A ticketUrl must
be copied from the links given; the tool drops any other. A row someone set
by hand is kept. After researching it, advance only its `checkedAt` through
the admin API when the tool leaves it unchanged. Compare all 40 native
event-info readbacks between local and production: an empty refresh can
preserve local session fields while replaying empty fields to production.
Restore the retained fields through the native event-info API and verify;
never use this check to replace a hand reading. First pass (2026-09-26): 75 of 151 upcoming event pins had
anything to read - blank beats guessed.

### products

The weekly job's task (owner, 2026-10-08: "a weekly job that refreshes the
product landing page for new products or updated information on them"). The
/products page shelves the product pins (a `productName`) of a few categories
and tags - Electronics, Audio, Fashion, Watches, Gaming, Collectibles, Snacks,
Comics ([products.ts](../../../src/lib/products.ts)) - and shows each with a
short line on why it is good and, when a source publishes one, a rating
(`ProductBlurb`, 0142-0143).
**Reads** `product_candidates`: the products on the shelves with no line yet
(new to the page: a pin another run created, or one that has just reached the
newest 12 of its shelf) or a line older than 21 days.
**Does** research each one - the maker's page, then reviews and best-seller
lists - and saves it with `save_product_blurb`: a line of at most 220
characters, one or two sentences, in the style "Ranked as the #1 ... best-seller
featuring ...". State a rank, award, score or feature **only** when a page you
opened says so, and give that page as `sourceUrl`; never invent one. Add a
`rating` only when a page you opened publishes it (a reviewer's score, or a
retailer's average stars) on its own scale, with the source's name and URL. A
page you cannot open (403) is no source. A product that is unreleased and
unreviewed gets a factual line from the announcement and no rating. The page
refreshes at once; it is cached for hours otherwise.

### pinAds

**Reads** `pin_ads_check`: every pin ad's Amazon listing read again (price,
stars, reviews, stock), the ones that just broke, and `needsAds` - upcoming
pins (from the last 120 days to the next 45) with fewer than two working ads,
those with a broken ad first, each with its categories and topics. **Let the
tags inspire the product**: a Watches/Fashion pin (a MoonSwatch drop) wants a
watch (a Garmin or Casio), a Gaming pin a controller, and so on. An ad also
serves on every other pin that shares its pin's tags. **Does** replaces each broken ad and fills the pins a product genuinely suits,
with `add_pin_ad` (the pin page shows them first in its ad slots, the
timeline mixes them in with the others). A pin's own page already has buy
buttons for what it is about; these are *adjacent* products - a Tamiya Mini 4WD
starter kit under the Mini 4WD Japan Cup, a Bandai Gunpla kit under a Gundam
tabletop game.
**Film pins are stocked by the tool itself** (`movieMerchandise` in the answer, up to 6 pins a run, [movieMerchandise.ts](../../../src/server/movieMerchandise.ts)): plush, toys, Funko Pops, LEGO and figures named for the film. Don't redo them by hand; `npm run ads:pin -- movies` does the same locally.
**The bar** (the tool enforces it, [adQuality.ts](../../../src/lib/adQuality.ts)):
in stock with a buy-box price, a brand on the listing, at least 4.3 stars from
at least 100 reviews. Beyond that, stick to trusted brands - the maker itself
or an established one, never an unknown reseller or a lookalike. **The pin's
brand comes first** (owner, 2026-10-02): when the pin has a company, search
for that company's own product (`brandMatchesPin` in the answer says it
matched) and only then another trusted brand that suits the pin; the picker
also ranks a brand match first on that pin's page.
**How to find them.** WebSearch `<brand> <product> site:amazon.com`, open the
result, and pass a link that came back from search - never a URL typed from
memory. If `add_pin_ad` refuses (reviews, stars, stock), say why in the report
and try the next-best listing. Two or three per pin; a pin with nothing
that suits it gets none rather than a filler. Never a product Amazon bans or
that has nothing to do with the pin (vapes, tobacco, weapons, adult products).
**Traps.** A robot check on the listing page is "unreadable", not "broken" -
nothing changes, the next run reads it again. A page can redirect to another
variant, so read the title the tool returns. Only amazon.com; other stores
need their own Associates id.

### holidayAds

**Reads** `holiday_ads_check`: every holiday ad's Amazon listing read again
(price, stars, reviews, picture, stock), the ones that just broke, and then it
**stocks** the holidays coming up on its own: `added` (each new ad with its
price tier, price, stars and reviews), `lacking` (tiers still short, and why),
`problems` (a search Amazon refused) and `coverage`.
**Does** reviews `added`, then fills `lacking`.
**What these are.** The traditional goods of the cultural holidays in the
catalog ([culturalDays.ts](../../../src/lib/culturalDays.ts): Mid-Autumn
Festival, Lunar New Year, Diwali, Hanukkah, Halloween, Christmas...), which
the timeline also tags with the holiday and its foods and customs. They run
from **45 days before the holiday to a week after** (owner, 2026-10-23; was a month before / three weeks after),
are stocked two weeks ahead of that, and are served first in the timeline's ad
slots and on the pin pages of pins that fall on the holiday, three tiles at a
time: an inexpensive, a middle and an expensive choice (the holiday's own
dollar budget splits them, in the catalog). Each tier is stocked to two working
ads.
**Review what `holiday_ads_check` added.** Its searches are mechanical - a
title that names the holiday or one of its goods, best-reviewed first - and a
supplement that shares an ingredient, a generic party decoration or a product
for another holiday can slip through. Drop each such ad with
`remove_holiday_ad`; what stays must be something people really eat, give,
wear, light or decorate with *that day* (mooncakes, a mooncake mold, paper
lanterns and oolong tea for the Mid-Autumn Festival; a menorah and gelt for
Hanukkah).
**Filling a short tier.** WebSearch `<holiday good> site:amazon.com` (a
mooncake brand, "mooncake gift box"), open the result and pass a link that came
back from search - never a URL typed from memory - to `add_holiday_ad`. The
tool reads the listing and refuses it unless it is in stock with a brand and at
least 4 stars from 5 reviews ([adQuality.ts](../../../src/lib/adQuality.ts):
well under the pin ads' 4.3 / 100, since a single holiday's goods sell in
small numbers and mooncakes on Amazon rarely have more; owner, 2026-10-03: "5
reviews is enough", "4 stars is good enough too"); the price decides the tier. A tier with nothing that clears the bar
gets nothing rather than a filler, and the picker repeats a tier the holiday
has two of.
**Never** alcohol, vapes, tobacco, weapons, adult products or supplements.
**Traps.** Amazon search answers a script with a stub page now and then
("no results on page") - a problem to report, not a reason to give up:
try the other searches. A robot check on a listing is "unreadable", not
"broken": nothing changes. By hand: `npm run ads:holiday -- coverage | fill
[--curl] | add | check | list | remove` (`--curl` runs the searches through curl,
which Amazon refuses less than Node's fetch).

### personCampaigns

**Reads** nothing first; its one call, `person_campaigns_update`, answers `due: false`
on every midnight run except the first one at least three days after an FEC quarterly
filing deadline (April 15, July 15, October 15, January 31) that it has not refreshed for
yet (owner, 2026-10-16: "run once after quarterly is reached"). The last deadline
refreshed is the `personCampaignsRun` AppSetting.
**Does** when due: reads the FEC bulk files (`weball`, `pas2`, `cm`) for the current
two-year cycle and the one before, replaces each matched member's campaign finance
(`PersonCampaign*`, the page's Campaign finance section), sends it to production when the
run writes there (`POST /api/admin/person-campaigns`), then records the deadline. A failed
write leaves the deadline unrecorded, so the next midnight run retries. The same code is
`npm run people:campaigns`.
**Traps.** The FEC's files trail the filings by a day or two, hence the three-day wait. A
cycle with no files yet (the next one, in January) is skipped, not an error. `unmatched` is
members with no FEC record in those cycles (retired, or never ran), not a failure. Pre-primary
and pre-general reports change the numbers between quarters; they are picked up at the next
quarterly refresh, or by hand with `npm run people:campaigns`.

### personTrades

**Reads** nothing first; its one call, `person_trades_update`, reads this year's
House Clerk periodic transaction reports, the Senate eFD reports of the last 30
days and the executive branch's OGE 278-T reports (president, VP, cabinet; a scanned
report it cannot read in full is listed under `failed` and not stored) (`src/server/services/personTradesImport.ts`, the same code as `npm run
people:trades`), stores every filing not stored yet on the people's pages, and,
when the run writes to production (`JOBS_PROD_BASE`), sends the filings filed in the
last 21 days to `POST /api/admin/person-trades` as the admin. A filing is stored once
(a unique line per trade) and a watcher is told once per filing, so the twice-daily run
and the 21-day resend never double up.
**Does** check `unmatched` (members with no person page: add the page with
`people:import`, then the next run picks their filings up) and `failed` (a PDF that did
not read - open it; `parsePtrText` in `src/lib/trades.ts` may need a new layout case).
Nothing else needs review: trades are the filing's own figures, never estimated.
**Traps.** Members have up to 45 days to file, so a trade date months back is normal.
Filings made on paper are scanned images and are skipped. Campaign finance is
the midnight job's [personCampaigns](#personcampaigns), not this task.

### traderPositions

**Reads** `trader_positions_status` (the followed traders: Michael Burry's Cassandra Unchained, HFIR, Shrubstack; positions stored, newest trade date, last 25 positions).
**Does** (owner, 2026-10-26: "there should be a 6am/pm job for getting update for this"): for each trader open the archive in the owner's logged-in Chrome (`@browser`, the owner is a paying subscriber; plain fetches see only the free preview), open every post newer than the newest stored trade date that names trades (Burry's "Trading Post", "Short Thoughts" and the like), and call `save_trader_positions` with one entry per trade the post says the trader made: ticker (the underlying for options), instrument (`stock`, `call`, `put`, `short`), action (`buy`, `sell`, `hold`, `swap`), the trade date, a `summary` in **our own words** (at most 280 characters, what and why), and the post URL and exact title. The save estimates the entry price from the close on the trade date, pushes the move once to premium subscribers (Web Push) and, when the run writes to production, saves it there too (`POST /api/admin/traders`, which pushes prod's subscribers).
**Traps.** These are paid third-party posts: never store or quote the author's text, and never paste more than the link and our summary; the premium page shows our summaries and a source link only. Save only moves the post states the trader made, never inferred ones, and not a stock merely discussed. Options are priced by the underlying in the estimated PnL (labelled so). A swap is two entries (a sell and a buy). The PnL is our estimate from market closes, not the trader's result. Nothing is stored for a post behind a login wall the run cannot get through: say so in the run notes.
**When.** In the news job (06:00 and 18:00 Los Angeles) after personTrades. Premium is the $20 a month plan (`/premium`, `PremiumSubscription` 0223); admins see the section without paying.

### threadPredicted

**Reads** `predicted_pins`: predicted pins (market-predicted events and pins tagged `Predicted`), unthreaded pins first, curators' pins first, each with its author and candidate parent threads to join.
**Does** for each pin: check whether it belongs to an ongoing series, flight test program, tournament, election cycle, or franchise (e.g. earlier model release, earlier flight in a test campaign, previous election). If an earlier pin in the story is available, attach the pin to that parent pin (`parentId`) with `update_pin`. If the pin was created by someone other than a curator, mark it with `mark_revisit`. If no thread is appropriate, leave it unthreaded.
**When.** In the news job, morning and evening (owner, 2026-10-14: "6am and 6pm job should add job to pin predicted pins to thread if available"). `npm run threads:predicted` does the same from a terminal (`--apply` to change).
**Duplicate pins and 'same event' (owner, 2026-10-14).** Once a pin is marked as the same event (a confirmed duplicate in a duplicate group), the 6am and 6pm job rethreads it so that the duplicate is not showing up on the thread: a duplicate pin must never answer the pin it duplicates, and duplicate pins must not appear in the thread. Detach the duplicate pin (`parentId: null`), and re-parent any child pins that answered the duplicate pin to the canonical/primary pin of that duplicate group instead. Never choose a parent that is in the pin's duplicate group.
**Traps.** A thread connects events in the same recurring story, series, or franchise; do not thread loosely related events just because they share a category or topic. A parent pin must have happened before or on the predicted start date (`utcStartDateTime`), and must not be a descendant or confirmed duplicate of the pin.

### productLifecycle

Added 2026-10-24 (owner: product pins carry Announced and Released; a future launch gets Released once its date passes).

**Reads** nothing: one call, `product_lifecycle_sync` ([productLifecycle.ts](../../../src/server/jobs/productLifecycle.ts)).
**Does** tag every goods pin (a live pin with a `productName` on a /products shelf, tagged `Automotive` or tagged `Product`; restaurants, films, festivals and conferences are left out) `Announced`, and `Released` once its start date has come. A pin still to launch has only `Announced`, so a product gains `Released` on the first run after its date. It runs on this database and, when the run writes to production, on production through the admin DB API (`PinTag` rows only; ids differ, so each side is read for itself). Returns `goods`, `tagged` and `untagged` for each side. Nothing to review.
**When.** In the news job, morning and evening. `npx tsx scripts/tags/productLifecycle.ts` (local) and `node scripts/tags/productLifecycleProd.mjs` (production) do the same by hand; `--dry-run` only counts.
**Traps.** New goods pins get both tags from the extraction prompt; this task catches the rest and the dates that have since passed. A start date that moves later takes `Released` off.

### productCompetitors

Added 2026-10-26 (owner: every product pin mentions its main competing products; see AGENTS.md "Product competitors").

**Reads** `product_competitor_gaps` (a few pins per call): goods pins tagged `Announced` or `Released`, not `Predicted`, with fewer than two `PinCompetitor` rows (none first, then newest) or with a row that has no `sourceUrl` yet (a rival the extraction named; the task sources it, drops it or replaces it) or with a rival whose `competitorPinId` is still null (listed last; a rival that cannot be pinned goes in `skip` with a reason). Each comes with its title, `productName`, start, rival count and author.
**Does** for each real product, one at a time:
1. `get_pin`, then research 2-5 same-segment rivals **at the pin's time and market** with `web_search` and `web_fetch`. Open every source page and confirm it names the rival; a search snippet alone is not a source.
2. For each rival, `find_pins` by its title. **When there is no pin, create one** (owner instruction, 2026-10-27): `scrape_url` the rival's official or publisher page, `create_pin` it as the same curator desk as the pin it rivals (a game is `@GameDesk`), dated to its own real release or announcement date, with the usual media, references and tags. It counts against the run's new-pin limit; past the limit, save the rival unlinked and `record_learning` the rival as a pin to add. Never create a pin for a rival you could not source.
3. `save_product_competitors` with `{ rank, name, maker, competitorPinId, summary, sourceUrl }` per rival (send the pin's whole list). `competitorPinId` only for a live pin of that exact product (a franchise or a different edition is not it). Re-listing a pin that already has unlinked rows also relinks any whose pin now exists. It saves here and, when the run writes to production, there as the pin's author.
A pin that is not a product (an event, award, shop, campaign, one-off auction, collection or capsule) or has no sourceable rival goes in `skip` on the next call, with a `record_learning` note saying which.
**When.** In the news job after productLifecycle, so a new goods pin gets its tags and then its rivals. Limit: about five pins a run.
**Traps.** Extraction now returns 2-5 `competitors` for a one-product pin (name, maker, summary; no source) and the pin save stores them unsourced, so each new goods pin is a gap until this task sources or replaces them. Never name a rival that released later than the pin unless the source calls it the pin's rival, and never use a ranking list as a head-to-head. A restored backfill (2026-10-26) left about 180 non-product or no-rival pins that this task will keep listing; skip them with a reason. Sites that answer 403 to fetches (Edmunds, Ford Authority, Primagames) need Chrome through `@browser`.

### factoryProfiles

Added 2026-10-27 (owner: the scraper should give every plant pin the project-timeline and buildout panel automatically; see AGENTS.md "Factory buildout profiles"). Replays what the 2026-10-27 sweep did by hand ([factory-capability.md](../api/factory-capability.md)).

**Reads** `factory_profile_gaps` (a few pins per call): live pins not `Predicted` with no `PinFactory` row that are either tagged `Manufacturing` or `Factory` (with a construction price or a `Proposed` / `In Progress` / `Completed` tag) or, since 2026-10-29 (owner: every construction pin gets the timeline panel), any other pin with both a construction price and a status tag (pipelines, power plants, dams, data centres, rail), newest first. The panel is titled "Factory buildout" and `sector` is free text ("Nuclear energy: ..."); it needs three distinct sourced metric categories. Restart-milestone and other event pins in a project's thread are skipped, not profiled; the project's own pin is. Each comes with its title, start, status tag, price, author and `sourceUrl`.
**Does** for each real plant, one at a time:
1. `get_pin`, then open the pin's own sources and research the project with `web_search` and `web_fetch`. Open every page you quote; a search snippet is not a source. When the pin's primary page will not load (a 403, a script-rendered page), quote a credible report of the same figures and say so in the metric.
2. Every page you will quote must be the pin's `sourceUrl` or one of its references: `update_pin` with `addReferences` for any that is not, before saving.
3. `save_factory_profile` with `sector`, `status` (the stage today: `announced`, `construction`, `commissioning`, `production`, `offline`), all six `axes`, 3-12 `metrics` and the dated `milestones`. Metric keys are `investment`, `employment`, `floorArea`, `siteArea`, `capacity`, `timeline`, `stage`, `products`; at least three distinct ones or the panel stays hidden. Keep the source's precision and currency ("Expected to be completed by 2028", CHF not USD) and say planned or demonstrated for each. Milestones run in time order: the announcement (demonstrated), then each stated start, opening or completion (planned until it happens; a date the source did not give is "Date not announced", never a guess). Every source is `{ url, title, publishedDate, quote }` with a verbatim quote of at most 300 characters.
Axes stay `null` (basis `unknown`, with the gap named) unless the pin's sources support a score: scale and efficiency need a cited cohort of at least five plants, automation, technical and workforce need a named capability, process or programme. Almost every announced plant is all-null, and that is correct; the buildout panel stands without the radar. Status follows the evidence: a groundbreaking or "construction is underway" is `construction`, an announcement, approval, loan or acquisition is `announced`, and an elapsed target date never makes it `production` ([AGENTS.md](../../../AGENTS.md) construction status rules). A profile set by hand is never replaced. Owner instruction (2026-10-30): explicitly withdrawn projects/requests carry the `Withdrawn` tag and a sourced timeline milestone. When no withdrawal date is published, label a dated source observation as such; do not invent the withdrawal date. A withdrawn request does not imply all projects at that site were cancelled.
A pin that covers **several plants** (a three-plant investment, a programme across sites; owner instruction, 2026-10-27) is not skipped: each plant gets its own pin, threaded under the programme pin. For each plant `scrape_url` the plant's own official or local-press page (a source URL the route has not already pinned, so not the programme's page), `create_pin` it as the programme pin's curator with `parentId` = the programme pin, dated to that plant's own stated milestone (start of production, opening, groundbreaking; estimated when only a year or season is given), `price` only when the source states that plant's own cost (never a share of the programme total), the usual tags (`Manufacturing`, the construction status tag, `Proposed` for a plan) and media; it counts against the run's new-pin limit, and past the limit the rest go in `record_learning` as plants to add. Then profile each new pin like any other. The programme pin keeps its total and gets no profile of its own. Several plants that one source names with no plant-level milestone anywhere (a bare "three plants" list) stay on the programme pin.
A pin that is not a plant build at all (a closure, wind-down, sale or buyback, a grid or campus plan with no plant) goes in `skip` on the next call, with a `record_learning` note saying which.
**When.** In the news job after productCompetitors, so a new construction pin gets its status tag and price first. Limit: about five pins a run.
**Traps.** Local ids and production ids differ for older pins: the save pushes by the same id and only works when the pin's author is a curator, so a profile on a pin by anyone else stays local; replay it with `scripts/factories/capability.ts` (admin, matches by identity). The scripted catalog `scripts/factories/capability.json` is the by-hand record, not this task's output. Never put the pin's price in as a bare number: the `investment` card keeps the source's currency and scope (a $100 million core-and-shell filing is not the whole project).

## Find new events

Look for what the timeline is missing, from what people search, read and say.

### trends

**Reads** `google_trends`, then the pins it says cover a term (`get_pin`).
**Does** two things. For a trending term with a dated event behind it and no
pin, research the event and pin it (a release, a launch, a ruling, a law
taking effect, a tour announced). For a trending term an existing pin
covers, the pin is in the news again: check its date, place and cost against
today's coverage, add the new reporting as references, and update what
changed - or mark it for revisiting if it is not a curator's.
**Traps.** About 3% of terms are pinnable ([Google Trends](nightly-jobs.md#google-trends)):
most are today's games, a lottery, the weather or a name with no dated
event. "When does X come out" usually means X has no date yet - check before
scraping. A trending person is not an event; the event they are trending
for may be.

### breakingNews

**Reads** the news, with web search, since the last run.
**Does** pin major news and newly announced events: an announced date for a
launch, a law signed, a ruling set, a summit called, a disaster with a
dated response. The event is the pin, dated to when it happens, not the
article ([one pin per event](strategy.md#principles)). Check `find_pins`
first: breaking news is often an update to an existing pin.
**Traps.** Something that already happened today with nothing ahead is
worth a pin only if it is major; a story with a dated next step (a vote, a
hearing, a deadline) is usually the better pin.

### earthquakes

Added 2026-10-24 (owner: keep the earthquake pins current).

**Reads** USGS's significant-earthquake GeoJSON feed,
`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson`
(use `significant_week` when a run was missed), with `web_fetch`.
**Does** pin each quake of magnitude 5.5 or more as @QuakeDesk, the way
`npm run earthquakes` does ([scripts/events/earthquakes.ts](../../../scripts/events/earthquakes.ts)):
title `M 6.9 earthquake strikes near <place>`, start = the origin time
(`dateConfidence: 'confirmed'`), the epicentre as latitude/longitude, category
`Disaster`, `sourceUrl` = the quake's USGS event page (`properties.url`, unique per
quake), and a description of magnitude, depth, the PAGER alert level, felt
reports and any tsunami flag. `find_pins` on the event page first: a quake
already pinned is skipped. An aftershock in the same hour as a larger quake is
its own pin only if USGS lists it as significant.
**Traps.** USGS revises magnitude and time for a day or two after an event; do not
re-date an existing pin for a revision of a few tenths. USGS has no photos, but
every significant quake has a ShakeMap: open the quake's `properties.detail` URL
and attach `products.shakemap[0].contents` `download/intensity.jpg`, `pga.jpg` and
`pgv.jpg` (their `url`s) as the pin's media, credited to USGS (a US-government
work); the app makes the thumbs. A quake with no ShakeMap yet gets a pin without media.

### stormTracks

Added 2026-10-30 (owner: the 6am/6pm job should keep the storm pins current).

**Call `storm_tracks` once** (no arguments; `days` defaults to 30). It reads NASA
EONET's severe-storm events (`https://eonet.gsfc.nasa.gov/api/v3/events?category=severeStorms`,
JTWC and NOAA NHC positions and winds every six hours) and does the whole task
([src/server/jobs/stormTracks.ts](../../../src/server/jobs/stormTracks.ts)):
- A storm that reached 64 knots and has no pin becomes a confirmed `Disaster` pin
  as @QuakeDesk: title `<storm> peaks at <n> knots`, start = its first dated
  position, the track as a flight path, three NASA Worldview true-colour pictures
  (first day, peak-wind day, latest day), `sourceUrl` = its EONET event record.
- A pinned storm whose track grew or ended gets the track, end date, peak, text
  and pictures brought up to date (a stale last-day picture is swapped for the
  new one; only the NASA frames are ever removed).
- Floods, wildfires and weaker storms are not pinned (too thin).
**Then** the tool returns `translationsDue` (every created and updated pin id): their
text changed, so list them in the run note and refresh their translations the way
the prod-translations skill does (`sync_translations.py`); the news run itself
cannot translate them.
**Traps.** EONET lists a storm a day or two before JTWC names it; a track can be
re-sorted by the agencies, so a changed length is the only trigger. By hand, `npx tsx scripts/events/storms.ts` posts only
new storms (admin token); updating existing ones is this task's job.

### predictionMarkets

Added 2026-10-01 (owner: "6am job and 6pm job should include scrape with
prediction betting sites to get new major events being predicted for, for
the week"). Updated 2026-10-15 (owner: "in 6am and 6pm job scrape for
interesting events that prediction market has and create predicted pins
out of them").

**Reads** `prediction_markets` once: `interesting` (top interesting and
high-volume events being predicted across politics, technology, space,
economics, championships, entertainment and culture), `thisWeek` (markets
resolving in the next seven days) and `newlyListed` (listed since the last
run, resolving later). Then `find_pins` and `get_pin` for each one worth a look.

**Does** scrape prediction betting sites (Polymarket, Kalshi) for interesting
events and create **predicted pins** out of them:
- **Create predicted pins:** Every pin created from a prediction market forecast
  or predicted event is a predicted pin. It carries the tag `Predicted` (which
  renders the sparkle badge, joins `tag:Predicted` filters, and appears in the
  followed-company watch view), with `dateConfidence: 'estimated'` (or `predicted`).
- **Which date:** Date the pin to when the predicted event itself is most likely
  to occur or start (`utcStartDateTime`), following the [predictions rule](strategy.md#which-date)
  and [vertical recipe](verticals.md). Never date to the market's settlement
  buffer or closing time (`closes`). For a cumulative ladder, date to the likeliest
  rung or where probability crosses a significant majority threshold. In
  `dateConfidenceReasoning`, start with `Estimated:` and explain the basis, quoting
  the market's odds and dollar volume as read on that day (past tense: "On 15 October 2026
  Polymarket traders priced...").
- **Monthly Brent and WTI commodity prices (owner instruction, 2026-10-15):**
  Scrape prediction markets (Kalshi, Polymarket) for Brent and WTI crude oil commodity prices every month.
  - **Create predicted pins:** Every month, create pins for upcoming Brent and WTI price forecasts, tagged `Predicted` (plus `Energy`, `Economy`, `Commodities`, `Oil Price`, `Brent` or `WTI`), set `dateConfidence: 'estimated'` dated to the month's settlement date (e.g. 5:00 PM EDT / 21:00 UTC on the final trading day of the month), authored under `@EnergyDesk` (or `@EconDesk`), quoting the contract strike distribution and traded volume.
  - **Make into a thread:** Each monthly Brent pin must be attached via `parentId` to the previous month's Brent pin; each monthly WTI pin must be attached to the previous month's WTI pin, forming continuous monthly commodity forecast series.
  - **After price realization:** Once the month concludes and the contract settles (`status: finalized` on Kalshi or official exchange index / EIA spot release), update the pin to `dateConfidence: 'confirmed'`, update the title with the final realized value (e.g. `Brent Crude Oil Settlement — September 2026: $97.92/bbl`), and add reasoning explaining the final realized value and why the prediction market forecast was missed or on point against actual market drivers (OPEC+ quota compliance, geopolitical risk premia around Hormuz, commercial/SPR inventory changes, and global refinery demand).
- **Track record (2026-10-29, `/predictions`):** call `prediction_accuracy` with `apply: true` once after
  creating pins. It records, per Predicted pin and market, the odds the market gave when first seen (table
  `PredictionRecord`, 0233, never rewritten) and marks closed markets settled (`resolved`, or `void` when no
  outcome settled at 99%+). Saves and edits of a Predicted pin record its markets too (events.ts), and an
  hourly in-process timer settles the rest (`PREDICTION_RECORDS=1` forces it on in dev). A market already
  closed when first seen is skipped: its earlier odds are unknown. The page scores each outcome as a binary
  forecast (a plain yes/no market counts once, by its leading side): favorite hit rate, Brier score and a
  calibration table. Code: `src/lib/predictionAccuracy.ts`, `src/server/services/predictionRecords.ts`.
  **Historical backfill:** `prediction_accuracy` with `historical: true` (one-off, minutes) scores markets that
  settled before they were recorded on their price 7 days before closing, from the exchange's price history
  (`basis = 'historical'`, 0234; Polymarket US keeps none). The page scores and labels the two bases separately; never
  merge them. Local backfill 2026-10-29: 114 markets, favorites 74%, Brier 0.072. Prod needs 0233/0234 and the backfill.
- **Curator desk and sources:**
  - Where the market points to an underlying dated event in the world (an election,
    a central-bank rate decision, an AI model release, an orbital flight test, a
    championship, an award ceremony), pin **the event** under the vertical's desk
    (@PoliticsDesk for elections, @TechDesk for tech and @AIDesk for AI, @EconDesk for macro releases,
    @BuildDesk for space/infrastructure, @SportDesk for championships), citing
    the prediction market URL in `references` or as `sourceUrl`.
  - For speculative model releases (Gemini, Claude Opus, Grok, DeepSeek) or market questions
    where the market is the primary reference, author under `@TechDesk` or `@OddsDesk` with
    the market URL as `sourceUrl` so live odds render.
- **Thread predicted pins:** When creating a predicted pin, always check whether
  an earlier pin or thread exists for the subject, model series, spaceflight campaign,
  election cycle or franchise (`find_pins`, `parentId`) and thread the predicted
  pin to it (`parentId`).
- **Deduplication and existing pins:** Check `coveredByPin` and `find_pins` first.
  Where an existing pin already covers the event, do not create a duplicate; add or
  update the market reference and latest odds on the existing pin if editable, or mark
  it for revisiting.
**Traps.** Quote the odds with the dollars traded and the day they were read
([learnings](learnings.md)); a thin book (under about $10k) is not evidence of
anything. A market's close time is when it settles, not when the event
happens - an election market closes the night after the vote, a "by Oct 31"
market says nothing about any one day. `related` lists the smaller markets
folded into one story; they are one pin (or one thread), not twenty. Kalshi's
`last_price_dollars` can be stale against the book; quote bid/ask where they
disagree. Skip a single regular-season game, a weekly count or a price
level - the tool drops most, not all.

### thinCategories

**Reads** `category_coverage` - the future counts, not the totals.
**Does** pick the two or three categories with the least ahead of them
(nothing in the next 90 days is the strongest signal) and add pins for their
**major** upcoming events: the summit, the launch, the final, the ruling
everyone in that field is waiting for. Prefer events far enough out to fill
the calendar's empty months, from an official schedule.
**Traps.** A category can be thin because its events are not announced
ahead (see "Not yet scheduled" in [nightly jobs](nightly-jobs.md)); say so
in a learning rather than forcing a weak pin. Never put an event in a
category it only brushes against.

### trendingCategories

**Reads** `trending_categories` and `most_viewed_pins`.
**Does** add major-event pins to the categories readers are opening most,
especially where views are rising and the future count is low: readers are
there and the timeline has little ahead to show them. Look at which pins
inside the category draw the views - the next event in the same story (the
sequel, the next round, the next launch) is usually the best pin, threaded
onto the chain it continues.
**Traps.** A category's views can come from one viral pin; pin the story
around it, not ten loosely related events.

### commentTopics

**Reads** `recent_comments`.
**Does** find subjects people keep raising - an event a commenter says is
coming, a correction several people make, a question about what happens
next - and pin the dated events behind them, or correct the pin they are on
(a correction in a comment is a lead: verify it from sources).
**Traps.** Few comments means few topics; one comment is an anecdote. Never
quote or name a commenter in a pin.

### localEvents

**Reads** `active_user_places` (signed-in users' saved places) and `traffic_places`
(where all readers, guests included, are by the city their pin views came from).
**Does** for the places with the most readers and the fewest upcoming
pins nearby - a city in both lists counts once, by its larger number - find major local events newly announced - festivals, stadium
concerts, openings, marathons, city elections, major closures - and pin them
at the venue (reverse-geocode the point; [never type an address](strategy.md)).
**Traps.** Users with no saved location are only a count; never guess their
place from anything else - a view's city is a place to cover, not a fact about a
person, so a pin or its summary never mentions where readers come from, and
an address never appears in a report or learning. A city-sized ISP hub or a
VPN exit can look like a crowd: check a `traffic_places` city against what its
readers open (`most_viewed_pins`) before pinning for it, and skip a city whose
viewers all opened the same one pin. "Major" means worth a stranger's attention, not a
weekly market.

## Beats

Subjects covered every run, whatever else is in the news. Each works through its own list, so a run picks up where the last left off.

### fortune100

**Reads** the current Fortune 500's top 100 (fortune.com's ranking, which
changes every June; Wikipedia's *List of largest companies in the United
States by revenue* when it will not load), then `company_coverage` with all
100 names.
**Does** take the first three to five companies it returns - never pinned,
then longest since a post - and pin their dated news since their last pin
and what is scheduled next: quarterly results and the next earnings call, an
acquisition and its close, a launch, a plant opening or closure, a ruling
against it, an investor day. One pin per event, following the company-news
rows in [Vertical recipes](verticals.md) (HPE, Microsoft, Alphabet, Abbott,
J&J, Lilly, Babcock & Wilcox): the company's own newsroom or IR release is
the source, the SEC 8-K (Item 2.02 results, 1.01 deals, 2.05 restructurings)
gives the filed facts and the acceptance time. Every pin carries the
company's shared tag - `commonTags` when it has one, else set a short one
(`Abbott`, `J&J`) and use it on all its pins - and is posted as the desk of
its first category. A company's earnings form one oldest-first chain; the
next call is `estimated` from its own pattern until the IR site lists it.
**Traps.** An earnings calendar's "confirmed" date is usually its own
estimate: check the company's IR news list. A list page's dates are
candidates, not facts - read each release's own dateline. A completion can
come before its announcement (the 8-K dates the close). The first pin's
`stocks` note for a new company becomes every later pin's company line, so
make it a company-wide clause. An existing Company row may be the brand, not
the group ("Volkswagen" vs "Volkswagen Group"). An empty `companies` in
`company_coverage` may only mean the app spells the name differently.

### layoffs

**When.** Midnight and the 06:00/18:00 America/Los_Angeles news job
(owner, 2026-10-15). Every run searches for new layoffs and checks existing
layoff pins for developments; this is both discovery and maintenance.

**Reads** `tagged_pins` for `Layoffs` (what is already pinned, newest
first), then `find_pins` for each company and source URL to catch existing
coverage even when the tag is missing. Search for announcements and updates
since this job's last run (the last 24 hours on its first run): the companies' own memos
and posts, SEC 8-K Item 2.05 filings (EDGAR full-text search), and state WARN
notices - California, New York, Texas, Washington, New Jersey, Tennessee and
the other states that publish them - for closures with a separation date
ahead.
**Does** pin each new layoff or closure worth a stranger's attention
(hundreds of roles, or a company people know) per the Layoffs row in
[Vertical recipes](verticals.md): @EconDesk; `Labour` first, then `Business`
and the employer's sector (`AI` too when the company blames AI); the tag
`Layoffs` plus the company's shared tag. Date it to the day staff were told
(`confirmed`), or a WARN closure to its separation date (`scheduled`, a
first-to-last window as a period). Place it at the site that closes, else
the HQ. The price is the company's own restructuring charge for that round
from its filing (a range's midpoint), never the savings. Before creating,
compare the company, affected site, announcement and separation dates with
existing pins. Update the existing pin for the same round: verified counts,
locations, dates, restructuring charges, corrections, cancellations and newer
sources or relevant media. Preserve its original author and existing verified
details; a second article or a revised count is not a new event. Read back
each saved change before resolving any review mark. Create a new pin only
for an unpinned event; a distinct further round at the same company answers
its previous layoff pin. Queue conflicting evidence or genuine research gaps
with the specific unresolved question. Apply the [employment graph guidance](#employment-graphs)
to new and existing layoff pins whenever suitable verified graphs are available.
**Traps.** Trackers and round-ups only shortlist: on the first batch they
were wrong on twelve of eighteen (the date, the count, the site, what the
cut even was). The memo or the filing is the fact. Cuts a board has only
approved as a plan are not a layoff yet; a share "of the US workforce" is
not of the whole company. News video on a layoff is scarce - three pictures
are fine.


### hiringJobCreation

**When.** The 06:00/18:00 America/Los_Angeles news job (owner, 2026-10-15).
Search for new hiring, emerging types of work and job-creating investment,
and update existing pins every run. Cover all sectors and regions, including
specialized AI engineers, forward-deployed engineers, manufacturing,
construction, energy, batteries and data centers. Major training or reskilling
programs qualify as dated workforce events, but are not evidence of new hires.

**Reads** `tagged_pins` for `Hiring` and `Job creation`, then `find_pins` by employer, project, role and source URL;
use `get_pin` before editing. Search announcements and developments since
this job's last completed run (24 hours on its first run). Check company
newsrooms, careers pages and dated recruitment announcements, investor
releases and SEC filings, public economic-development agreements, county
minutes, permits, interconnection filings and developer project pages.
News reporting shortlists leads and supplies attributed context; verify
headcounts and spending against primary documents wherever available.
The owner's [AWS/Anthropic specialized-engineer example](https://www.cnbc.com/2026/10/15/aws-anthropic-racing-to-deploy-army-of-specialized-ai-engineers.html)
is a research lead, not verified evidence of a particular count or budget.

**Does** create a missing pin for each significant dated hiring drive,
new-role program or job-creating project milestone. Use the relevant desk
and categories (`Labour`, `Business` and the employer's sector as applicable),
the employer's shared tag, and `Hiring` and/or `Job creation` when supported.
Explain the new role's actual responsibilities, employer, location and timing.
Include published job counts, spending amount, currency, period, source date
and conditions in the cited summary. Distinguish openings, planned hires,
filled positions, trainees, retained jobs, temporary construction jobs and
permanent operating jobs. Label direct versus indirect/induced estimates and
full-time roles versus job-years; never add overlapping totals. A training
cohort or existing employees redeployed to clients is not net new hiring.

Separate workforce/training spending, total project capital investment,
public incentives and projected economic impact. Do not present a broader
corporate budget as the cost of one hiring program or project. Populate the
pin's price only with a published amount attributable to that pinned event,
using the existing price/currency/range conventions; explain its basis in
the summary. Missing counts or spending stay explicitly unpublished, never
estimated from salaries, capacity, incentives or industry benchmarks.
Date an announcement to its actual announcement date; keep future hiring,
construction and opening targets distinct and label their confidence.
Place a site-specific project at its verified site, not the corporate HQ.

Update the matching pin for the same initiative with newly verified counts,
budgets, timelines, construction status, pauses, cancellations and outcomes;
preserve its author, sourced details and media. A new article, changed target
or revised budget does not create another pin. A distinct phase or milestone
may receive a linked follow-up when it is a separate dated event. Read back
saved changes before resolving review marks. Follow the standing admin-API
procedure above when curator ownership prevents a routine authorized update.

Apply the [employment graph guidance](#employment-graphs) to new and existing
hiring and job-creation pins wherever the evidence supports a useful graph.

### Employment graphs

For both `layoffs` and `hiringJobCreation` in the 06:00/18:00 news job, search
primary reports, filings, investor presentations and project documents for
relevant published graphs of jobs, hiring, layoffs, workforce/training spending
or project investment. Inspect the actual graph and its underlying definitions
before adding it. Useful graphs show comparable counts or spending over time,
role/site breakdowns, or a clearly labelled project budget breakdown. A single
announced number does not justify inventing a trend or extra comparison points.

Add a verified publisher chart image through the existing pin-media pipeline
(`scrape_url` for discovery, `create_pin` or `update_pin` with `addMedia` to save),
with its source page as a reference. Store images in Azure Blob Storage under
the standing media rules; verify the public blob and saved pin. Keep the
publisher/author credit and a caption naming the metric, units, currency,
observation period, geography and whether figures are actuals, plans or
estimates. Do not crop away axes, legends, caveats or attribution. Preserve
other relevant pin media and deduplicate against existing chart images.

On existing pins, refresh a superseded graph when a newer comparable edition
is verified; retain historically relevant announcement-era charts with their
as-of dates explicit. Keep revised observations distinct from originally
reported figures. Never combine trainees with hires, construction job-years
with permanent jobs, or program spending with an entire corporate budget.
Do not imply that sector-wide employment movement measures one company's
announced hiring or layoffs.

The existing native `PinSeries` renderer supports publisher EIA/FRED time
series. Retain a relevant working native chart when a pin already has one;
its observations refresh from the publisher. The daily-job write tools do
not currently attach new native series or accept arbitrary chart datasets,
so use verified chart-image media for new graphs. If only a data table is
available, preserve the cited figures and record a specific graph-generation
gap rather than claiming a graph was added. Do not hold an otherwise verified
pin solely for a missing graph. Report graphs added/refreshed by pin ID and
any unavailable graphs, inaccessible source assets or incompatible data.

## Scores

Keep the numbers the pages graph up to date. Last, so they cover the pins the run just added.

### sentiment

**Identity check (2026-10-28).** Apply the repair workflow under Keep pins right
before scoring. Fix source-supported company/content collisions in this run,
verify both environments, then re-fetch `pending_sentiment`. A hotel detached
from an unrelated company should leave the company queue without a score.

**Review collection (2026-10-26).** Before the final scoring pass, call
`review_research_gaps`. Research a bounded batch of the returned exact products,
works and restaurant branches: aim for three independent reviews, up to six
(up to eight for `PinCriticReview`; taste needs at least one). The category
queue is a list of leads: awards, tours, finances and construction are not
reviewable products. Skip them and pass checked ids in `skip` so they do not
starve the queue. Open HTTPS sources, retain exact titles and verbatim extracts
of at most 300 characters, and score each with `reviewRubric`. Save with
`save_researched_reviews`, which preserves the author and axes, merges existing
reviews and verifies both environments through native pin APIs. Research an
undated extract's original publication day; never use `dateModified`, a URL
date, a check date or a publisher's `0001-01-01` placeholder. Leave genuinely
undated reviews null, and keep directory/shop pages off the graph. Record
specific source failures or conflicting evidence, not an author allowlist
mismatch. Back scoring sources with references/source wikis and synchronize
the research/replay catalogs; do not report a partial production save as done.

**Reads** `pending_sentiment`: the company pins whose title or summary
changed since their tone was scored (or that never were), the comments
with no tone yet and the scraped rubric reviews with no sentiment yet (the
`reviews` column of PinTaste, PinCarPerf, PinGasCarPerf, PinAircraftPerf,
PinLlmPerf, PinVideoPerf, PinHotel and PinDining, and PinCriticReview for pins with no rubric of their own, such as games; only a review with a quote and
a publication day), each with its rubric.
**Does** score each from -1 to 1 by its rubric - a pin by how its event reads
as news for its company, a comment by the commenter's tone - and save them
with `record_sentiment`, then ask again until nothing is left. A review is
scored by how it feels about the product it reviews (`reviewRubric`), and handed
back as `{ table, pinId, url, sentiment }`; it is saved on the rubric row's
review of that url, and on production through the admin table API when the run
writes there, so a review the rubric tasks just saved is on its pin's
"Sentiment over time" graph by the end of the run. The scores feed the sentiment
graph on a company search and on the pins.
**When.** Last in the news job, so it scores the pins that run just added: a
company pinned at 6pm has its point on the company's graph by the end of that
run (owner, 2026-09-23). It is off for the midnight job by default - the
morning run six hours later picks up whatever midnight added - and an admin
can tick it there. When nothing is pending it is one call that returns empty
lists.
**Traps.** Saving a pin scores it at once when the app's key has credit, so
this is the catch-up for everything that missed that: pins saved while the
key had none, and text edited since. It never rescores a pin whose title and
summary are unchanged. Pins posted with their own `sentiment` and
`productLine` ([fields](fields.md)) skip it entirely. That is how to keep the
backlog from growing: 1,693 company pins posted by desk batches without a
score had piled up by 2026-09-29. The payload lists each company's
`knownProducts` once, not per pin, and hands out a 12-character `textHash`.
Pass `textHash` and `text` back exactly as given; a pin or comment edited in
between is skipped and comes back next run. Judge the event for the company named, not for the world, and stay near
0 when the summary does not say how it went.

# Learning

Every run can call `record_learning`: a source that blocks, a rule that
misfired, a category that turned out to have nothing to pin and why. The
learnings are stored on the run (`JobRun.learnings`), shown on the admin
page, and the 25 newest are read into every later run's instructions, so a
lesson applies from the next run. On a development machine a run also
appends its learnings to [Learnings](learnings.md) as a dated entry, where a
session folds them into the page they belong to, per the
[living-docs rule](learnings.md#how-to-keep-this-current). A learning that
contradicts this page is a question for the owner, not a change a run makes
on its own.

# What a run records

`JobRun` (schema 0067): its job and slot, trigger, driver,
the tasks, every write (`actions`), its learnings, the closing report, and
what it used (tokens and an estimated cost for `api`, turns for `session`).
`PinRevisit` (0067): a pin a run marked to be looked at again, and how the
mark was resolved. People ask for a fix with "Suggest a correction" instead.

### modelScores

**Reads** `model_scores` once: `awaiting` (AI Models pins whose model is
priced on OpenRouter and absent from LMArena's overall text leaderboard,
longest-waiting first) and `needsFrontierTag` (pins whose model the arena has
scored, that sit on their year's cost/quality frontier, and lack the
`Frontier Model` tag). Both sources are read fresh, not from the hour's cache.
**Does** add `Frontier Model` to each `needsFrontierTag` pin with `update_pin`,
sending `tags` as the pin's `userTags` plus `Frontier Model` (a `tags` patch
replaces the pin's user tags, so never send the tag alone). A pin's chart
picks a new arena score up by itself; only the tag needs the job. For each
`awaiting` pin, look at the arena's own leaderboard when the wait is over two
weeks and the model is a major lab's: a model the arena lists under a name the
chart does not match (a renamed or suffixed entry) is a matching gap to
record in the run's learnings, not something to fix by hand.
**When.** In the news job just before sentiment (which stays last), so a score published since the 6am run is
tagged by 6pm (owner, 2026-10-12: "checking arena score for ai model missing
scores to 6am and 6pm job"). `npm run models:frontier-tag` is the same catch-up
by hand.
**Traps.** Never remove a tag: a model that has since fallen behind keeps it
(it led when it shipped). A model that is not on OpenRouter has no price and
is neither awaiting nor tagged; the tool does not guess. When the arena
returns nothing the tool errors rather than reporting every pin as awaiting.


### horoscopes

**Reads** `horoscopes_needed`: for every user with a birthday, today's and
tomorrow's (UTC days) **transits** - the planets' positions
([transits.ts](../../../src/lib/transits.ts), `astronomy-engine`, tropical
zodiac) against the natal chart - and what has no reading yet: `transits`, each
distinct set of aspects (`key`, `aspects`, `day`, `users`), and `signs`, the
users with no aspect in orb that day, who get their sun sign's reading.
**Does** writes each missing reading itself and saves it with `save_horoscope`
(`transits` = the key exactly as given, or `sign`). Owner, 2026-10-26: "daily
horoscope on the 6am/pm job for all users with birthdays entered to save on
site LLM credits" and "make it personal like astro.com". The menu row under the
weather ([NotificationBell.tsx](../../../src/components/nav/NotificationBell.tsx),
`GET /api/horoscope/me`) only reads `TransitHoroscope` / `DailyHoroscope`
(0221, 0222); the site never calls an LLM, so a user with no stored reading
sees their sign without text. Two days are written because the site reads the
**UTC** day and the 18:00 Pacific run already falls on the next one.
**The chart.** A birthday alone gives the planets at noon UTC on that day
(Sun-Pluto; the Moon moves 13 degrees a day and is left out). A birth time and
place (`UserBirth`, 0222, profile > Preferences) cast the exact moment, adding
the natal Moon and the Ascendant. Aspects: conjunction, square, trine,
opposition within 1 degree, sextile within 0.5; the strongest three (slow
planets weigh most) form the key, so everyone with the same sky shares one
reading. Verified against astro.com: a 15 Dec 1984 chart on 27 Oct 2026 has the
Sun conjunct natal Pluto, exact that afternoon.
**Writing.** 2-4 sentences, under 90 words, original wording (never copy a
horoscope site - astro.com's interpretations are licensed), grounded in the
aspects (what the transiting planet stirs in that part of the chart), warm
second person, no medical, financial, legal or fear-based claims, no event
predictions, no dates, never naming the user. A sign reading is a mood, one area
to lean into and one small thing to try. Never interchangeable with another
entry's text.
**Prod.** A run that writes locally pushes the rows to production through
`/api/admin/db/TransitHoroscope?upsert=1` and `/api/admin/db/DailyHoroscope?upsert=1`
(keys `transits,day` / `sign,day`) so www.chronopin.com has them; verify with
a signed-in `GET /api/horoscope/me` there. Note prod's users' charts differ from
local's, so keys must be computed against prod's `horoscopes_needed`.

### modelRubrics

**Reads** `model_rubric_gaps` (a few pins per call, newest first): AI language/video model release and announcement pins (tag `AI Models`, dated today or earlier, not predicted, not retirements and not image, speech or live models) missing a rubric (`PinLlmPerf` / `PinVideoPerf`), a nonempty spec panel (`PinPerf` charts or tables), or a live picture. Existing rubrics do not hide missing spec panels or media. Each comes with its `kind`, what it `needs` (`rubric`, `tables`, `media`) and its author. "Announces" titles are included.
**Does** for each pin, in this order, one at a time:
1. `get_pin` for what the pin covers and its references, then research with `web_fetch` and `web_search` by the rules in [strategy.md](strategy.md) ("Language model rubric", "Video model rubric", "Which results table"): the model **as launched**, scored on its published figures (maker page, docs, Artificial Analysis, API providers), `null` for what was not published then, never borrowed from a sibling model or from today's price.
2. At least 3 (up to 6) independent reviews of **this** model from pages opened in this run: exact title, ISO `publishedDate` or null, a verbatim quote up to 300 characters; string-match each quote against the page text before sending it, and drop what fails. Prefer tech press and genuine hands-on tests; a vendor or reseller page counts only when it is a real test and `basis` says so. Fewer than 3 is recorded in `basis`.
3. `save_model_rubric` with the six scores for the kind, `basis` (the figures, versions and disputes, at most 1000 characters) and `sourceUrl` (the maker's page opened in this run). It saves here and, when the run writes to production, there as the pin's author.
4. **Both language and video models** get `save_model_tables`, which accepts `charts` as well as `tables`. Add graphs of published comparable benchmarks, preceding models first and this model highlighted last, and a "specs as launched" table (maker, release, context or resolution/clip length, modalities/audio, input limits, access, API price with currency and unit). Each block needs its own opened HTTPS `sourceUrl`; translate chart/table text for every supported locale. Keep benchmark editions, precision and settings comparable, and distinguish introductory from standard prices. If no comparable numerical graph is published, save the supported spec table and explain that gap in its note. Supplied collections replace themselves; omitted charts/tables are preserved. A table update must never erase existing graphs.
5. **Always research media**, including official announcement galleries, linked photo pages and benchmark graphics. Use `check_image` to verify relevance, dimensions and duplicates; `update_pin` with `addMedia` (type **1** for a picture), `authorName` for credit, `authorUrl` for its source page, and reference reasoning for the caption/evidence. The native save stores thumbnails in Azure. Verify public blobs, image types and saved pin media; preserve existing pictures and authors. Aim for the normal three-media target without using off-subject filler. A pin without a picture stays in the maintenance queue. If no relevant accessible media exists, record sources checked and the specific failure.
6. Verify native panel and pin readbacks before resolving review marks. Production enrichment matches by sourceUrl, uses authenticated admin maintenance for all authors and checks saved data and ownership. An API or verification failure creates a revisit mark; an allowlist mismatch is never a research gap. Keep research/replay catalogs synchronized.
A pin that is not a release (an announcement whose release pin carries the rubric, a feature update, a family pin whose flagship is scored: say which in `basis`) goes in `skip` on the next call and a `record_learning` note.
**When.** Automatically during creation/research and in every 06:00/18:00 America/Los_Angeles news job just after modelScores (owner, 2026-10-28: "this should be done automatically all the time"). `create_pin` flags model graphs/tables and media for completion in the same run; the recurring queue also catches existing gaps. Limit: about five pins a run; record specific remaining work when run limits are reached. No new confirmation is needed for routine content enrichment.
**Traps.** Artificial Analysis rebases its index and its live pages show today's lower numbers: use the figure published at launch and name the version. openai.com is Cloudflare-walled (use developers.openai.com, press and Artificial Analysis); VentureBeat and Medium often block curl, so use the page only if it opened. A rubric set by hand is never overwritten. Never invent a review, a score or a spec to fill an axis.

### industryForecasts

**Reads** `industry_forecast_status` (every forecast panel: tags, FRED handles, newest survey day, projection points, earlier editions, sources, last check). See [industry-forecasts.md](../../industry-forecasts.md).
**Does**
1. `refresh_btos`: downloads the Census BTOS national file and replaces the AI adoption panel's two survey lines, here and on production. Mechanical; needs python3 with openpyxl. If it fails, say so in the run notes and carry on.
1b. `refresh_ramp_tokens` (owner, 2026-10-25: "this should be rescraped on 6am and 6pm job"): reads Ramp's token-volume, token-spend and token-price chart feeds (`ramp.com/data/ai-index/chart-data/tokenVolumes` and `tokenPrices`) and replaces the weekly lines of `ramp-token-volume`, `ramp-token-spend` and `ramp-token-price`, here and on production. Mechanical; if Ramp's feed shape changes, say so in the run notes and carry on.
2. For each projection row (Gartner worldwide AI spending and infrastructure, Goldman Sachs US AI investment, FactSet hyperscaler capex, IDC US spending), look for the publisher's newest edition (Gartner's newsroom releases a quarterly forecast; Goldman and FactSet publish ad hoc). Open the page (Chrome through `@browser` when gartner.com or businesswire.com answer 403 to fetches), and only when it states a figure that differs from the row, call `save_industry_forecast`: the new figures in `projection`, the figures they replace appended to `earlier` as `{ label: "Gartner, May 2026", publishedDate, points }` (oldest first, never dropped), and every source opened with a verbatim quote of at most 300 characters (a table row counts). The panel draws earlier editions as a grey dotted line and says they were revised.
3. A new industry sector or publisher worth a panel (a Ramp/FRED series for another sector, a new forecaster's US figure) is added the same way, with its tags.
**Traps.** Never convert currencies or years, never turn a "more than" floor into a point estimate in the note, never put a search-snippet figure in a row: only pages opened in this run. A 2025 value Gartner labels an estimate stays labelled so in `note`.
**When.** In the news job after modelRubrics (owner, 2026-10-25: "fill the gaps ... and add job"). Limit: a few rows a run.


## adTranslations

Ad translation is an upkeep task in the existing **midnight** job (00:00)
and **news** job (06:00 and 18:00 Los Angeles). It is not a separate job.
Run-all flows include it through those jobs. Saved settings are upgraded to
include the task in both jobs while preserving their schedules, enabled flags,
drivers and limits; the earlier standalone `ad-translations` entry is removed.

1. Call `pending_ad_translations`, starting at `after: 0`. Follow `nextAfter`
   until null, even when a scanned page contains no missing translations.
   Only ads with auto-translation enabled are returned, including admin ads.
2. Translate each exported headline/body into every `missingLocales` language
   yourself in this job session. Do not call the server's model translator.
   Preserve brand names, numbers, prices, currencies, and conditions. Empty
   source body stays empty. Do not translate image text or change the link.
3. Call `save_ad_translations` for that ad with its exact `sourceHash` and
   locale-keyed `{ title, body }` objects. Saves use the admin translation API;
   when `JOBS_PROD_BASE` is set both reads and writes target production, not
   local ad IDs. Production writes use the shared serial queue.
4. Read the ad back through the admin translation GET endpoint (or rescan the
   pending queue) to verify coverage. On 409 fetch fresh text and retranslate;
   on failure report the ad ID, missing locales and specific reason. Do not
   turn on opted-out ads or mark a failed save complete.

No pin creation or pin edit is needed. Each successful save is recorded in the
job's action log. Completed languages are skipped, so rerunning only fills gaps.

## Latest manual news run — October 30, 2026 morning

[Run 35 report](news-2026-10-30-am.md): four new pins; Hoodini identity and Gaylord public-opening repairs; 40 event readings; model specifications, trade/ad synchronization and production translation verification. Follow-up gaps include building-specific primary sources, Hoodini permit/queue reconciliation, Senate eFD response format and prediction-record selection before market filtering.
