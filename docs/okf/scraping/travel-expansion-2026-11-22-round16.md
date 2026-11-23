# Travel shelf expansion — sixteenth round, 2026-11-22

MEININGER Hotel Munich Olympiapark joins Family and Budget; LEGOLAND New York Hotel joins Family.
Catalog: `scripts/hotels/travel-expansion-2026-11-22-round16.json`. Replay with
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round16.json`
and append `--apply` for writes. Manifest and native readbacks:
`.scrape/prod-batches/travel-expansion-2026-11-22-round16/`.

Munich's **March 25, 2019** opening is explicit in the operator's subsequent [Lyon chronology](https://www.meininger-hotels.com/en/press/press-releases/first-hotel-in-lyon/).
The [original release](https://www.meininger-hotels.com/en/press/press-releases/second-hotel-in-munich/)
describes a former-office conversion with **172 rooms / 822 beds**. The [current hotel page](https://www.meininger-hotels.com/en/hotels/munich/hotel-munich-olympiapark/)
lists 820 beds; both counts are dated/contextualized rather than silently reconciled. Private family
rooms, guest kitchen and social spaces are verified. Dorm beds and whole private rooms remain
separate booking products; compare all extras and transport from the Mittlerer Ring location.

Munich Tripadvisor UK snapshot: **97 reviews**, overall **2.9/5**; Rooms 2.9 / Service 3.1 /
Location 3.9 / Cleanliness 3.1 / Value 3.2, rounded to half points. The low overall score and recent
family accounts of cleanliness, heat, room condition and noise are prominent. Laurel A's English
firsthand review “Pleasemt stay and wonderful staff” supplies a short exact excerpt; September 2025
publication month without precise day means date null. Mixed category membership is not presented
as high satisfaction or a guaranteed cheapest stay. MICHELIN complete Munich-and-surroundings list
1–27 of 27 and Forbes Munich have no MEININGER match; AAA awards exclude Germany. Acclaim zero records
checked-guide absence. No property-specific conversion budget was verified.

Munich official address **Landshuter Allee 174, 80637 Munich, Germany**; operator map point
**48.1648635 / 11.5383819**, corroborated by ArcGIS exact address and OSM named hotel. New York full
published address **1 LEGOLAND Boulevard, Goshen, NY 10924, United States**; exact OSM hotel point
**41.3792138 / -74.3146155**, corroborated by ArcGIS hotel POI. Nearby parking result rejected;
OSM's local Ring Road label does not replace official mailing address. Broad title and exact-source
checks found no existing hotel identity locally or on production.

New York hotel's **August 6, 2021** debut and **250 rooms** come from the [operator-issued August 9
release](https://www.prnewswire.com/news-releases/everything-is-awesome-legoland-new-york-resort-is-fully-open-301350684.html).
The date is distinct from the park's earlier phased opening and July 9 opening of all seven lands.
[Current hotel information](https://www.legoland.com/new-york/places-to-stay/legoland-hotel/)
verifies four themes, separate children's sleeping areas, treasure hunts, indoor play, breakfast and
entertainment. Exact layouts, occupancy and package inclusions require checking. No per-person
package starting amount becomes an all-in whole-room nightly quote, and no resort-wide investment
is allocated to the hotel. Property-specific construction cost remains null.

The [seasonal-closures page](https://www.legoland.com/new-york/plan-your-visit/know-before-you-go/seasonal-closures/),
read November 22, lists the hotel pool closed for the 2026 season, and several lands/areas closing
from **November 27, 2026**. Article and activity copy retain this material limitation; pool imagery
is not used. Hotel, attraction and seasonal opening calendars must be checked for booked dates.

New York Tripadvisor UK snapshot: **89 reviews**, overall **3.1/5**; Rooms 3.5 / Service 3.1 /
Location 4.1 / Cleanliness 3.8 / Value **2.5**, rounded to half points. Service, housekeeping, dining
and extra-cost concerns remain visible; Family only. [My Cruising Family's firsthand opening-weekend
account](https://www.mycruisingfamily.com/blog/2021/8/20/legoland-new-york-planning-your-legoland-hotel-stay)
is published **August 20, 2021** in structured metadata and supplies an exact short walk-to-park
excerpt. Historical rate, breakfast and cancellation terms are not current promises. AAA's exact
hotel listing was opened but no numeric Diamond designation established; MICHELIN Goshen unavailable,
Forbes Hudson Valley directory read without match but incomplete local evidence. Acclaim null.

Six official photos downloaded and visually inspected: Munich family room, kitchen, lounge;
New York exterior, Kingdom room, pirate treasure chest. The New York page also uses a Florida-2015
elevator image; it is excluded. Azure public hash verification precedes creation; native source
credits checked on readback. No image binaries in Git. Engineering axes unsupported by benchmarks
remain null; sourced operating milestones and capacity metrics saved.

Munich seasons use **DWD München-Stadt 03379**, derived 1991–2020 calendar-month averages of MO_TX
(daytime highs) and MO_RR (precipitation): **30 valid observations for every month and field**, rounded
to 0.1, with no missing-value fill. New York seasons use **NOAA NCEI Middletown 2 NW USC00305310**,
1991–2020 metric normals, nearby Orange County regional guidance. This is not Goshen, Indiana; NOAA
station inventory verifies the selected New York location. Source, period and regional character
are explicit. Rain bands below 75 / below 150 / at least 150 mm; weather, operating schedules and
rates are separate inputs. These are climate averages, not hotel forecasts.

English only; translations remain with the separate agent. No code deployment performed.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Hotel Munich Olympiapark | 21338 | 21179 |
| LEGOLAND New York Hotel | 21339 | 21180 |

Both hosts passed native title/source/date/address/coordinates/author/references/media-credit,
hotel rubric and factory metrics/milestones readbacks. All four native pages returned HTTP 200.
Local `/travel` renders both additions without application errors: **Family 41 / Budget 31**.
All 10 existing travel tests and `git diff --check` passed. No data writes remain pending.
Production category display awaits an explicitly requested code deployment.
