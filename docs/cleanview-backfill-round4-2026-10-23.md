# Cleanview sourcing backfill — round 4, October 23, 2026

Researched and corrected 12 existing pins (`16339`–`16350`) on local and production. No pins deleted. No deployment.

## Changes

| Production/current local ID | Project | Correction |
|---|---|---|
| 16339 | ENGIE Bouse Solar and Storage: 1,000 MW Development Sold by Revolve | Revolve’s June 2024 announcement identifies Bouse as a 1,000 MW solar and storage development sold to ENGIE in January 2023. The prior $1.5B budget and separate 1,010 MW solar / 1,011 MW battery readings are not established by this source. |
| 16340 | RWE Fourth Quarter BESS: 300 MW, Four-Hour Storage; Operations Target 2028 | RWE identifies Fourth Quarter as a 300 MW, four-hour battery project at the retired Dickerson station, with operations anticipated in 2028. The earlier February 2030 date and $400M budget are unsupported by the opened project page. |
| 16341 | AVAIO Hercules: 50 MW First-Phase Power in 2027; 1 GW Long-Term Power Plan | AVAIO’s current Appomattox page describes a 436-acre campus, with 300 MW grid power and 700 MW behind-the-meter baseload planned. Its homepage lists 50 MW first-phase power in 2027; the historical $3B announcement covered a 452-acre acquisition plan. |
| 16342 | Digital Realty Moores Chapel: Up to 400 MW IT; 156-Acre Charlotte Campus | Digital Realty’s earnings release establishes up to 400 MW IT capacity for its Charlotte land acquisition. City planning records describe 156.23 acres and up to 3 million square feet; the $160M land purchase is not a total campus budget. |
| 16343 | Google New Florence: New Data Center Within $15B Missouri Infrastructure Investment | Google’s May 20, 2026 release confirms its New Florence data center within a $15 billion Missouri infrastructure investment. That statewide commitment does not establish this campus’s standalone budget, 600–1,200 MW IT load, acreage or operating date. |
| 16344 | Google Cheyenne Tembo: 2.7 GW Resource Mix; First Energy Service Late 2027 | Black Hills’ October 6, 2026 agreements describe 2.7 GW of resources including reserve margins, with Google taking service in late 2027 and reaching peak load in 2030. This is not 2.7 GW of verified IT load or a disclosed $17B campus budget. |
| 16345 | Prometheus Evanston: 1.25 GW Initial Campus Plan; Conditional Use Permit Approved | Prometheus’s June 2026 announcement gives its 506-acre Evanston campus 1.25 GW initial capacity and a path to 5 GW. A separate August power-facility recommendation was not final approval; the prior 250 MW / $2B tracker scope is superseded. |
| 16346 | Cypress Creek Steel River: 2.46 GW Solar, 2.94 GWh Storage; $4.5B+ Project | Cypress Creek’s current Steel River page lists 2.46 GW solar, 2.94 GWh battery storage and $4.5B-plus private investment. July 2026 groundbreaking covered the first two phases; all three phases are targeted in service by 2029. |
| 16347 | Doral Tennyson Creek: 300 MW Solar; Issuer Targets 2029 with 800 MWh Storage | Doral’s U.S. solar-storage page lists Tennyson Creek at 300 MW solar. Its April 2026 issuer presentation gives 374 MWp / 800 MWh and a 2029 COD target; DC peak capacity and battery energy are distinct from solar AC generation. |
| 16348 | Doral Vista Sands: 1.3 GW Solar Approval; Issuer Targets 2029–2030 | Wisconsin’s PSC describes 1,315.6 MWac solar plus 300 MW storage, with final decision issued January 16, 2025. Doral’s April 2026 presentation targets 2029–2030, later than the regulator’s historical end-2028 schedule; the operator announces nearly $2B investment. |
| 16349 | Invenergy Beeline Solar in Burt County: 250 MW First Project; Target Q4 2028 | Invenergy’s February 2025 factsheet identifies Beeline in Burt County as a proposed 250 MW solar project targeting Q4 2028 operation. This replaces the prior single 500 MW / $700M tracker presentation; larger county permit scope needs phase-specific reconciliation. |
| 16350 | NextEra West Gardner: Up to 217 MW Solar, 128 MW Storage; $320M Investment | NextEra’s current project page lists up to 217 MW solar and 128 MW battery storage across Johnson and Douglas counties. Its published $320 million project investment replaces $500 million; the former 320 MW solar figure is an older design. |

## Validation

- Verified all 24 saves, preserving original authors, source-reference structures and intentional tags. Fresh independent read-backs check pin fields and each affected power/datacenter/energy endpoint.
- Removed unsupported Bouse and New Florence power readings; corrected generation/storage classification and explicitly distinguished AC, DC, IT and power-supply scopes.
- Replaced telemetry on five data centers and removed their capacity-scaled water estimates and calculated annual energy. No published measured energy was removed.
- Repaired Bouse’s stale local mapping after identity checks; other selected local mappings were already current. Both posted maps retain 1,452 entries. Synchronized all 12 draft snapshots.
- Preserved 33 original images, replaced Hercules’s three maps, and added one verified Steel River operator aerial with caption/source credit. All 37 current Azure images downloaded successfully.
- Eight representative native pages returned HTTP 200 and included revised values.
- Visually inspected Beeline’s Q4 2028 timeline, Charlotte planning scope/map, Doral’s MWp/MWh pipeline table and all four added/replacement images.
- No application code changed; no build or production deployment performed.

## Remaining research

- **solar-revolve-bouse-az:** Obtain current ENGIE/BLM design, solar AC and battery MW/MWh, budget, COD and exact parcel; 1,000 MW seller shorthand does not establish the old separate 1,010/1,011 MW readings.
- **battery-rwe-fourth-quarter-md:** Verify approval outcome, current construction schedule, total budget, usable MWh and exact battery parcel.
- **dc-avaio-appomattox-va:** Verify approved final transmission capacity, BTM permits/fuel, full-campus buildout dates and updated budget; published point is not a certified parcel boundary.
- **dc-digital-realty-moores-chapel-nc:** Obtain current first-service/COD schedule, campus capital budget, approved water specifications and precise parcel alignment.
- **dc-google-spade-new-florence-mo:** Obtain county site plan, campus-specific MW/acreage, COD and budget; $15B state commitment cannot be treated as campus cost.
- **dc-google-tembo-cheyenne-wy:** Verify county amended site plan/acreage, critical IT load, phase-specific service dates and campus-only budget.
- **dc-prometheus-atlas-evanston-wy:** Verify final power-site approvals, construction start, initial service date, exact parcel and current investment estimate.
- **solar-cypress-steel-river-ar:** Obtain phase-specific COD and AC export ratings, storage discharge MW and precise site boundaries; project images/one-pager checked but not globally imported.
- **solar-doral-bourbon-tennyson-ks:** Project page returned HTTP 500. Verify current county agreements/exemptions, 2029 schedule, DC/AC scope, budget and exact parcel; chamber page/search versions have conflicting 2028/2029 dates.
- **solar-doral-vista-sands-wi:** Reconcile PSC design variants, current 300 MW battery inclusion and 1,446 MWp issuer design; obtain latest construction report, exact phase COD and parcel boundaries.
- **solar-invenergy-burt-ne:** Verify current county CUP and full 500 MW generation/storage phase allocation, updated budget and Q4 2028 schedule; retain source factsheet because operator site redirects.
- **solar-nextera-west-gardner-ks:** Obtain current permitting/design documents, exact parcel, storage duration and COD; operator overview subpage returned access-block page.

- Bouse, Moores Chapel, Google New Florence, Prometheus Evanston and West Gardner retain explicitly disclosed unverified legacy dates. Other day values represent published year/quarter/season windows, not scheduled commissioning days.
- Capacity layers remain distinct: Tembo’s 2.7 GW includes reserves; its power row is only the 590 MW grid-service component. Hercules’s row is the 50 MW first phase. Steel River’s generation row is solar DC nameplate, with that basis stated.
- Vista Sands has conflicting primary design figures (1,315.6/1,310.4 MWac, 1,446 MWp DC) and historical/current schedule differences. Its about-$2B price is an approximate operator-announced capital estimate. Prometheus’s $10B figure is a historical announcement, not a current final budget.
- Hercules’s three new USGS map images follow its published point. Existing outlines are not certified parcel boundaries. Other pin coordinates and retained map images were preserved, not globally re-audited.
- Reviewed official project-page imagery and linked documents. Added Cypress Creek’s verified Steel River construction aerial with source and operator credit. AVAIO’s linked exterior render URLs failed in the web fetcher; no unlabeled or generic rendering was added. RWE offers a site-location image; Doral’s storage overview also shows Israel photos, which were not treated as Kansas images. Further project-photo coverage remains open.
- Existing Vista Sands pin `15889` covers the same project and uses the PSC URL. Pin `16348` now uses the opened operator homepage; both native identities remain. Consolidation requires checking their threads, follows and other associations. This is an explicit unresolved duplicate, not a completed deduplication.
- Existing translations, company-stock associations, source wikis and site outlines were not globally re-audited.
- Broader Rounds 7–59 backfill stays open. Next untouched early pin: High Spring Solar `16351`, then later mapped IDs.

## Evidence

[Field-level evidence and verification](cleanview-backfill-round4-2026-10-23.json) records source URLs, saved patches, media provenance, outcomes and remaining gaps. Before/after snapshots, guarded scripts and visually checked Beeline, Charlotte and Doral PDF pages are in `.scrape/prod-batches/cleanview-2026-10-14/audit/backfill4-2026-10-23`.
