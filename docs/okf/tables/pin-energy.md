---
type: Postgres Table
title: PinEnergy
description: "A pin's annual electricity use in gigawatt-hours, with how the figure was arrived at, its source and a note. Shown on the pin page and filterable with the energy: search term and the TWh pills."
resource: ../../../scripts/db/schema/0197_pin_energy.sql
tags: [table, schema, energy, search]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-19T00:00:00Z }
---

# Schema

| Column | Type | Description |
| --- | --- | --- |
| `pinId` | integer, PK | The pin (cascade delete). One row per pin. |
| `gwh` | numeric(14,2) | Annual use in GWh, > 0 (1 TWh = 1000). A range is stored as its upper figure with the range in `note`. |
| `basis` | `published` \| `contracted` \| `calculated` | `published`: a source states annual consumption. `contracted`: the contracted power volume per year. `calculated`: megawatts x 8,760 hours, a ceiling at continuous running. |
| `sourceUrl` | varchar(4000) | The page the figure (or its megawatts or contract) comes from. |
| `note` | varchar(500) | The claim in words, including the arithmetic for a calculated figure. |
| `checkedAt` | timestamptz | When it was last set. |

Like [PinPower](pin-power.md), `Pin#update()` never touches it and it is not in `PinBaseView`.

# Where it is used

* **Pin page:** an "Energy" line (`src/lib/energy.ts`, `pinEnergy` in `services/pages.ts`) with the basis, note and source link.
* **Search:** `energy:>=1twh`, `energy:500-2000gwh` (a bare number is GWh; units MWh, GWh, TWh) in `src/server/util/searchQuery.ts`; the tag cloud's "1+ TWh a year" and "10+ TWh a year" pills write the same term.
* **API:** `GET|PUT|DELETE /api/pins/:id/energy` (author or admin); `PUT` body `{ gwh, basis?, sourceUrl?, note? }`.

# Rules for filling it

* A `published` figure needs a source that states consumption. Never call a calculation published.
* A `calculated` figure is the sourced megawatts for **that facility** times 8,760 hours; say so in `note`. It is a ceiling, not a measurement, and miners and other flexible loads run below it.
* A `contracted` figure is the contract volume divided by its years; name the contracts in `note`.
* Leave the pin without a row when no source or megawatt figure exists.
