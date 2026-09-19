---
type: Postgres Table
title: PinSource
description: Which links a pin cites, and which wiki version of each its summary was last built from.
resource: ../../../scripts/db/schema/0026_source_wiki.sql
tags: [table, schema]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T02:00:00Z }
---

# Schema

| Column | Type | Description |
| --- | --- | --- |
| `pinId` | integer | FK to Pin, cascade delete. Part of the primary key |
| `sourceId` | integer | FK to [Source](source.md), cascade delete. Part of the primary key |
| `role` | varchar(16) | `source` (Pin.sourceUrl) or `reference` (a PinReference) |
| `summarizedWikiVersion` | integer | The link's `wikiVersion` the summary was built from. Null means not taken in yet |
| `utcRemovedDateTime` | timestamptz | Set when the pin stops citing the link. The row is deleted at the next rebuild, which is how the rebuild knows it has to happen |

Links are matched by URL rather than by PinReference id, because references are deleted and re-inserted on every pin edit. Model: [source.ts](../../../src/server/model/source.ts) (`PinSource`).
