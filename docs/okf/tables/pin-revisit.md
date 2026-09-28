---
type: Postgres Table
title: PinRevisit
description: A pin a daily job marked to be looked at again, and how the mark was resolved.
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
| `markedBy` | integer | The admin who marked it (the old clock button); NULL when a job did |
| `jobRunId` | integer | The [run](job-run.md) that marked or resolved it |
| `resolution` | varchar(2000) | What was done |
| `utcCreatedDateTime`, `utcResolvedDateTime` | timestamptz | Open while `utcResolvedDateTime` is NULL |

Marked and resolved by the daily jobs' `mark_revisit` and `resolve_revisit`
tools; the midnight job's
[revisits](../scraping/daily-jobs.md#revisits) task works the open ones. Not
backed up to the seeds. Model: [pinRevisit.ts](../../../src/server/model/pinRevisit.ts).

People do not mark pins: the admin clock button was removed on 2026-09-27.
Anyone signed in, admins included, asks for a fix with "Suggest a correction"
on the pin page (`AiFeedback`). Its review adds references, and it can demote
or replace a picture it has looked at (`PinMedium.weight`, 0090,
[suggestionMedia.ts](../../../src/server/services/suggestionMedia.ts)).
