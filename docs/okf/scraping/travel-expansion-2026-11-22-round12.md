---
type: Reference
title: "Travel shelf expansion — twelfth round, 2026-11-22"
description: "Added MEININGER Hotel Paris Porte de Vincennes to family and budget, and LEGOLAND Castle Hotel Windsor to family. Catalog: `scripts/hotels/travel-expansion-2026-11-22-round12.json`. Replay: `node scripts/hotels/expandTravelShelves.mjs..."
tags: [scraping, travel]
---

# Travel shelf expansion — twelfth round, 2026-11-22

Added MEININGER Hotel Paris Porte de Vincennes to family and budget, and LEGOLAND Castle Hotel Windsor
to family. Catalog: `scripts/hotels/travel-expansion-2026-11-22-round12.json`. Replay:
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round12.json`;
append `--apply` to save. Manifest and native readbacks are under
`.scrape/prod-batches/travel-expansion-2026-11-22-round12/`.

MEININGER's subsequent Lyon launch release explicitly records the Paris opening milestone on
**October 9, 2019**. Covivio's formal inauguration on **November 13, 2019** is separate; its owner
project sheet says open since October and reports **249 rooms / 946 beds / €47 million investment**.
Those figures apply to Paris Porte de Vincennes, not the separate Lyon hotel. Pin price is EUR47m,
with an explicitly labelled owner project-investment metric; no FX conversion or nightly-rate claim.
Private family-room layout, occupancy, shared kitchen and extras must be checked for the booked room.
The eastern 12th-arrondissement location is not presented as a central-sights hotel or given invented
walking times. A shared dorm bed and a whole private room are different booking products.

Paris's opened Tripadvisor UK snapshot has **314 reviews**, overall 3.6/5. Components Rooms 3.5 /
Service 3.7 / Location 3.7 / Cleanliness 3.4 / Value 3.8 are rounded to half points. Housekeeping,
service and noise tradeoffs remain visible. Eva's English firsthand February 2026 review provides
a short exact walls/noise excerpt; precise publication day unavailable, date null. Guest allegations
are not promoted to independent findings. The current operator property page and newer reviews were
read; an old electrical-outage report is not presented as proof of a current closure.

Windsor's public Castle Hotel opening is **July 1, 2017** in contemporary Brick Fanatics and dated
Theme Park Guide coverage, corroborated by a firsthand Scotsman account explicitly saying July 1.
The subcontractor's approximate June 2017 handover wording is not substituted for the guest-opening
milestone. The Scotsman page now labels publication February 28, 2019, while older search metadata
says July 6, 2017; it is used as opening-day corroboration, not as a precisely dated review record.
The review rubric uses a separate firsthand family launch-preview account in Belfast News Letter,
**published July 14, 2017**, updated July 18, with a short exact room-detail excerpt. The preview
sleepover and historical menu/access context are explicit, without making current offers from them.

Main contractor McGoff describes a **£10 million** Castle Hotel project with **61 themed bedrooms**.
The stated scope includes hotel construction, restaurant/bar, reception and existing dining changes,
external landscaping and related works. Pin price GBP10m is explicitly the reported contractor
project value, not a verified all-in wider-resort investment. No cost is imported from the Castle
Hotels in Denmark, Germany or California. Current operator room themes, in-room treasure hunt and
shared resort facilities are verified. The pool and water-play area are in the neighbouring Resort
Hotel; the Playroom is a shared resort facility. Current access rules, package inclusions, occupancy
and park operating dates must be checked. No old early-ride duration, menu or promotion is reused.

Windsor's opened Tripadvisor UK snapshot has **469 reviews**: Rooms 3.9 / Service 3.6 / Location 4.5 /
Cleanliness 3.9 / Value 3.2, rounded to half points. Value and upkeep/service tradeoffs are retained.
Snapshot counts are not live totals. Source quote budgets are respected.

MICHELIN Paris first page covers only 48 of 154 hotels; pagination was not fully read, so acclaim
remains null. Forbes Paris directory was read with no MEININGER match. The Windsor MICHELIN directory
did not establish property recognition; Forbes Windsor page was unavailable. Windsor acclaim is
also null rather than an invented zero. AAA's program excludes France and UK. No Key or Forbes award
is asserted from hotel class or guest-review ratings.

Six distinct official photos were downloaded and visually inspected. Paris: family room, exterior
and guest kitchen. Windsor: Castle Hotel exterior, Wizard room and shared Playroom. Shared-facility
context is explicit in the article and activity card. Images are saved to Azure, with public SHA-256
and native credit readbacks. No binaries enter Git. The old Castle Hotel URL returned 404; the current
`/short-breaks/accommodation/the-legoland-castle-hotel/` URL is used for identity.

Full addresses: **37 Boulevard Carnot, 75012 Paris, France**, and **LEGOLAND Castle Hotel, Winkfield
Road, Windsor SL4 4AY, England, UK**. Paris ArcGIS point-address match scores 100. Windsor returned two
same-name POIs: the first, 51.465336 / -0.647028, matches the Nominatim hotel footprint **way 563732617**
(51.4653192 / -0.6470018), and is used. The other point is rejected. The hotel's published mailing
postcode is retained rather than the nearby OSM postcode. No city-centre or park-entrance point is
substituted. Broad duplicate checks find only the separate, already-added Billund Castle Hotel;
that property's IDs and source URL remain unchanged. No Paris or Windsor match exists on either host.

Paris seasonal data reuses the verified **Météo-France Paris-Montsouris 75114001, 1991–2020** table
from round five, reworded as regional guidance for eastern Paris. Windsor uses **Met Office Heathrow,
1991–2020**; the current first table was fetched again and agrees with the round-three values. It is
nearby regional guidance, not a resort forecast. Normal daytime highs are not mean temperatures.
Rain bands: below 75 mm / below 150 mm / at least 150 mm. Park operating dates and room-rate seasons
are checked separately from climate suitability.

Unsupported comparative engineering scores remain null. No deployment or translation run was
performed. Translations remain with the separate agent.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Hotel Paris Porte de Vincennes | 21330 | 21171 |
| LEGOLAND Castle Hotel Windsor | 21331 | 21172 |

Native title/source/date/address/coordinates/author/reference/media-credit fields, hotel rubrics and
factory milestones passed readback on both hosts. All four native pages returned HTTP 200. Local
`/travel` renders both additions without an application error and shows **Family 33 / Budget 27**.
Windsor's regional climate label was updated in both catalogs to name Windsor rather than London.
All 10 existing travel tests and `git diff --check` passed. No data writes remain pending.
Production category display awaits an explicitly requested code deployment.
