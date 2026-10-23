# Cleanview sourcing backfill — round 2, October 23, 2026

Audited 12 existing pins. Corrected 11 and soft-deleted one unverifiable tracker identity on both local and production; moved its draft to `held/`. No deployment.

## Changes

| Production/current local ID | Project | Saved correction |
|---|---|---|
| 16310 | Related Digital Cheyenne: Up to 420 MW Campus; $1.2B First Phase | Related Digital lists a 115-acre Cheyenne campus with up to 420 MW capacity and an initial 88 MW critical-IT building for CoreWeave. The published $1.2 billion investment applies to the first phase, not the entire campus. |
| 16311 | Vantage Lighthouse: 902 MW Critical IT, Four Buildings, $15B+ Wisconsin Campus | Vantage’s Lighthouse campus in Port Washington is planned for 902 MW of critical IT capacity across four buildings, with completion in 2028. WEC’s September 2026 presentation describes $15 billion-plus of investment and construction underway. |
| 16312 | TeraWulf Justified: 482 MW Electric Service, 401 MW IT Plan, $4.0–4.5B Investment | TeraWulf’s Justified campus in Hawesville has PSC-approved electric service up to 482 MW and a 20-year Anthropic lease for approximately 401 MW of critical IT capacity. Initial service is expected in H2 2027, ramping to full IT capacity in early 2028. |
| 16313 | Augusta Township Data Center Rezoning Rejected by Voters on August 4, 2026 | Augusta Township voters rejected the data-center rezoning, 2,314–269, in the August 4, 2026 primary. The proposed $1 billion development’s former 2028 opening claim and unverified 100 MW figure are removed. |
| 16314 | Ameren Reform: 250 MW Missouri Solar Project Approved; Target Q4 2028 | Missouri’s PSC granted Ameren a certificate for the 250 MW Reform solar project in Callaway County on May 13, 2026. Ameren’s May investor presentation targets service in Q4 2028, correcting the earlier September placeholder. |
| 16315 | Clearway Royal Slope: 260 MW Solar and 260 MW / 1,040 MWh Storage in Washington | Clearway and Grant PUD signed 20-year solar and storage agreements for Royal Slope. Grant PUD’s packet specifies 260 MW solar and 260 MW / 1,040 MWh storage, with contractual commencement no earlier than March 31, 2028. |
| 16316 | Clēnera CO Bar: 1,211 MW Solar, 4,000 MWh Storage, $2.900–3.045B Investment | Enlight’s CO Bar complex in Arizona comprises five projects with 1,211 MW solar and 4,000 MWh storage. Its June 2026 financing release gives $2.900–3.045 billion total investment and phased operation from H2 2027 through H1 2028. |
| 16317 | Doral Mammoth Solar: 900 MWac Phases Near Commercial Operation in October 2026 | Doral’s October 7, 2026 release celebrates imminent commercial operation of Mammoth South, Central I and Central II, totaling 900 MWac. It does not confirm the previously displayed October 15 COD or substantiate a $1.5 billion cost for these phases. |
| 16318 | Koshkonong: 300 MW Solar Expected in 2026; 165 MW Battery Expected in 2027 | Koshkonong’s solar and battery have separate delivery windows: MGE expects solar in 2026 and battery storage in 2027. Its ownership shares and WEC’s annual-report table distinguish utility-owned capacity from whole-project capacity. |
| 16319 | Invenergy Tip Top Solar: 110 MW, $200M Investment, Target End-2026 | Invenergy’s current Tip Top Solar page lists a 110 MW solar facility under construction in Lea County, New Mexico, with $200 million capital investment and commercial operation expected by end-2026. Earlier state reporting described a 220 MW plan; storage is a separate project. |
| 16320 | Excelsior Energy Center: 280 MW Solar, 20 MW Storage Approval; November 2026 Target | Excelsior’s operator documents announce construction of the 280 MW Byron solar facility from April 2025. New York’s siting report records 20 MW storage approval and a historical $345 million estimate; its amended interconnection schedule targets November 2026 commercial operation. |
| 16321 | NextEra Sedgwick Solar | Held: no opened record establishes this tracker name, developer and parcel. The real SPP GEN-2017-220 remains a research lead, not a proven identity match. |

## Validation

- Verified all 24 pin actions with fresh API reads. Existing authors, all media arrays and applicable tag changes preserved or verified.
- Repaired all 12 stale local mappings only after current title/source identity matched the production ID.
- Verified Sedgwick returns 404 in both environments before removing mappings and moving its draft to `held/`. Both posted lists now hold 1,452 mappings.
- Verified explicit power readings: Lighthouse 902 MW usage; Justified 482 MW electric service; Reform 250 MW, Royal Slope 260 MW, CO Bar 1,211 MW, Mammoth 900 MW, Koshkonong 300 MW, Tip Top 110 MW and Excelsior 280 MW generation. Removed Augusta’s unsupported 100 MW reading.
- Royal Slope, Koshkonong and Excelsior retain battery capacity in the text; their single power rows record solar generation, avoiding incorrect storage totals.
- Replaced Cheyenne, Lighthouse and Justified telemetry with verified scope; removed Augusta telemetry and dependent calculated annual energy for all four data centers plus Tip Top. No measured annual-energy record was removed.
- Downloaded all 33 retained Azure images successfully. Eight native pages returned HTTP 200 with the revised content.
- Visually checked WEC annual-report page F-67 to distinguish utility ownership shares, expected solar/battery years and CWIP from whole-project cost.

## Remaining research

- **dc-related-digital-cheyenne-wy:** Verify actual first-phase COD, campus-wide capital cost and exact parcel; existing map coordinates were not moved.
- **dc-stargate-lighthouse-vantage-wi:** First-service date remains unverified; campus completion in 2028 is not an energization date. Existing source-wiki/site-shape records were not certified in this batch.
- **dc-terawulf-justified-campus-ky:** Confirm detailed construction status, parcel boundary and current water/acreage specifications.
- **dc-thor-equities-augusta-mi:** Verify whether Thor/JDS has filed any new proposal since the referendum. $1B is a reported proposal estimate, not money spent. Existing geographic position is approximate.
- **solar-ameren-reform-callaway-mo:** Current detailed construction schedule, total published cost and parcel coordinates still require verification.
- **solar-clearway-royal-slope-wa:** Exact delivery day and total capital cost remain unpublished; one PinPower row cannot represent both generation and storage without conflation.
- **solar-clenera-co-bar-complex-az:** Precise stage-by-stage commissioning days and exact site/media alignment remain unverified.
- **solar-doral-mammoth-solar-complex-in:** Actual COD may since have occurred; obtain a phase-specific operational confirmation and published cost.
- **solar-invenergy-koshkonong-solar-energy-center-wi:** Exact solar COD, battery commissioning schedule and current full-project cost remain unverified. WEC overview collapses timing; annual-report and MGE phase-specific dates used here.
- **solar-invenergy-tip-top-nm:** Reconcile historical 220 MW EIA/nameplate scope with current 110 MW operator scope; verify exact parcel and commissioning.
- **solar-nextera-excelsior-energy-center-ny:** Verify final battery construction scope, latest COD and cost changes since the historical $345M estimate.

- Cheyenne exact first-service date remains unverified; legacy November 1 estimate is explicitly disclosed.
- Mammoth October window is inferred from the October 7 imminent-operation announcement; actual COD needs confirmation.
- Koshkonong published solar timing is 2026, battery 2027; the retained December 1 solar date is an estimated placeholder, not source-stated day.
- Lighthouse 2028 is a campus completion window, not a verified first-energization date.
- Existing coordinates/media were preserved, not certified against parcel geometry; exact positions remain research gaps.
- Existing translations, source wikis and site outlines were not globally re-audited.
- Broader Rounds 7–59 backfill and fresh lead research remain open. Next untouched early pin: Singer Solar 16322, then 16328 onward.

## Evidence

[Field-level evidence and verification](cleanview-backfill-round2-2026-10-23.json) includes opened source URLs, saved patches, all outcomes and specific Sedgwick research. Full before/after snapshots, the rendered PDF table and guarded scripts are in `.scrape/prod-batches/cleanview-2026-10-14/audit/backfill2-2026-10-23`.
