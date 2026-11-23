# Travel shelf expansion — twentieth round, 2026-11-22

MEININGER Hotel Bremen Hauptbahnhof joins Family and Budget; Great Wolf Lodge Northern California
in Manteca joins Family. Catalog: `scripts/hotels/travel-expansion-2026-11-22-round20.json`.
Replay with `node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round20.json`
and append `--apply` for writes. Manifest and native readbacks:
`.scrape/prod-batches/travel-expansion-2026-11-22-round20/`.

Bremen's **25 May 2022** opening is announced by [MEININGER](https://www.meininger-hotels.com/en/press/press-releases/new-hotel-in-bremen/)
and explicitly reported as completed by [Hospitality ON](https://hospitality-on.com/fr/ouverture/meininger-hotels-ouvre-un-nouvel-etablissement-breme)
in its search-rendered full article, published 25 May 2022. Direct fetches of Hospitality ON intermittently
returned 403. [Hotelbau](https://www.hotelbau.de/aktuelles/meininger-bremen/) corroborates the completed
opening. Opening capacity **126 rooms / 378 beds** comes from the operator. The hotel occupies part of
the HIGHeleven development; broader bus-terminal, parking and office costs are not assigned to the hotel.
No hotel-specific investment was verified, so project price/currency remain null.

The [current operator page](https://www.meininger-hotels.com/en/hotels/bremen/hotel-bremen-central-station/)
verifies family rooms, guest kitchen, game zone and shared lounge. Whole private rooms remain distinct
from dormitory beds. Current address **Rosa-Parks-Ring 1, 28195 Bremen, Germany**, rather than the older
project address Bürgermeister-Smidt-Straße 15. Operator point **53.08359080 / 8.80913010** agrees with
ArcGIS exact current address and the older street address at the same building. Station/bus access,
walking routes, breakfast, taxes, nearby parking, storage and cancellation terms remain booking checks.

Bremen refreshed Tripadvisor UK snapshot: **24 reviews**, overall 3.8/5; Rooms 4.1, Service 4.4,
Location 4.8, Cleanliness 4.8, Value 4.2, rounded to half points. The small sample is explicit. Chris S.'s
firsthand “Good value for money, centrally located.” review is site-translated from German. Publication
August 2026 differs from the February stay; exact day unavailable, date null. Ventilation noise and varied
staff responses remain guest accounts. MICHELIN complete Bremen list 1–5 of 5 has no MEININGER match;
Forbes Bremen unavailable; AAA excludes Germany. Acclaim null names the specific guide gap.

Manteca's pin explicitly dates its **formal grand opening on 29 June 2021**, verified by the
[operator's opening PDF](https://www.greatwolf.com/content/dam/greatwolf/sites/www/locations/master/Media/press-releases/GWL-Northern-CA-Announcement-Release-6.28.2021.pdf).
PDF page 1 was rendered and visually checked: printed date 29 June 2021 overrides the earlier 6.28 filename.
The source describes **500 rooms**, **95,000-square-foot indoor water park** and **45,000-square-foot
Adventure Park**. These are opening-era figures. [Contemporary reporting](https://www.kcra.com/article/great-wolf-lodge-opens-manteca-water-park-adventure-resort/36875445)
confirms earlier soft-opening operations, separate from the formal event; first guest arrival is not
claimed as 29 June.

[Manteca Bulletin](https://www.mantecabulletin.com/news/local-news/great-wolf-opening-june-29/)
reports the already-completed resort as a **US$180 million** project. This sourced whole-resort figure is
saved in USD and the investment metric, explicitly separate from room rates and water-park-only cost.
The article's Garden Grove stock photo is excluded. Its expired opening promotion and nightly-rate
figures are not reused. The [current operator](https://www.greatwolf.com/northern-california) and
[property profile](https://www.greatwolf.com/northern-california/about-us) verify 500 suites, overnight
indoor-water-park inclusion and family activities. Exact suite beds/occupancy, arrival/departure access,
height and supervision rules, paid attractions, dining and parking need date-specific checks.

Full Manteca address **2500 Daniels Street, Manteca, CA 95337, USA**; named ArcGIS resort point
**37.785142 / -121.263792** agrees with its exact street-address result. This is a Central Valley property,
not San Francisco city; actual driving distances matter. Both properties passed broad-title and canonical
source duplicate checks on local and production.

Manteca refreshed Tripadvisor UK snapshot: **543 reviews**, overall 3.8/5; Rooms 4.1, Service 3.9,
Location 4.2, Cleanliness 4.0, Value 3.6, rounded to half points. Crystal M's firsthand family “Wolf Den Suite
experience” supplies a short exact crowding excerpt. Publication October 2026 without exact day means
date null. Water-park enjoyment is balanced with room-readiness, crowding, cleaning, maintenance, noise
and cost concerns, retained as guest reports. MICHELIN and Forbes Manteca directories unavailable;
AAA Manteca returned a generic shell with no property results or Diamond evidence. Acclaim null.

Six distinct photos visually checked: Bremen family room, kitchen and lounge from MEININGER; Manteca
frontage, outdoor pool and indoor water-play structure from the exact Tripadvisor property gallery.
Images credited and uploaded to Azure; public hashes verified before pin creation. No binaries in Git.

Seasonality uses **DWD Bremen 00691 historical monthly observations**, calculating 1991–2020 means
of MO_TX (normal daily highs) and MO_RR (monthly rainfall). Each month has exactly 30 valid samples for
both columns and no -999 missing values. Raw observations and calculation saved in ignored research
scratch files. Manteca uses **NOAA Stockton Metropolitan Airport USW00023237 1991–2020** monthly normals
in metric units. These nearby stations provide regional guidance, not hotel forecasts or San Francisco
coastal conditions. Manteca July–August highs approach 35°C; Bremen rain is possible year-round. Rain
bands below 75 / below 150 / at least 150 mm. Weather suitability does not establish prices or operating calendars.

Unsupported comparative engineering scores remain null. English only; translations left to the separate
agent. No production code deployment performed.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Hotel Bremen Hauptbahnhof | 21361 | 21187 |
| Great Wolf Lodge Northern California — Manteca | 21362 | 21188 |

Both hosts passed complete native pin, date, full address, coordinates, author, reference and credited-media
readbacks, plus hotel rubrics and factory metrics/milestones. Manteca's reported USD 180m project cost
and Bremen's null cost read back correctly. Each native pin contains three images. All four native pages
returned HTTP 200. Local `/travel` renders both additions without application errors: **Family 49 /
Budget 35**. All 10 existing travel tests and `git diff --check` passed. No data writes remain pending.
Production category display awaits an explicitly requested deploy.
