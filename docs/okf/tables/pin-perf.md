---
type: Postgres Table
title: PinPerf
description: "A hardware pin's published performance figures: bar charts comparing the part with its predecessor or rivals, and spec tables, each with its source page. Drawn on the pin page."
resource: ../../../scripts/db/schema/0198_pin_perf.sql
tags: [table, schema, hardware, charts]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-19T00:00:00Z }
---

# Schema

| Column | Type | Description |
| --- | --- | --- |
| `pinId` | integer, PK | The pin (cascade delete). One row per pin. |
| `charts` | jsonb array | `{ title, unit, higherIsBetter?, note?, sourceUrl?, bars: [{ label, value, highlight? }] }`. `highlight` marks the pin's own part. |
| `tables` | jsonb array | `{ title, columns, rows, note?, sourceUrl? }`; `columns[0]` heads the row labels and each row has one cell per column. |
| `checkedAt` | timestamptz | When it was last set. |

At least one chart or table. Like [PinEnergy](pin-energy.md), `Pin#update()` never touches it and it is not in `PinBaseView`.

# Where it is used

* **Pin page:** `PinPerf` (`src/components/pin/PinPerf.tsx`), server-rendered under the pin's map and rubric panels.
* **API:** `GET|PUT|DELETE /api/pins/:id/performance` (author or admin); `PUT` replaces the charts and tables. Validation in `src/lib/pinPerf.ts`.
* **Seed:** `scripts/hardware/perf.json` and `npx tsx scripts/hardware/perf.ts` (local); PUT the same body to prod.

# Rules for filling it

* Only vendor-published or benchmark-body figures, each block with its source page. Never an estimate.
* Chart only like-for-like rows (same precision, same sparsity, same scope); put everything else in a table and say so in `note`.
