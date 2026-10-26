---
type: Reference
title: "Five-country geometry follow-up — 2026-10-25"
description: "Zero country gaps resolved; zero production writes."
tags: [scraping, maps, boundaries, production]
---

# Five-country geometry follow-up — 2026-10-25

**Latest follow-up: Morocco now has verified partial production coverage: all 12 regional-list constituencies. Its 92 local constituencies remain missing. Total production coverage is 75 mapped pins and 10,257 default features. Five countries still lack complete coverage.** The original research-only pass below is retained as history.

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

## Second follow-up: regional coverage published

The [Interior Ministry's September 11, 2026 communiqué](https://www.maroc.ma/fr/actualites/legislatives-2026-1850-listes-de-candidatures-presentees-lechelle-nationale) explicitly places regional-list constituencies at the level of the country's 12 regions. This makes the regional tier independently usable even while the local tier remains incomplete.

`scripts/boundaries/prepare-morocco-regional.py` validates all 12 exact region codes/names and polygon validity, preserves every source coordinate, and prepares `backfill-morocco-regional-2026-10-25.prod.json`. The [downloadable source database](https://communes.pages.dev/fr/docs/downloads/) and OSM/ODbL attribution are retained on the saved features. These are cartographic outlines, not legally surveyed electoral lines. Minor source overlaps are retained and enumerated in ignored validation evidence. Source administrative geography includes disputed Western Sahara; its display makes no sovereignty determination.

The 12 polygons were imported through the authenticated admin API and verified by read-back. The public pin map rendered all 12 paths without page errors; its screenshot was visually reviewed. Feature labels say **Regional-list only** and their vintage explains that the 92 local constituencies are not mapped. The pin wiki now states this partial coverage and cites the ministry communiqué. No local-seat boundaries or redraw comparisons were fabricated.

The main audit uses `verified_partial` for Morocco, retaining 74 fully verified maps and adding one partially covered pin. `mappedPins` is 75; district pins are 57, wildfire pins 18, and default features 10,257. `researchGaps: 5` counts countries still lacking complete coverage, including partially mapped Morocco; four records remain `research_gap` and one is `verified_partial`. The 11 existing redraw comparisons and 401 alternate-plan features are unchanged. The master replay manifest now includes Morocco's regional-only entry.

## Second follow-up: official Nigerian ward roster

Downloaded and parsed the official [Lagos RAC directory](https://www.inecnigeria.org/documents/resources/rac/LAGOS.pdf) and [Rivers RAC directory](https://www.inecnigeria.org/documents/resources/rac/RIVERS.pdf), linked from [INEC's directory page](https://www.inecnigeria.org/resources/rac). `research-nigeria-rac.py` checks sequential ward codes and extracts **76 registration-area names** across the five split LGAs. Source PDF hashes are stored in `research-nigeria-rac-2026-10-25.json`.

| LGA | INEC registration areas | GRID3 operational features |
| --- | ---: | ---: |
| Lagos Island | 19 | 20 |
| Mushin | 14 | 19 |
| Oshodi/Isolo | 11 | 20 |
| Surulere | 12 | 23 |
| Port Harcourt | 20 | 20 |

The name comparison confirms that this is not simply a national feature-count problem. A documented geographic crosswalk is still needed. Matching Port Harcourt's count does not independently certify its operational boundaries. The research catalog is explicitly unsuitable for direct geometry import, and Nigeria's pin wiki now includes these findings.

## Other leads checked

The new `skthewimp/india-constituency-maps` repository's [own conversion script](https://github.com/skthewimp/india-constituency-maps/blob/main/scripts/add_redelimited.py) identifies the previously reviewed `shijithpk/2024_maps_supplement` files as its redelimited source. It is a conversion, not independent new Assam/J&K evidence. The `yashveeeeeeer/india-geodata` tree includes a national `india_pc_2019_simplified.geojson`; its presence does not establish current redelimited coverage.

The [Duma 2026 map author's own explanation](https://duma.vollper.com/) says its boundaries are approximations derived from polling-place coordinates and Natural Earth, with schematic boundaries in Bashkortostan and Leningrad Oblast. It covers 214 constituencies on internationally recognized Russian territory; it cannot establish the required complete 225-district legal polygon set. `gd2026.wiki` could not be inspected directly because HTTPS certificate validation failed. Russia's pin wiki records the approximation warning.

The ANCFCC [thematic cartography catalog](https://www.ancfcc.gov.ma/cartographieThematique/) describes regional/province/commune maps; no Hassan annex geometry was obtained from it. A fresh request for the linked consolidated Moroccan law PDF timed out. No new complete Gambia geometry was established. All five complete-country gaps therefore remain open, with Morocco's regional tier now useful in production.
