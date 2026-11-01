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

Which news run: 06:00 and 18:00 PT are both the `news` job. Only one run or job may be open at a time; if
`begin_job` refuses, find and finish or abandon the open run first (`/admin/jobs`), never start a second.
A run left open past 3 hours is cut off as abandoned.

## Working it

- Follow the prepared prompt, then `.agents/skills/daily-news-job/SKILL.md` for the standing authorizations,
  revisit/sentiment procedure and what to queue. Read the matching section of `daily-jobs.md` before each task.
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
