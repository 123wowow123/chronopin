---
name: pin-enrichment-rubrics
description: >-
  Use this skill when adding or repairing scored rubrics and reviews on Chronopin pins: taste radar for
  food/drink, car performance (EV and gas), restaurant dining, AI language/video model rubrics with spec
  graphs, and product competitors. Gives the required fields, review minimums, save endpoints and sync files.
---

# Pin enrichment rubrics

Common rules for every rubric: only **opened HTTPS sources**, exact article titles, ISO `publishedDate`
(`YYYY-MM-DD`), **verbatim** quotes, never invented figures. Save through the API **locally and on production**
(match prod pins by `sourceUrl`; ids differ), read back, and keep the repo catalog JSON in sync.
If a figure or review is unavailable, record a specific research gap instead of filling it.

| Pin kind | Rubric | Reviews | Endpoint | Catalog to sync |
|---|---|---|---|---|
| Food, snack, beverage (ciders, beers, confectionery, launches) | 7-axis taste: Aroma 香り, Bitterness 苦味, Sweetness 甘味, Astringency 渋味, Umami うま味, Pungent 辛味, Coolness 清涼感; each 0-5 in half steps | at least 1 firsthand tasting (`PinTaste.reviews`: `url`, `title`, `publishedDate`, `quote`) | `PUT /api/pins/:id/taste` | `scripts/products/taste.json` (prod-id keyed; collides with local ids) |
| EV (`PinCarPerf`) | performance radar | at least 3, up to 6, credible road testers (Car and Driver, MotorTrend, Top Gear, Evo, Autocar); quote up to 300 chars on dynamics/steering/acceleration/handling | `PUT /api/pins/:id/car-performance` | car scripts + JSON catalogs |
| Gas car (`PinGasCarPerf`) | performance radar | same as EV | `PUT /api/pins/:id/gas-car-performance` | same |
| Restaurant (`PinDining`) | 5 axes: Food, Service, Ambience, Value, Critic acclaim; 0-5 half steps or null if unpublished | at least 3, up to 6 (Gourmet Traveller, Broadsheet, Time Out, Infatuation, MICHELIN, NYT, Eater); `publishedDate` may be null | `PUT /api/pins/:id/dining` | `scripts/restaurants/diningRubric.json`; back each cited source with references and source wikis |
| AI language/video model release or announcement | six-axis rubric (`PinLlmPerf` / `PinVideoPerf`) plus published spec/benchmark graphs and tables, credited media (see "AI model rubrics, graphs and media") | independent benchmarks and reviews | model rubric admin routes (see `daily-jobs.md#modelrubrics`) | research/replay catalogs |
| Any product pin (purchasable good or named product: vehicles, aircraft, snacks and drinks, sneakers, watches, electronics, games, software, AI models) | 2-5 `PinCompetitor` rows, rank 1 = closest rival | each row has opened HTTPS `sourceUrl` (comparison, review, spec) | `PUT /api/pins/:id/competitors` | replay scripts |

## Type-specific rules

- **Hotels**: always check Michelin Keys, Forbes and AAA acclaim in a rubric pass (`PinHotel`).
- **Competitors**: same segment and market at the pin's own time; name product and maker; link `competitorPinId`
  when we have the pin; one-line `summary`. Save locally and on production, matching prod pins by `sourceUrl`
  (ids differ). Not for restaurants, films, events or projects. Never invent a rival; queue the pin with a reason
  when no sourced rival exists. Extraction (`src/server/extract/index.ts`) names rivals when it reads a product
  page and the pin save stores them unsourced; the `productCompetitors` daily task then sources or replaces them.
- **Food and drink**: applies to every consumable (regional snack awards, ciders, beers, confectionery, new
  launches). Never leave one without a native taste radar and review citations, on local and production.
- **Cars**: aim for at least 3 verified independent reviews; up to 6. Keep scripts and JSON catalogs in sync.
- **Restaurants**: also back each cited scoring source with references and source wikis.
- **Radar scores** with no published basis stay null.
- A review's quote must actually describe the thing scored; do not reuse a review across sibling variants.

## AI model rubrics, graphs and media (owner instruction 2026-10-28)
Automatically enrich **every** AI language/video model release or announcement pin with its sourced six-axis
rubric, published specification/benchmark graphs and tables, and relevant credited media.
- Do it at creation/research time **and** repair existing gaps in every 06:00/18:00 news run, including pins
  that already have a rubric and pins whose authors are outside the curator allowlist.
- Open the exact model's launch announcement, docs, independent benchmarks and official galleries. Never
  inherit sibling-model specs; never graph incomparable evaluations together.
- Store images in Azure (see `pin-media-azure`); verify the public blobs and the saved native panels.
- Preserve authors and existing graphs, tables and media. Synchronize research/replay catalogs.
- Record specific unpublished figures, unavailable reviews or inaccessible media as research gaps; never invent
  them to fill a chart. Docs: `docs/okf/scraping/daily-jobs.md#modelrubrics`.

## Verify

Read the pin back on both environments, confirm the native panel renders, then update the catalog file and the
relevant section of `docs/okf/scraping/daily-jobs.md`.
