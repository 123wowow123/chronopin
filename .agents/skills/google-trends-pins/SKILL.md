---
name: google-trends-pins
description: >-
  Use this skill to suggest new pins from Google Trends (trends.google.com): which trending searches point at a
  dated event that Chronopin can pin with original, useful content and that could rank on Google. Covers reading
  the trends, filtering, checking existing pins, scoring search potential, and handing candidates to the normal
  scrape/create pipeline. Suggestion only: it never posts a pin by itself.
---

# Google Trends pin suggestions

Reader: `src/server/jobs/trends.ts` (Google Trends daily RSS, free, no key). CLI: `npm run trends:discover`.
Daily-job tool: `google_trends`. Task: `trends` in the midnight job
(`docs/okf/scraping/daily-jobs.md#trends`, background in `docs/okf/scraping/nightly-jobs.md#google-trends`).
This skill is the manual, human-in-the-loop version: it produces a ranked suggestion list for the owner.

## Steps

1. **Read the trends.** `npm run trends:discover -- --geo US,GB,CA,AU,IN --json` (or the `google_trends` tool).
   Default is ten markets; use the owner's target markets if given. Only about 3% of terms are pinnable; the filter
   already drops same-day sport, lotteries, weather and bare names. Use `--all` only to rescue a term you suspect
   was dropped wrongly.
2. **Drop what is already pinned.** Anything with `coveredByPin` is not a new pin. If the trend means the pin is in
   the news again, suggest an *update* (date, cost, new references) instead, and say so.
3. **Find the dated event.** For each remaining term open the news links (read the article, not the snippet).
   A pin needs an event with a date: a release, launch, opening, ruling, law taking effect, tour, deadline.
   A trending person is not an event; the event they trend for may be. "When does X come out" often means X has
   no date yet: check before suggesting it. Without a date, drop it or mark it a `Predicted`/`estimated` candidate.
4. **Score search potential** (judgment, 1 to 5 each; suggest only terms scoring 3+ on every line):
   - *Search demand that lasts*: trend traffic plus whether people will still search it in weeks (a release date
     or law effective date) rather than only today (a news blip).
   - *Intent we can answer*: the query asks "when", "how much", "date", "release", "price", "does it start",
     "what changes": questions a dated pin answers directly.
   - *Unique value*: we can add something beyond the headline: several sources compared, dates and costs
     reconciled, a timeline context, related pins, a sourced fact table. AdSense rejected thin template pins
     (2026-10-04), so a pin that would just restate one article is a no.
   - *Fit with the site*: matches an existing desk/category (Entertainment, Gaming, Motor, Tech, Law, Travel,
     Food, Business...) so it threads onto related pins.
   - *Competition*: for a mega-head term (a global brand name alone) the pin will not outrank publishers; prefer
     the specific event ("X release date", "X takes effect") where a structured dated page can win.
5. **Check we can meet the indexing floor.** A pin is only indexed when it has enough body and media (see the
   thin-pin gate, `docs/okf/` SEO notes and `thin_pins`): roughly 900+ characters of original body, 3+ media, a
   sourced date, references, and translations (translation gate). If the sources cannot support that, do not
   suggest it.
6. **Present the shortlist** to the owner, ranked, one line each:
   `term (geo, traffic) | event + date | pin type/desk | why it can rank | source URLs | new or update`.
   Include a short "dropped and why" count. Offer to create the top ones.

## Creating the approved ones

Only after the owner picks. Use the normal pipeline (`scrape_url` / the scrape docs under `docs/okf/scraping/`,
check the matching skill: construction, restaurants, prediction markets, rubrics). Rules that always apply:
one pin per event dated to when it happens (not the article date), author from the right desk, sourced facts only
(never invent dates, prices or figures), three media, sources as `cite data-ref`. In a pin research/creation
session do not run translations unless the owner asks (AGENTS.md); say they are left to the translation agent.
Do not deploy.

## Traps

- Trends are crowds looking, not events; most of a day's list is noise.
- Geo matters: a term can be a date in one market and a name in another; pin in the language and place of the event.
- Do not chase a term only for its traffic: a pin with no durable question behind it adds crawl load, not ranking.
- Google Trends' web UI (trends.google.com) needs a browser and rate-limits; the RSS reader is the supported path.
  For "is interest rising" on a specific term, open trends.google.com/trends/explore in Chrome (`@browser`) and
  read the 12-month shape; do not scrape it in bulk.
- Update this skill when the scoring or reader changes.
