# Cleanview sourcing backfill — round 32, October 24, 2026

Audited **12 mapped records (17067–17078)**: **seven corrected and five soft-deleted/held** on local and production. Source/company wikis, catalogs and TODO updated. No deployment.

## Corrected records

| ID | Saved result |
|---|---|
| 17067 | **Jefferson–Greentown AG2-331: 200 MW / 2,000 MWh; Tracker Lists Withdrawn** — PJM’s October 29, 2025 Phase I study identifies Cobia Solar LLC’s 200 MW / 2,000 MWh, ten-hour storage addition in Decatur County, Indiana. The 715 MW figure is combined facility capability. GridTracker’s later listing reports the request withdrawn. |
| 17068 | **South Platte Storage: 250 MW; June 2027 EIA Target** — EIA’s September 2026 inventory lists South Platte Storage plant 70053, generator SP250, at 250 MW in Morgan County, Colorado, under construction at no more than 50% complete and planned for June 2027. Operator is South Platte Storage LLC. |
| 17069 | **Steel River Phase 2 Storage: 250 MW; July 2029 EIA Target** — EIA’s September 2026 inventory identifies Steel River Solar Phase 2, plant 70398, with 250 MW battery SRSB2 and a separate 500 MW solar generator. It reports construction no more than 50% complete and July 2029 planned operation. |
| 17070 | **Steel River Phase 3 Storage: 250 MW; July 2030 EIA Target** — EIA’s September 2026 inventory identifies Steel River Solar Phase 3, plant 70399, with 250 MW battery SRSB3 and a separate 500 MW solar generator. It reports construction no more than 50% complete and July 2030 planned operation. |
| 17075 | **Galion–South Berwick AG2-149: 314 MW Solar; Tracker Lists Withdrawn** — PJM’s October 29, 2025 Phase I study identifies Wombat Solar LLC’s AG2-149 solar request in Crawford County, Ohio: 314 MW energy and 52 MW capacity, within a 400 MW combined facility. GridTracker’s later queue record lists it withdrawn. |
| 17077 | **Split Rock–White (WAPA) 345 kV J3964: 490 MW Solar Request; 2030 Target** — MISO lists J3964 as an active 490 MW solar interconnection request in Brookings County, South Dakota, in DPP 2025 Phase 1. Its requested in-service date is 2030-01-31. The queue does not identify developer ownership or a final array parcel. |
| 17078 | **Stone Lake–Gardner Park 345 kV J3975: 416.5 MW Solar Request; 2030 Target** — MISO lists J3975 as an active 416.5 MW solar interconnection request in Rusk County, Wisconsin, in DPP 2025 Phase 1. Its requested in-service date is 2030-02-20. The queue does not identify developer ownership or a final array parcel. |

## Held identities

- **17071 — dc-google-jackson-county-bldg-4-al:** Unverified Google Jackson County Building 4 split within retained campus 16410. Opened Google June 15, 2026 announcement and full PDF establish a $1.5B 2026–2027 campus expansion on the operating Widows Creek site, not a separately labelled 150 MW/$1B Building 4 or its COD. No opened building-specific plan/permit resolves this tracker allocation. Hold the unsupported split; preserve 16410 and do not infer cancellation of the campus.
- **17072 — dc-google-west-memphis-bldg-3-ar:** Unverified Google West Memphis Building 3 tracker split. Opened Google October 2, 2025 state investment announcement and Entergy October 19, 2026 expansion/service release support a real campus and expanded power-service agreement, but do not label this Building 3, assign 118 MW/$750M or confirm its exact delivery date. Regional $4B investment, $600M utility resource upgrades and customer savings are different scopes. Hold pending a labelled building filing; no campus cancellation inferred.
- **17073 — dc-google-west-memphis-bldg-5-ar:** Unverified Google West Memphis Building 5 tracker split. Opened Google October 2, 2025 state investment announcement and Entergy October 19, 2026 expansion/service release support a real campus and expanded power-service agreement, but do not label this Building 5, assign 118 MW/$750M or confirm its exact delivery date. Regional $4B investment, $600M utility resource upgrades and customer savings are different scopes. Hold pending a labelled building filing; no campus cancellation inferred.
- **17074 — dc-meta-montgomery-bldg-6-al:** Unverified Meta Montgomery Building 6 split. Meta May 2024 and September 23, 2025 releases describe the campus and two added buildings, with nearly 1.3M sqft and more than $1.5B total investment. They do not identify a sixth building, 40 MW, $350M building budget or November 2027 opening. Hold pending an opened labelled building plan; retain already corrected campus 16386 unchanged, without dividing campus totals or borrowing Huntsville figures.
- **17076 — solar-independence-ises-powerline-ar:** Independence–ISES 625 MW tracker mapping is ambiguous. Current MISO queue has two distinct 625 MW Jackson County solar requests, J2261 and J2262, at Independence–ISES–Powerline Road; February 11, 2026 MISO planning report explicitly confirms each has a GIA and a shared Campbell switching-station project. Original lead has no request identifier and September 2028 can match either negotiated month. No evidence establishes an Entergy-owned $650M standalone project or maps this pin to one request. Hold until identity resolves; $39.9M shared switching-station cost is not either solar project’s budget and queue Done is not operation.

## Verification and wiki coverage

- Verified **24 environment actions**, **22 current Azure files**, **14 native pages** and original authors. Three markers received **six replacement maps**. Seven credited gallery placements use four unique original assets; ten unique new Azure files in total.
- Updated **10 source wikis** and **4 company wikis** per environment. Verified **39 affected pins** unchanged during wiki work, **73 current citation associations**, **24 ready source wikis**, **zero stale summaries** and **no source gaps within this round’s wiki scope**.
- Existing MISO/EIA wiki coverage preserved. Eight retained campus/component pins passed sixteen unchanged checks across both environments. No automatic merge or campus cancellation.
- Both posted maps contain **1,372 entries**; **1,058 mapped live records remain unaudited**, plus reviewed-record gaps and held identities.
- The four inaccessible exact URLs from the [earlier wiki pass](cleanview-wiki-backfill-2026-10-24.md) remain separate follow-up. Backups, source downloads, byte checks and saved readbacks are retained in ignored `.scrape/prod-batches/cleanview-2026-10-14/audit/round32-2026-10-24/`. No deployment, build, restart or application-code changes.

## Research decisions

- Opened PJM Phase I studies were released October 29, 2025: Cobia AG2-331 is 200 MW/2,000 MWh/ten-hour storage added within a 715 MW combined facility; Wombat AG2-149 is 314 MW solar within 400 MW combined solar/storage capability. Neither request is in the June 2026 Phase II request list. Opened GridTracker records report November 27, 2025 withdrawal/CIW for each. This later status is explicitly attributed to secondary records; exact primary withdrawal confirmation remains a follow-up because current export returns 401. Native dates mark the verified historical study publication, not withdrawal day or future COD.
- South Platte plant 70053/SP250 is 250 MW battery, EIA September 2026 status U and June 2027 plan. FERC asset registry has an older July 2027 month. It is distinct from 150 MW South Platte Solar plant 69972; no unsupported phase/parent identity or duration is inferred. Water-storage projects and reservoir cost studies with the same name are unrelated.
- Steel River Phase 2/3 are independent storage generator records SRSB2/SRSB3 at 250 MW each, paired with separate 500 MW solar records. Current EIA reporting targets July 2029/July 2030, while current operator page targets all phases by 2029. Phase 3 conflict remains explicit; July 2026 ceremony and Google PPA cover the first two phases only. Native company keeps the EIA/legal Cypress Creek Renewables identity, with current Cypress Creek Energy branding explained.
- Seven unsupported construction prices were cleared; no matched current construction budget was verified for these scopes. Study network-upgrade allocations are not whole project costs. Steel River $4.5B-plus capital is whole-program; $3.5B financing covers first two hybrid phases together. The $39.9M Campbell switching-station project is shared infrastructure for two distinct 625 MW solar requests, not a budget for either generating plant. No division, phase prorating or FX conversion.
- Independence lead lacks a request identifier, and both J2261 and J2262 match 625 MW/Jackson County/September 2028 negotiated month. Opened February 2026 MISO planning report confirms two projects and a shared switching station. Hold avoids arbitrarily assigning a tracker lead or treating queue Done as commercial operation.
- Google Jackson County Building 4, Google West Memphis Buildings 3/5 and Meta Montgomery Building 6 lack opened building-specific mapping, capacity, cost or COD evidence. Opened campus releases support real wider developments, not those tracker allocations. Meta/Jackson canonical pins and existing Steel River component/campus pins remain unchanged; holds do not mean cancellation of campuses.
- Official gallery/link checks added two whole-program Steel River construction photos and a phase-location schematic to each storage pin, plus the first-two-phase ceremony on Phase 2. Captions distinguish shared solar/program context from a completed or separately identified battery installation. Three moved markers received six USGS maps at EIA reporting coordinates, not surveyed battery plots. Seven gallery placements reuse four original public Azure files; ten unique new files were uploaded. Plain curl original bytes and public blob bytes were verified; no pin images added to Git.
- Wombat’s former project homepage redirects to generic Geenex content; unlabelled corporate imagery was not used as a project gallery. No independently labelled South Platte, anonymous MISO or Cobia site gallery was established after project/developer/filing searches. Original invented operator URLs were dead/blocked. Exact gallery and parcel gaps remain recorded.

## Remaining research gaps

- **17067:** Recover current primary queue/withdrawal record, exact parcel, published project construction budget and site imagery. Do not interpret the 2028 study model as COD.
- **17068:** Verify current parent ownership, final footprint, latest construction/schedule, MWh and published construction budget; project-specific gallery remains unlocated.
- **17069:** Verify phase-specific battery MWh, precise footprint, separate construction budget and actual commissioning; resolve EIA/whole-program schedule and storage-design differences. Whole-project photos do not establish this phase’s battery installation.
- **17070:** Verify phase-specific battery MWh, precise footprint, separate construction budget and actual commissioning; resolve EIA/whole-program schedule and storage-design differences. Whole-project photos do not establish this phase’s battery installation.
- **17075:** Recover primary withdrawal record and current local/project disposition, final parcel and matched construction budget; no project-specific gallery found after operator redirect.
- **17077:** Identify applicant, exact project parcel, permits, published construction budget and verified project gallery; do not treat queue status as operation.
- **17078:** Identify applicant, exact project parcel, permits, published construction budget and verified project gallery; do not treat queue status as operation.

## Source links

- [PJM — AG2-331 Phase I System Impact Study](https://www.pjm.com/pjmfiles/pub/planning/project-queues/TC2/PHASE_1/AG2-331/AG2-331_imp_PHASE_1.htm)
- [GridTracker — Jefferson-Greentown AG2-331 queue record](https://www.interconnection.fyi/project/pjm-ag2-331)
- [EIA — September 2026 generator inventory](https://www.eia.gov/electricity/data/eia860m/xls/september_generator2026.xlsx)
- [FERC market-based rate asset registry — South Platte Storage](https://mbrweb.ferc.gov/SearchlkpFERCAsset/Index?page=46)
- [Cypress Creek — Steel River Energy Center](https://cypresscreekenergy.com/steel-river-energy-center/)
- [Cypress Creek — Steel River financing](https://cypresscreekenergy.com/news/steel-river-financing/)
- [Cypress Creek and Google break ground on Steel River](https://cypresscreekenergy.com/news/steel-river-groundbreaking/)
- [PJM — AG2-149 Phase I System Impact Study](https://www.pjm.com/pjmfiles/pub/planning/project-queues/TC2/PHASE_1/AG2-149/AG2-149_imp_PHASE_1.htm)
- [GridTracker — Galion-South Berwick AG2-149 queue record](https://www.interconnection.fyi/project/pjm-ag2-149)
- [MISO generator interconnection queue — J3964](https://www.misoenergy.org/api/giqueue/getprojects)

Next untouched mapped records: **17079** (`battery-energy-water-rock-bess-nye-nv`), **17080** (`battery-kickstart-v-ellis-tx`), **17081** (`battery-prairie-point-ii-wise-tx`).

[Field-level evidence and verification](cleanview-backfill-round32-2026-10-24.json).
