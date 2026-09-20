---
type: Postgres Table
title: Source
description: One row per link any pin cites, shared across pins, with its fetched text and wiki status.
resource: ../../../scripts/db/schema/0026_source_wiki.sql
tags: [table, schema]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T02:00:00Z }
---

# Schema

| Column | Type | Description |
| --- | --- | --- |
| `id` | integer | Identity |
| `urlKey` | varchar(2000), unique | The link, normalized ([citations.ts](../../../src/lib/citations.ts) `urlKey`). Longer links get no wiki |
| `url` | varchar(4000) | The link as first seen |
| `kind` | varchar(16) | `web`, `youtube`, `tweet`, `podcast` |
| `title` | varchar(1024) | The page's title |
| `status` | varchar(16) | `pending` (no wiki yet), `ready`, `failed` |
| `text` | text | The text the wiki was written from. Backed up gzipped to its own `scripts/backup/seedSourceTexts.json.gz`, keyed by `id`, so a restored wiki can be rewritten without refetching a link that may be dead |
| `textHash` | varchar(64) | sha256 of `text`, so a refetch can tell whether anything changed |
| `sourceModifiedDate` | date | The link's own publication or update date, which becomes OKF `last_modified` |
| `generatedBy` | varchar(128) | OKF actor that wrote the wiki, `chronopin-wiki/<model>` |
| `wikiVersion` | integer | 0 until the first wiki, then +1 on each rewrite |
| `attempts` | smallint | Failed tries since the last success. Retried while under 3 |
| `lastError` | varchar(2000) | Why the last try failed |
| `utcFetchedDateTime`, `utcAttemptedDateTime`, `utcBuiltDateTime`, `utcCreatedDateTime` | timestamptz | When the text was fetched, when the last try was made, when the wiki was written, when the row was created |

Model: [source.ts](../../../src/server/model/source.ts) (`Source`).
