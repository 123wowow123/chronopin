# Second large production boundary run — 2026-10-25

**Eight additional pins are verified live, bringing coverage to 70 pins and 9,863 default features.** The expanded discovery was rerun and found no new candidates beyond the 512 already reviewed. This round resolves three existing research gaps and adds five reviewed jurisdiction matches. Seven source gaps remain: Russia, India, Nigeria, Gambia, Mexico, Angola and Morocco.

All eight new public pages were checked for the expected map, feature count, label and source. All 70 saved production maps were read back against their prepared geometry. The new pins' authors, titles, addresses, descriptions, summaries, dates, source URLs and parent links remain unchanged. Taipei prediction pin 19425 had no coordinate; its missing map anchor was filled from the verified Taipei polygon, preserving its null address. No production build, restart or deployment occurred.

| Pin | New layer | Scope |
| --- | --- | --- |
| 2450 — Black Summer | 1 MultiPolygon, 25,354 dissolved components | Official indicative national fire extent, July 2019–June 2020; includes planned fires and unburnt pockets. |
| 6541 — Taiwan July 26 recalls | 24 legislative constituencies | Exactly the 24 legislative recalls announced by CEC, excluding the separate Hsinchu mayor recall. |
| 6548 — Taiwan nine-in-one elections | 22 executive areas | City/county mayor and magistrate geography only. Councillor, township, indigenous-district and village contests are not drawn. |
| 19425 — Taipei mayor prediction | 1 citywide area | Taipei City mayor voting area, not council or polling districts. |
| 5173 — Lima mayor | 1 provincial area | Province of Lima metropolitan mayor jurisdiction, including its 43 districts; excludes Callao and individual district-mayor contests. |
| 3500 — Boston mayor inauguration | 1 citywide area | Elected mayor's jurisdiction; the original Symphony Hall venue marker is preserved. |
| 3549 — New York governor term begins | 1 statewide area | January 2026 Census outline as context for the 2027 term. |
| 3616 — NYC mayor inauguration | 1 citywide area | Elected mayor's jurisdiction; the original City Hall marker is preserved. |

## Black Summer: precision and topology

The [official DCCEEW NIAFED v20200623](https://www.arcgis.com/sharing/rest/content/items/dc651afe7ec944d0a22e6c1f120f3a15/info/metadata/metadata.xml?format=default&output=html) is licensed CC BY 3.0 AU. The full source has 33,728 polygon parts, including 1,270 self-touching parts. Source linework normalization changes their area only at floating-point precision; no buffer, hull or missing-ring removal is used. Overlapping parts are dissolved into 25,354 disjoint components. Coverage simplification at tolerance 150 in Australian Albers (EPSG:3577) retains those components and produces valid geometry. The overview's total area differs from the source union by about 0.019%; this is cartographic generalisation, not a new burnt-area estimate.

The old boundary importer rounded every coordinate to six decimals, collapsing 25 tiny exterior components. `boundaryShape` now clones and validates the prepared coordinates without rounding them. Simplification remains the reviewed preparation script's responsibility. A regression test verifies that a tiny valid component survives and that the returned geometry does not share mutable coordinate arrays with the input. The generic `roundCoords` utility and existing non-boundary importers are unchanged.

This helper is used by the import scripts; it is not a production runtime dependency. The deployed map already accepts full coordinate precision, so the data was saved without a deployment. The stored GeoJSON is valid and retains all 25,354 prepared components and all 1,485 source-union holes.

The [government's source caveats](https://www.dcceew.gov.au/environment/biodiversity/bushfire-recovery/bushfire-impacts) remain visible in the map label: the source covers July 1, 2019 through June 22, 2020, includes planned fires and potentially unburnt pockets, and is an indicative national aggregate. It does not show the pin's earliest June 2019 fires, ignition-time spread or a precise final burnt scar. `observedAt=2020-06-22` is the extent cutoff; June 23 is the release date. Existing event dates and acreage claims were not changed.

The complete overview is about 25 MiB before HTTP compression. Local full-page verification took about 4–6 seconds and production about 12.3 seconds, including the map. The other seven production-page checks took about 1.3–1.7 seconds each. Raw sources and geometry stay ignored.

## Taiwan: official data and exact membership

The current MOI/TGOS village download previously returned 403. This round located accessible official alternatives on [NCDR's CAP documentation page](https://alerts.ncdr.nat.gov.tw/web/developer/cap-docs), labelled **Taiwan_Geocode_113, updated 2024-10-15**:

- City/county boundaries: `https://alerts.ncdr.nat.gov.tw/web/StaticFile/Document/city_113.shp(utf8).zip` — 22 records, WGS84.
- Village boundaries: `https://alerts.ncdr.nat.gov.tw/web/StaticFile/Document/village_113.shp(utf8).zip` — 7,953 records, source TWD97 geographic CRS, transformed explicitly to WGS84.

The release date identifies NCDR's publication, not a claim that every underlying boundary was surveyed that day. Geographic overviews use 50-metre topology-preserving simplification and retain the source's offshore polygons. The 22-area map therefore includes the distant offshore geography supplied by NCDR; it is not a statement that every polygon has resident voters, nor a determination of disputed sovereignty.

The [CEC's official announcement](https://web.cec.gov.tw/central/article/60139) establishes the exact July 26, 2025 set: Taipei 3/4/6/7/8; New Taipei 1/7/8/9/12; Taoyuan 1–6; Taichung 4/5/6; Yunlin 1; Hualien; Taitung; Keelung; Hsinchu City. The current CSV from [CEC's 11th Legislative Yuan definition directory](https://data.cec.gov.tw/?dir=%E7%AC%AC11%E5%B1%86%E7%AB%8B%E6%B3%95%E5%A7%94%E5%93%A1%E9%81%B8%E8%88%89%E5%8D%80%E7%AF%84%E5%9C%8D) was fetched again and matched the reviewed definitions exactly. The [government open-data catalog](https://data.gov.tw/en/datasets/170247) also identifies this authoritative definition dataset.

All **2,313 selected village codes** match uniquely, with no duplicate assignment across the 24 districts. Every named village in a split town must match exactly once. Two source encoding correspondences were verified: 瓦磘里 is `瓦[磘]里` (65000030017), and 灰磘里 is `灰[磘]里` (65000030054). No geographic membership was guessed from those spellings. Whole-town definitions include their geographic fragments; no unassigned fragment exists in the selected split towns. The four whole-county/city constituencies use the full official county/city polygons.

All selected input polygons, district unions and final overviews are valid. The membership report records every village code and the exact CEC definition. It is retained under ignored `taiwan-recall-membership-verified.json`.

The [CEC election schedule reported on the government's OCAC site](https://www.ocac.gov.tw/OCAC/Eng/Pages/Detail.aspx?nodeid=329&pid=80997079) establishes the six special municipalities and sixteen county/city executive contests. The nine-in-one pin is now mapped **only at that executive level**; lower-tier ballot areas remain outside this layer and the key explicitly says so. Taipei's citywide mayor prediction receives the corresponding single city polygon. Its map anchor is a centroid inside the verified source polygon, not an invented venue address.

## Lima and elected-office jurisdictions

Lima uses [geoBoundaries PER ADM2](https://www.geoboundaries.org/api/current/gbOpen/PER/ADM2/), 2020 IGN/OCHA ROLAC province geometry, CC BY 3.0 IGO. The exact province named Lima is selected, not the Lima department or the larger urban agglomeration. [Peru's Presidency of the Council of Ministers](https://www.gob.pe/institucion/pcm/campa%C3%B1as/4355-limametropolitana-informacion-territorial) establishes the province's 43-district extent. Its one native feature is the metropolitan mayor jurisdiction; separate district contests and Callao are excluded.

The three office-term pins reuse already reviewed Census jurisdiction matches, with labels distinguishing the elected office's area from the inauguration venue. [Boston's official inauguration announcement](https://www.boston.gov/news/inauguration-mayor-michelle-wu-and-boston-city-council) and [NYC's official inauguration notice](https://www.nyc.gov/assets/cecm/downloads/pdf/2026-inauguration-street-closures-info.pdf) were checked. No venue marker was replaced or broadened into a venue footprint.

## Reproduction and checks

Use `scripts/boundaries/fetch-large2.mjs`, then `prepare-black-summer.py` and `prepare-taiwan.py` with Shapely 2.1+, GEOS 3.12+, pyproj and pyshp in an ignored environment. `prepare-large2.py` builds the replay entries and selects Lima; the earlier ballot-jurisdiction preparation supplies the three reviewed US outlines. Cached sources are reviewed snapshots; remove them explicitly for a fresh source review.

Run `import-centres.mjs` with `backfill-centres-large2-2026-10-25.prod.json` for the reviewed missing Taipei coordinate, then `import.ts` with `backfill-large2-2026-10-25.prod.json`. Both require the explicit target base and token file for production saves. The coordinate helper now handles a null textual address with a guarded `.null` filter, preserves it, and refuses to replace a different existing coordinate. The complete boundary manifest contains 70 unique pins.

Preparation and authenticated dry runs passed. Focused geometry/key tests passed (26 tests), TypeScript checks and targeted lint passed. All eight new public pages have the expected native-map paths, labels and no browser errors. All 70 saved maps match the reviewed source output. Before-write rows, hashes, screenshots and detailed reports remain ignored, including `large2-prod-before.json`, `large2-prod-ui.json`, `large2-all-saved-verified.json` and `black-summer-preparation.json`.
