---
type: Postgres Table
title: PinPower
description: A pin's electrical capacity in megawatts (a data centre's power, a solar farm's or battery's nameplate), with its source and a note saying what the figure is. Shown on the pin page and totalled on the map.
resource: ../../../scripts/db/schema/0196_pin_power.sql
tags: [table, schema, energy, data-centers, map]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-19T00:00:00Z }
---

# Schema

| Column | Type | Description |
| --- | --- | --- |
| `pinId` | integer, PK | The pin (cascade delete). One row per pin. |
| `megawatts` | numeric(12,2) | Capacity in MW, > 0. 1 GW = 1000. A range is stored as its upper figure, with the range in `note`. |
| `source` | `title` \| `hand` | `title` was read off the pin's title ("500 MW", "1.5 GW") by the 0196 backfill. `hand` was set by a person or session from `sourceUrl`; a `title` write never replaces it. |
| `sourceUrl` | varchar(4000) | The page that states the figure. |
| `note` | varchar(500) | What the number is ("planned campus power", "critical IT load phase 1", "press estimate", "modelled by Epoch AI") and whether the site is operating or planned. |
| `checkedAt` | timestamptz | When it was last set. |

Like [PinEventInfo](../../scripts/db/schema/0082_pin_event_info.sql), `Pin#update()` never touches it, so editing a pin cannot wipe it, and it is not in `PinBaseView`.

# Where it is used

* **Pin page:** a "Power" line (`src/lib/power.ts` `formatMegawatts`, `pinPower` in `services/pages.ts`) with the note and a source link.
* **Map:** `megawatts` rides on each marker (`MAP_SELECT` in `model/pins.ts`); with a search term active, the Filters block shows `Pins / Cost / MW` totals. Cost sums USD prices only (no FX exists).
* **API:** `GET|PUT|DELETE /api/pins/:id/power` (author or admin); `PUT` body `{ megawatts, sourceUrl?, note? }` writes a `hand` row.

# Rules for filling it

* Record only a figure a source states for **that facility**. Never another site, the operator's fleet, a neighbouring campus, a combined multi-site figure, a renewable-supply/PPA contract or a floor-area guess.
* Say in `note` what the number is. Operator-stated figures are best; trade-press or filing figures next; a press or modelled estimate is allowed only when labelled as one (Ian accepted press estimates, 2026-10-19).
* No tracker numbers without attribution (Cleanview, DC Hub, Baxtel). Epoch AI's modelled IT power was accepted for 11 Meta sites and is labelled "modelled".
* Leave the pin without a row when nothing verifiable exists, and record why (see [Learnings](../scraping/learnings.md)).
