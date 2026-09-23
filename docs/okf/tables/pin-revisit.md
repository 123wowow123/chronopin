---
type: Postgres Table
title: PinRevisit
description: A pin marked to be looked at again - by an admin from the pin's page or by a daily job - and how the mark was resolved.
resource: ../../../scripts/db/schema/0067_daily_jobs.sql
tags: [table, schema, jobs, maintenance]
generated: { by: claude-code/claude-opus-5-5, at: 2026-09-22T18:00:00Z }
---

# Schema

| Column | Type | Description |
| --- | --- | --- |
| `id` | integer | Identity |
| `pinId` | integer | FK to Pin, cascade delete. At most one open mark per pin (`UX_PinRevisit_open`); marking it again appends to the reason |
| `reason` | varchar(1000) | What should be looked at |
| `markedBy` | integer | The admin who marked it; NULL when a job did |
| `jobRunId` | integer | The [run](job-run.md) that marked or resolved it |
| `resolution` | varchar(2000) | What was done |
| `utcCreatedDateTime`, `utcResolvedDateTime` | timestamptz | Open while `utcResolvedDateTime` is NULL |

Marked and resolved from the clock button beside a pin's edit pencil (admin
only, `GET`/`POST`/`DELETE /api/pins/:id/revisit`) and by the daily jobs'
`mark_revisit` and `resolve_revisit` tools; the midnight job's
[revisits](../scraping/daily-jobs.md#revisits) task works the open ones. Not
backed up to the seeds. Model: [pinRevisit.ts](../../../src/server/model/pinRevisit.ts).
