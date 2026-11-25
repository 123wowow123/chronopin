---
type: Reference
title: "Travel shelf expansion — sixth round, 2026-11-22"
description: "Added Gardaland Adventure Hotel (Italy) to the family shelf and MEININGER Hotel Berlin East Side Gallery to both the family and budget shelves. Research catalog: `scripts/hotels/travel-expansion-2026-11-22-round6.json`. Replay with..."
tags: [scraping, travel]
---

# Travel shelf expansion — sixth round, 2026-11-22

Added Gardaland Adventure Hotel (Italy) to the family shelf and MEININGER Hotel Berlin East Side
Gallery to both the family and budget shelves. Research catalog:
`scripts/hotels/travel-expansion-2026-11-22-round6.json`. Replay with
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round6.json`;
append `--apply` to save. Audits and allocated-ID manifest are under
`.scrape/prod-batches/travel-expansion-2026-11-22-round6/`.

Corriere del Veneto's May 28, 2016 report says Gardaland Adventure Hotel was inaugurated that day.
That is this pin's event, explicitly titled an inauguration. Travel Quotidiano distinguishes earlier
soft opening from full operation on June 1. The exact first guest's night is not inferred. Corriere
reports EUR25 million of hotel development investment and 100 themed rooms. This published hotel
investment is saved in its original currency, with a sourced factory investment metric; it is not
a nightly room rate or the whole Gardaland resort budget.

MEININGER's December 2017 operator release explicitly says the hotel opened December 1, with
245 rooms and 833 beds. These are historical opening figures. The current operator portfolio lists
243 rooms / 825 beds, so the article does not present opening capacity as today's inventory. No
property construction cost or matching cost benchmark was verified; Berlin's price/currency remain
null. Comparative engineering axes for both properties remain null for lack of a benchmark.

Berlin's operator page verifies private family rooms, twin/bunk configurations, a guest kitchen and
laundry. The card and article distinguish a whole private family room from an individual dorm bed;
no dorm lead price is used for a family stay. Private-room totals, breakfast, parking and extras must
be compared for actual dates. Published guest components are mixed, especially for room quality,
cleanliness and value; the article states that tradeoff rather than presenting a luxury experience.
Gardaland's card covers its four adventure themes and restaurant. Tickets, room occupancy, resort
transport, seasonal water-area access and operating days are explicitly booking checks. No current
all-in nightly quote is claimed for either hotel.

Property photos were visually inspected and publicly verified after Azure upload, including SHA-256
and native authorName/authorUrl readbacks. Berlin uses operator photos of a family room, guest
kitchen and outdoor terrace (1200 pixels wide); a nearly duplicated common-area angle was rejected.
Gardaland uses the exact property's entrance, reception and Arctic room-entry detail from La rete
delle mamme's historical visit feature. The Arctic photo shows a floor/entry detail, not a full
bedroom. These three 510-pixel photographs were retained without enlargement and credited to the
publication. Initial Gardaland operator URLs returned errors/403; the correct canonical hotel page
was identified through an opened search result, and independent property photos were used.

Street addresses: Via Palù 1/A, 37014 Castelnuovo del Garda, Verona, Italy, and Am Postbahnhof 4,
10243 Berlin, Germany. ArcGIS matched the exact Gardaland Adventure Hotel POI at 98.91 and Berlin's
full street-address point at 100. No city-centre coordinate was used. Authenticated title-pattern
and exact source-URL checks found no existing matching hotel pins on either host.

Hotel rubrics use opened Tripadvisor snapshots, rounded to half points:

| Hotel | Snapshot reviews | Rooms | Service | Location | Cleanliness | Value |
| --- | --- | --- | --- | --- | --- | --- |
| Gardaland Adventure Hotel | 736 | 4.6 | 4.0 | 4.4 | 4.5 | 3.6 |
| MEININGER Berlin East Side Gallery | 277 | 3.1 | 3.3 | 4.3 | 3.2 | 3.2 |

Snapshot counts are not live totals; Gardaland's opened page is an older 2025 snapshot. Its linked
independent excerpt is the original Italian wording from La rete delle mamme's actual hotel visit,
with publication day left null. A guest review on the Gardaland Tripadvisor page explicitly concerns
the neighbouring Gardaland Hotel and was not used as the firsthand excerpt. Berlin's English
“Friends trip” guest review describes a dorm stay in December 2023, published only to September
2024 precision; publication day remains null. Its dorm experience is not represented as a review of
a private family room. The Berlin quote was read verbatim in the opened web snapshot; Gardaland's
opening, capacity, cost and independent excerpt and Berlin's opening/capacity excerpts were also
checked against fetched raw page text.

MICHELIN property searches and Berlin destination listings, and Forbes Travel Guide's Berlin and
Lake Garda directories, did not establish a property-specific distinction. The Castelnuovo MICHELIN
lookup was inaccessible. Acclaim stays unknown rather than a fabricated zero; hotel class and guest
review scores are not awards. AAA coverage excludes Germany and Italy.

Monthly weather uses NOTAMET's airport-derived tables, transcribed cell by cell:

- Verona Villafranca (LIPX): NOAA GSOD-derived 1991–2020 temperatures and precipitation, explicitly a
  regional proxy for southern Lake Garda. GSOD daily extremes can differ from official station normals.
- Berlin Brandenburg (EDDB): NOAA GSOD-derived 1991–2020 temperatures, but the site's precipitation
  fallback is **WorldClim 2.1, 1970–2000**. The mixed periods and regional proxy are explicitly stated;
  precipitation is not mislabelled as measured 1991–2020 station rainfall. An undated-period DWD
  Tempelhof PDF was inspected and not used for the monthly cards.

Rain bands: below 75 mm low, below 150 moderate, otherwise high. Recommended months are editorial
outdoor-planning guidance, not a rate or crowd prediction. Current forecasts and attraction calendars
remain separate checks.

Validation and assigned IDs follow below. English data synchronization only; no production code
deployment or translation run was performed.

| Hotel | Production pin | Local pin |
| --- | --- | --- |
| Gardaland Adventure Hotel | 21281 | 21113 |
| MEININGER Berlin East Side Gallery | 21282 | 21114 |

Native pin/date/address/author/reference/media-credit fields, hotel rubric fields and development
milestones passed readback on both hosts. All four native pages returned HTTP 200. Local `/travel`
renders both additions without an application error and shows **Family 24 / Budget 19**. All 10
existing travel tests and `git diff --check` passed. No data writes remain pending. Production shelf
membership awaits an explicitly requested deployment; translations are left to the translation agent.
