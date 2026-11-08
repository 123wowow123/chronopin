---
type: Postgres Table
title: PinProject
description: A building project's headline quantities (homes, affordable homes, hotel rooms, seats, beds, stories, floor area, site acres, parking), shown as a "Project specs" tile panel on the pin page the way PinDatacenter is for data centres.
resource: ../../../scripts/db/schema/0249_pin_project.sql
tags: [table, schema, construction, housing]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-08T00:00:00Z }
---

# Schema
One row per pin (`pinId`, cascade delete). Nullable positive quantities `units`, `affordableUnits` (<= units), `rooms`, `seats`, `beds`, `stories`, `sqft`, `acres`, `parking`; `source` (`title` | `hand`), `basis` (`published` | `planned` | `reported`), `sourceUrl`, `note`, `checkedAt`. `Pin#update()` never touches it.

# Where it is used
* **Pin page:** `data-project-panel` tiles (`projectTiles` in `src/lib/projectSpecs.ts`); hidden on data-centre pins, which have their own panel.
* **API:** `GET|PUT|DELETE /api/pins/:id/project` (author or admin). `PUT` replaces the row with `source: 'hand'`.
* **Backfill:** `scripts/construction/backfillProjectSpecs.ts [--apply]` reads counts a build pin's title states; it never replaces a `hand` row.

# Rules
Record only a count a source states for **that** project and phase (never the whole master plan). Say in `basis` whether it is published, a planned design figure or a press-reported proposal. Leave the pin without a row rather than guess; area/parking/affordable counts come from the developer, city filing or news article, with `sourceUrl`.
