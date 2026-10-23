# Cleanview sourcing backfill — round 3, October 23, 2026

Researched and corrected 12 existing pins in local and production. No pins deleted and no deployment.

## Changes

| Production/current local ID | Project | Saved correction |
|---|---|---|
| 16322 | NextEra Singer Solar: 200–300 MW Source Discrepancy; $350M Published Investment | NextEra’s Singer website advertises up to 200 MW and $350 million investment, while EIA lists a 300 MW unit planned for March 2027. These published scopes need reconciliation; the earlier $145 million figure is removed. |
| 16328 | Aligned Project Phoenix: Announced 2 GW Shippingport Campus; $10B Regional Investment | Aligned’s September 10, 2026 groundbreaking announcement describes a 2 GW campus across three facilities in Shippingport. Its $10 billion figure is estimated regional economic investment, not a disclosed construction budget for the former 264 MW tracker scope. |
| 16329 | CloudHQ ORD Mount Prospect: 252 MW Listed IT Capacity; $2.5B Announced Investment | CloudHQ lists 252 MW critical IT load and 1.7 million square feet for ORD, while its overview describes configurations up to 300 MW. ComEd’s 2022 release gives a $2.5 billion announced investment; a fixed current service date remains unverified. |
| 16330 | Google Project Cannoli: 1 GW Site Plan Approved in Van Buren Township | Michigan’s PSC conditionally approved Google/DTE service contracts on October 1, 2026. Local reporting documents October 14 final site-plan approval for a 1 GW, 282.2-acre Google campus, correcting the older 231 MW scope and unsupported $2 billion price. |
| 16331 | Prime Phoenix Avondale: 240 MW IT Campus, Five Buildings, $3B+ Investment | Prime announced construction of the first three buildings of its five-building, 240 MW IT Phoenix campus in May 2026. The developer release describes more than $3 billion investment; unrelated Stream Phoenix chip figures have been removed. |
| 16332 | TeraWulf Muskie at EastPark: Proposed 1 GW Power Agreement; First Service October 2028 | Muskie is TeraWulf’s EastPark campus near Grayson, not a verified 250 MW Catlettsburg facility. Kentucky Power’s October fact sheet describes an amended 1 GW agreement awaiting PSC approval, ramping from 100 MW in October 2028 to full service in October 2029. |
| 16333 | Vantage Trident at Windler: Aurora Proposal Under Review; Capacity and Budget Unverified | Trident is a real Vantage proposal at E-470 and East 48th Avenue in Aurora, with local reporting documenting plan review and resident opposition. The earlier 250 MW capacity and $1.5 billion construction cost were not established by the opened records. |
| 16334 | Clearway Mosey: Proposed 500 MW Solar and Up to 850 MW Battery Storage in Nevada | The federal permitting dashboard describes Mosey as 500 MW solar with up to 850 MW battery storage in Pahrump Valley. These are proposed capacities under environmental review; the previous 544 MW scope and $1.25 billion budget were not substantiated. |
| 16335 | Dominion Randolph Solar: 800 MW, Phased Completion 2030–2032 | Dominion’s current Randolph page gives 800 MW, construction as early as January 2028 and completion phases from 2030 to 2032. A historical $800M–$1.6B estimate replaces the unsupported single $1.2B figure without claiming a current final budget. |
| 16336 | EDF Macadamia Solar: 484 MW Washington County Project, Expected in 2028 | EDF’s project directory and the Advanced Energy United project profile identify Macadamia as a 484 MW Washington County, North Carolina development expected in 2028. A verified $550 million budget and March-specific COD were not found. |
| 16337 | High Noon Solar: 300 MW Solar and 165 MW Battery Storage, Expected in 2027 | MGE’s operator announcement describes High Noon in Columbia County as 300 MW solar and 165 MW battery storage, with service expected in 2027. The previously shown $650 million total and September-specific service date need current scope-specific evidence. |
| 16338 | Amazon’s Sunstone Solar: 1,200 MW Solar and Up to 7,200 MWh Storage Approval | Oregon’s regulator identifies Amazon subsidiary Oregon Solar 1 LLC as Sunstone’s certificate holder after a June 26, 2026 ownership amendment. The approved, not-yet-constructed project has up to 1,200 MW solar and 7,200 MWh storage; construction deadline is not COD. |

## Validation

- Verified all 24 saves with independent fresh API read-backs of saved fields and power/datacenter/energy records; authors preserved.
- Reconciled 12 stale local IDs after title/source identity checks. Both posted maps retain 1,452 entries; synchronized all 12 draft snapshots.
- Verified intentional tag changes, including Amazon attribution and removal of Pine Gate from Sunstone.
- Retained 30 images and replaced six for the two moved coordinates. All 36 public Azure images downloaded successfully; eight native pages returned HTTP 200 with revised content.
- Removed unsupported Trident power/datacenter statistics and mismatched Prime Phoenix chip/generator claims. Corrected High Noon to solar generation; separate battery capacity remains in text.
- Cleared dependent calculated annual energy on eight pins after checking its basis; no published measured energy was removed.
- Visually checked the Muskie utility factsheet and all six replacement aerial/topographic/relief images.
- No application code changed; no build or deployment performed.

## Remaining research

- **solar-nextera-singer-solar-la:** Reconcile operator 200 MW/$350M scope against EIA 300 MW/March 2027 unit; verify actual construction/COD and parcel.
- **dc-aligned-pit01-shippingport-pa:** Obtain phased capacity and service schedule, project-only budget, exact site boundaries and tenant.
- **dc-cloudhq-ord-mount-prospect-il:** Resolve 252/300 MW specifications, current buildings/acreage and anchored RFS date; historical $2.5B is not a final outturn cost.
- **dc-google-cannoli-van-buren-mi:** Obtain utility contract schedule, current approved water/cooling design, total cost and exact parcel coordinates.
- **dc-prime-phoenix-avondale-az:** Verify actual data-hall RFS/COD and commissioning status; do not infer tenant or chips from another Phoenix operator.
- **dc-terawulf-muskie-catlettsburg-ky:** Verify amended agreement approval and exact parcel boundary. Approximate EastPark point from US Data Centers Tracker, consistent with operator location, replaces wrong former area; imagery regenerated.
- **dc-vantage-co21-aurora-co:** Aurora development-portal link returned 404/login. Obtain case DA-1707-46 current approved plan, MW, cost, generator count and operator COD. Do not turn resident claims into verified capacity.
- **solar-clearway-mosey-nv:** Confirm current federal approval, construction schedule, COD, cost and surveyed project coordinates.
- **solar-dominion-randolph-va:** Current total capital budget, phase capacities, exact commissioning days and parcel geometry remain unverified.
- **solar-edf-macadamia-nc:** EDF project-specific URL currently exposes directory shell; obtain current certificate/ISA amendments, exact COD, budget and site coordinates.
- **solar-invenergy-high-noon-wi:** Obtain current all-in solar/battery budget, phase-specific COD and exact site/media alignment.
- **solar-pine-gate-sunstone-or:** Obtain Amazon build/COD schedule, published investment and storage MW; verify exact parcel boundary against regulator map.

- Several exact dates remain explicitly disclosed legacy placeholders: Aligned Phoenix, CloudHQ, Cannoli, Prime Phoenix, Mosey and Sunstone. Sunstone’s November 18, 2027 construction deadline is not its COD.
- Muskie’s October 2028 date is initial service; full proposed 1 GW service in October 2029 remains conditional on approval. Operator/issuer acreage differs by land scope (285 versus 308 acres).
- Randolph’s $800M–$1.6B range is historical reporting, not a current construction budget.
- CloudHQ uses operator-published coordinates; Muskie uses an explicitly approximate EastPark tracker point. Six replacement USGS images are regional map context, not evidence of an exact parcel boundary.
- Other coordinates and 30 retained images were preserved; exact parcel/media alignment remains unaudited. Existing translations, source wikis and site outlines were not globally re-audited.
- Broader Rounds 7–59 backfill remains open. Next untouched early pin: Bouse Solar 16339, then 16340 onward.

## Evidence

[Field-level evidence and verification](cleanview-backfill-round3-2026-10-23.json) records saved patches, source URLs, outcomes and media provenance. Before/after snapshots, guarded scripts, six downloaded images and the visually checked Muskie utility PDF are in `.scrape/prod-batches/cleanview-2026-10-14/audit/backfill3-2026-10-23`.
