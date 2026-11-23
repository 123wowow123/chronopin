# Travel shelf expansion — tenth round, 2026-11-22

Added MEININGER Kraków Centrum to family and budget, and LEGOLAND Japan Hotel to family only. Research
catalog: `scripts/hotels/travel-expansion-2026-11-22-round10.json`. Replay:
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round10.json`;
append `--apply` to save. Assigned-ID manifest and native readbacks are in
`.scrape/prod-batches/travel-expansion-2026-11-22-round10/`.

Kraków's operator confirms an **October 2023** opening with **135 rooms / 507 beds**, but no reliable
precise day was found. The pin therefore marks a separate real dated event: publication of Keri
Stooksbury's firsthand Upgraded Points family-stay review on **February 26, 2024**. Both publisher
JSON-LD and itemProp datePublished agree; January 27, 2026 is dateModified and is not substituted.
The title, date reasoning, article and development milestone explicitly identify review publication,
not hotel opening. The opening remains month-only in text and the stage metric. No fabricated day,
confidence workaround or invented review date is used. The earlier 503-bed proposal is not substituted
for the operator's actual 507-bed launch figure. Private family rooms, shared kitchen and game zone
are verified on the actual property page. Shared dorm-bed prices are not family-room quotes.
The review headline's historical $55 rate and savings comparison are not current offers.

Kraków's opened Tripadvisor UK snapshot has 60 reviews. Components Rooms 4.0 / Service 3.4 /
Location 4.3 / Cleanliness 4.1 / Value 4.0 are rounded to half steps. Service and social hotel-and-hostel
tradeoffs remain visible in the article. The independent firsthand review supplies an exact short
game-zone excerpt, checked against fetched text. Its exact full headline and original publication
date are retained in the rubric. Hotel and review metadata are not confused with sibling properties.

LEGOLAND Japan's operator confirms the hotel grand opening on **April 28, 2018**, separate from the
2017 park opening and April 15, 2018 SEA LIFE opening. Current room list: Standard/Premium 30 m² for
four; Premium Plus 30 m² for five; selected 45 m² suites for five or six depending on layout. The
hotel information page states that the Water Play Area requires reservations. Package inclusions,
activity access and park admission must be checked for the selected stay. This is a Kinjo-futo park
base outside central Nagoya. No current verified low rate supports adding it to budget.

Nagoya's opened Tripadvisor UK snapshot has 162 reviews and components Rooms 4.5 / Service 4.1 /
Location 4.5 / Cleanliness 4.4 / Value 4.1, rounded to half steps. Guest Mauritian diplomat's English
firsthand account is displayed for December 2025 with no precise publication day, so publishedDate
is null; October 2025 is the stay month and is not substituted. The short bunk-bed excerpt is exact.
Listed inventory is 252 rooms, labelled as property-listing inventory rather than an unsupported
opening-day total. Counts are dated snapshots rather than live totals. Quote budgets are respected.

Full MICHELIN city directories were read: 18 Kraków hotels and three Nagoya hotels, no match for
these properties. Forbes Kraków directory contains Bachleda but no MEININGER; acclaim 0 for the
checked selections, without claiming that no design award exists. Forbes Nagoya directory was
unavailable and name searches did not establish recognition; Nagoya acclaim remains null. No Key or
Forbes recognition is invented. AAA's country program excludes Poland and Japan. No hotel-specific
complete construction investment or appropriate conversion/themed-hotel benchmark was verified;
price/currency and unsupported engineering axes remain null.

Six distinct official photos were downloaded and visually inspected: Kraków family room, entrance
and kitchen; Nagoya exterior, NINJAGO bedroom and family restaurant. Photos are stored in Azure with
public SHA-256 and native credit verification; no binaries are committed. Full addresses:
Grzegórzecka 10, 31-530 Kraków, Poland; 2-7-1 Kinjofuto, Minato-ku, Nagoya, Aichi 455-8606, Japan.
Kraków ArcGIS point-address match scores 100. Nagoya's address geocode was superseded by the exact
Japanese hotel-name ArcGIS POI, score 100, at 35.050637523 / 136.846373097. The operator's current
Japanese hotel FAQ uses postcode 455-8606; the English FAQ and older directories show 455-8605.
Street numbering agrees across sources; current Japanese FAQ is used. No city or theme-park point
is substituted. Broad authenticated title patterns and exact-source checks found no matching pins
on either host.

Kraków climate uses IMGW-PIB station **12566, 1991–2020**: mean daily maxima from TMAX_AVE and monthly
rain totals from OPAD_SUMA, read from the actual Kraków rows. An initial PREZ query is vapour pressure,
not precipitation, and is not used. Nagoya climate uses JMA station **47636, 1991–2020**, daytime-high
and precipitation columns, not mean temperature. Both provide regional guidance. Rain bands are
below 75 mm / below 150 mm / at least 150 mm; weather recommendations do not imply cheaper rates.

No code deployment or translation run was performed. Translations remain with the separate agent.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Kraków Centrum | 21324 | 21156 |
| LEGOLAND Japan Hotel | 21325 | 21157 |

Native title/source/date/address/coordinates/author/reference/media-credit fields, hotel rubrics and
factory milestones passed readback on both hosts. All four native pages returned HTTP 200. Local
`/travel` renders both additions without an application error and shows **Family 30 / Budget 25**.
All 10 existing travel tests and `git diff --check` passed. No data writes remain pending.
Production category display awaits an explicitly requested code deployment.
