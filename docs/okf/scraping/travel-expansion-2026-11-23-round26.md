---
type: Reference
title: "Travel shelf expansion — twenty-sixth round, 2026-11-23"
description: "MEININGER Milano Garibaldi joins Family and Budget; Great Wolf Lodge Gurnee joins Family. Catalog: `scripts/hotels/travel-expansion-2026-11-23-round26.json`. Replay `node scripts/hotels/expandTravelShelves.mjs --catalog..."
tags: [scraping, travel]
---

# Travel shelf expansion — twenty-sixth round, 2026-11-23

MEININGER Milano Garibaldi joins Family and Budget; Great Wolf Lodge Gurnee joins Family.
Catalog: `scripts/hotels/travel-expansion-2026-11-23-round26.json`.
Replay `node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-23-round26.json`;
append `--apply` for writes. Manifest/readbacks: `.scrape/prod-batches/travel-expansion-2026-11-23-round26/`.

Milan's **18 December 2017 brand opening** is explicitly confirmed in the
[operator release](https://www.meininger-hotels.com/en/press/press-releases/meininger-opened-first-hotel-in-italy/).
The former hostel was converted over ten months; this dates the MEININGER opening, not a new building's first use.
Current [portfolio](https://www.meininger-hotels.com/en/portfolio/) **80 rooms / 268 beds** matches the opening
inventory. No conversion-specific investment or fitting refurbishment benchmark verified; project cost/currency null.

The [exact hotel](https://www.meininger-hotels.com/en/hotels/milan/hotel-milan-garibaldi-station/) has private family
rooms, kitchen, laundry and lounge. Whole private rooms and dorm beds are separate products.
[Operator directions](https://help-center.meininger-hotels.com/en/support/solutions/articles/79000143619-getting-to-meininger-milano-garibaldi)
place it about 500m from **Cenisio M5**. City-centre visits require walking/transfers; no Duomo-front location or
station-platform adjacency claimed. Full address **Via Privata Giovanni Calvino 11, 20154 Milan, Italy**; operator
point **45.4909186 / 9.1710122** corroborated by exact-address PointAddress.

Milan refreshed Tripadvisor UK snapshot: **255 reviews**, overall 3.9; Rooms 4.0, Service 4.0, Location 3.7,
Cleanliness 4.1, Value 4.0, rounded to half points. Iry I's firsthand couple “Fantastic” review published July
2026 without exact day, null, site-translated from Italian. Other firsthand accounts retain reception/kitchen
interactions, evening access, location expectations and refund concerns. These remain attributed experiences.
MICHELIN Milan complete **1–40 of 40** and Forbes Milan have no match; AAA excludes Italy. Acclaim zero records
checked-guide absence, not a missing assessment.

Gurnee's pin dates **formal grand-opening ceremony 21 June 2018**, independently verified by
[Daniel Boczarski's dated Getty Images event photo](https://www.gettyimages.co.uk/detail/news-photo/chance-the-rapper-and-ceo-of-great-wolf-resorts-murray-news-photo/980492638).
The caption and creation date establish the actual button-press ceremony. Contemporary
[Daily Herald onsite reporting](https://www.dailyherald.com/20180621/news/chance-the-rapper-hits-the-waterslides-at-new-great-wolf-lodge-in-gurnee/)
and TravelPulse coverage corroborate it. Daily Herald's displayed June 21 dateline differs from its June 20 UTC
HTML metadata; the independent photo resolves the event day. Earlier publicity targeted July 1; the current
operator history instead gives July 22 reopening. Those conflicting guest-opening dates are not substituted for
the observed ceremony. The first guest-opening day remains unresolved, not silently unified.

Daily Herald quotes CEO Murray Hennessy describing **US$65m in renovation and improvements**, corroborated by
TravelPulse's description of the completed transformation. Price USD65m and factory investment metric explicitly
represent this reported **Key Lime Cove conversion**, separate from acquisition, original construction, later
spending and nightly room rates. No audited final breakdown claimed. The
[current operator history](https://www.greatwolf.com/illinois/about-us) lists **414 suites / 80,000-square-foot indoor
water park**, with shared microwaves in common areas. Do not assume an in-suite microwave. Actual suite/occupancy,
admission hours, height rules, supervision, paid activities, dining, parking and package terms require booking checks.
No date-specific all-in nightly quote verified. This is Gurnee, not downtown Chicago or Milwaukee.

Full address **1700 Nations Drive, Gurnee, IL 60031, USA**, operator and AAA verified; named resort point
**42.3837655 / -87.9450348** agrees with exact-address PointAddress. Both additions passed broad-title and canonical
source duplicate checks on local and production.

Gurnee refreshed Tripadvisor UK snapshot: **944 reviews**, overall 3.7; Rooms 3.8, Service 3.8, Location 4.3,
Cleanliness 3.9, Value 3.5 rounded to half points. Jodi K's firsthand family “Would stay again!” review published
March 2025, exact day unknown, null. Positive weekday queues/check-in feedback retained alongside November room
position, elevator congestion and heating complaints, plus maintenance/cleaning concerns. These remain individual
guest accounts. [AAA exact property](https://www.aaa.com/tripcanvas/hotel/great-wolf-lodge-AA118419) confirms
414 units; its component scores do not replace guest scores. MICHELIN Gurnee unavailable; Forbes Chicago no match.
Acclaim null.

Six distinct photos visually checked: Milan family room, kitchen and lounge from MEININGER; Gurnee frontage,
slides/wave-pool area and water-play structure from exact-property Management Photos. Credited Azure public blobs
are hash-checked before live references; no photo binaries in Git. Comparative engineering axes null.

Climate: primary **WMO Milano Linate 16080, 1991–2020**, downloaded from the
[NCEI CSV](https://www.ncei.noaa.gov/data/oceans/archive/arc0216/0253808/6.6/data/0-data/Region-6-WMO-Normals-9120/Italy/CSV/Milano_Linate_16080.csv).
Parameter 3 mean daily maximum temperature and parameter 1 precipitation totals, rounded to one decimal.
NoY rows report **26–29 valid years per monthly field**, explicitly not 30 complete samples. Web fetch timed out,
but the plain request downloaded the complete primary sheet. Gurnee uses **NOAA Chicago Waukegan Regional Airport
USW00014880, 1991–2020** metric normals, 12 complete records, station identity verified. An empty feed from a different
station code was rejected. Both are regional guidance rather than onsite forecasts. Precipitation includes snow's
water equivalent; low winter totals do not mean snow-free travel. Bands below 75 / below 150 / at least 150 mm.
Outdoor suitability is separate from indoor swimming, operation calendars and room-price seasons.

English only; translations left to the separate agent. No production code deployment performed.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Milano Garibaldi | 21395 | 21210 |
| Great Wolf Lodge Gurnee | 21396 | 21211 |

Both hosts passed complete native pin, date, address, coordinates, author, references and media-credit
readbacks, hotel rubrics and factory metrics/milestones. Milan's null project cost and Gurnee's USD65m
conversion investment read back correctly. Each pin contains three credited images; public hashes checked
before saving. Assessment date, catalog checkedAt and Azure date folders verified as 2026-11-23. All four
native pages returned HTTP 200. Local `/travel` renders both additions without application error: **Family 61 /
Budget 41**. All 10 existing travel tests and `git diff --check` passed. No batch operations remain pending.
Production category display awaits an explicitly requested code deployment.
