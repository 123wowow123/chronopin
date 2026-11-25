---
type: Reference
title: "Travel shelf expansion — fourth round, 2026-11-22"
description: "Added Universal Stella Nova Resort and Universal Terra Luna Resort to both the family and budget shelves. Both have official Prime Value positioning and standard two-queen rooms for up to four. English pin data is saved on production..."
tags: [scraping, travel]
---

# Travel shelf expansion — fourth round, 2026-11-22

Added Universal Stella Nova Resort and Universal Terra Luna Resort to both the family and budget
shelves. Both have official Prime Value positioning and standard two-queen rooms for up to four.
English pin data is saved on production and local; runtime shelf membership needs a separately
requested code deployment. Translations remain with the translation agent.

The source catalog is `scripts/hotels/travel-expansion-2026-11-22-round4.json`. Replay with
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round4.json`;
append `--apply` to save. Audit snapshots and allocated-ID manifest live under
`.scrape/prod-batches/travel-expansion-2026-11-22-round4/`.

Universal's contemporaneous first-guest releases confirm January 21, 2025 for Stella Nova and March
25, 2025 for Terra Luna. An older Terra Luna fact sheet/tourism listing retained February 25; the
actual opening release takes precedence. Property-name searches in the authenticated Pin table on
both hosts found no existing hotel pins, and exact source-URL checks also found no duplicates.

Loews' property pages supply full addresses (4500 and 5500 Epic Boulevard, Orlando FL 32819) and
current transport/parking information. ArcGIS matched Stella Nova's exact POI at 100 and Terra Luna's
street address at 95.2; Terra Luna's weaker POI match was not used. Stella Nova's walking path is
explicitly described; Terra Luna is presented with shuttle transport rather than inheriting its
sibling's dedicated path. Separate park tickets, paid parking, occupancy limits and the absence of
included Universal Express Unlimited are stated in the articles. Loews listed overnight self-parking
at $30 plus tax per vehicle per night, subject to change. Current official hotel benefits were checked.
No historical promotional room rate or current guaranteed all-in nightly quote was invented.

Three distinct photos per hotel were visually inspected: exterior, pool and two-bed room. The four
exterior/pool images come from exact Loews property pages, with operator credits; Stella Nova's
room is credited to Andrew Long / Wandering In Disney and Terra Luna's to Orlando Informer.
All six are in Azure, verified by public download and SHA-256, with native authorName/authorUrl
readbacks after thumbnail processing. The two 1024-pixel room photos were not upscaled.

Hotel rubrics use opened Tripadvisor UK property snapshots, with their smaller review samples
explicitly recorded rather than presented as live totals:

| Hotel | Snapshot reviews | Rooms | Service | Location | Cleanliness | Value |
| --- | --- | --- | --- | --- | --- | --- |
| Stella Nova | 126 | 4.1 | 3.8 | 4.3 | 4.4 | 3.8 |
| Terra Luna | 72 | 3.8 | 3.7 | 3.9 | 4.1 | 3.8 |

Native scores round those published values to half points. Stella Nova's independent stay review is
Wandering In Disney, dated June 22, 2026 on the article (UTC metadata falls June 23). Terra Luna uses
AAA's inspector excerpt with no invented publication day. All saved quotes were checked verbatim
against fetched page text. AAA's property pages were inspected; component scores were not treated
as Diamond counts. MICHELIN's Orlando page displayed five other hotels and Forbes Travel Guide's
Orlando directory did not identify either resort; acclaim remains null.

Development profiles carry per-property opening and 750-room capacity evidence. The PCI project
profile and civil contractor SDC describe the combined two-hotel construction work, including its
precast system, without a verified property-specific budget. Combined project quantities were not
split into unsupported per-hotel figures. No matching cost benchmark or cost allocation was
established; construction prices and comparative engineering scores remain null.

Both receive the Florida Climate Center's Orlando International Airport 1991–2020 monthly normals,
with explicit period/station, Celsius daytime highs and the existing Orlando rainfall bands (under
3 inches low, under 6 moderate, otherwise high). Recommended months are editorial climate guidance,
not predictions of hotel rates or holiday crowds.

Validation results and assigned IDs follow below.

| Hotel | Production pin | Local pin |
| --- | --- | --- |
| Universal Stella Nova Resort | 21271 | 21103 |
| Universal Terra Luna Resort | 21272 | 21104 |

Native pin/reference/address/author/media-credit readbacks, hotel fields and development milestones
passed on both hosts. All four native pages returned HTTP 200. The local `/travel` page renders both
additions without an application error and shows **Family 21 / Budget 17**. All 10 existing travel
tests passed and `git diff --check` passed. No pending writes remain. No production code deployment
or translation run was performed.
