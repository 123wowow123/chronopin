# Travel shelf expansion — eighteenth round, 2026-11-22

MEININGER Hotel Bordeaux Gare Saint-Jean joins Family and Budget. Great Wolf Lodge Arizona joins Family.
Replay catalog: `scripts/hotels/travel-expansion-2026-11-22-round18.json`, using
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round18.json`
with `--apply` for writes. Saved manifests and native readbacks are under
`.scrape/prod-batches/travel-expansion-2026-11-22-round18/`.

Bordeaux's [operator opening announcement](https://www.meininger-hotels.com/en/press/press-releases/new-hotel-in-bordeaux/)
explicitly dates opening to **26 May 2021**, with **162 rooms accommodating 493 guests**.
Later directory counts differ, so opening inventory is labelled historical. The [current operator page](https://www.meininger-hotels.com/en/hotels/bordeaux/hotel-bordeaux-gare-saint-jean/)
verifies private family rooms, communal kitchen and game spaces. Whole-room bookings remain distinct
from dorm beds. Station access does not imply being directly opposite the station or beside the historic
centre. Full address **12 rue du Commerce, 33800 Bordeaux, France**; operator point **44.82720230 /
-0.55193960**, corroborated by exact-address ArcGIS and OSM results. City-centre points excluded.

Bordeaux Tripadvisor UK snapshot: **130 reviews**, overall 4.3/5; Rooms 4.2, Service 4.5, Location 4.0,
Cleanliness 4.5, Value 4.4, rounded to half points. Taggert1's firsthand English “Short stay” review supplies
a brief kitchen excerpt. Publication June 2026 has no exact day, so date null. Walking distance, parking
and cancellation terms remain explicit tradeoffs. Complete MICHELIN Bordeaux directory has no MEININGER
match; Forbes Bordeaux directory unavailable; AAA excludes France. Acclaim null records this evidence gap.

Arizona's [contemporary ABC15 report](https://www.abc15.com/local/great-wolf-lodge-is-officially-open-in-scottsdale)
was published **30 September 2019** and explicitly says doors opened **27 September**. The
[tribal newspaper, 7 November 2019, page 12](https://oan.srpmic-nsn.gov/wp-content/uploads/2024/06/OAN_11_07_19.pdf)
reports the separate **17 October grand-opening ceremony**, **350 suites** and an **85,000-square-foot
indoor water park**. PDF page 12 was rendered and visually verified. The pin dates guest opening, rather
than the later ceremony or an earlier planned date. The [operator](https://www.greatwolf.com/arizona)
verifies overnight water-park inclusion and daily family activities. Paid Adventure Park attractions,
arcade, dining and parking are separate cost considerations. Exact suite beds, occupancy, height rules
and operating hours need booking checks. No expired promotion or unsupported nightly price is saved.

Arizona Tripadvisor UK snapshot: **596 reviews**, overall 3.7/5; Rooms 3.9, Service 3.6, Location 4.3,
Cleanliness 4.0, Value 3.4, rounded to half points. Lily's firsthand “Fun family resort!” review was
published April 2025 about a March stay; date null because publication day unavailable. Recent individual
accounts support balanced mention of inconsistent cleaning, maintenance, service and extra costs.
Guest claims are not presented as independently established faults. Forbes Scottsdale has no Great Wolf
match; MICHELIN Scottsdale unavailable; AAA exact-property Diamond recognition not established and
its directory timed out on recheck. Acclaim remains null, without an invented award or zero.

Arizona full address **7333 N. Pima Road, Scottsdale, AZ 85258, USA**. Named ArcGIS hotel point
**33.5435031 / -111.8902864** agrees with OSM Great Wolf Lodge at the exact address. The resort is at
Scottsdale/Salt River in the Salt River Pima-Maricopa Indian Community; city-centre results rejected.
Broad-title and canonical-source duplicate checks passed on both hosts.

Six distinct photos visually checked: Bordeaux room, kitchen and lounge from MEININGER; Arizona
exterior, indoor play pool and outdoor pool from the exact property's Tripadvisor management gallery,
credited to Great Wolf Lodge / Tripadvisor. Operator direct Arizona downloads were blocked; generic
sibling images were excluded. Public Azure hashes are checked before pin creation and media credits
read back. No image binaries enter Git.

Seasonality uses primary **Météo-France Bordeaux-Mérignac 33281001 1991–2020** normals, PDF page 1
rendered and visually checked, and **NOAA Scottsdale Municipal Airport USW00003192 1991–2020** monthly
normals returned in metric units. Values are normal daily highs, not monthly means or record extremes.
Nearby stations give regional guidance, not hotel forecasts. Arizona June–August highs approach
39–40°C, so outdoor heat remains explicit despite indoor swimming. Rain bands are below75 / below150 /
at least150 mm; low monthly rain does not exclude monsoon storms. Weather suitability does not establish
room-rate seasons, attraction schedules or a forecast.

Both construction budgets and comparative engineering scores remain null for lack of verified figures.
Opening milestones and capacities are sourced. Nightly rates remain on request. English only;
translations left to the separate agent. No production code deployment performed.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Hotel Bordeaux Gare Saint-Jean | 21342 | 21183 |
| Great Wolf Lodge Arizona | 21343 | 21184 |

Both hosts passed native pin, date, full address, coordinates, author, reference and credited-media
readbacks, plus complete hotel rubrics and factory metrics/milestones. Project price/currency remain
null and each native pin contains three images. All four native pages returned HTTP 200. Local
`/travel` renders both additions without application errors: **Family 45 / Budget 33**. All 10 existing
travel tests and `git diff --check` passed. No data writes remain pending. Production category display
awaits an explicitly requested deploy.
