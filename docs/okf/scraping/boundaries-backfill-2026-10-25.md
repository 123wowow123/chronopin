---
type: Reference
title: Production boundary backfill audit, 2026-10-25
description: Verified wildfire and district layers, production replay and unresolved source gaps.
resource: ../../../scripts/boundaries/backfill-2026-10-25.prod.json
tags: [scraping, maps, wildfire, elections, production]
---

# Production boundary backfill — 2026-10-25

**Latest partial follow-up:** Morocco's 65 whole-unit local constituency outlines and 12 regional-list areas are saved and publicly verified. Current coverage is **75 mapped pins and 10,322 default features** (74 complete reviewed layers plus one explicitly partial map; 18 wildfire and 57 district pins). All five countries still lack complete geometry: Morocco's 27 local constituencies in ten split provinces remain missing. See [country round three](boundaries-country-round3-2026-10-25.md). Earlier round counts below are historical.

The owner requested all relevant production pins after the initial three-pin import. The audit covered **592 distinct pins across the discovery passes**, discovered by broad title/description searches and then independently by the Elections, Disaster, Wildfire and Wildfires tags. The category-tag pass found national elections that the title search missed. The structured audit is `scripts/boundaries/backfill-audit-2026-10-25.json`.

**74 pins have saved, read-back verified production layers: 18 wildfire-related pins and 56 district-election/voting-area pins, containing 10,245 default GeoJSON features.** This adds coverage to 71 pins beyond the initial three; it also refreshes the two initial fire layers to the newer CAL FIRE archive. All 74 public pages were checked for rendered geometry, key, name, source date/plan vintage, and expected color. The author, title, description, summary, event dates, source URL and parent ID were verified unchanged; three previously missing map coordinates were filled from verified municipal geometry against pre-write snapshots. Non-boundary map layers are preserved by the importer.

**5 candidates remain research gaps; this is not a claim that every relevant pin is mapped.** Each has an explicit reason and checked sources in the audit and table below. Another 513 search/category matches were outside the boundary scope: for example national contests without a reviewed subnational ballot area, internal parliamentary votes, non-wildfire disasters, construction districts, entertainment titles and product recalls. No map is inferred from a word match alone.

The follow-up also stores **10 state redraw comparisons (362 alternate-plan features)** on US midterms pin 1648. After the owner reported deployment, all 30 state/view combinations were verified on production. See [the second round](boundaries-round2-2026-10-25.md) for the two additional country maps. No deployment or VM action was performed. See [redraw research and verification](boundary-redraws-2026-10-25.md).

The [large run](boundaries-large-run-2026-10-25.md) adds 25 pins, includes explicitly labelled citywide/countywide/statewide ballot areas, resolves Bosnia with a separate Brčko explanation, and corrects Black Summer to a research gap. Its table lists all new pin IDs and reviewed scope sources.

The [second large run](boundaries-large2-run-2026-10-25.md) adds eight maps and resolves Black Summer plus both Taiwan pin gaps. The nine-in-one layer covers city/county executives only; lower-tier ballot areas are not drawn. The importer preserves full prepared coordinate precision.

## Verified coverage

| Group | Production pins | Source scope |
| --- | --- | --- |
| Wildfires | 3215, 3403, 3407, 3411, 3417, 3421, 3427, 3431, 3437, 3442, 3448, 3453, 3458, 3461, 3466, 3596, 3599 | Border 2, Palisades and Eaton, with both LA fire polygons for the combined debris-removal and chief-removal stories. |
| Local districts | 3507, 3523, 3644, 3650, 3668, 3684, 6073 | Boston districts 1–9; San Diego County District 1; San Francisco District 4 and the five November ballot districts (2/4/6/8/10); Holborn and St Pancras. |
| National/provincial constituencies | 1648, 1977, 1979, 2352, 2353, 2355, 2356, 2358, 2360, 2362, 5170, 5171, 5473 | Germany 299; Canada 343; Finland 13; Argentina 24; Quebec 127; the 27 Czech Senate districts voting in 2026; US House 435; Kenya 290; El Salvador 14; Latvia 5; Guatemala 23; Micronesia 10; Spain 8,132 municipal/city areas. |

The map annotations identify exactly which part of a mixed election is drawn: Boston’s at-large seats, Czech municipal council contests and the presidential component of Argentina’s election are not presented as subnational district contests. Future-election pins explicitly label current published plans as context, rather than certifying that no boundaries can change before the predicted election.

## Sources and vintage checks

- **Wildfires:** [CAL FIRE historical perimeter service](https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/California_Historic_Fire_Perimeters/FeatureServer/0), linked from [FRAP’s official perimeter page](https://www.fire.ca.gov/what-we-do/fire-resource-assessment-program/fire-perimeters). Version Firep25_1 was released in April 2026. The import selects `YEAR_=2025` and exact incident names/incident numbers: Palisades `LDF/00000738`, Eaton `LAC/00009087`, Border 2 `SDU/00001643`. These are historical full-incident extents, not ignition-time spread or evacuation orders. The ignition pins say so explicitly. `observedAt=2025` preserves the archive’s annual precision; containment dates are not relabelled as observation times. GIS acreage differs slightly from operational incident totals, so existing pin acreage/text is not changed.
- **San Francisco:** [DataSF Supervisor Districts (2022)](https://data.sf.gov/Geographic-Locations-and-Boundaries/Supervisor-Districts-2022-/f2zs-jevy/data), April 2022 plan, water-trimmed. Its officeholder attributes are stale; only exact `sup_dist` values determine the shapes. The November 2026 pin receives precisely districts 2, 4, 6, 8 and 10.
- **Boston:** [2023-2032 district service](https://services.arcgis.com/sFnw0xNflSi8J0uh/arcgis/rest/services/CityCouncilDistricts_2023_5_25/FeatureServer/0), matched to the approved application linked by [Boston’s official redistricting page](https://www.boston.gov/departments/city-council/2022-redistricting-boston). Its service says effective 2023-05-25; the city page says the map goes into effect for November 2023. An older GIS Planning/OpenData layer lists former councillors and was rejected rather than treated as the current plan.
- **Holborn:** [ONS July 2024 BGC FeatureServer](https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Westminster_Parliamentary_Constituencies_July_2024_Boundaries_UK_BGC/FeatureServer/0), exact code `E14001290`, 20m generalisation. The similarly named cached MapServer does not provide the needed feature query; use the FeatureServer.
- **Germany:** [Federal Returning Officer downloads](https://bundeswahlleiterin.de/bundestagswahlen/2025/wahlkreiseinteilung/downloads.html), generalised WGS84 geometry for the 2025 Bundestag election. All 299 polygons and the required full attribution are retained. The 2029 prediction pin calls it the current published 2025 plan.
- **Canada:** [Elections Canada 2023 Representation Order shapefile](https://www.elections.ca/content.aspx?dir=cir/mapsCorner/edb&document=index&lang=e&section=res), 343 districts. Converted from the archive’s declared Statistics Canada Lambert CRS with `always_xy=True`, simplified at 250m in that metric CRS with topology preservation, then transformed to WGS84. Its 2029 pin explicitly describes the currently published plan rather than a guaranteed future plan.
- **Finland:** [Statistics Finland’s 2026 constituency classification](https://stat.fi/en/luokitukset/vaalipiiri/vaalipiiri_1_20260101) and official WFS `tilastointialueet:vaalipiiri1000k_2026`, 13 constituencies, January 2026 division. The official classification reports no changes since January 2022. A 1:1,000,000 overview is labelled as current context for the 2027 election, credited CC BY 4.0.
- **Argentina:** [Official Georef download API](https://www.argentina.gob.ar/georef/descarga-de-la-base-completa), IGN provincial polygons: 23 provinces plus Buenos Aires city. These correspond to congressional electoral districts under the [National Electoral Chamber’s explanation](https://www.electoral.gob.ar/pdf/capacitacion_jovenes.pdf); they are not the smaller voting circuits.
- **Quebec:** [Élections Québec data](https://www.dgeq.org/donnees.html), final January 2026 electoral map, 127 features in `circonscriptions_electorales_sans_eau_2026.json`; the source geometry states 50m simplification and omits water.
- **Czech Republic:** [Czech Statistical Office 2026 Senate service](https://geodata.csu.gov.cz/server/rest/services/Hosted/Sen%C3%A1tn%C3%AD_volebn%C3%AD_obvody_2026/FeatureServer/1). Select `rok_voleb=2026`, producing 27 unique district codes. The complete layer also includes other election cycles and a military-area record; do not import it unfiltered. `obvod` is zero-padded text; a numeric `IN` query failed and was replaced with the source’s election-year field.

## Replaying the verified coverage

Use `scripts/boundaries/backfill-2026-10-25.prod.json`. Source downloads are fresh HTTPS queries except the two shapefile conversions, which have reproducible preparation scripts:

1. Download the official Canadian ZIP linked in `scripts/boundaries/prepare-canada-2023.py` to `.scrape/boundaries/canada-2023-shp.zip`. In a temporary venv with `pyshp`, `pyproj` and `shapely`, run that script.
2. Download the official German ZIP linked in `scripts/boundaries/prepare-germany-2025.py` to `.scrape/boundaries/germany2025-shp.zip`. Run that script with `pyshp` installed.
3. Obtain a valid admin session, then dry-run the full manifest before saving. Recheck mutable source vintages and the current pin titles; do not assume future replay is automatically correct.

```sh
npx tsx scripts/boundaries/import.ts --manifest scripts/boundaries/backfill-2026-10-25.prod.json --base https://www.chronopin.com --token-file .scrape/admin-boundaries-prod.token --dry
npx tsx scripts/boundaries/import.ts --manifest scripts/boundaries/backfill-2026-10-25.prod.json --base https://www.chronopin.com --token-file .scrape/admin-boundaries-prod.token
```

Pre-write records, raw source downloads, per-page browser results, screenshots and the final per-shape SHA-256 verification report are under ignored `.scrape/boundaries/`. Each verified record in the tracked audit includes its saved geometry hash. No credentials, raw pin photos or deployment artifacts are committed. No production deployment, VM build or restart was performed.

The [third large run](boundaries-large3-run-2026-10-25.md) adds Mexico’s 300 federal single-member districts from INE’s October 1, 2026 release. The five proportional-list regions are explicitly outside that layer. All 71 saved maps pass read-back verification.

The [fourth large run](boundaries-large4-run-2026-10-25.md) adds 56 Electoral College voting areas to the 2028 US presidential pin and five county areas to the Connect Bay Area qualification pin. Both previously excluded candidates now have verified electoral scope. All 73 saved maps pass read-back verification; six source gaps remain.

The [fifth large run](boundaries-large5-run-2026-10-25.md) resolves Angola with 21 current provincial areas and a live 18-to-21 comparison. Current coverage is 74 pins, with 10 US state comparisons plus one Angola provincial comparison (401 alternate-plan features). Five country geometry gaps remain.

The [sixth large review](boundaries-large6-run-2026-10-25.md) expands discovery by 80 candidates, all outside boundary scope, and checks new source leads without importing incomplete geometry. All 74 saved maps remain verified; the five country gaps are unchanged.

The [seventh review](boundaries-large7-run-2026-10-25.md) records further source limitations and saves an official Gambia constituency/ward membership catalog. It is explicitly non-importable until polygon geometry and current-plan validation are obtained. Coverage and the five geometry gaps remain unchanged.

## Research gaps

| Pin | Remaining boundary research |
| --- | --- |
| 1967 — Russians Vote for a New State Duma | Need a complete verified 2026 State Duma single-member district polygon set. Region/address lists and legal descriptions found do not establish reusable national geometry; older Duma plans cannot be substituted. [Sources checked](https://kolomnagrad.ru/index.php?area=static&do=download&id=1887) |
| 1978 — India's Next General Election Picks a Prime Minister | Need a verified complete current Lok Sabha polygon set and explicit treatment of the predicted 2029 plan. Older 2019 parliamentary maps found require checking against subsequent delimitations; the ECI/government material checked supplies delimitation information, not a verified complete current GeoJSON set. [Sources checked](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1910038&lang=2&reg=48) |
| 2350 — Nigeria Votes for a President and National Assembly | Need actual federal constituency polygons, not states or LGAs. INEC material establishes 360 House constituencies, but a complete version-matched public geometry set was not verified from the sources checked. [Sources checked](https://wp1.inecnigeria.org/wp-content/uploads/Activity-Report-Election-Management-Body.pdf) |
| 2354 — The Gambia Elects a National Assembly | Need the 53 constituency polygons. The National Assembly source establishes 53 elected constituencies, while IEC searches and the electoral-disclosure study checked did not yield a verified current national polygon set; administrative regions are not substitutes. [Sources checked](https://assembly.gm/about/elections) |
| 2979 — Morocco’s PAM Leads the 2026 Election With 97 of 395 Seats | Need verified 2026 local constituency polygons and separate regional-list scope. Current election pages describe local and regional constituencies; the older 2011 list or a generic province/region layer does not establish the complete 2026 plan. [Sources checked](https://www.maroc.ma/fr/actualites/elections-legislatives-2026-trois-moyens-pour-localiser-votre-bureau-de-vote) |

The initial US and Kenya import failures were resolved during the follow-up. The US map now reconciles ten states and preserves Missouri’s operative November plan; Alaska framing wraps display coordinates without changing stored geography. Kenya uses a different primary IEBC/OCHA archive, with all 290 named constituency IDs verified. Five unassigned source pieces are explicitly excluded and disclosed, rather than assigned to invented districts.
