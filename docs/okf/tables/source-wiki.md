---
type: Postgres Table
title: SourceWiki
description: A link's wiki pages as a tree, one main page and any number of sub-pages, replaced whole on each rewrite.
resource: ../../../scripts/db/schema/0026_source_wiki.sql
tags: [table, schema, okf]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T02:00:00Z }
---

# Schema

| Column | Type | Description |
| --- | --- | --- |
| `id` | integer | Identity |
| `sourceId` | integer | FK to [Source](source.md), cascade delete |
| `parentId` | integer | FK to this table. Null for the main page, and exactly one main page per link |
| `position` | smallint | Order among siblings, as the source has them |
| `type` | varchar(64) | OKF type: the link's kind for the main page, else `Source Part` or `Topic` |
| `title` | varchar(1024) | What the page covers |
| `summary` | varchar(2000) | One line, used as OKF `description` and to decide what to read |
| `body` | text | Markdown facts from the source |
| `tags` | varchar(64)[] | Lowercase subjects |

`Source.wikis(ids)` reads these back as trees.
