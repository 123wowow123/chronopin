---
type: Reference
title: "Third large production boundary run — 2026-10-25"
description: "Added Mexico's 300 federal single-member districts to production pin 2357."
tags: [scraping, maps, boundaries, production]
---

# Third large production boundary run — 2026-10-25

**Added Mexico's 300 federal single-member districts to production pin 2357. Coverage is now 71 pins and 10,163 default boundary features: 18 wildfire pins and 53 district/voting-area pins. Six source gaps remain.** The refreshed broad production search found no new candidates beyond the 512 already reviewed. This round adds one national map, not hundreds of new pins.

## Mexico: an accessible official release

The [INE radio/television coverage download page](https://pautas.ine.mx/transparencia/mapas/) supplies an official federal-district shapefile and identifies its effective date as **October 1, 2026**. The download URL is `https://pautas.ine.mx/transparencia/mapas/cob_2025/DISTRITO_FEDERAL.zip`; the historical directory name does not determine the release date. The archive contains `DISTRITO_FEDERAL_26` files dated October 1, 2026. Its projection metadata identifies INE DERFE's 2026 delivery and a WGS84 Lambert Conformal Conic CRS.

This is a different publication route from SIGE's separately scheduled November 12 election-product release. The layer states its October vintage and uses it as current geographic context for the 2027 pin; it does not claim to contain the forthcoming November release. The [2026–2027 framework agreement, INE/CG526/2026](https://sidof.segob.gob.mx/notas/docFuente/5800306), records the 2022 approval of the 300 federal districts and the separate five proportional-list regions. [INE's October explanation](https://centralelectoral.ine.mx/2026/10/05/entrevista-de-la-consejera-electoral-carla-humphrey-con-hector-jimenez-landin-para-ruta-2027-3/) also distinguishes federal and local electoral geography.

Exactly 300 unique `(entidad, distrito_f)` pairs match the expected district counts across all 32 states. The native map draws only these single-member districts. Its key explicitly excludes the five proportional-list regions, local districts and polling sections. Each feature retains its own numeric state/district identity and INE credit.

All 300 original polygons are valid. A 50-metre topology-preserving overview in the source metric CRS retains all 726 polygon components; every transformed WGS84 output is valid. The largest individual area difference is approximately 0.58%. The source has about 101.4 square metres of overlap across approximately 1.948 trillion square metres of union area. Those tiny source inconsistencies are disclosed, not silently repaired or treated as evidence that a constituency is missing. Prepared coordinates retain full precision.

## Verification and replay

Download the ZIP to ignored `.scrape/boundaries/mexico-federal-2026.zip`, then run `scripts/boundaries/prepare-mexico.py` with pyshp, Shapely and pyproj. The preparation checks all IDs, state counts, source/output validity, coordinate ranges, component counts and area changes before creating the overview and replay manifest. It performs no database writes.

Authenticated dry run and import passed using `scripts/boundaries/backfill-large3-2026-10-25.prod.json`. The master replay manifest now contains 71 unique pins. The new production page renders all 300 teal paths, individual district names and the native election-boundary key without browser errors. A read-back comparison verifies all 71 saved maps against their reviewed geometry and source credits. Mexico's author, title, address, description, summary, event dates, source URL, parent and existing Congress-area coordinate are unchanged. All 30 earlier/later/overlay views across the existing 10 US state redraw comparisons also passed a fresh production browser check without errors; Missouri's blocked-plan explanation remains visible.

Raw geometry, pre-write records, SHA-256 comparisons and screenshots remain ignored under `.scrape/boundaries/`, including `mexico-preparation.json`, `large3-prod-before.json`, `large3-prod-ui.json` and `large3-all-saved-verified.json`. No production deployment, build, restart or VM operation occurred.

## Remaining research

Russia, India, Nigeria, Gambia, Angola and Morocco remain unresolved for the specific reasons in the master audit. Further searches did not establish a complete suitable geometry source for those pins.

A newly examined [Esri India Living Atlas 2024 service](https://livingatlas.esri.in/server/rest/services/Election_Results_States/India_Election_Data_Parliamentary_2024/MapServer/0) has 544 records, including a Jammu and Kashmir “No Data Available” area. Assam's constituency names/codes, legacy IDs and winner assignments are inconsistent: for example its Lakhimpur record names Gaurav Gogoi, while its Jorhat record names Pradan Baruah. Its own portal item has no geometry provenance or reuse terms. A service title containing “2024” is insufficient validation; no Indian geometry was imported. The existing 10 US state redraw comparisons remain separate from Mexico's single October release.
