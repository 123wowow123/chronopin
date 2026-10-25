---
type: Reference
title: "Second production boundary round — 2026-10-25"
description: "After the owner reported deploying the redraw code, all ten US state comparisons were checked on production in Earlier plan, Later plan and Compare plans modes."
tags: [scraping, maps, boundaries, production]
---

# Second production boundary round — 2026-10-25

After the owner reported deploying the redraw code, all ten US state comparisons were checked on production in Earlier plan, Later plan and Compare plans modes. All 30 combinations rendered the expected district counts and colors, and Missouri retained its blocked-plan warning. The default still shows 435 voting House districts. The NCSL tracker and AP's map release notes were reopened; neither required changing the stored ten-state comparison catalog. No deployment, build, restart or VM operation was performed in this round.

**37 production pins are now mapped**, with 9,780 default boundary features. Two additional pins were imported: Micronesia and Spain. All 37 saved maps were read-back verified; both new public pages render their expected geometry and scope labels. Ten candidates retain explicit source gaps.

## Micronesia — pin 2353

The ten two-year congressional districts are aggregated from **all 75 source municipalities**, each assigned once. The output union equals the original union exactly, without simplification or repairs. This maps island land only: maritime boundaries and four-year at-large contests are excluded. The pin's predicted 2027 date is not used to certify an unpublished future plan.

Geometry comes from [geoBoundaries FSM ADM2](https://www.geoboundaries.org/api/current/gbOpen/FSM/ADM2/), boundaryID `FSM-ADM2-79324940`, representing 2019: FSM Division of Statistics, the 2010 Census/SPC and OCHA, CC BY 3.0 IGO. The fixed GeoJSON download is `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/FSM/ADM2/geoBoundaries-FSM-ADM2.geojson`; cache it as `.scrape/boundaries/fsm-municipal-round2.geojson` and run `scripts/boundaries/prepare-micronesia.py` with shapely.

[Congress's May 11, 2025 organisation announcement](https://www.cfsm.gov.fm/congress-organizes-24th-body-and-maintains-most-of-its-leadership/) identifies the five Chuuk districts by region and the three Pohnpei districts; Kosrae and Yap each have one statewide two-year district. [Chuuk Constitution article V.3](https://www.fsmlaw.org/chuuk/constitution/article05.htm) enumerates the regional islands. The [Pohnpei government code](https://www.pohnpeidota.fm/_files/ugd/acdfca_897d8c06a4b84a4aaf2ea850e88fdc82.pdf), 10 PC 3-103, enumerates all eleven jurisdictions across its three congressional districts. Its P-2 definition reads “Election District P-2 consisting of the local jurisdictions of Kitti and Madolenihmw”.

Reviewed source spellings are retained in the aggregation: PiisPenau = Piis-Panewu; PiisEmwar = Piis-Emmwar; Lekinoch = Lukunoch; Romanum = Ramanum; Murillo = Murilo; Piherech = Piherarh; Sapwuafik = Sapwuahfik; Mwokilloa = Mwoakilloa. These are spelling correspondences, not extra districts. The 75-unit government layer represents some smaller islands inside a municipality; Etten and Totiw are not fabricated as separate polygons. Every original polygon survives in its district union. Saved geometry was independently checked for validity after the importer's six-decimal rounding.

## Spain — pin 2356

[IGN's official API-Features administrative-unit collection](https://api-features.ign.es/collections/administrativeunit) supplies 8,213 areas labelled Municipio. Its [government catalog entry](https://datos.gob.es/es/catalogo/e0dat0002-divisiones-administrativas-de-espana1) identifies the registered municipal boundary source. A complete paginated download is matched by the final five national-code digits against [INE's January 2026 municipal register](https://www.ine.es/dyngs/INEbase/operacion.htm?c=Estadistica_C&cid=1254736177031&idp=1254734710990), downloaded from `https://www.ine.es/daco/daco42/codmun/26codmun.xlsx`.

All **8,132 INE codes** are present exactly once. The **81 extra shared territories** (comunidades, comuneros and other jointly administered areas) are excluded and retained in an ignored report; they are not invented municipalities. The output comprises 8,130 municipal areas and separately labelled Ceuta and Melilla Assembly areas. [LOREG article 179](https://www.boe.es/buscar/act.php?id=BOE-A-1985-11672) states “Cada término municipal constituye una circunscripción”. Regional, provincial and island-council districts are not drawn; that scope limit appears in the map key. These are current published outlines as context for the 2027 prediction, not certification of future electoral boundaries.

All original polygons must be valid. Preparation simplifies them at 150 metres in EPSG:3035 while preserving topology, converts to WGS84, and verifies validity at the importer's six-decimal precision. No source polygon is repaired or dropped. The source download contains 83 pages; feature IDs must match the complete inventory and counts must remain stable. The resulting overview is about 11 MiB before HTTP compression. The [IGN licence](https://www.ign.es/resources/licencia/Condiciones_licenciaUso_IGN.pdf) is CC BY 4.0; visible credit uses the required derived-work wording and identifies IGN and INE.

Run `node scripts/boundaries/fetch-spain.mjs`, then `scripts/boundaries/prepare-spain.py` with shapely, pyproj and openpyxl. Downloads, geometry, source workbooks and screenshots stay ignored. The fetcher retains reviewed cached pages; remove those explicitly for a fresh source review. A changed inventory fails preparation and requires another review.

## Review evidence and remaining gaps

The replay catalog is `scripts/boundaries/backfill-round2-2026-10-25.prod.json`. Pre-write pin and map rows are retained under ignored `.scrape/boundaries/round2-prod-before.json` and `spain-round2-before.json`. Read-back checks compare exact prepared geometry and original pin fields. Browser checks verify public map paths, labels, source scope and screenshots. The Spain overview was previewed locally before its production save: all 8,132 areas rendered in 4.4 seconds. Production rendered all 8,132 areas in 10.6 seconds, with no browser errors. This is a dense overview and individual boundaries are best inspected by zooming. Both new pins’ authors, titles, text, dates, locations, source URLs and parents were verified unchanged.

The title/description and category-tag discovery passes were rerun. The only additional keyword match was Governors Awards pin 19810, which has no wildfire or electoral boundary scope. Existing gaps remain specific rather than filled with nearby administrative shapes:

- India: the original government NIC election map service timed out; the previously rejected image-georeferenced community supplement was not used.
- Gambia: newly located 2026 ArcGIS result services contain **points**, not constituency polygons. The administrative downloads found still do not establish all 53 constituencies.
- Nigeria: the additional ArcGIS search did not produce a verified complete federal-constituency geometry set.
- Bosnia: a federal ministry entity layer returns six unnamed polygons and does not establish a valid current Brčko treatment. The [OHR Final Award annex, section 9](https://www.ohr.int/ohr_archive/annex-to-brcko-final-award/?print=print) confirms voting by entity citizenship; generic administrative outlines are not promoted to a territorial partition of those voters.
- Morocco: the additional public election dataset explicitly aggregates eight Casablanca electoral areas into one province. It cannot supply the complete local constituency map.
- Angola: the additional community package explicitly leaves geometry empty until official data is imported. The older 18-province and AI-traced 21-province maps remain unsuitable.
- Russia, Mexico and the two Taiwan pins retain their earlier documented geometry/version/scope gaps. Mexico's announced November 12 publication date has not arrived. No unverified geometry was saved for any of these pins.
