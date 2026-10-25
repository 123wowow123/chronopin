---
type: Reference
title: "Large production boundary run — 2026-10-25"
description: "25 more production pins are mapped: 62 total, with 9,811 default boundary features."
tags: [scraping, maps, boundaries, production]
---

# Large production boundary run — 2026-10-25

**25 more production pins are mapped: 62 total, with 9,811 default boundary features.** All 25 new public pages were checked for rendered geometry, teal styling, scope labels and source attribution. All 62 saved production maps were read back against their reviewed geometry. Ten state redraw comparisons remain available; these additions introduce no new legislative plans. No deployment, build, restart or VM operation was performed.

The expanded discovery reviewed **512 distinct candidates**, including 169 additional keyword matches. Search terms added legislative bodies, senators/councillors, by-elections, referendums, assembly, seats and additional wildfire terms. Every new candidate's title and description was reviewed; many were manufacturing assembly, venue seating, Seattle/Trump substring matches, internal legislative decisions or entertainment. The audit records 62 mapped pins, ten research gaps and 440 outside scope.

The subsequent [second large run](boundaries-large2-run-2026-10-25.md) brings current coverage to 70 pins and resolves the Black Summer and Taiwan gaps described below. This document retains the earlier run’s results and diagnosis.

## Reviewed voting jurisdictions

This round expands the earlier scope to include **verified citywide, countywide and statewide public ballots**. Their maps identify a single voting jurisdiction, explicitly distinguished in the key from internal legislative, ward or polling districts. A city/state administrative polygon is used only after an election authority establishes the ballot's jurisdiction. Internal parliamentary votes, corporate votes and venue names do not qualify.

| Voting area | Added production pins | Scope evidence |
| --- | --- | --- |
| California governor | 1970 | [Governor's statewide election proclamation](https://www.gov.ca.gov/2026/06/08/governor-newsom-issues-proclamation-declaring-californias-2026-general-election/) |
| New York governor | 3545 | [State Board of Elections certifications](https://elections.ny.gov/ballot-certifications-elections) |
| Missouri Amendment 3, 2024 and 2026 | 3970, 3972 | [2024 official results](https://www.sos.mo.gov/CMSImages/ElectionResultsStatistics/ActualResults-November52024.pdf), [2026 certified measures](https://www.sos.mo.gov/petitions/2026ballotmeasures) |
| Nevada Question 6, 2024 and 2026 | 3974, 3976 | [2024 official question](https://webfiles.clarkcountynv.gov/Election%20Department/2024/NV6-24G.pdf), [2026 Secretary of State information](https://www.nvsos.gov/sos/elections/election-information/2026-election-information) |
| Virginia Question 1 / Idaho Proposition 1 | 3979, 3981 | [Virginia Elections](https://www.elections.virginia.gov/election-law/proposed-constitutional-amendment-question-1/), [Idaho Secretary of State](https://voteidaho.gov/initiatives-amendments/) |
| Boston mayor, preliminary and general | 3290, 3306 | [City election results](https://www.boston.gov/departments/elections/state-and-city-boston-election-results) |
| New York City mayor, primary and general; city charter proposals | 3535, 3539, 3541 | [Board of Elections](https://vote.nyc/page/election-results-summary), [2026 city charter proposals](https://www.nyc.gov/mayors-office/news/2026/07/coge-releases-5-ballot-proposals-and-final-report-to-make-govern) |
| Los Angeles mayor, primary and general; municipal measures | 3570, 3584, 3618 | [City Clerk municipal election and measure information](https://clerk.lacity.gov/elections/municipal-elections/ballot-measures) |
| San Diego city Measure A | 3525 | [Official voter pamphlet](https://www.sdvote.com/content/dam/rov/en/sb/SB-ENG-058.pdf) |
| San Diego County measures A and B | 3530, 3532 | [Registrar's county measure filings](https://www.sdvote.com/content/rov/en/candidates-campaigns/filing.html) and the pin's official county analyses |
| San Francisco Proposition D | 3670 | [City Ethics official measure page](https://campaign.sfethics.org/elections/2026-06-02/measures/measured.html) |
| Connect Bay Area five-county district | 3686 | [MTC's Public Transit Revenue Measure District](https://mtc.ca.gov/about-mtc/authorities/public-transit-revenue-measure-district) explicitly identifies Alameda, Contra Costa, San Francisco, San Mateo and Santa Clara. The map draws those five counties, not the nine-county MTC region. |
| Toronto / Ottawa / Vancouver mayor | 19615, 19807, 7453 | [Toronto's election fact sheet](https://www.toronto.ca/news/fact-sheet-2026-toronto-municipal-election/), [Ottawa's official candidate service](https://elections.ottawa.ca/CandidateList/CandidateList), [Vancouver's election page](https://vancouver.ca/your-government/2026-election.aspx). Council, school and other ballot scopes are explicitly excluded from these mayor-area maps. |

These 24 pins use 19 reviewed geographic groups and contain 28 features, including the five-county district. Exact pin IDs, geographic codes and scope sources are in `scripts/boundaries/ballot-jurisdictions-2026-10-25.json`.

## Geometry and dates

US 2025/2026 state, county and incorporated-place geometry comes directly from [Census TIGERweb](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb). The service's January 1, 2025 ACS snapshot is used for the 2025 Boston/New York City ballots; its January 1, 2026 snapshot is used for 2026 ballots. The two 2024 state referendums use [2024 Census cartographic state boundaries](https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_500k.zip), 1:500,000, transformed from the source CRS to WGS84. Later state geometry is not relabelled as 2024.

The generalised LA and San Diego city service responses failed topology checks. Full-resolution source polygons were downloaded instead; both are valid, then generalised at 50 metres in EPSG:5070 with topology preserved. No invalid source ring was removed or repaired. Other selected generalised Census polygons are valid. Every prepared output is checked again at the importer's six-decimal precision.

The three Canadian cities use [Statistics Canada's 2021 Census digital subdivision boundaries](https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Digital_boundary_files/MapServer/9), under the Open Government Licence – Canada. The key clearly identifies the 2021 geography as context for the 2026 mayor vote and excludes ward/school districts. All three CSDUIDs and names match exactly.

Toronto and Ottawa originally had `location=null`; the page intentionally hides its map in that condition. Both missing coordinates were filled through guarded authenticated admin PATCHes using geometric centroids inside their verified municipal polygons. These are municipality map anchors, not claims about a venue or city-hall address. The existing textual addresses were preserved. The helper refuses to overwrite any different existing location and can be replayed idempotently. All new pins' original authors, titles, descriptions, summaries, dates, source URLs and parent links were verified unchanged. Prediction-market metrics can refresh independently during a run and are not overwritten.

## Bosnia and Herzegovina — pin 5172

The earlier Brčko gap is resolved with an explicit geographic treatment: **two entity areas plus a separately labelled Brčko special voting area**. The key states that Brčko's ballot follows entity citizenship and that Brčko is not a third Presidency constituency. It does not assign all Brčko voters to one entity or infer eligibility solely from residence.

The [OHR Final Award annex, section 9](https://www.ohr.int/ohr_archive/annex-to-brcko-final-award/?print=print), the [OHR citizenship decision](https://www.ohr.int/decision-enacting-the-law-on-amendments-to-the-law-on-citizenship-of-the-federation-of-bosnia-and-herzegovina-2/?print=print), and [Constitution article V](https://www.brckosupervizija.ba/web/?p=35) establish the voting treatment. The [CEC's 2026 basic information](https://www.izbori.ba/?CategoryID=183&Id=6169&Lang=6) was also checked.

Geometry is a **2013 geographic overview**, geoBoundaries build 2024, sourced to public-domain Wikimedia Commons data. Its [metadata and exact download](https://www.geoboundaries.org/api/current/gbOpen/BIH/ADM1/) remain visibly credited; it is not labelled as official 2026 precinct cartography. All three polygons are valid and have no overlapping interiors. Each feature carries its own explanatory label and vintage.

## Black Summer: corrected research gap

Pin 2450 was incorrectly classified outside scope in the earlier audit. That classification is corrected to a research gap. The full official [DCCEEW NIAFED v20200623](https://www.arcgis.com/sharing/rest/content/items/dc651afe7ec944d0a22e6c1f120f3a15/info/metadata/metadata.xml?format=default&output=html) downloaded successfully: one feature with 33,728 polygon parts. Of these, 1,270 have self-touching rings. A reviewed linework normalization changed source areas only at floating-point precision, but overview preparation ultimately failed after six-decimal rounding because a tiny component collapsed. **No fire layer was saved.** Failed experimental geometry and diagnostics remain ignored; no broken preparation command is included in the replay workflow.

Any later import must disclose the [government dataset's limits](https://www.dcceew.gov.au/environment/biodiversity/bushfire-recovery/bushfire-impacts): it covers July 1, 2019 through June 22, 2020, includes planned fires and potentially unburnt pockets, and is an indicative aggregated extent. It cannot be called an ignition-time perimeter or a precise final burnt-area measurement. No component was dropped to force this import through.

## Replay and verification

1. Run `node scripts/boundaries/fetch-ballot-jurisdictions.mjs` to cache sources. Existing cache is the reviewed snapshot; remove it explicitly for fresh research.
2. Run `scripts/boundaries/prepare-ballot-jurisdictions.py` and `prepare-bosnia-presidency.py` with shapefile, shapely and pyproj installed in an ignored environment.
3. Dry-run and apply `scripts/boundaries/import-centres.mjs` with `--manifest scripts/boundaries/backfill-centres-2026-10-25.prod.json`, `--base` and `--token-file` when a target has no map coordinate.
4. Dry-run and apply `scripts/boundaries/import.ts` using `backfill-large-2026-10-25.prod.json` and `backfill-large-resolved-2026-10-25.prod.json`. The complete current list is `backfill-2026-10-25.prod.json` (62 unique pins). Original non-district geometry remains preserved.

Source files, tokens, before/after rows and screenshots stay ignored. Evidence includes `large-prod-before.json`, `large-bosnia-before.json`, `large-verified.json` (all 25 public pages), `large-all-saved-verified.json` (all 62 saved maps) and `australia-topology-review.json`. Preparation replay, coordinate idempotence checks, script lint and diff checks passed. No application code changed and no deployment is needed for these content updates.

Ten research gaps remain: Russia, India, Nigeria, Gambia, Mexico, Angola, Morocco, two Taiwan pins and Black Summer. Bosnia is no longer a gap. The current Taiwan MOI village download linked by government dataset 7438 returned 403; no unverified replacement or point-derived boundary was imported.
