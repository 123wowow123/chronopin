---
type: Reference
title: "Travel shelf expansion — thirteenth round, 2026-11-22"
description: "Added MEININGER Hotel Copenhagen to family and budget, and LEGOLAND Hotel Florida to family. Research catalog: `scripts/hotels/travel-expansion-2026-11-22-round13.json`; replay with `node scripts/hotels/expandTravelShelves.mjs --catalog..."
tags: [scraping, travel]
---

# Travel shelf expansion — thirteenth round, 2026-11-22

Added MEININGER Hotel Copenhagen to family and budget, and LEGOLAND Hotel Florida to family.
Research catalog: `scripts/hotels/travel-expansion-2026-11-22-round13.json`; replay with
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round13.json`
and append `--apply` for writes. Resumable manifest and complete native readbacks live under
`.scrape/prod-batches/travel-expansion-2026-11-22-round13/`.

Copenhagen's pin dates its **January 1, 2017 entry into MEININGER**, explicitly stated in the operator's
[portfolio announcement](https://www.meininger-hotels.com/en/press/press-releases/urban-house-copenhagen-by-meininger/).
The hotel had operated since 2015 as Urban House Copenhagen; this is not a fabricated opening date.
The joining announcement lists 218 rooms. The [December 2025 name-change release](https://www.meininger-hotels.com/en/press/press-releases/meininger-hotel-copenhagen-new-name/)
reports 235 rooms / 873 beds and establishes the current MEININGER Hotel Copenhagen identity.
Capacity metrics label that later inventory explicitly. The current [operator hotel page](https://www.meininger-hotels.com/en/hotels/copenhagen/hotel-copenhagen/)
verifies private family rooms, communal guest kitchen and social areas. A private room is distinct
from an individual dorm bed; no old promotion becomes a current quote.

The Copenhagen Tripadvisor UK snapshot has 4,634 reviews. Components Rooms 4.0 / Service 4.0 /
Location 4.6 / Cleanliness 4.3 / Value 4.1 are rounded to half points. Sarah M's firsthand family
review, “Great base for exploring,” supplies a short exact kitchen excerpt. Its displayed publication
month is August 2026 without day, so publishedDate is null. Recent guest reports of tired rooms and
weekend noise remain in the article as guest feedback. Counts are research snapshots, not live totals.
MICHELIN's complete Copenhagen directory, 1–20 of 20, and Forbes Copenhagen directory have no match
under current or former hotel name; AAA awards do not cover Denmark. Acclaim zero records that
checked-directory result, not an assertion of poor guest quality.

LEGOLAND Florida's [operator-issued opening release](https://www.prnewswire.com/news-releases/legoland-hotel-at-legoland-florida-resort-makes-its-long-awaited-debut-300084294.html)
states the hotel opened **May 15, 2015**, with **152 rooms and suites**. This is the original hotel,
not the park's 2011 opening, Pirate Island Hotel or Beach Retreat. Current [hotel information](https://www.legoland.com/florida/places-to-stay/legoland-hotel/)
verifies themed rooms, separate children's sleeping area, interactive play and pool. Current room
refurbishments are not limited to the four original themes. The [room-only product](https://www.legoland.com/florida/places-to-stay/vacation-packages/room-only/)
means park admission is not universal; check booked package, occupancy, breakfast, fees and dates.
Historical opening rates and undated AAA starting rates are excluded.

Florida's Tripadvisor UK snapshot has 1,642 reviews: Rooms 4.4 / Service 4.1 / Location 4.4 /
Cleanliness 4.4 / Value 3.6, rounded to half points. Jonathan V's firsthand family review dated
November 14, 2026 supplies a short exact walk-to-park excerpt. Room wear, dining delays and food
cost tradeoffs remain visible; the property is not added to Budget. The exact-property
[AAA listing](https://www.aaa.com/tripcanvas/hotel/legoland-hotel-florida-resort-AA126109)
has inspector notes and room/public-area component scores, but a numeric Diamond designation was
not established from the opened text. MICHELIN Winter Haven directory was unavailable; Forbes
Orlando was checked without a match but does not prove complete Winter Haven coverage. Acclaim
stays null. No award is invented from star class or generic AAA header text.

Neither property has a verified hotel-specific construction/conversion budget. Project price and
currency remain null, separate from room rates. Comparative engineering scores remain null; sourced
operating milestones and capacity metrics are saved instead. Quotes were checked against opened
source text, and short review excerpts stay within source quote budgets.

Six distinct official photos were downloaded and visually inspected: Copenhagen family room,
kitchen and lounge; Florida exterior, Kingdom children's bunk beds and hotel pool. Azure public
SHA-256 verification precedes pin creation; source credits are checked on native readbacks. No
image binaries enter Git.

Copenhagen retains the full official address **Colbjørnsensgade 5–11, 1652 Copenhagen, Denmark**.
ArcGIS's number-11 address point and current MEININGER POI agree at 55.672239044529 / 12.562296834105;
OSM's renamed hotel node corroborates that location. Number 5's distinct street point and an older
Urban House POI south of the property are not used. Florida's full address is **1 LEGOLAND Way,
Winter Haven, FL 33884, United States**. Its exact OSM hotel point 27.9882458 / -81.6917568 agrees with
ArcGIS's LEGOLAND Hotel POI; neither the park centre nor Pirate Island is substituted. Broad title
and canonical-source duplicate checks found no existing hotel identity on either host.

Copenhagen weather uses **WMO / DMI Copenhagen 1961–1990** historical normals, explicitly labelled as
an older baseline rather than modern normals. The actual monthly station JSON was read; older data
are a recorded gap. Winter Haven uses **NOAA NCEI USC00089707, 1991–2020** monthly normals, requested
in metric units, with property-local regional guidance. Values are normal daytime highs, not mean
temperatures or forecasts. Rain bands are below 75 / below 150 / at least 150 mm. Rainfall amounts,
park calendars and date-specific room rates are separate planning inputs.

No code deployment or translation run was performed. Translations remain with the separate agent.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Hotel Copenhagen | 21332 | 21173 |
| LEGOLAND Hotel Florida | 21333 | 21174 |

Native title/source/date/address/coordinates/author/reference/media-credit fields, complete hotel
rubrics, factory metrics and milestones passed readback on both hosts. All four native pages returned
HTTP 200. Local `/travel` renders both additions without an application error and shows **Family 35 /
Budget 28**. All 10 existing travel tests and `git diff --check` passed. No data writes remain pending.
Production category display awaits an explicitly requested code deployment.
