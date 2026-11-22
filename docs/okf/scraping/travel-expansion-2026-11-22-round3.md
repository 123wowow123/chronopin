# Travel shelf expansion — third round, 2026-11-22

Added two family hotels and two compact, value-positioned city hotels. English pin data, hotel
rubrics, development profiles and credited media are saved on production and local. The runtime
catalog is updated locally; no production code deployment or translation run was performed.

| Hotel | Shelf | Production | Local | Guest opening |
| --- | --- | --- | --- | --- |
| LEGOLAND Castle Hotel Billund | Family | 21267 | 21099 | 2019-03-29 |
| Great Wolf Lodge Anaheim / Garden Grove | Family | 21268 | 21100 | 2016-02-19 |
| citizenM London Bankside | Budget | 21269 | 21101 | 2012-07-04 |
| YOTEL Singapore Orchard Road | Budget | 21270 | 21102 | 2017-10-01 |

The research catalog is `scripts/hotels/travel-expansion-2026-11-22-round3.json`. Replay with
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round3.json`
for an identity dry run; append `--apply` to resume saves. Database IDs were allocated by each host.
Audit snapshots and the posted manifest are under
`.scrape/prod-batches/travel-expansion-2026-11-22-round3/`.

Opening evidence is property-specific: LEGOLAND Billund's contemporaneous press release; Bisnow's
22 February 2016 report that Great Wolf opened the preceding Friday; citizenM's syndicated opening
release; and Hong Fok's 3 November 2017 supplemental information memorandum, printed page 10
(PDF page 14, text and rendered page inspected). Great Wolf's first guest opening precedes its
4 March ceremony. YOTEL's owner-confirmed operations date takes precedence over a later tourism
guide's November opening reference. These are not inferred dates based on construction schedules.

LEGOLAND's announced 2017 investment of DKK200 million and Great Wolf's reported USD250 million
hotel-and-water-park development are saved in their original currencies, with sourced investment
metrics. LEGOLAND's figure is an announced investment, not final audited expenditure. No construction
investment was verified for Bankside or YOTEL; those prices remain null. Engineering rubric axes
remain null for lack of a comparable, evidenced benchmark.

Each hotel has three visually reviewed, distinct Azure photos, public-download/hash verification and
native authorName/authorUrl attribution readbacks. Castle shows exterior, bedroom and playground;
Great Wolf shows entrance, room and outdoor pool; Bankside shows lounge, compact room and meeting
space; YOTEL shows entrance, room and pool. Generic brand images depicting other properties were
rejected. Full street addresses were verified from property information and listings (the Danish
food authority also identifies Castle at Åstvej 20), then geocoded with property-specific ArcGIS
POI/address matches rather than city centroids.

Hotel scores use opened Tripadvisor component snapshots, rounded to half points. Snapshot counts
and original values are retained in each basis; they are not current live review-count promises.
Independent excerpts are from MUMMYTRAVELS' hosted Castle review (2019-10-13), AAA's Garden Grove
inspection (undated), Oyster's Bankside review (undated), and TTG Asia's YOTEL stay (2017-11-02).
MICHELIN and Forbes Travel Guide property-name searches did not establish current distinctions.
AAA's Garden Grove inspection was checked without inferring a Diamond count from room scores;
AAA geographic coverage excludes the overseas properties. Acclaim remains null.

Bankside's budget positioning comes from Oyster's competitive-price assessment; rooms are for two
adults, with compact space and no on-site parking stated. YOTEL's value positioning is supported by
[Forbes Vetted's July 18, 2024 selection](https://www.forbes.com/sites/forbes-personal-shopper/article/best-hotels-in-singapore/).
This editorial selection is distinct from Forbes Travel Guide awards. Its historical starting price
was not reused. Current YOTEL Premium Queen rooms are 14 square metres for two; Premium Triple
rooms are 14 square metres for three. All four have rates on request; there is no invented current
all-in quote or universal USD ceiling. Great Wolf's parking and paid attractions are disclosed.

Per-property monthly climate data replaces Orlando guidance:

- Billund Airport: NOTAMET's published NOAA GSOD-derived 1991–2020 averages. This is a secondary
  record-based series; daily extrema may differ from official station normals. The source and
  limitation are retained in the catalog. Winter park operating days need checking.
- Anaheim: NOAA station USC00040192, 1991–2020 monthly normals; Fahrenheit and inches were
  converted to Celsius and millimetres. The indoor water park is a year-round activity.
- London: Met Office Heathrow 1991–2020 normals, explicitly a regional proxy for Bankside.
- Singapore: WMO / Meteorological Service Singapore 1991–2020 normals, read from the city JSON.

Rain bands use below 75 mm / below 150 mm / at least 150 mm. Recommended months are editorial
climate guidance and do not predict room rates or holiday crowds.

Validation: native pin, reference, address, author, media-credit, hotel-score and milestone readbacks
passed on both hosts. All eight native pages returned HTTP 200 with expected property text. The
local `/travel` page renders all four additions without an application error and shows **Family 19 /
Budget 15**. All 10 existing travel tests passed. The first factory save rejected an invalid metric
shape before saving it; investment metrics were corrected to the supported string-value schema and
both hosts were fully replayed and verified. Zero pending writes remain. Translations are left to
the translation agent; production category display awaits a separately requested code deployment.
