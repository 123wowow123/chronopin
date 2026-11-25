---
type: Reference
title: "Travel shelf expansion — twenty-second round, 2026-11-22"
description: "MEININGER Venezia Mestre joins Family and Budget; Great Wolf Lodge Grand Mound joins Family. Catalog: `scripts/hotels/travel-expansion-2026-11-22-round22.json`. Replay with `node scripts/hotels/expandTravelShelves.mjs --catalog..."
tags: [scraping, travel]
---

# Travel shelf expansion — twenty-second round, 2026-11-22

MEININGER Venezia Mestre joins Family and Budget; Great Wolf Lodge Grand Mound joins Family.
Catalog: `scripts/hotels/travel-expansion-2026-11-22-round22.json`. Replay with
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round22.json`
and append `--apply` for writes. Manifest and native readbacks:
`.scrape/prod-batches/travel-expansion-2026-11-22-round22/`.

Venice's **1 March 2023 MEININGER opening** is announced by the [operator](https://www.meininger-hotels.com/en/press/press-releases/new-hotel-in-venice/)
and explicitly confirmed as completed in the [1 March opening report](https://www.hotelnewsresource.com/article125164.html).
The seven-storey building previously housed a hostel and was partially remodelled. This pin dates the
MEININGER brand opening, not the building's first use. Opening capacity **112 rooms / 434 beds** is
explicitly dated. No conversion-specific investment verified; project price/currency null. Earlier
construction costs of another operator or property are not assigned to this conversion.

The [current operator](https://www.meininger-hotels.com/en/hotels/venice/hotel-venice-mestre/)
verifies family rooms, kitchen, shared spaces and laundry. Private whole-room bookings and dorm beds
are separate products. **Mestre is on the mainland**, with rail/bus transfers to historic Venice and
separate tickets/schedules. Full address **Via Ca' Marcello 8/C, 30172 Mestre, Venice, Italy**; operator
point **45.48127270 / 12.23781470** agrees with ArcGIS exact 8C address. Both selected properties
passed broad-title and canonical-source duplicate checks on local and production.

Venezia Mestre refreshed Tripadvisor UK snapshot: **64 reviews**, overall 3.8/5; Rooms 4.2,
Service 4.3, Location 4.7, Cleanliness 4.4, Value 4.4, rounded to half points. fabiola antico's firsthand
family “A perfect stay, beyond all expectations.” review is displayed in the site's English translation
from Italian, published 8 November with November 2026 context, saved as 2026-11-08. Towels, pillows,
light curtains, train noise, storage fees and varied service/meal concerns remain guest accounts.
Small sample and dated snapshot are explicit. Whole-room cost, taxes, breakfast, parking, storage and
transfer tickets remain booking checks; no unsupported nightly rate.

MICHELIN complete **Venezia, Italy list 1–33 of 33** and Forbes Venice, Italy have no MEININGER match;
AAA awards exclude Italy. Acclaim zero records checked-guide absence. The separate MICHELIN
`/venice` route returned California hotels and was rejected; the verified Italian route is `/venezia`.

Grand Mound's pin dates the **formal grand opening on 24 April 2008**, verified by the
[current operator history](https://www.greatwolf.com/grand-mound/about-us) and the
[construction retrospective](https://www.constructionequipment.com/home/article/10716058/absher-completes-family-destination-resort).
Earlier March 2008 guest operations are separate, supported by contemporary annual reports and
[KNKX's reporting](https://www.knkx.org/politics/2012-05-16/documents-show-agency-insiders-questioned-great-wolf-lodge-tax-exemption).
An archived Hotel Online reprint has February metadata and an April 28 relative dateline; neither is
used to date the event. The contractor retrospective explicitly says the formal opening was April 24.

KNKX's **16 May 2012** reporting describes the resort as costing **US$170m to build**. Saved project
price USD 170m and investment metric explicitly represent that reported whole-resort construction cost,
separate from early US$100m project budgets, the later US$40m renovation and nightly rates. No FX
conversion. The tax controversy in that article is not repurposed as current legal or tax guidance.

The operator currently lists **407 suites**, after refurbishing 398 and adding nine in 2023, and a
56,000-square-foot water park. Other sources have different opening-era suite counts and water-park
areas, so capacity metric uses the clearly labelled current operator suite inventory. AAA's 414-unit
listing is not combined with the operator's newer 407-suite figure. Exact suite layout/occupancy,
height rules, admission hours, booked package items, paid activities, dining and parking need checks.
The lodge is at Grand Mound on the Chehalis Reservation, not in central Seattle or Portland.

Full address **20500 Old Highway 99 SW, Centralia, WA 98531, USA** verified by operator and AAA;
ArcGIS named Grand Mound resort point **46.7889631 / -123.0106288** identifies the actual property.
Grand Mound refreshed Tripadvisor UK snapshot: **322 reviews**, overall 3.9/5; Rooms 3.9,
Service 3.9, Location 4.2, Cleanliness 3.9, Value 3.4, rounded to half points. Deborah Anne's firsthand
family “Spring Staycation” review supplies a short exact excerpt. March 2025 publication has no exact
day, so date null. Crowding, seating, check-in, room-assignment, cleaning and extra-cost concerns remain
guest accounts; enjoyment of the water park is retained without treating feedback as independently
established universal conditions.

[AAA's exact property profile](https://www.aaa.com/tripcanvas/hotel/great-wolf-lodge-AA118405)
shows **Three Diamond**, also verified in the Centralia directory's Three Diamond section. This
recognition is stated in the article. MICHELIN and Forbes Centralia were unavailable; the hotel's
numeric acclaim stays null because no supported mapping from AAA Three Diamond to that rubric was
verified. It is not mislabelled as MICHELIN selection and is not assigned zero.

Six distinct photos visually checked: Venice family room, kitchen and lounge from MEININGER; Grand
Mound frontage and two different indoor water-play structures from the exact Tripadvisor property
gallery. Public Azure hashes checked before pin creation and media credits read back. No binaries in Git.

Venice climate uses the primary **WMO World Weather Information Service / Italian Air Force**
[Venice data feed](https://worldweather.wmo.int/en/json/606_en.xml), verified cityId 606 and Italy member.
Its climate branch explicitly gives **1971–2000** monthly averages, distinct from the forecast branch.
The older baseline is prominently labelled; no 1991–2020 claim is made. The newer NCEI global archive
and composite endpoints timed out, so those were not used. Climate fields are daily maximum-temperature
averages and monthly rainfall, not means or forecasts. Current heat, rain, fog and lagoon conditions
need present-day checks. Grand Mound uses **NOAA Olympia Airport USW00024227 1991–2020** monthly
normals in metric units. Nearby regional guidance shows wetter winters and drier summers; indoor
water-park access is separate from weather-dependent outdoor operations. Rain bands below 75 /
below 150 / at least 150 mm; seasonal weather does not establish room-rate seasons or calendars.

Unsupported comparative engineering scores remain null. English only; translations left to the separate
agent. No production code deployment performed.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Venezia Mestre | 21365 | 21191 |
| Great Wolf Lodge Grand Mound | 21366 | 21192 |

Both hosts passed complete native pin, date, full address, coordinates, author, reference and credited-media
readbacks, plus hotel rubrics and factory metrics/milestones. Grand Mound's reported USD 170m build cost
and Venice's null project cost read back correctly. Each pin contains three credited images. All four
native pages returned HTTP 200. Local `/travel` renders both additions without application errors:
**Family 53 / Budget 37**. All 10 existing travel tests and `git diff --check` passed.
No data writes remain pending. Production category display awaits an explicitly requested deploy.
