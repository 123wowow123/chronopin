---
type: Postgres Table
title: OkfLintFinding
description: What the latest okf:lint run found, by check, pin and link; plus OkfLintScan, what the costly checks last looked at.
resource: ../../../scripts/db/schema/0027_okf_lint.sql
tags: [table, schema, lint]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T04:00:00Z }
---

# Schema

| Column | Type | Description |
| --- | --- | --- |
| `id` | integer | Identity |
| `check` | varchar(32) | `conformance`, `stale`, `orphan`, `quality`, `contradiction`, `imprecise` (0051) |
| `severity` | varchar(16) | `error`, `warning`, `info` |
| `pinId` | integer | FK to Pin, cascade delete. Set for a pin-level finding |
| `sourceId` | integer | FK to [Source](source.md), cascade delete. Set for a link-level finding |
| `path` | varchar(1024) | The bundle path, for a conformance finding |
| `message` | varchar(2000) | One line, as `okf:lint` prints it |
| `detail` | jsonb | For example the changed lines, or a contradiction's claims and links |

# OkfLintScan

`(check, subjectId, signature)` records what a costly check last covered, so the next run skips it if nothing has changed:

- For `contradiction`, the subject is a pin, and the signature is a hash of its title, description, dates, links and wiki versions.
- For `quality`, the subject is a link, and the signature is the wiki version already queued for a rewrite.

Both tables are backed up to `seedSources.json`. Model: [okfLint.ts](../../../src/server/model/okfLint.ts).
