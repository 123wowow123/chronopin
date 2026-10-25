---
type: Reference
title: "Five-country geometry follow-up — 2026-10-25"
description: "Zero country gaps resolved; zero production writes."
tags: [scraping, maps, boundaries, production]
---

# Five-country geometry follow-up — 2026-10-25

**Zero country gaps resolved; zero production writes.** All five remain explicitly open. Fresh authenticated read-back verified the existing 74 production maps and 10,245 default features against the saved reviewed geometry and source credits. No deployment, restart or build occurred.

The tracked evidence catalog is `scripts/boundaries/research-country-gaps-2026-10-25.json`. It records source links, downloaded-file hashes, geometry checks and the exact input still needed for each pin. Every country entry is marked `usableForBoundaryImport: false`. The main audit links these follow-ups without changing its coverage counts or replay manifest.

| Pin | Country | Result and remaining requirement |
| --- | --- | --- |
| 1967 | Russia | No new complete source established. Previously reviewed material has 99 constituency records in 43 pixel-coordinate diagrams; need all 225 current 2026 districts in geographic coordinates. |
| 1978 | India | No new verified geometry established. Legacy Assam boundaries and inconsistent attributes remain disqualifying; need current Assam/J&K geography, a validated 543-seat national crosswalk and explicit treatment of the predicted election plan. |
| 2350 | Nigeria | New GRID3 v4 covers Lagos/Rivers but uses operational divisions. Need an electoral crosswalk and verified split-LGA boundaries before producing the complete 360-seat map. |
| 2354 | Gambia | Downloaded two valid ward layers; neither has a verified current IEC crosswalk. Need coastal cut lines and current ward geometry matched to all 53 seats. |
| 2979 | Morocco | Downloaded the legal composition annex and arrondissement polygons. Rabat's two seats split Hassan below arrondissement level; need those administrative-annex polygons and current-plan confirmation. |

## Nigeria: new coverage does not establish electoral equivalence

[GRID3 Operational Wards v4.0](https://www.arcgis.com/home/item.html?id=74cf76766bec4481aa03523e0e1fdddc), created October 16 and modified October 20, 2026, includes the previously missing Lagos and Rivers coverage. Its terms specify **CC BY-SA 4.0**, describe the edits as operational rather than authoritative, and warn that government validation is incomplete.

The downloaded attributes contain **376 Lagos** and **316 Rivers** features, whereas the electoral registers have **245 and 319 wards** respectively. A direct national dissolve would silently equate different geographic units. The relevant remaining split LGAs are Lagos Island, Mushin, Oshodi/Isolo, Surulere and Port Harcourt.

Port Harcourt's 20 numbered operational polygons are valid. Using the indexed primary [INEC 2015 Info Kit](https://www.inecnigeria.org/wp-content/uploads/2019/02/2015-GENERAL-ELECTIONS-INFO-KIT-.pdf) composition produces two valid unions with zero overlap: constituency I uses wards 1, 2, 3, 4, 6, 7, 8, 9, 19 and 20; constituency II uses 5 and 10–18. The full PDF could not be downloaded this pass, and current-plan/geographic validation is still needed. The candidate unions are saved only in ignored research storage. They are not approved import geometry.

[OurNigeria's Port Harcourt I page](https://ournigeria.ng/constituencies/fed_rivers_port_harcourt_i) assigns all 20 wards to constituency I, conflicting with that INEC composition. This directory cannot resolve the split without independent verification.

## Gambia: geographic wards found, current coastal crosswalk missing

The [NDMA/OCHA HDX boundaries](https://data.humdata.org/dataset/cod-ab-gmb) contain **115 valid admin3 polygons**, dated valid on September 1, 2022, under CC BY-IGO. Their 49 admin2 names include Mangrove and older constituency-like administrative groupings. The date alone does not make them current electoral boundaries.

[geoBoundaries GMB ADM3](https://www.geoboundaries.org/api/current/gbOpen/GMB/ADM3/) supplies **120 valid World Bank-derived ward polygons**, boundary ID `GMB-ADM3-80922684`, representing 2020, under CC BY 4.0. Several coastal names have A/B/C suffixes without a verified correspondence to IEC electoral wards.

The existing [IEC membership roster](https://iec.gm/wp-content/uploads/2026/03/Wards.docx) establishes the 53 constituency names, but the three coastal constituencies Busumbala, Old Yundum and Sanneh Mentereng cut older ward groupings. Neither similar feature counts nor matching village names establish the missing cut lines. The [NEA data-management mission report](https://nea.gm/wp-content/uploads/2024/05/NEA-data-management-mission-report-Phase-I.pdf) also distinguishes available humanitarian ward data from the official ward data held by GBOS/IEC.

## Morocco: the legal annex exposes a finer geographic split

The annex to decree 2-11-603 of October 19, 2011, was downloaded from a [gazette mirror](https://archive.gazettes.africa/archive/ma/2011/ma-bulletin-officiel-dated-2011-11-03-no-5992.pdf); the [original SGG bulletin](https://www.sgg.gov.ma/BO/bo_fr/2011/bo_5992_fr.pdf) was also located. This provides legal composition evidence, but continuity to the pin's 2026 election still needs confirmation.

The [communes dataset](https://communes.pages.dev/fr/docs/downloads/) supplies 41 arrondissement polygons with OSM-derived geometry under ODbL. It has one Hassan polygon. The annex assigns Hassan's administrative annexes **3 and 4** to Rabat El Mouhit, and **1, 2 and 22** to Rabat Chellah. Assigning the entire arrondissement to either seat, or duplicating it, would be incorrect. Other commune/province and historical-name crosswalks also require verification before a full 92-local plus 12-regional-list import.

## Verification

Shapely validated all 115 NDMA/OCHA and 120 World Bank-derived Gambia polygons and all 20 selected Port Harcourt source polygons. Both Port Harcourt candidate unions are valid and have zero intersection area. These checks establish geometric integrity, not electoral accuracy.

The fresh production comparison is saved as `.scrape/boundaries/gap-resolution-all-saved-verified.json`; its hash is recorded in the catalog. Raw downloads, candidate geometry and credentials remain ignored. No runtime application code changed.

## Pin wiki publication

At the owner's subsequent request, a dated Boundary research section and source references were added to the native production pin wikis for **1967, 1978, 2350, 2354 and 2979**. These explain the findings and missing geographic inputs without claiming the gaps are resolved. Existing wiki content and references were retained. Read-back verified each saved section, all reference URLs, the original author, title, description, event dates, confidence, thread and coordinates.

The reviewed additions are in `scripts/boundaries/research-pin-wikis-2026-10-25.json`. `node scripts/boundaries/publish-research-wikis.mjs` previews them; `--apply` publishes through the authenticated pin API. It checks for concurrent edits, preserves surrounding wiki content, replaces only its own dated section on replay and verifies the saved result. The publication report is ignored at `.scrape/boundaries/research-wikis-production-verified.json`. This follow-up wrote pin wiki text and references only; geometry coverage remains unchanged.
