---
type: Reference
title: "Travel shelf expansion — twenty-fourth round, 2026-11-23"
description: "MEININGER Hotel Leipzig Central Station joins Family and Budget; Great Wolf Lodge LaGrange joins Family. Catalog: `scripts/hotels/travel-expansion-2026-11-23-round24.json`. Replay `node scripts/hotels/expandTravelShelves.mjs --catalog..."
tags: [scraping, travel]
---

# Travel shelf expansion — twenty-fourth round, 2026-11-23

MEININGER Hotel Leipzig Central Station joins Family and Budget; Great Wolf Lodge LaGrange joins Family.
Catalog: `scripts/hotels/travel-expansion-2026-11-23-round24.json`.
Replay `node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-23-round24.json`;
append `--apply` for writes. Manifest/readbacks: `.scrape/prod-batches/travel-expansion-2026-11-23-round24/`.

Leipzig's **1 April 2017 brand opening** was announced by the [operator in March](https://www.meininger-hotels.com/en/press/press-releases/meininger-hotels-in-leipzig/).
The former parent's **Cox & Kings Annual Report 2016–17, printed page 22**, explicitly confirms the completed
April 1 opening. Its [Scribd-hosted full-text reproduction](https://www.scribd.com/document/392815293/Cox-and-Kings)
was opened and read; original company-hosted annual report unavailable. It is cited as a reproduction of the
primary document, rather than as Scribd's AI-generated description. The [conversion announcement](https://www.meininger-hotels.com/en/press/press-releases/meininger-hotel-leipzig/)
identifies the former ibis Leipzig City, closed March 2016, refurbished for MEININGER. This is a brand conversion,
not first construction of the building. No conversion-specific investment or applicable refurbishment benchmark
was verified; project price/currency null. Current [operator portfolio](https://www.meininger-hotels.com/en/portfolio/)
row: **126 rooms / 404 beds**, separate from date-specific availability.

The [exact property](https://www.meininger-hotels.com/en/hotels/leipzig/hotel-leipzig-central-station/)
has private family rooms, a guest kitchen, laundry and shared spaces. Private whole-room bookings and dorm beds
are separate products. Full address **Brühl 69, 04109 Leipzig, Germany**; operator point **51.3422497 / 12.3805021**
corroborated by exact-address ArcGIS PointAddress. Both selected properties passed broad-title and canonical-source
duplicate checks on local and production.

Leipzig refreshed Tripadvisor UK snapshot: **150 reviews**, overall 4.1; Rooms 3.8, Service 4.3, Location 4.9,
Cleanliness 4.3, Value 4.4, rounded to half points. Janet Owen's firsthand couple account “Highly recommended.”
was published September 2025 without an exact day, saved null. Other actual accounts retain dated rooms,
noise, summer heat and older family cleaning concerns. No review-summary AI text used as a firsthand review.
MICHELIN Leipzig complete list **1–6 of 6** has no MEININGER match, Forbes Leipzig unavailable and AAA excludes
Germany. Incomplete coverage leaves acclaim null.

LaGrange pin dates **formal grand opening 24 May 2018**, explicitly confirmed by the [TCA project profile](https://tilt-up.org/projects/profile/?id=5726)
and contemporary onsite [WTVM reporting](https://www.wtvm.com/story/38267567/great-wolf-lodge-officially-opens-in-lagrange/?outputType=amp).
The operator/city opening release was also read through its Readkong reproduction. Earlier advertised May 31
is not used as the completed event date. WTVM quotes general manager Keith Furnas stating **US$150m invested
in this project** at opening. Saved project price USD150m and investment metric explicitly represent that
reported whole-project investment, not an audited cost breakdown, later renovation or nightly room price.

Current [operator history](https://www.greatwolf.com/georgia/about-us): **457 suites / 100,000-square-foot water park**,
eight suite types, shared microwaves in common areas and no fitness centre. TCA's older 456-suite / 93,000-square-foot
figures remain separate. Exact suite/occupancy, water-park hours, height restrictions, supervision, package items,
parking, dining and paid attractions need booking checks. No date-specific all-in nightly quote is published in
these profiles; expired promotions are excluded. LaGrange is southwest of Atlanta, not a downtown Atlanta hotel.

Full address **150 Tom Hall Parkway, LaGrange, GA 30240, USA** from the operator; named ArcGIS resort point
**32.99453 / -85.02478** agrees with the exact-address PointAddress within metres. ArcGIS returns postal code
30241; operator's published 30240 retained and discrepancy recorded. Raw Great Wolf requests returned 403;
current operator pages were read through the web tool instead.

LaGrange refreshed Tripadvisor UK snapshot: **1,572 reviews**, overall 3.9; Rooms 4.1, Service 4.0, Location 4.3,
Cleanliness 4.1, Value 3.5 rounded to half points. Shequila O's firsthand family “Second Visit” account published
October 2026 supplies a short exact excerpt; exact day unknown, null. Dining prices, delayed towels and late
room readiness retained alongside enjoyable atmosphere/clean-room accounts. September guest reports of carpet
odour, beds, housekeeping and dining-table cleanliness remain attributed individual experiences. MICHELIN
LaGrange unavailable, Forbes Atlanta no match, AAA LaGrange directory and search found no exact profile.
Cvent's AAA Three Diamond claim was not verified with the award giver and is not scored; acclaim null.

Six photos visually inspected. Leipzig family room, kitchen and lounge from MEININGER. LaGrange completed-site
aerial, outdoor pool and indoor water-park structure from TCA's exact project gallery, credited to its named
photographer **Precision Concrete**. Construction-progress candidates excluded. Gallery photos describe the
project; they do not establish current pool operations or hours. Azure public blobs hash-checked before use;
no photo binaries in Git. Engineering comparative axes remain null.

Climate: **DWD Leipzig/Halle 02932**, 1991–2020 monthly MO_TX daytime highs and MO_RR rainfall, exactly 30 valid
observations for each calendar month, no missing-value sentinels; station name independently checked in DWD's
station catalogue. LaGrange uses **NOAA Newnan 7 WNW USC00096335**, 1991–2020 metric normals, 12 complete records.
This is regional guidance about 45km north-northeast, explicitly not an onsite forecast. The closer La Grange
1N feed omitted rainfall and was rejected for the paired climate fields. Rainfall bands below 75 / below 150 /
at least 150 mm. Outdoor-weather planning remains separate from indoor swimming, operations and room-rate seasons.

Replay helper now derives `checkedAt` and the Azure travel folder from the dated catalog filename, preserving
older batch dates while correctly using 2026-11-23 for this batch. The hotel workflow skill records that convention.
English only; translations left to the translation agent. No production code deployment performed.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Hotel Leipzig Central Station | 21380 | 21206 |
| Great Wolf Lodge LaGrange | 21381 | 21207 |

Both hosts passed complete native pin, date, address, coordinates, author, references and media-credit
readbacks, hotel rubrics and factory metrics/milestones. Leipzig's null project cost and LaGrange's USD150m
investment read back correctly. Three credited images per pin, public hashes verified before saves.
The 2026-11-23 assessment date, catalog checkedAt and Azure date folders read back correctly. All four native
pages returned HTTP 200. Local `/travel` renders both additions without application errors: **Family 57 /
Budget 39**. All 10 existing travel tests, Node script syntax check and `git diff --check` passed. No batch
operations remain pending. Production category display awaits an explicitly requested code deployment.
