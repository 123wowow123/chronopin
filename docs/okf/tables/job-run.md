---
type: Postgres Table
title: JobRun
description: One run of a daily pin job - its claimed slot, who reasoned for it, every write it made, what it learned and its closing report.
resource: ../../../scripts/db/schema/0067_daily_jobs.sql
tags: [table, schema, jobs, learnings]
generated: { by: claude-code/claude-opus-5-5, at: 2026-09-22T18:00:00Z }
---

# Schema

| Column | Type | Description |
| --- | --- | --- |
| `id` | integer | Identity |
| `jobId` | varchar(40) | The job in the `dailyJobs` admin setting (`midnight`, `news`) |
| `slot` | varchar(120) | What was claimed: `news@2026-09-22T06:00 America/Los_Angeles` for a scheduled run, `manual:<iso>` for one started by hand. Unique with `jobId`, which is what makes a slot run once however many servers tick |
| `trigger` | varchar(10) | `schedule` or `manual` |
| `status` | varchar(10) | `running`, then `ok`, `failed` or `skipped` (no LLM was available). A run still `running` after three hours is closed as `failed` |
| `driver` | varchar(10) | `api` (the app's key) or `session` (a headless Claude Code on its login) |
| `tasks` | jsonb | The task ids the run was given |
| `actions` | jsonb | `[{at, tool, pinId?, title?, detail}]`, every write in order |
| `learnings` | jsonb | `[{at, topic, text}]`; the 25 newest across runs go into every run's instructions |
| `report` | text | The model's closing report |
| `error` | varchar(4000) | Why a run failed or was skipped |
| `usage` | jsonb | Tokens and an estimated cost (`api`), or turns and duration (`session`) |
| `userId` | integer | The admin who started a manual run |
| `utcStartedDateTime`, `utcFinishedDateTime` | timestamptz | |

Not backed up to the seeds: runs are the server's history, not content. Model: [jobRun.ts](../../../src/server/model/jobRun.ts); the jobs: [Daily pin jobs](../scraping/daily-jobs.md).
