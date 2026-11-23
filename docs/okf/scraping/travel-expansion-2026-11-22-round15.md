# Travel shelf expansion — fifteenth round, 2026-11-22

MEININGER Hotel Heidelberg Hauptbahnhof joins Family and Budget; LEGOLAND Pirate Island Hotel Florida
joins Family. Catalog: `scripts/hotels/travel-expansion-2026-11-22-round15.json`. Replay:
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round15.json`
with `--apply` for writes. Manifest and native readbacks are under
`.scrape/prod-batches/travel-expansion-2026-11-22-round15/`.

Heidelberg's confirmed **July 24, 2019** opening comes from the operator's [later Lyon chronology](https://www.meininger-hotels.com/en/press/press-releases/first-hotel-in-lyon/),
corroborated by its Brussels release. The [opening announcement](https://www.meininger-hotels.com/en/press/press-releases/first-hotel-in-heidelberg/)
reports **100 rooms / 331 beds**, not the earlier planned 336 beds. Its current [hotel URL](https://www.meininger-hotels.com/en/hotels/heidelberg/hotel-heidelberg-central-station/)
uses `hotel-heidelberg-central-station`; the guessed Hauptbahnhof route returned 404 and is excluded.
Private family rooms, kitchen and common areas are verified. Whole rooms and shared dorm beds are
separate products. The station-area location is not described as the old-town core; allow transport
and compare extras for your dates.

Heidelberg Tripadvisor UK snapshot: **68 reviews**, overall 4.1/5; Rooms 3.8 / Service 4.4 /
Location 3.8 / Cleanliness 4.2 / Value 4.2, rounded to half points. English firsthand jordanellie41
“A CROSS BETWEEN A HOTEL AND A HOSTEL,” displayed February 2025 without exact day, supplies a short
kitchen excerpt; publishedDate null. Small/basic rooms, housekeeping, noise, paid extras and distance
tradeoffs remain guest feedback, not independent findings. Historical dorm rates are not current
whole-room prices. MICHELIN Heidelberg was blocked by verification; Forbes Heidelberg unavailable;
AAA awards exclude Germany. Acclaim null records these specific evidence gaps.

Heidelberg address **Carl-Benz-Straße 2/1, 69115 Heidelberg, Germany**. Operator point **49.3986953 /
8.678485** is corroborated by the correct MEININGER ArcGIS POI and exact street-address result.
The first fuzzy name-search result was the wrong Ibis hotel and was rejected. OSM text search
returned no result. Broad duplicate checks found neither selected identity on either environment.

Pirate Island guest opening is **June 1, 2020**, explicit in Nick Ewen's [firsthand TPG account](https://thepointsguy.com/news/legoland-florida-pirate-island-hotel),
with exact title “5 things to know about staying at Legoland Florida's new Pirate Island Hotel,”
published **February 19, 2021** in article metadata. The complimentary media stay is explicitly
disclosed. Its exact short treasure-hunt excerpt is verified against fetched text. Historical menu
prices, pandemic procedures and offers are not current claims. A [2022 CFDC interview](https://www.cfdc.org/peppa-pig-theme-park-preparing-to-open-in-winter-haven/)
quotes the operator saying Pirate Island debuted with the June 1 resort reopening, adding **150 rooms**,
while the fuller celebration followed later. Earlier April targets and unsourced June 25 summaries
are not used. This separate themed wing connects to the original hotel and shares check-in; it is
not confused with that hotel's 2015 opening or Beach Retreat.

[Current operator information](https://www.legoland.com/florida/places-to-stay/pirate-island-hotel/)
verifies pirate rooms, separate children's sleeping areas, treasure hunts, entertainment and pool.
The resort's room-only product means park tickets are not universal; compare package inclusions,
occupancy, fees and dates. Pirate Island is Family only. Tripadvisor UK snapshot **72 reviews**,
overall **3.3/5**, Rooms 3.8 / Service 3.5 / Location 4.2 / Cleanliness 3.7 / Value **2.8**, rounded
to half points; current guest service/housekeeping/value concerns remain visible.

The [AAA exact-property page](https://www.aaa.com/tripcanvas/hotel/legoland-pirate-island-hotel-AA128529)
exposes **diamond-three-long**, confirming Three Diamond recognition, with 150 units and inspector
notes. That distinction is stated separately in the article. No Three Diamond-to-native-acclaim
conversion is established, and MICHELIN Winter Haven was unavailable; Forbes Orlando checked without
match but not complete Winter Haven coverage. Acclaim remains null with actual AAA evidence retained,
not invented as a MICHELIN selection. AAA room/bath/public-area scores are not guest rubric axes.
Address **1 LEGOLAND Way, Winter Haven, FL 33884, United States**; exact Pirate Island ArcGIS POI
**27.98777 / -81.6914146**, separate from original-hotel point. OSM text search returned no result.

Six distinct official photos were downloaded and visually checked: Heidelberg family room, kitchen
and lounge; Pirate Island exterior, adult themed bedroom and treasure hunt. Upload to Azure and
verify public SHA-256 before pin creation; native credits checked on readback. No binaries in Git.
Neither hotel has a verified property-specific construction investment; project price/currency and
unsupported engineering axes stay null. Sourced operating milestones and capacity metrics saved.

Heidelberg climate uses nearby **DWD Mannheim 05906**, explicitly a regional proxy. Daytime highs
are calculated by calendar-month averaging of **1991–2020 MO_TX** observations from the DWD monthly
historical archive: exactly **30 valid temperature observations per month**, rounded to 0.1°C.
Precipitation uses the **published DWD Mannheim 1991–2020 normals** row, not a hand-filled value:
raw monthly December 2020 rain is missing. The scratch derivation and source URLs are retained;
no missing temperature is invented. The failed LUBW download is not cited as evidence. Pirate Island
reuses the round-13 **NOAA NCEI Winter Haven USC00089707 1991–2020** metric normals, with station and
period explicit. Averages are not forecasts. Rain bands below 75 / below 150 / at least 150 mm;
weather suitability, attraction calendars and date-specific prices remain separate planning inputs.

English only; translations remain with the separate agent. No code deployment performed.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Hotel Heidelberg Hauptbahnhof | 21336 | 21177 |
| LEGOLAND Pirate Island Hotel Florida | 21337 | 21178 |

Both hosts passed native title/source/date/address/coordinates/author/references/media-credit,
hotel rubric and factory metrics/milestones readbacks. All four native pages returned HTTP 200.
Local `/travel` shows both additions without an application error: **Family 39 / Budget 30**.
All 10 existing travel tests and `git diff --check` passed. No data writes remain pending.
Production category display awaits an explicitly requested code deployment.
