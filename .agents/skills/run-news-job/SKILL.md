---
name: run-news-job
description: >-
  Use this skill when the user asks to run, start or kick off the Chronopin daily pin jobs (the 06:00 /
  18:00 America/Los_Angeles news run, midnight, monthly or a full run) from a local or VS Code session
  instead of the server's schedule. It covers launching a prepared run and closing it. For how to work the
  run itself (revisits, sentiment, mismatches), hand off to `daily-news-job`.
---

# Launch the daily jobs from a local session

Authoritative detail: `docs/okf/scraping/daily-jobs.md` ("By hand in the active LLM session", "A full run").
Owner, 2026-10-06: run requested jobs with whichever LLM is active in this session and do not ask again
for permission. This does not authorize production deployment.

## Pick a path

1. **The `chronopin` MCP tools are already loaded in this session** (`begin_job`, `finish_job`, ...; load
   them with ToolSearch if deferred). Call `begin_job` for the job, work it, call `finish_job` with the report.
   Fastest, nothing to install. Needs a prepared full-run config (path 2) to have been added, since every
   other tool refuses between jobs.
2. **Prepare a run:**
   - Full run: `npm run jobs:run -- --all --prepare` (midnight, news, monthly in saved order).
     `--jobs midnight,news` picks some.
   - One job: `npm run jobs:run -- --job news --prepare` (`midnight`, `news`, `monthly`).
   - It writes the prompt and an MCP config and prints a
     `claude mcp add chronopin -- ... --run <id>` line. Run it, restart or reconnect MCP if the tools
     do not appear, then work the printed prompt file.
3. **Headless, no manual work:** `npm run jobs:run -- --all --driver session` (Claude Code's own login, no
   API key). Same as the admin page's "Run all jobs now". Use only when the user wants it unattended.

**Register once (2026-11-04):** `claude mcp add chronopin -- <tsx> scripts/jobs/mcp.ts --follow` makes every tool call work for whichever run is open now, so a new `--prepare` needs no rebind or reconnect (reconnect `chronopin` in `/mcp` one time after switching to it). The rebind below is only for the old `--run <id>` registration.

**Rebinding the MCP to a new run (VS Code, 2026-11-02):** `claude` is not on PATH there. Use the extension's
binary, `~/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/claude`: run
`mcp remove chronopin`, then the printed `mcp add chronopin -- ... --run <id>` line, then reconnect `chronopin`
in `/mcp`. The tools are bound to one run id, so a stale id (previous run) means the reconnect is needed.
This build has no `begin_job` / `finish_job` tool; close with `npm run jobs:run -- --finish <id> --report <file>`.
Revisit marks on seasonal pins whose official 2027 pages are still the 2026 edition stay open: record them as
checked in the run note, do not edit or resolve them.

Which news run: 06:00 and 18:00 PT are both the `news` job. Only one run or job may be open at a time; if
`begin_job` refuses, find and finish or abandon the open run first (`/admin/jobs`), never start a second.
A run left open past 3 hours is cut off as abandoned.

## Working it

- Follow the prepared prompt, then `.agents/skills/daily-news-job/SKILL.md` for the standing authorizations,
  revisit/sentiment procedure and what to queue. Read the matching section of `daily-jobs.md` before each task.
- Work **every** task `begin_job` lists, drain the revisit and event-info queues, and write the run note +
  okfLint before closing (owner, 2026-11-01; see "Always complete the whole run" in `daily-news-job`).
  Never `finish_job` after a partial pass.
- 06:00 / 18:00 also create `Predicted` pins and the Brent/WTI threads: `.agents/skills/prediction-market-pins/`.
- `create_pin` returns `needs`: act on every item before the run ends or list it in the report.
- Do not run pin translations (owner, 2026-10-30); report the handoff.
- Do not run a database pull, local search rebuild or deploy as part of a job.

## Closing

- Prepared single run: `npm run jobs:run -- --finish <id> --report <file>`.
- Full run: `finish_job` per job with its report (what was checked, saved, left, and why).
- Read saved changes back on local and prod, confirm queues drained, then resolve review marks.
- Write the run note `docs/okf/scraping/news-YYYY-MM-DD-{am,pm}.md` (copy the previous note's OKF
  frontmatter) and run `npx vitest run src/lib/okfLint.test.ts`.

## Unattended full-run checklist (owner, 2026-11-02: automate the whole job)

Work the lanes in this order inside one open run, writing each lane's result into the slot's run note as it
finishes (so a cut-off run leaves a usable note), then close once with `jobs:run --finish <id> --report <file>`:

1. Prepare (`jobs:run --job news --prepare`), rebind the MCP (see above), load tools with ONE ToolSearch call:
   `revisit_queue, pending_event_info, record_event_info, pending_sentiment, record_sentiment, review_research_gaps,
   prediction_markets, predicted_pins, update_pin, get_pin, resolve_revisit, record_learning, WebSearch, WebFetch`.
2. Lane 1 revisits: fetch operator pages in parallel (4 per batch); edit only on a verified fact; otherwise note
   "checked, no new evidence" and leave the mark.
3. Lane 2 event info: loop `pending_event_info(limit 2)` -> `record_event_info` 20 times. Read from the pages
   handed back (no extra fetch needed); decimals are fine for prices but tiers take whole numbers; a prior-edition
   lineup or price is never recorded; future "early bird opens <date>" = PreOrder with that date.
4. Lane 3 markets (`prediction_markets` once), lane 4 `pending_sentiment` until empty, lane 5 ads/products.
5. Write `news-YYYY-MM-DD-{am,pm}.md`, run `npx vitest run src/lib/okfLint.test.ts`, then finish.
Spend parallel tool calls on independent fetches; stop and report a task only for a concrete blocker.

## Every lane, every run (owner, 2026-11-04)

All five lanes are done in full on **every** 06:00 and 18:00 run; "lanes still open" is not an acceptable close.
Runs 43-45 left lanes 1, 3, 4 and 5 open and the backlog (25 revisits, 129 model-rubric gaps, 19 pins needing ads)
only grew. Per run:

- Lane 1: every revisit mark is re-checked and edited, resolved or re-noted with the new evidence. `weekReview`,
  `freshSources` and `pingang_handoff.py` run too.
- Lane 3: scan the markets, create every dated Predicted pin, thread Brent and WTI, run `prediction_accuracy`.
- Lane 4: `model_scores`, `model_rubric_gaps` (work the batch it lists), `industry_forecast_status`,
  `review_research_gaps`, horoscopes.
- Lane 5: `pin_ads_check` fills every pin in `needsAds`, `holiday_ads_check`, `product_lifecycle_sync`,
  `pending_ad_translations`, trader positions, person trades, product competitors, factory profiles.
- If a run cannot finish (session limit, blocked source), say which task and why in the run note; do not close
  with lanes silently skipped. Delegate independent lanes to subagents to finish in time.
- Do **not** use `oil_commodity_markets` with `apply: true`: it writes canned text through direct SQL (see
  learnings.md "Oil helper is not safe for publication"). Build Brent/WTI month-end pins by hand from the Kalshi
  API (KXBRENTMON; KXWTI is a daily series, use the month's last-day event, e.g. `KXWTI-26OCT3014`), check
  `find_pins` by source URL first, and thread each month under the previous one.

## Added after run 49

- Daily-job script helpers live in `scripts/jobs/` (`pingang_handoff.py`, `pingang_enrich_media.py`); scratch scripts go in the session scratchpad, not the repo.
- Prediction-market pins: dollar volume and odds carry the observation date; thread to the existing parent (the Iran ceasefire pin 1952 is the parent for new ceasefire markets); call `prediction_accuracy` with `apply: true` after creating pins.
- Before closing, list every open lane and unworked task in the run note (see `news-2026-11-02-am.md`) so the next slot starts there.

## Added after run 46

- Work the lanes with background subagents (see `daily-news-job` "Learnings from run 46"): one per lane in parallel, then a follow-up wave, then the parent writes the note and closes. Count revisit marks with a high `limit`; the default may hide some.

## MCP transport in a Codex terminal session (run 48)

When the tools are not registered as a connector, the existing stdio MCP protocol can be called directly from a persistent child process (`scripts/jobs/mcp.ts --run <id>`). Keep that process alive for paired research/save calls: `pending_event_info` stores its opened pages in a process-local `eventPagesRead` map and `record_event_info` must run in the same process. Launching a fresh MCP process per call loses that evidence cache and the record tool correctly refuses. Preserve the protocol's JSON-RPC response/error checks and the native run action log; do not substitute direct database writes.
