---
type: Reference
title: "Travel shelf expansion — twenty-third round, 2026-11-22"
description: "MEININGER Hotel Cologne West joins Family and Budget; Great Wolf Lodge Concord joins Family. Catalog: `scripts/hotels/travel-expansion-2026-11-22-round23.json`. Replay `node scripts/hotels/expandTravelShelves.mjs --catalog..."
tags: [scraping, travel]
---

# Travel shelf expansion — twenty-third round, 2026-11-22

MEININGER Hotel Cologne West joins Family and Budget; Great Wolf Lodge Concord joins Family.
Catalog: `scripts/hotels/travel-expansion-2026-11-22-round23.json`.
Replay `node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round23.json`;
append `--apply` to write. Manifest/readbacks: `.scrape/prod-batches/travel-expansion-2026-11-22-round23/`.

Cologne opened **22 September 2023**: [operator opening report](https://www.hotelnewsresource.com/article128294.html)
explicitly says “Today marks the opening.” The official MEININGER LinkedIn opening post's JSON-LD
`datePublished` is 2023-09-22, independently corroborating the day. The operator release displays only
September, and the October 2 retrospective is not used as the event date. The
[current operator portfolio](https://www.meininger-hotels.com/en/portfolio/) lists **209 rooms / 750 beds**,
explicitly current inventory rather than separately verified opening-day capacity. No hotel-specific
construction investment was verified; whole-OVUM mixed-use budgets are not assigned to this hotel.

The [exact hotel](https://www.meininger-hotels.com/en/hotels/cologne/hotel-cologne-west/) offers private
family rooms, guest kitchen, laundry and shared spaces. Whole private rooms and dorm beds are separate
products. Western Braunsfeld requires city transport planning. Full address **Stolberger Straße 347,
50933 Cologne, Germany**, operator point **50.9419716 / 6.8891037**, corroborated by exact-address ArcGIS
PointAddress. Both properties passed broad-title and exact canonical-source duplicate checks on both hosts.

Cologne Tripadvisor UK snapshot: **83 reviews**, overall 4.1; Rooms 3.7, Service 3.9, Location 3.5,
Cleanliness 4.0, Value 4.0, rounded to half steps. Sandra K's firsthand student-group account, “Solid hotel,”
is site-translated from German. October 2026 has no exact publication day, so null. Small sample, functional
room layout and location tradeoffs explicit. MICHELIN full Cologne list **1–8 of 8** has no match;
Forbes Cologne unavailable and AAA excludes Germany. Incomplete coverage leaves acclaim null.

Concord's pin dates the **formal community grand opening on 23 April 2009**, verified by
[local attendees writing the following morning](https://activerain.com/blogsview/1048977/great-wolf-lodge-grand-opening).
The [operator SEC-filed earnings release](https://www.sec.gov/Archives/edgar/data/1294538/000129993309001986/exhibit1.htm)
explicitly distinguishes the end-of-first-quarter guest opening from a late-April community event. No
ceremony date is presented as the first guest stay. The current [operator history](https://www.greatwolf.com/concord/about-us)
lists **402 suites**, **80,000-square-foot indoor water park** and 2019 renovation. Older 409-room figures
are not combined with this current inventory. Paid attractions, parking, dining and package fees need
separate checks; no date-specific all-in nightly quote verified.

Construction price/currency remain null: [Aquatics International's profile](https://www.aquaticsintl.com/awards/great-wolf-lodge-charlotte-concord_o/)
lists USD50m construction but its whole-resort versus aquatic scope is unclear. A development-cost
comparison PDF could not be inspected after download timeout. Neither a comparison snippet nor the
USD63.9m expandable construction loan establishes a verified comparable project cost. This specific
scope gap does not hold the otherwise researched property.

Full address **10175 Weddington Road, Concord, NC 28027, USA**. Official structured-data point
**35.36153 / -80.71178094** agrees with the exact-address PointAddress at Weddington Road Extension.
A nearby StreetAddress interpolation about 200m away was rejected. [AAA exact property](https://www.aaa.com/tripcanvas/hotel/great-wolf-lodgecharlotte-concord-AA120061)
corroborates address and 402 units. Its component ratings are not substituted for guest aggregates.
MICHELIN Concord unavailable; Forbes Charlotte has no match. Numeric acclaim null.

Concord Tripadvisor UK snapshot: **5,397 reviews**, overall 4.2; Rooms 4.3, Service 4.4, Location 4.6,
Cleanliness 4.4, Value 3.8 rounded to half steps. Victoria C's “Great Family Trip” firsthand family review
published September 2026 supplies a short exact excerpt; date null because day unknown. Positive room,
staff and water-park feedback retained alongside check-in queues, parking and dining costs. A November
firsthand guest account reports insects in dining/shopping areas and sofa-bed bedding concerns, plus
management apologies, meal adjustment and breakfast refund. These remain attributed guest reports,
not universal or independently established current conditions.

Six distinct images visually inspected: Cologne room with cot, kitchen and bar/lounge from MEININGER;
Concord front entrance, separate conference-centre entrance and indoor slides from the exact property's
Tripadvisor Management Photos. Credited Azure public blobs are hash-checked before live references.
No binary images added to Git. Both project costs and comparative engineering scores remain null.

Climate: Cologne uses **DWD Köln/Bonn 02667**, monthly MO_TX daytime highs and MO_RR rainfall,
**1991–2020**, exactly 30 valid observations per calendar month and no missing-value sentinels. Concord
uses **NOAA NCEI USC00311975 CONCORD**, metric monthly normals **1991–2020**, 12 finite records.
Both are regional stations rather than onsite forecasts. Rainfall bands are below 75 / below 150 /
at least 150 mm. Outdoor weather planning is separate from indoor swimming, seasonal operating calendars
and date-specific room prices.

English only; translations left to the translation agent. No code deployment authorized or performed.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Hotel Cologne West | 21367 | 21193 |
| Great Wolf Lodge Concord | 21368 | 21194 |

Both hosts passed complete native pin, date, address, coordinates, author, references and credited-media
readbacks, hotel rubrics and factory metrics/milestones. Both project costs read back null. Each pin
has three credited images. All four native pages returned HTTP 200. Local `/travel` renders both
additions without application errors: **Family 55 / Budget 38**. All 10 existing travel tests and
`git diff --check` passed. No batch operations remain pending. Production category display awaits an
explicitly requested code deployment.
