# Travel shelf expansion — seventeenth round, 2026-11-22

MEININGER Budapest Great Market Hall joins Family and Budget; Center Parcs Woburn Forest joins Family.
Catalog: `scripts/hotels/travel-expansion-2026-11-22-round17.json`. Replay with
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round17.json`
and append `--apply` for writes. Manifest and native readbacks:
`.scrape/prod-batches/travel-expansion-2026-11-22-round17/`.

Budapest opened **March 18, 2019**, explicit in MEININGER's [later opening chronology](https://www.meininger-hotels.com/en/press/press-releases/first-hotel-in-lyon/),
corroborated by the subsequent Brussels release. Its [opening announcement](https://www.meininger-hotels.com/en/press/press-releases/new-property-in-budapest/)
reports **184 rooms / 751 beds**; these are opening-era capacities, not a later inventory guarantee.
The earlier spring-2018 proposal is not the opening date. [Current hotel information](https://www.meininger-hotels.com/en/hotels/budapest/hotel-budapest-great-market-hall/)
verifies private family rooms, communal guest kitchen and common spaces beside the Great Market Hall.
Whole private rooms and individual dorm beds remain distinct. No hotel-specific construction budget
was verified; price and currency null. No current all-in nightly quote, so rates on request.

Budapest Tripadvisor UK snapshot: **312 reviews**, overall 3.8/5; Rooms 3.5 / Service 3.5 /
Location 4.2 / Cleanliness 3.5 / Value 3.4, rounded to half steps. Nick B's English firsthand family
“Very good hotel” review supplies a short exact excerpt. Displayed publication July 2026 without day,
so date null. Housekeeping, breakfast, cooling and fee concerns remain guest accounts, not independent
findings or universal conditions. MICHELIN complete Budapest directory 1–22 of 22 and Forbes Budapest
have no MEININGER match; AAA awards exclude Hungary. Acclaim zero records that checked-guide result.

Budapest full address **Csarnok tér 2, 1093 Budapest, Hungary**. Operator point **47.4860404 /
19.0601214** agrees with ArcGIS exact address and OSM named hotel. Another OSM result is an electrical
substation with the same street number, rejected. Both selected properties passed broad title and
canonical-source duplicate checks on local and production.

Woburn's [operator launch release](https://www.mynewsdesk.com/uk/center-parcs/pressreleases/new-center-parcs-village-now-open-to-short-break-guests-1069960)
and **July 1, 2014 investor presentation** establish **June 6, 2014** as the arrival of first paying
guests. The earlier May 16 trial break is separate. The investor PDF's printed page 18 / PDF index 17
was rendered and visually checked with the PDF workflow. It reports **c£250m development cost** for
the whole village, saved as GBP250m with approximate scope explicit in article and factory metric.
It is not allocated solely to the hotel and never used as a holiday price. Opening mix: **625 lodges,
75 hotel bedrooms and six spa suites**, from the operator release, separate from later inventory.

The pin covers the complete [Woburn Forest holiday village](https://www.centerparcs.co.uk/discover-center-parcs/holiday-locations/woburn-forest.html).
Family accommodation uses the exact lodge layout and occupancy; hotel rooms and spa suites are
separate products, not assumed to have the same kitchen or occupancy. Included swimming/play
facilities are distinguished from paid activities, hire, dining and spa bookings. Hills, walking
distances, age rules and current schedules matter. No unsupported current nightly figure is saved.

Woburn Tripadvisor UK village-wide snapshot: **11,347 reviews**, overall 4.0/5; Rooms 4.3 /
Service 4.2 / Location 4.4 / Cleanliness 4.4 / Value 3.5, rounded to half points. 693susan's firsthand
family “Highly recommend Center Parcs Woburn Forest.” account describes a four-bedroom Woodland Lodge;
the short kitchen excerpt refers to that lodge, not every accommodation type. October 2026 publication
without exact day means date null. Expensive extras, cleanliness, maintenance and changeover concerns
remain visible. MICHELIN Woburn and Forbes Bedfordshire directories unavailable; AAA excludes UK.
Acclaim null names those guide gaps, rather than an invented award or zero.

Woburn operator schema point **52.02762 / -0.5241026** agrees with ArcGIS's second resort POI. Other
campus/entry points are not a different village. Full visitor-facing address **Center Parcs Woburn
Forest, Millbrook Road, Bedford MK45 2HZ, England, UK**, supported by the operator postcode and
[onsite Joules address](https://www.joules.com/storelocator/centerparcswoburnforest/5328?sv=list).
Government records for an onsite outlet use Fordfield Road / MK45 2GZ; this service address does not
replace the published visitor postcode. The pin is not at Bedford city centre.

Six distinct official photos downloaded and visually checked: Budapest family room, kitchen and
lounge; Woburn lakeside family scene, aerial village square and playground. The operator's Woburn
page contains images labelled SF, EF and IRE, representing other villages; those are excluded.
Retained WO-labelled images establish Woburn identity. Generic Lake District text on a Woburn FAQ
was also not reused. Azure public hashes are verified before creation and source credits read back;
no binaries enter Git. Unsupported engineering scores stay null; sourced milestones/capacity saved.

Budapest seasonal data use **HungaroMet Budapest-Pestszentlőrinc 1991–2020** monthly maxima and
rainfall from the actual table, not the different-period radiation/wind columns. Woburn uses the
**Met Office Bedford station 1991–2020 first table**, explicitly verified by its data-period attribute.
Both are nearby regional guidance, normal daytime highs rather than monthly means, and not forecasts.
Rainfall bands below 75 / below 150 / at least 150 mm. Weather suitability does not establish room-rate
seasons or guarantee attraction availability.

English only; translations left to the separate agent. No code deployment performed.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Budapest Great Market Hall | 21340 | 21181 |
| Center Parcs Woburn Forest | 21341 | 21182 |

Both hosts passed native title/source/date/address/coordinates/author/references/media-credit,
hotel rubric and factory metrics/milestones readbacks. Woburn GBP250m project cost read back correctly.
All four native pages returned HTTP 200. Local `/travel` renders both additions without application
errors: **Family 43 / Budget 32**. All 10 existing travel tests and `git diff --check` passed.
No data writes remain pending. Production category display awaits an explicitly requested deploy.
