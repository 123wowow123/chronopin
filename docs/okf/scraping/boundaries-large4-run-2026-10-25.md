---
type: Reference
title: "Fourth large production boundary run — 2026-10-25"
description: "Added 61 boundary features across two production pins."
tags: [scraping, maps, boundaries, production]
---

# Fourth large production boundary run — 2026-10-25

**Added 61 boundary features across two production pins. Coverage is now 73 pins and 10,224 default features: 18 wildfire pins and 55 district/voting-area pins. Six source gaps remain.** The refreshed production search found no new candidates beyond the 512 already reviewed. Both additions are previously reviewed candidates whose electoral scope is now established; this is not a claim to 61 new pins.

| Pin | New native map | Scope |
| --- | --- | --- |
| [1950 — 2028 US presidential election](https://www.chronopin.com/pin/1950/americans-vote-in-the-2028-u-s-presidential-election) | 56 voting areas | 50 states and DC, plus Maine's two and Nebraska's three congressional districts. Current geography and rules as context for 2028. |
| [3676 — Connect Bay Area qualification](https://www.chronopin.com/pin/3676/connect-bay-area-transit-tax-qualifies-for-the-november-2026-ballot) | Five county polygons | Alameda, Contra Costa, San Francisco, San Mateo and Santa Clara; the measure's actual voting district. |

Both new public pages render the expected native map paths, per-area names, source credits and election-boundary key without browser errors. All 73 saved production maps were read back and matched their reviewed geometry and credits. The two new pins' authors, titles, addresses, descriptions, summaries, dates, source URLs, parent links and existing marker coordinates remain unchanged. No deployment, build, restart or VM operation occurred.

## US presidential voting geography

The [National Archives' allocation table](https://www.archives.gov/electoral-college/allocation) explicitly applies to 2024 and 2028 and totals 538 electors. The preparation records all 51 state/DC allocations, then represents Maine and Nebraska as two statewide electors each plus one elector for each congressional district. These 56 geographic voting areas reconcile to exactly 538 electors, without counting Maine's or Nebraska's district electors twice. The feature names state the number represented.

The overlapping statewide and district areas in those two states are intentional: they represent separate elector allocations on the same presidential ballot. The [Archives' explanation](https://www.archives.gov/electoral-college/electors), [Nebraska Revised Statute 32-710](https://nebraskalegislature.gov/laws/statutes.php?statute=32-710) and [Maine Title 21-A section 802](https://web.legis.maine.gov/statutes/21-A/title21-Asec802.html) establish the scope. The Maine statute's search-index text was available, but its full page timed out; the opened Archives page independently confirms the same rule.

Geometry is from [Census TIGERweb's January 2026 state layer](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/0) and [120th-Congress district layer](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0). Exactly 51 state/DC FIPS codes and district codes 2301, 2302, 3101, 3102 and 3103 are required. Territories without presidential Electoral College votes are excluded. The label describes current geography and allocation rules checked October 25, 2026, not guaranteed future district lines or laws, a result forecast, or 538 individual precincts.

Census's generalized state response has self-intersections at river boundaries in Nebraska, Oklahoma, Texas, North Dakota and Minnesota. Those five features are replaced with valid full-resolution polygons from the same source. The five Maine/Nebraska districts also use full-resolution source geometry. These inputs are simplified at 50 metres in CONUS Albers (EPSG:5070), retaining component counts and valid output. No buffer repair, arbitrary sliver deletion or invented boundary is used. All 56 final WGS84 features are valid. Alaska and Hawaii remain present, with existing display-only longitude wrapping handling the Aleutians.

The [NCSL mid-decade tracker](https://www.ncsl.org/redistricting-and-census/changing-the-maps-tracking-mid-decade-redistricting?maptype=tile), checked again this round, lists the same ten changed states already represented by pin 1648's redraw selector. No additional verified plan pair was found to add. The new presidential map includes congressional lines only for Maine and Nebraska; it does not imply that other states' House districts allocate presidential electors. Existing redraw data is preserved.

## Connect Bay Area

The [MTC certification announcement](https://mtc.ca.gov/news/connect-bay-area-transit-measure-certified-november-2026-ballot), published July 1 about the June 30 certification, explicitly names the five participating counties. This resolves the earlier exclusion of the qualification milestone: its scope is the same reviewed district as the eventual ballot pin, not a generic administrative outline inferred from its title.

The layer uses a fresh [Census county query](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/1), checking exactly FIPS 06001, 06013, 06075, 06081 and 06085. All five source polygons are valid, including offshore San Francisco geography. Each county has an individual label. The map excludes the other four counties of the wider MTC region and does not replace the pin's original certification-location marker.

## Research gaps

Russia, India, Nigeria, Gambia, Angola and Morocco remain unresolved. Two further Indian download routes were investigated through [OpenCity's dataset](https://data.opencity.in/dataset/parliamentary-elections-2019-map) and its accessible CKAN API. Its plain 2024 KML contains 543 records but retains Assam's old roster, including Mangaldoi, Tezpur and Kaliabor. Its results KMZ has 544 records, a “No Data Available” area and the same inconsistent Assam attributes found in the Esri service. The [planemad NIC extract](https://gist.github.com/planemad/1e2b63f6b9806970db749f19980ffd25) also acknowledges old Assam names. These are not independent confirmation of a complete current national plan; no Indian geometry was imported.

Nigeria's [GRID3 operational wards v3.0](https://www.arcgis.com/home/item.html?id=45cd2ef592094d12aca43113a90a6054) explicitly covers only 24 states and has not undergone full government validation. It excludes Lagos and Rivers, where split LGAs are among the unresolved federal constituency problems. It cannot establish all 360 legal House constituencies. The other source gaps retain their specific reasons in the structured audit; this round does not substitute outdated or generic administrative polygons for them.

## Replay and verification

Run `node scripts/boundaries/fetch-large4.mjs`, then `scripts/boundaries/prepare-large4.py` in the ignored Shapely/pyproj environment. Downloads are HTTPS government queries with exact count and unique-code checks. Preparation validates all input/output geometry, required geographic membership, component retention, area changes and the 538-elector reconciliation before writing the two-entry replay manifest. These scripts do not write to either database.

Authenticated dry run and production import passed for `scripts/boundaries/backfill-large4-2026-10-25.prod.json`. The complete master replay now contains 73 unique pins. Saved-shape read-back comparisons and original-field preservation checks passed. The two production maps were also visually inspected; browser checks found 56 and five paths respectively, with the expected teal boundary style and no page errors. No application runtime code changed.

Ignored evidence includes `large4-preparation.json`, `large4-prod-before.json`, `large4-all-saved-verified.json`, `large4-prod-ui.json`, both map screenshots, raw government downloads and the examined Indian KML/KMZ files. Raw geometry and credentials remain outside Git.
