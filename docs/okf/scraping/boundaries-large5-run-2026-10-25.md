# Fifth large production boundary run — 2026-10-25

**Resolved Angola's geometry gap: 21 current provincial areas and a live 18-to-21 comparison are saved on production pin 2361. Coverage is now 74 pins and 10,245 default boundary features. Five country source gaps remain.** The refreshed broad production search found no new candidates beyond the 512 already reviewed. This round adds one mapped pin, not 21 new pins.

The [live Angola pin](https://www.chronopin.com/pin/2361/angola-elects-a-national-assembly-and-president) defaults to 21 provincial areas. Select **Angola — 18 to 21 provinces** in its redistricting control to see the earlier geography, later geography or overlay. All three views passed production browser checks: 18 earlier paths, 21 later paths and 39 overlay paths, with the expected brown/teal styling, statuses and both source links. Returning to the default restores the 21 current features. The map and control screenshots were visually inspected.

All 74 saved production maps were read back against their reviewed geometry and source credits, including the new comparison's complete alternate geometry. Angola's author, title, address, descriptions, summary, event dates, source URL, parent and original Luanda marker remain unchanged. No deployment, build, restart or VM operation occurred.

## Current and historical sources

The [World Bank GAD polygon service, layer 17](https://services.arcgis.com/iQ1dY19aHwbSDYIF/ArcGIS/rest/services/WB_GAD/FeatureServer/17) supplies all **21 current provinces**, including Icolo e Bengo, Moxico Leste, Cuando and Cubango. Its last data edit is September 16, 2026. The [World Bank catalog](https://datacatalog.worldbank.org/search/dataset/0038272/world-bank-official-boundaries), whose metadata was updated October 21, licenses the dataset CC BY 4.0. The catalog update is not relabelled as the geometry's survey or release date. Layer 2 of the same service contains points; the importer uses polygon layer 17.

Exactly 21 unique World Bank province codes and their expected names are required. All source polygons are valid. Their **115 polygon components** are retained, including Cabinda and offshore geography. The union is valid and the computed overlap is effectively zero at floating-point precision. Source coordinates, components and holes are preserved without simplification, rounding, buffering or repair.

The historical comparison uses [geoBoundaries AGO-ADM1-26408823](https://www.geoboundaries.org/api/current/gbOpen/AGO/ADM1/): **18 provinces, representing 2021**, sourced from the US Census Bureau and public domain. Its raw download is pinned to geoBoundaries commit `9469f09`. All 18 original polygons and their union are valid. This reference is explicitly historical and never supplies the default 2027-context map.

The overlay compares two providers and vintages. It helps locate the provincial splits, but coastal and line-detail differences are not all legal boundary changes. That qualification appears in the control's historical-vintage text. The earlier geography is marked superseded; the current administrative geography is in effect. These statuses describe the provincial division, not certification of a final 2027 polling map.

## Electoral scope and timing

The [Angolan embassy's announcement](https://brasil.mirex.gov.ao/web/noticias/nova-divisao-politica-administrativa) dates the 21-province division's effectiveness to **January 1, 2025**. It identifies the Luanda, Moxico and Cuando Cubango splits. The [CNE's July 31, 2026 report](https://www.cne.ao/noticia/CNE%2BAprova%2BProposta%2Bdo%2BOr%C3%A7amento%2BInstitucional%2Bpara%2Bano%2B2027.) records the presentation of all 21 provincial electoral commission presidents. Article 24 of the [CNE-published electoral law](https://www.cne.ao/storage/legislations/CNE-Legisla%C3%A7%C3%A3o-561ebf28f6d7b4.pdf) ties provincial electoral circles to provinces; the 2025 republication also retains this geographic rule.

The map therefore labels **current provincial electoral areas as context for 2027**. It does not draw the national-list or presidential geography separately, represent precincts, guarantee future electoral rules or encode seat counts. The pin's existing 220-seat description was preserved; reconciling that wording against post-reorganisation law is separate content research, not a conclusion supplied by this geometry import.

An additional lead was a [TOPOGIS archive](https://www.topogis-ao.com/arquivos-sig-e-cad) described as the territorial ministry's updated 2024 shapefile. Its metadata identifies an INE-adjusted source and July 2026 export, and it contains 21 provinces, but four province geometries are invalid. It was not imported or repaired. The independently published, openly licensed, valid World Bank geometry resolved the source gap instead. Earlier AI-traced and empty community datasets remain rejected.

## Replay and checks

Run `node scripts/boundaries/fetch-angola.mjs`, then `scripts/boundaries/prepare-angola.py` in the ignored Shapely environment. The fetcher downloads the current polygon query, fixed historical reference and metadata, requiring exact counts and unique source codes. Preparation checks complete current province membership, historical membership, finite geographic bounds, valid individual polygons and unions, negligible overlap and retention of all 115 current components. It preserves full coordinate precision. Neither script writes to a database.

Authenticated dry run and production import passed for `scripts/boundaries/backfill-large5-2026-10-25.prod.json`. The complete replay manifest contains 74 unique pins. The stored comparison uses the existing deployed controls and schema; no runtime code changed. There are now **10 US state comparisons plus one Angola provincial comparison**, with **401 alternate-plan features** in total. The new default page, all three comparison modes, source links, statuses, colors and restored default were verified without browser errors. Read-back comparisons passed for every saved map.

Ignored evidence under `.scrape/boundaries/` includes raw sources, the rejected archive, `angola-preparation.json`, `large5-prod-before.json`, `large5-prod-ui.json`, `angola-redraw-ui-prod.json`, all comparison screenshots and `large5-all-saved-verified.json`. Russia, India, Nigeria, Gambia and Morocco retain their specific unresolved source reasons in the structured audit.
