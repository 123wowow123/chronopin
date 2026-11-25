---
type: Reference
title: "Travel shelf expansion — twenty-first round, 2026-11-22"
description: "MEININGER Hotel Dresden Zentrum joins Family and Budget; Great Wolf Lodge Williamsburg joins Family. Catalog: `scripts/hotels/travel-expansion-2026-11-22-round21.json`. Replay with `node scripts/hotels/expandTravelShelves.mjs --catalog..."
tags: [scraping, travel]
---

# Travel shelf expansion — twenty-first round, 2026-11-22

MEININGER Hotel Dresden Zentrum joins Family and Budget; Great Wolf Lodge Williamsburg joins Family.
Catalog: `scripts/hotels/travel-expansion-2026-11-22-round21.json`. Replay with
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round21.json`
and append `--apply` for writes. Manifest and full native readbacks:
`.scrape/prod-batches/travel-expansion-2026-11-22-round21/`.

Dresden opened **14 September 2022**. The [operator release](https://www.meininger-hotels.com/en/press/press-releases/new-hotel-in-dresden/)
gives that date and [Radio Dresden's report that day](https://www.radiodresden.de/beitrag/neues-hotel-in-dresden-meininger-oeffnet-seine-tueren-737639/)
explicitly says the hotel opens on Wednesday. Opening capacity **173 rooms / 719 beds** replaces earlier
165-room/639-bed plans. The supermarket in the same building opened in September 2021, a separate date.
No hotel-specific construction investment was verified, and no mixed-use building cost is assigned to it.
Project price/currency remain null.

The [current operator page](https://www.meininger-hotels.com/en/hotels/dresden/hotel-dresden-city-center/)
verifies private family rooms, guest kitchen, game zone and music-inspired common spaces. Whole-room
bookings and dorm beds remain distinct. Full address **Wiener Platz 5, 01069 Dresden, Germany**.
The operator's map point 51.0411038/13.7341923 lies several hundred metres east of the actual hotel.
Saved point **51.0423670 / 13.7296900** comes from the named [OSM hotel node](https://www.openstreetmap.org/node/9223785747)
at number 5, corroborated by ArcGIS named Meininger and exact street-address results. The neighbouring
Simmel grocery node is not used as the hotel. Both properties passed broad-title and canonical-source
duplicate checks on both hosts.

Dresden refreshed Tripadvisor UK snapshot: **34 reviews**, overall 3.2/5; Rooms 3.3, Service 3.5,
Location 4.7, Cleanliness 3.1, Value 3.6, rounded to half points. The low cleanliness score and small
sample are preserved. Birgit B's firsthand couple review “Price/performance ratio not OK!” supplies a
brief luggage-storage excerpt, displayed in the site's English translation from German. August 2026
publication without exact day means date null. Housekeeping, essentials, storage fees and accessibility
concerns remain guest reports, without treating them as independently established faults or applying a
dorm review universally to private rooms. MICHELIN complete Dresden list 1–9 of 9 has no MEININGER
match; Forbes Dresden unavailable; AAA excludes Germany. Acclaim null records the specific guide gap.

Williamsburg's **23 March 2005** original opening is explicit in the shareholder letter within the
[operator's 2004 annual report](https://media.corporate-ir.net/media_files/irol/18/185610/reports/AR04.pdf).
The letter was written after year-end; PDF page 4 was rendered and visually checked. It reports
**301 suites** and **66,000 square feet of indoor entertainment**, which is not water-park-only area.
The [2005 SEC filing](https://www.sec.gov/Archives/edgar/data/1294538/000095014405005295/g94864a2posam.htm)
corroborates the opening month and original 301-suite inventory; raw SEC requests were blocked but the
web reader exposed its full content. The current [operator profile](https://www.greatwolf.com/williamsburg/about-us)
reports **405 suites across 13 types**, separate from the original inventory and later expansions.

The [2005 construction report](https://www.hotel-online.com/news/archive-15298) by hotel-waterpark
researchers reports **US$48 million** in total cost for the original Williamsburg resort. Saved price
USD 48m and investment metric explicitly represent reported historical resort cost, excluding later
expansions and nightly rates. Earlier proposals and budgets are not substituted. The report's differing
water-park-area figure is not reused; the operator annual report's clearly labelled indoor-entertainment
area is retained.

Full address **549 East Rochambeau Drive, Williamsburg, VA 23188, USA** is verified by the operator and
AAA exact-property profile. Named ArcGIS resort point **37.3484073 / -76.7293726** agrees with its exact
street-address result on the resort grounds. This is not Williamsburg city centre. Overnight indoor
water-park inclusion and daily family activities are distinct from paid attractions, meals, parking and
offsite Historic Triangle visits. Exact suite occupancy, accessibility, height rules, admission hours and
full date-specific stay cost remain booking checks. No unsupported nightly figure is saved.

Williamsburg available cached Tripadvisor UK snapshot: **425 reviews**, overall 3.6/5; Rooms 3.8,
Service 3.6, Location 4.0, Cleanliness 3.9, Value 3.1, rounded to half points. The cache limitation is
explicit; the older 331-review US-domain page is excluded. Travelc2018's firsthand family “Fun for
families and Clean” review supplies a short exact suite excerpt. July 2025 publication without exact day
means date null. Newer guest accounts add cleaning, maintenance, booking-price and service concerns.
No old parking amount or promotion is saved as a current price.

Forbes Williamsburg lists other properties, with no Great Wolf match; MICHELIN Williamsburg was
unavailable. The exact [AAA inspector profile](https://www.aaa.com/tripcanvas/hotel/great-wolf-lodge-AA118012)
was verified and lists 405 units, family lofts, cabin suites and fireplaces. AAA room/bath/public-area
components and Diamond-program text are not a verified numerical mapping to the app's acclaim rubric;
acclaim remains null rather than an invented MICHELIN-style award or zero.

Six distinct photos visually checked: Dresden room, kitchen and lounge from MEININGER; Williamsburg
frontage, outdoor attraction/pool view and indoor water-play structure from the exact Tripadvisor property
gallery. Azure public hashes are verified before creation, and credits read back. No image binaries in Git.

Seasonality uses **DWD Dresden-Klotzsche 01048 historical monthly observations**, calculating
**1991–2020** means of MO_TX (normal daily highs) and MO_RR (monthly precipitation), with exactly 30
valid observations for every calendar month and no -999 missing values. Williamsburg uses primary
**NOAA Williamsburg 2 N USC00449151 1991–2020** normals in metric units. Nearby regional guidance
is separate from hotel forecasts or onsite conditions. Summer heat, humidity and storms, winter cold,
and Williamsburg's July rainfall over 150 mm remain explicit. Rain bands below 75 / below 150 / at least 150 mm.
Weather suitability does not establish rates or operating calendars.

Unsupported engineering scores remain null. English only; translations left to the separate agent.
No production code deployment performed.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Hotel Dresden Zentrum | 21363 | 21189 |
| Great Wolf Lodge Williamsburg | 21364 | 21190 |

Both hosts passed complete native pin, date, full address, coordinates, author, reference and credited-media
readbacks, plus hotel rubrics and factory metrics/milestones. Williamsburg's reported USD 48m original
project cost and Dresden's null cost read back correctly. Each native pin contains three images. All four
native pages returned HTTP 200. Local `/travel` renders both additions without application errors:
**Family 51 / Budget 36**. All 10 existing travel tests and `git diff --check` passed.
No data writes remain pending. Production category display awaits an explicitly requested deploy.
