# International family and budget stays — November 22, 2026

Added four more hotels to both shelves, retaining the four Orlando-area additions from the first round.

| Hotel | Production pin | Local pin | Opening date represented |
| --- | --- | --- | --- |
| LEGOLAND Malaysia Hotel | 21246 | 21095 | November 29, 2013 |
| ibis Styles Tokyo Bay | 21247 | 21096 | July 2, 2018 |
| Tokyo Disney Celebration Hotel | 21248 | 21097 | June 1, 2016, Wish building’s Disney rebranding |
| Rove Downtown | 21249 | 21098 | May 4, 2016 |

Each has three visually inspected, distinct property images stored in Azure, verified by public
download and SHA-256, with native media attribution checked after thumbnail processing. Maihama Hotel
Stays watermarks were preserved. ibis images show reception, a room and a firsthand breakfast; LEGOLAND
shows its entrance, Kingdom room and treasure activity; Celebration shows its lobby, room and both
buildings; Rove shows its lobby, gym and exterior. Two Accor photos are 1024×768, used without upscaling.

Full addresses come from property/operator information and property-specific listings. ArcGIS matched
the Japanese street addresses at 97.81–100 and the exact LEGOLAND and Rove hotel POIs at 100. Broad
street-name matches for the latter two were rejected: the first Dubai street match was kilometres away
from the hotel. Celebration’s postal code is the operator’s 279-8502, rather than the geocoder’s general
street-area postal code.

Hotel rubrics use opened property-specific Tripadvisor component-score snapshots, rounded to half
points, with the snapshot review counts in each basis. They are not presented as current live counts.
Reviews are short verified excerpts: Maihama Hotel Stays’ firsthand ibis and Celebration articles
(publication dates May 25 and 26, 2022; updated October 24, 2026), The National’s Rove profile
(September 13, 2016), and a firsthand LEGOLAND guest review (only April 2026 is given, so no day is invented).
Current MICHELIN/Forbes distinctions could not be established; acclaim remains null. The Forbes Tokyo
and Dubai directories and MICHELIN Tokyo/Dubai lookups were read; Johor lookups were inaccessible or
did not supply a property record. AAA’s June 2026 geographic coverage excludes these three countries.
No hotel class or generic group award was converted to acclaim.

Rove’s exact day is supplied by its COO Paul Bridger in [BOTT’s May–June 2022 interview,
printed page 39](https://bottindia.com/wp-content/uploads/2022/05/BOTT-SATTE-Magazine-MAY-JUNE-2022.pdf).
The PDF text and rendered page were inspected. His explicit May 4, 2016 statement replaces the initial
month-only estimate; the pin, date reasoning, reference and buildout milestone were corrected on both
hosts, preserving author, map, photos and previous references. The site’s confidence filter is unchanged.

Budget membership is supported by the hotels’ published value/midscale positioning and property-specific
firsthand reviews. The shelf no longer promises that all rooms are below a universal USD ceiling.
LEGOLAND’s operator advertises Kingdom rooms from RM679; that is kept in the native article in its own
currency, with taxes, occupancy and ticket inclusions to be checked. It is not inserted into the USD price
sort or the construction cost. The other properties have no verified current booking quote, so their cards
say rates on request. The cached Rove AED299 ticket promotion ended October 31 and was not reused.
Dynamic rate tables and hotel search snippets were not treated as guaranteed current quotes.

Tradeoffs are in the native articles: ibis uses a park shuttle; Celebration is a limited-service Disney hotel
about a 20-minute bus ride from the parks; Rove’s standard room selector permits two adults and one child
(larger families need confirmed connecting rooms). Park tickets and breakfast are not presumed included.
Construction costs remain unknown; buildout profiles carry the verified opening/rebranding milestone and
leave unsupported engineering scores null.

The runtime catalog now accepts property-specific `bestTimeToGo` data, so these hotels do not inherit
Orlando’s seasons. Sources:

- [JMA Tokyo 1991–2020 monthly normals](https://www.data.jma.go.jp/stats/etrn/view/nml_sfc_ym.php?prec_no=44&block_no=47662),
  used explicitly as a regional climate proxy for Urayasu.
- [WMO Johor Bahru](https://worldweather.wmo.int/en/city.html?cityId=78), with its Malaysian Meteorological
  Department 1974–2000 series, explicitly dated as older regional guidance.
- [WMO Dubai](https://worldweather.wmo.int/en/city.html?cityId=1190), with its UAE 1974–1991 series,
  explicitly dated as historical context, not a contemporary forecast.

All twelve monthly highs and rainfall totals were read from the primary tables/underlying public city
JSON; no forecast values were used as normals. Rain bands are low below 75 mm, moderate 75–149.9 mm,
high at least 150 mm. Season ratings are editorial climate guidance and do not predict hotel prices.

Replay: `node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round2.json`
for identity dry run; append `--apply` to save. The script allocates IDs, posts one pin at a time with the
homepage latency gate and pacing, verifies native readbacks, and merges runtime entries by source URL
without dropping earlier batches. The original default command keeps its original posted-manifest path.
Audit snapshots are in `.scrape/prod-batches/travel-expansion-2026-11-22-round2/`.

Saved English data on production and local. No translation run or production deployment was performed.

Validation: typecheck passed and all 10 existing travel tests passed. Local `/travel` renders without a
server-rendering error, retains the first batch and shows **Family 17 / Budget 13**. All four new names
are in the rendered page. Native API readbacks verify the pin fields, media, credit, references, hotel
rubric and buildout profile on both hosts. All eight native pages returned HTTP 200 with the expected
property name; each pin retains three media. `git diff --check` passed.
