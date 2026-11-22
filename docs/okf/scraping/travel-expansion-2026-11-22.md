# Family and budget travel additions — November 22, 2026

Added four hotels to both the family and budget travel catalogs. Each has a native Travel pin,
a sourced hotel rubric, an undated AAA inspector excerpt, three visually reviewed property photos
uploaded to Azure and verified by public download/SHA-256, a full street address, and ArcGIS
PointAddress geocoding (99.9–100 match scores). No fixed IDs were inserted or reused.

| Hotel | First guest opening | Production pin | Local pin | Nightly rate basis |
| --- | --- | --- | --- | --- |
| Universal Cabana Bay Beach Resort | March 31, 2014 | 21242 | 21074 | AAA from $179, before taxes/fees |
| Universal Surfside Inn and Suites | June 27, 2019 | 21243 | 21075 | AAA from $127, before taxes/fees |
| Universal Dockside Inn and Suites | December 15, 2020 | 21244 | 21076 | AAA from $167, before taxes/fees |
| Disney’s Pop Century Resort | December 14, 2003 | 21245 | 21077 | MouseSavers 2026 standard-room rack rates, $212–396 including 12.5% tax |

Rates are observations or published seasonal tables, not guaranteed booking quotes. Family suites can
cost more than standard rooms. Pop Century qualifies below $250 only on selected dates, and its
operator currently flags construction/refurbishment. The budget shelf tagline now states the
date/room/tax limitations. Hotel operating-history pins retain null construction costs rather than
putting room rates into the project cost field. Buildout profiles record the evidenced opening milestone;
engineering scores stay null without comparable evidence.

Opened sources are retained in each pin’s references and in
`scripts/hotels/travel-expansion-2026-11-22.json`: property-specific Universal press releases (Surfside PDF,
Dockside release hosted by VISIT FLORIDA), Orlando Informer’s Cabana Bay history, Disney’s D23 archive,
official amenity pages, Tripadvisor’s property-specific component guest scores, AAA inspector pages,
and MouseSavers’ 2026 Pop Century rate table. Guest component scores are rounded to the nearest half
point. Forbes’ Orlando directory was checked; none of the four was listed. MICHELIN’s Orlando lookup
redirected to a generic hotel catalog; no current Keys claim is made and acclaim remains null.
Browser access was unavailable, so no visual native-page browser inspection was possible.

Seasonal planning uses [Florida Climate Center’s Orlando International Airport 1991–2020 normals](https://climatecenter.fsu.edu/products-services/data/1991-2020-normals/orlando).
Monthly temperatures are normal daytime highs converted from Fahrenheit to whole Celsius; rainfall
bands are low below 3 inches, moderate from 3 to below 6, high at least 6. Prime/good/fair months are
editorial climate guidance, separate from room-price seasonality and school-holiday crowd patterns.

The new runtime catalog matches by exact source URL because local/prod IDs differ. Research and replay:
`node scripts/hotels/expandTravelShelves.mjs` (identity dry run) or `--apply` (resumable writes; refresh
admin logins first). It gates creation on homepage latency, preserves batch identities in the ignored
posted manifest, verifies complete native readbacks, restores image credits after thumbnail processing,
and expires the affected pages. Audit readbacks live under
`.scrape/prod-batches/travel-2026-11-22/`.

Data was saved in both environments. Travel shelf code is prepared locally; no production deployment
was requested or performed. English only; translations are left to the translation agent.

Validation: `npm run typecheck` passed; all 10 existing `src/lib/travel.test.ts` tests passed.
The local `/travel` HTML rendered without a server-rendering error and includes all four additions,
with **Family 13 / Budget 09** (previously 09 / 05). All eight native pages returned HTTP 200 and
contained the expected property name. An intermediate development HMR cache held an undefined timing
value; the regional timing lookup and a no-cache HTTP refresh produced a clean final render.

Specific gaps: a verified resort construction budget/comparable cost benchmark, current MICHELIN
recognition, and a dated independent expert review. One Dockside poolside image is 640×427 and retained
without upscaling; the other two Dockside images are 1500×1000.
