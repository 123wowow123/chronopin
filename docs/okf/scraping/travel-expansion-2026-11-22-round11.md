---
type: Reference
title: "Travel shelf expansion — eleventh round, 2026-11-22"
description: "Added JO&JOE Vienna to budget and Great Wolf Lodge Colorado Springs to family. Catalog: `scripts/hotels/travel-expansion-2026-11-22-round11.json`. Replay with `node scripts/hotels/expandTravelShelves.mjs --catalog..."
tags: [scraping, travel]
---

# Travel shelf expansion — eleventh round, 2026-11-22

Added JO&JOE Vienna to budget and Great Wolf Lodge Colorado Springs to family. Catalog:
`scripts/hotels/travel-expansion-2026-11-22-round11.json`. Replay with
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round11.json`;
append `--apply` to save. Native readbacks and assigned-ID manifest are under
`.scrape/prod-batches/travel-expansion-2026-11-22-round11/`.

Accor's launch release on its Austrian PR agency's site explicitly confirms **August 26, 2021**
for JO&JOE Vienna, with **345 beds**, above the IKEA store at Westbahnhof. September coverage is
not the guest opening. The current operator page distinguishes private/atypical rooms for three
from shared dormitories for up to twelve. Private room and dorm-bed pricing are different products.
The social bar, events, rooftop and quiet-sleep tradeoff are clear. No expired launch rate or
current all-in nightly quote is invented, and no IKEA whole-building cost is assigned to the hostel.

JO&JOE's opened Tripadvisor UK snapshot has 58 reviews: Rooms 3.7, Service 4.0, Location 4.7,
Cleanliness 3.8, Value 3.7, rounded to half steps. Sleep Quality 2.9 is retained explicitly in the
article, not relabelled as another axis. Sami M's July 2026 English firsthand dorm review supplies
a short exact excerpt about housekeeping; a precise publication day is unavailable, so date null.
Limited shared food-preparation equipment is not presented as a full cooking kitchen. Raw operator
page fetch returned 403, but the full exact property page was read through web.

The Gazette's January 27, 2017 contemporary launch report was fetched successfully and confirms
**December 16, 2016** as Great Wolf Lodge's actual guest opening. Its January ribbon-cutting is a
separate event; an older projected December 26 date is not substituted. The CEO reported **about
US$100 million invested**, including acquisition of the unfinished Renaissance hotel, completion,
amenities and the water park. This combined project scope is explicit in the article and factory
investment metric; pin price is USD100,000,000, with no FX conversion and no claim that it is a
construction-only subtotal. The same report gives **311 all-suite rooms**. The current operator
page describes a 50,000-square-foot indoor water park; bookings must be checked for suite occupancy,
park access, height restrictions, meals, parking, extra activities and fees. Expired November 15
Black Friday booking offers and old opening promotions are excluded.

Great Wolf's opened Tripadvisor UK snapshot has 3,189 reviews: Rooms 4.2, Service 4.3, Location 4.5,
Cleanliness 4.5, Value 3.5, rounded to half steps. Value and optional-extra tradeoffs stay visible.
Selvia priska W's displayed November 2026 firsthand family review provides a short exact excerpt;
precise publication day unavailable, date null. These counts describe snapshots, not live totals.
No guest allegations are promoted to independently established facts.

Complete MICHELIN city lists were read (Vienna 35, Colorado Springs five), without property matches.
Forbes destination lists also do not contain these properties. JO&JOE acclaim is 0 for the checked
guide selections; AAA does not cover Austria. Visit Colorado Springs contains a secondary AAA
3 Diamond field and a Forbes 3 Star field. A current primary AAA property record was not verified,
and Forbes Travel Guide does not corroborate the latter field. Great Wolf acclaim remains null;
neither secondary tourism field is promoted to a confirmed award. Hotel star class is not a Key.

Three distinct photos per hotel were downloaded and visually inspected. Vienna's dorm room, rooftop
and building exterior are from Accor's launch gallery, credited to **Accor / Philipp Lipiarski** via
Ketchum Austria. Colorado's aerial exterior, indoor water-park overview and lobby are from the exact
Visit Colorado Springs meetings-property gallery; nearby recommendation photos are excluded. Those
images have modest source resolution (525/600 pixels) and are not upscaled or substituted with a
sibling hotel's stock image. Public Azure SHA-256 and native credit readbacks are verified. No image
binaries enter Git.

Full addresses are **Europaplatz 1/6, 1150 Vienna, Austria**, and **9494 Federal Drive, Colorado Springs,
CO 80921, United States**. Both ArcGIS point-address matches score 100. Vienna's geocode uses street
number 1 for the upper-floor hostel; the operator's /6 suffix is retained in the address. No city
points are used. Broad authenticated title-pattern and exact-source checks found no duplicates on
either host.

Vienna climate uses the city's complete cached primary table, GeoSphere Austria **Wien Hohe Warte,
1991–2020**; all twelve months, column labels and source attribution were read through web search.
Direct fetch returned 403/500; this limitation is recorded rather than pretending a successful raw
fetch. Normal daytime highs, not mean temperatures, and monthly precipitation totals are used.
Colorado uses the fetched **NWS Pueblo Colorado Springs 1991–2020** normal table, with Fahrenheit
highs converted to Celsius and precipitation inches to millimetres for classification. The NWS
summary caveat applies; these are regional planning normals, not property forecasts or engineering
data. Rain bands: below 75 mm / below 150 mm / at least 150 mm. Indoor water-park conditions are
separate from the outdoor climate. Seasonal recommendations do not promise cheaper rates.

Unsupported comparative engineering scores remain null. No complete Vienna hotel development cost
or matching allocation benchmark was verified; its pin price/currency stay null. No deployment or
translation run was performed. Translations remain with the separate agent.

| Property | Production pin | Local pin |
| --- | --- | --- |
| JO&JOE Vienna | 21326 | 21158 |
| Great Wolf Lodge Colorado Springs | 21327 | 21159 |

Native title/source/date/address/coordinates/author/reference/media-credit fields, hotel rubrics and
factory milestones passed readback on both hosts. All four native pages returned HTTP 200. Local
`/travel` renders both additions without an application error and shows **Family 31 / Budget 26**.
All 10 existing travel tests and `git diff --check` passed. No data writes remain pending.
Production category display awaits an explicitly requested code deployment.
