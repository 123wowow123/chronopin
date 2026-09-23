---
type: Strategy
title: Daily pin jobs
description: The two scheduled LLM runs that grow and maintain the pins - the midnight maintenance-and-growth job and the 6am/6pm news check - what each task reads and does, the tools and drivers behind them, and how a run's learnings feed the next.
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

# The two jobs

| Job | Default time | Tasks | New pins / updates per run |
| --- | --- | --- | --- |
| `midnight` - maintenance and new pins | 00:00 America/Los_Angeles | Keep pins right: [revisits](#revisits), [pinHealth](#pinhealth). Find new events: [trends](#trends), [thinCategories](#thincategories), [trendingCategories](#trendingcategories), [commentTopics](#commenttopics), [localEvents](#localevents). Beats: [fortune100](#fortune100), [layoffs](#layoffs) | 100 / 250 |
| `news` - morning and evening check | 06:00 and 18:00 America/Los_Angeles | Keep pins right: [weekReview](#weekreview), [freshSources](#freshsources). Find new events: [breakingNews](#breakingnews). Scores: [sentiment](#sentiment) | 100 / 250 |

Both are set on **/admin/jobs**: on or off, the times (up to six a day) and
their time zone, which tasks, which driver, and the two limits. They ship
**on**, and there is no dry run - every run posts and edits for real (owner,
2026-09-22: "no dry run needed", "both jobs are on by default", "remove dry
run option"). Turn a job off there to stop it.

**How the clock works.** Every server checks once a minute
([dailyJobSchedule.ts](../../../src/server/services/dailyJobSchedule.ts)); a
job whose local time has just passed is claimed in `JobRun` by its slot key
(`news@2026-09-22T06:00 America/Los_Angeles`), so it runs once however many
servers there are. A slot missed while the servers were down still runs if
they are back within two hours; after that it is let go rather than run late
into the next one. One run at a time, and a run that has not finished after
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
* **By hand in a VS Code session.** `npm run jobs:run -- --job midnight
  --prepare` opens a run and writes its prompt and MCP config; add the server
  it prints (`claude mcp add chronopin -- ... --run <id>`), work the prompt,
  and close it with `--finish <id> --report <file>`. The writes count against
  the same run and show on the admin page.

# Tools

Only what Claude cannot do natively is a tool
([tools.ts](../../../src/server/jobs/tools.ts)). Searching the web, reading a
page or a PDF, and looking at a picture are the model's own. The rest:

| Tool | What it gives | Why it is a tool |
| --- | --- | --- |
| `category_coverage`, `trending_categories`, `most_viewed_pins`, `recent_comments`, `active_user_places`, `pins_this_week`, `pins_changed_since_last_run`, `soft_dated_soon`, `revisit_queue` | The signals each task starts from ([signals.ts](../../../src/server/jobs/signals.ts)) | The app's own data |
| `google_trends` | Trending searches in ten markets, scored for dated events, with `coveredByPin` ([trends.ts](../../../src/server/jobs/trends.ts)) | Same reader as `trends:discover` |
| `company_coverage`, `tagged_pins` | Where a beat left off: each company's pins and when one was last posted, stalest first; what a tag (`Layoffs`) already holds ([signals.ts](../../../src/server/jobs/signals.ts)) | The app's own data |
| `find_pins`, `get_pin` | The already-pinned test; a pin's full JSON | The app's own data |
| `pin_health_scan`, `check_pin_health` | Broken pictures, removed or unembeddable videos, deleted posts, dead sources ([health.ts](../../../src/server/jobs/health.ts)) | Dozens of link checks in one call; oEmbed status codes |
| `read_page` | A page as a browser renders it, a YouTube or podcast transcript, a scanned PDF's OCR | **Headless Chrome** and transcript fetchers from the scrape pipeline; web fetch cannot run a page's JavaScript or get past most bot walls |
| `scrape_url` | The app's whole scrape into a draft pin (with `llmTasks` when the app's key has no credit) | Media top-up, screen extras, studio HQ and page metadata are the pipeline's, not the model's |
| `check_image` | A picture's size, type, fingerprint, and whether it repeats one the pin has | The **image processor** (Jimp decode, difference hash at distance 6) |
| `read_okf` | Any page here, or the sections of one that mention a word | The docs are on the server, not the web |
| `create_pin`, `update_pin`, `mark_revisit`, `resolve_revisit` | The writes, through the real API as a curator | See below |
| `record_learning` | Writes down what the run taught | See [Learning](#learning) |

# Rules every run follows

* **Write through the real API as a curator.** The server signs a token for
  the curator desk (never a password, never a person's account), and the save
  goes through `POST`/`PUT /api/pins`, so the live feed, search, duplicate
  checks, threading and tags all follow ([pinApi.ts](../../../src/server/jobs/pinApi.ts)).
  Pick the desk whose vertical fits (the list is in `create_pin`'s own
  description and [curators.ts](../../../src/server/jobs/curators.ts)).
* **Only a curator's pin is edited.** A pin posted by a person is theirs:
  mark it for revisiting with what should change, and an admin decides.
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

# Tasks

A job works its tasks group by group, in the order below - the same groups
and order the admin page shows and a run's instructions list.

## Keep pins right

Re-check the pins that exist before adding to them.

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
references beyond the source, and the summary is current. Update curators'
pins; mark the rest.
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

**Reads** `active_user_places`.
**Does** for the places with the most active users and the fewest upcoming
pins nearby, find major local events newly announced - festivals, stadium
concerts, openings, marathons, city elections, major closures - and pin them
at the venue (reverse-geocode the point; [never type an address](strategy.md)).
**Traps.** Users with no saved location are only a count; never guess their
place from anything else. "Major" means worth a stranger's attention, not a
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

**Reads** `tagged_pins` for `Layoffs` (what is already pinned, newest
first), then what was announced since the last run: the companies' own memos
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
from its filing (a range's midpoint), never the savings. A further round at
the same company answers its previous layoff pin.
**Traps.** Trackers and round-ups only shortlist: on the first batch they
were wrong on twelve of eighteen (the date, the count, the site, what the
cut even was). The memo or the filing is the fact. Cuts a board has only
approved as a plan are not a layoff yet; a share "of the US workforce" is
not of the whole company. News video on a layoff is scarce - three pictures
are fine.

## Scores

Keep the numbers the pages graph up to date. Last, so they cover the pins the run just added.

### sentiment

**Reads** `pending_sentiment`: the company pins whose title or summary
changed since their tone was scored (or that never were) and the comments
with no tone yet, each with its rubric.
**Does** score each from -1 to 1 by its rubric - a pin by how its event reads
as news for its company, a comment by the commenter's tone - and save them
with `record_sentiment`, then ask again until nothing is left. The scores feed
the sentiment graph on a company search.
**When.** Last in the news job, so it scores the pins that run just added: a
company pinned at 6pm has its point on the company's graph by the end of that
run (owner, 2026-09-23). It is off for the midnight job by default - the
morning run six hours later picks up whatever midnight added - and an admin
can tick it there. When nothing is pending it is one call that returns empty
lists.
**Traps.** Saving a pin scores it at once when the app's key has credit, so
this is the catch-up for everything that missed that: pins saved while the
key had none, and text edited since. Pass `textHash` and `text` back exactly
as given; a pin or comment edited in between is skipped and comes back next
run. Judge the event for the company named, not for the world, and stay near
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
`PinRevisit` (0067): a pin marked to be looked at again - by an admin from the
clock button on the pin's page, or by a run - and how the mark was resolved.
