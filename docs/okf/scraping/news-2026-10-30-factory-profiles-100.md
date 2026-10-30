---
type: Log
title: "Factory/buildout profiles — 100-pin batch, October 30, 2026"
description: "Research and verified API replay of 100 factory and power-project buildout profiles in production and locally."
tags: [scraping, factory-profiles]
generated: { by: process:factory-profile-research, at: 2026-10-30T00:00:00Z }
---
# Factory/buildout profiles — 100-pin batch, 2026-10-30

Applied 100 new profiles to production and mirrored the same 100 locally. All 200 final API readbacks matched the submitted profiles exactly. Authors, narrative text, media, dates, prices, source URLs, parent threads, existing references and unrelated manual tags were preserved. Added research references, separate buildout/power records and evidenced construction-status tags were verified through authenticated APIs. No deployment was performed.

The replay catalog now contains 699 profiles. This batch covers 100 distinct EIA plant identities: 2 from the prior 256-candidate priced production-gap queue and 98 from the wider existing-pin inventory. Remaining raw queue candidates include unsupported building-specific claims, broken project links, repeated milestones and multi-site programmes; they were not filled with invented metrics to reach a numerical target. Current raw gap scan: 254 production / 259 local. These counts describe candidates requiring research, not a count of proven eligible construction projects.

The profiles contain 401 sourced metric cards and 100 dated milestones, with 501 attached source quotations. Profile stages: 43 announced, 50 construction, 6 commissioning, 1 production. All six radar scores remain null with specific evidence gaps. Published generator capacity does not establish manufacturing automation, efficiency percentiles, workforce outcomes or other capability scores.

The main source is [EIA's September 2026 preliminary generator workbook](https://www.eia.gov/electricity/data/eia860m/xls/september_generator2026.xlsx), released October 23. A fresh download matched the parsed original workbook byte-for-byte (SHA-256 `bcef74e1af991680731aeecfda967f5950db4ce739bb584edd8b8774c7e6da17`). Names, technology, capacity and state/county were matched; reviewed aliases include operator prefixes, community-solar abbreviations and state/locality suffixes. Exact workbook sheet/row references and original cell order are retained. Aggregate nameplate figures for Anode and Athos explicitly sum the listed generator units; their evidence includes the original contiguous D:R cell rectangles. Atlas VIII was excluded because phase/row scope needed further review. Hybrid solar capacity is distinct from battery power and unrelated wind generation.

Agave required an exception to the inventory stage: the [owner's SEC proxy](https://www.sec.gov/Archives/edgar/data/764622/000162828026023516/pnw-20260403.htm) explicitly lists it among the projects placed in service in 2025, contradicting the preliminary planned entry. Its production profile uses that operating evidence and [DOE's project assessment](https://www.energy.gov/sites/default/files/2024-09/Agave_Floodplain_Notice_and_Assessment.pdf) for the 150 MW / 600 MWh design and footprint. Its original Completed tag remains. The combined 400 MW owner programme is not attributed to Agave alone, and no commissioning day was invented. The batch was paused before writing its conflicting planned profile, then resumed with exact checks of already-written profiles and the original 200-pin preservation baselines retained. The construction skill now records the need to check existing owner evidence before downgrading Completed projects from preliminary inventory data.

Validated 100 power records in each environment: 74 generation and 26 storage records. [Power manifest](../../../scripts/factories/power-2026-10-30-batch100.json). All values distinguish generation nameplate MW from storage power. Battery duration/energy is not inferred; Agave's duration and energy are explicitly published. No annual generation or site consumption was computed. The annual-use audit checked all 200 environment/pin combinations and found no records requiring correction.

Applied 84 status alignments in each environment: 77 missing tags added (44 In Progress and 33 Proposed), five Proposed changed to In Progress, and two In Progress changed to Proposed where EIA explicitly says not under construction. Testing/construction-complete generators remain In Progress until commercial operation is established. Moonlight Flats retains its existing main-pin tag because the planned-inventory status alone does not resolve the physical-stage conflict; its profile labels the EIA reading and the research gap is retained. No completion was inferred from an elapsed forecast.

Only two selected pins have existing construction prices. They were preserved, and the workbook does not validate those budgets. Missing project budgets, land/building area, employment and annual generation remain research gaps; nothing was fabricated or converted between currencies. Forecast operation months retain source precision and are not treated as capacity commitments. The five translated source-text fields were unchanged.

Validation: schema/evidence and identity preflight in both environments, duplicate rejection, exact profile/power/status readbacks, all-source quote matching, final preservation checks for all 200 pins, and catalog/whitespace checks. Research evidence, conflict notes, baselines and per-write receipts remain in `.tmp/factory-100-2026-10-30/`.

| Project | Production/local pin | EIA plant | Profile stage |
| --- | --- | --- | --- |
| Blackwater Clean Solar Center: 250M USD, 200 MW Solar Farm in Roosevelt County, New Mexico | 18114 / 18114 | 70297 | announced |
| Snowflake A Clean Solar Center: 500M USD, 475 MWac Photovoltaic Plant in Navajo County, Arizona | 17153 / 17153 | 69060 | announced |
| Deschutes Clean Energy Storage Center: 1,000 MW / 4,000 MWh BESS in Wasco County, Oregon | 18774 / 18774 | 68763 | announced |
| Covington Solar Project: 96 MWac Solar in Covington County, Mississippi | 18719 / 18719 | 65293 | announced |
| Maiden Creek Battery Energy Storage System: 50 MW / 200 MWh BESS in Catawba County, North Carolina | 18714 / 18714 | 69194 | construction |
| Blue Lake Battery Energy Storage System: 136 MW / 544 MWh BESS in Scott County, Minnesota | 18713 / 18713 | 70098 | construction |
| Barton Branch Battery Energy Storage System: 200 MW / 800 MWh BESS in Robertson County, Texas | 18712 / 18712 | 69392 | construction |
| Hop Hill Solar Generation Facility: 500 MWac Solar in Benton County, Washington | 18704 / 18704 | 68342 | announced |
| Kingstree Georgetown Solar Project: 249 MWac Solar in Georgetown County, South Carolina | 18683 / 18683 | 67862 | announced |
| Bellflower Solar Project: 600 MWac Solar in Brunswick County, Virginia | 18633 / 18633 | 68071 | announced |
| Lower Snake Solar Project: 300 MWac Solar in Garfield County, Washington | 18623 / 18623 | 68344 | announced |
| Steele Flats Energy Storage Facility: 50 MW BESS in Jefferson County, Nebraska | 18617 / 18617 | 70345 | construction |
| Glen Canyon Solar Project Phase A: 95 MWac Solar in Kane County, Utah | 18610 / 18610 | 66484 | construction |
| Antelope Hills Solar Project: 200 MWac Solar in Beaverhead County, Montana | 18608 / 18608 | 68315 | announced |
| CO Bar Battery Energy Storage System: 206 MW BESS in Coconino County, Arizona | 18592 / 18592 | 69058 | announced |
| Cooperative Solar Three Project: 96 MWac Solar in Marion County, Kentucky | 18583 / 18583 | 69742 | announced |
| Crossroads Solar Project: 150 MW Clean Energy in Liberty County, Georgia | 18459 / 18459 | 68333 | announced |
| Carousel Energy Storage Project: 150 MW BESS in Kit Carson County, Colorado | 18450 / 18450 | 70340 | announced |
| Keamuku Solar and Storage Project: 86 MW Solar & 344 MWh BESS in Hawaii County, Hawaii | 18440 / 18440 | 69795 | announced |
| Colleton Solar Center: 75 MW Clean Energy in Colleton County, South Carolina | 18435 / 18435 | 62188 | announced |
| Moonlight Flats Solar: 250 MW Solar Power Center in Clearfield County, Pennsylvania | 18398 / 18398 | 67950 | announced |
| Karn Solar Energy Center: 85 MW Solar Facility in Bay County, Michigan | 18338 / 18338 | 67998 | construction |
| Dulles Solar & Storage Project: 100 MWac Solar Farm at Dulles Airport, Virginia | 18330 / 18330 | 65043 | construction |
| Blackford Solar Energy Project: 150 MWac Solar Farm in Blackford County, Indiana | 18326 / 18326 | 66960 | construction |
| Sunstone Solar: 1,200 MW Solar and 1,200 MW Battery in Morrow County, Oregon, Bought by Amazon in January 2026 | 15887 / 15887 | 68396 | announced |
| SCE Anode (Springville) Battery Storage: 225 MW Utility-Owned Lithium-Ion System Near Porterville, California, Due December 2026 | 15753 / 15753 | 65458 | commissioning |
| ENGIE Anson 2 Solar: 200-218.5 MW Solar Plant for Meta in Jones County, Texas | 15727 / 15727 | 69149 | construction |
| FPL Ambersweet Solar Energy Center: 74.5 MW Tracking Solar in Indian River County, Florida, Due April 2027 | 15725 / 15725 | 68829 | construction |
| AEUG Madison Solar: 100 MW Acciona Merchant Solar Farm in Madison County, Kentucky, Planned for 2028 | 15719 / 15719 | 64659 | construction |
| Primergy Ash Creek BESS: 300-306 MW Battery Planned With the 408 MW Ash Creek Solar Plant in Hill County, Texas | 15710 / 15710 | 66391 | announced |
| DTE Au Gres Solar Park: 175 MW Solar Farm in Arenac County, Michigan, Targeted for Q4 2028 | 15703 / 15703 | 69462 | construction |
| Duke Energy Allen Battery 2: 167 MW / 668 MWh Storage at the Former Allen Coal Plant in Belmont, North Carolina, Due in 2027 | 15687 / 15687 | 69148 | announced |
| APS Agave Battery Energy Storage System: 150 MW / 600 MWh Battery at the Agave Solar Plant in Arlington, Arizona, In Service | 15684 / 15684 | 67964 | production |
| SB Energy Athos Energy Storage: 400 MW / 1,600 MWh Battery Retrofit to a 450 MW Solar Plant in Riverside County, California | 15669 / 15669 | 64290 | construction |
| SL Brockport Clean Solar Center: 4 MWac Solar in Monroe County, New York | 18822 / 18822 | 69473 | construction |
| James River Battery Energy Storage System: 31 MW / 124 MWh BESS in Greene County, Missouri | 18813 / 18813 | 2161 | construction |
| Clinton Clean Solar 5 Project: 3 MWac Solar Center in Clinton County, Illinois | 18808 / 18808 | 70375 | construction |
| Fair Haven Solar Project: 20 MWac Solar in Rutland County, Vermont | 18792 / 18792 | 69667 | announced |
| Fabius Community Solar Facility: 5 MWac Solar in Onondaga County, New York | 18785 / 18785 | 70030 | construction |
| USS Gold Solar Facility: 5 MWac Solar in Luna County, New Mexico | 18773 / 18773 | 69889 | construction |
| Bear Branch Solar Project: 35 MWac Solar in Stokes County, North Carolina | 18718 / 18718 | 64168 | commissioning |
| Salt City Battery Energy Storage Project: 13 MW / 52 MWh BESS in Ross County, Ohio | 18716 / 18716 | 65302 | announced |
| Panther Branch Battery Energy Storage System: 32 MW / 128 MWh BESS in Duplin County, North Carolina | 18715 / 18715 | 66385 | announced |
| Swiss Dale Farm Solar Project: 2 MWac Solar in Cecil County, Maryland | 18711 / 18711 | 70373 | construction |
| McGinness Hills Solar Project: 14 MWac Solar in Lander County, Nevada | 18707 / 18707 | 61912 | construction |
| Liberty Knox II Solar Project: 5 MWac Solar in Albany County, New York | 18706 / 18706 | 69372 | construction |
| OIT Battery Energy Storage Facility: 2 MW / 8 MWh Storage in Klamath County, Oregon | 18700 / 18700 | 67741 | construction |
| Crane Creek Solar Project: 5 MWac Solar in Waseca County, Minnesota | 18680 / 18680 | 70378 | construction |
| Putnam Meadow Solar Station: 4 MWac Solar in Windham County, Connecticut | 18674 / 18674 | 65710 | announced |
| Palmdale 6MG Tank Solar Project: 1 MWac Solar in Los Angeles County, California | 18673 / 18673 | 68542 | construction |
| SR Milan Solar Facility: 3 MWac Solar in Gibson County, Tennessee | 18672 / 18672 | 68110 | announced |
| SR Lott Solar Facility: 8 MWac Solar in Mobile County, Alabama | 18671 / 18671 | 68558 | announced |
| Emery Shute Solar One Project: 1 MWac Solar in Waldo County, Maine | 18670 / 18670 | 65045 | construction |
| Solitude Solar Project: 5 MWac Solar in LaSalle County, Illinois | 18650 / 18650 | 67643 | construction |
| SR Marion Junction Solar Facility: 15 MWac Solar in Dallas County, Alabama | 18647 / 18647 | 68560 | announced |
| Braley Hill North Solar Farm: 5 MWac Solar in Plymouth County, Massachusetts | 18644 / 18644 | 68215 | construction |
| Quaker Creek Farm Solar: 35 MWac Solar in Alamance County, North Carolina | 18638 / 18638 | 67977 | construction |
| Wylie Ridge Solar Farm: 8 MWac Solar in Hancock County, West Virginia | 18627 / 18627 | 66901 | announced |
| Oregon Trail Solar Project: 41 MWac Solar in Gilliam County, Oregon | 18625 / 18625 | 69294 | construction |
| Sunrise Magnolia Solar Project: 3 MWac Solar in Kent County, Delaware | 18624 / 18624 | 69560 | construction |
| Penn Hemlock Solar Project: 3 MWac Solar in Snyder County, Pennsylvania | 18622 / 18622 | 69996 | construction |
| City of Little Rock Solar Array: 5 MWac Solar in Pulaski County, Arkansas | 18621 / 18621 | 68208 | construction |
| SR Bear Creek Solar Facility: 5 MWac Solar in Marion County, Alabama | 18618 / 18618 | 68243 | announced |
| South Portland Battery Energy Storage System: 10 MW BESS in Cumberland County, Maine | 18607 / 18607 | 64616 | announced |
| KRS I Anahola Battery Energy Storage System: 12 MW BESS in Kauai County, Hawaii | 18604 / 18604 | 58639 | announced |
| Pembroke 2 Solar Farm: 5 MWac Solar in Genesee County, New York | 18603 / 18603 | 69310 | construction |
| Grears Corner Solar Farm: 4 MWac Solar in New Castle County, Delaware | 18600 / 18600 | 68211 | announced |
| Clems Way Solar Project: 5 MWac Solar in Bristol County, Massachusetts | 18598 / 18598 | 70401 | announced |
| Parkwood Battery Energy Storage System: 12 MW BESS in Union County, North Carolina | 18596 / 18596 | 69870 | construction |
| Essex Battery Energy Storage System: 16 MW BESS in Chittenden County, Vermont | 18593 / 18593 | 69602 | construction |
| SR Winnsboro Solar Facility: 5 MWac Solar Generation in Franklin Parish, Louisiana | 18591 / 18591 | 68257 | construction |
| Puuloa Solar Energy Center: 6 MWac Solar in Honolulu County, Hawaii | 18588 / 18588 | 68285 | announced |
| La Junta Solar Project: 5 MWac Photovoltaic Generation in Otero County, Colorado | 18584 / 18584 | 70116 | announced |
| SR Sipsey Solar Project: 10 MWac Photovoltaic Generation in Fayette County, Alabama | 18579 / 18579 | 68566 | announced |
| Pivot Solar 36 Center: 5 MWac Photovoltaic Facility in Weld County, Colorado | 18576 / 18576 | 69035 | construction |
| Canyonville Solar Project: 3 MWac Solar Facility in Douglas County, Oregon | 18575 / 18575 | 66340 | announced |
| Bjorn Solar Project: 5 MWac Photovoltaic Generation in Barron County, Wisconsin | 18574 / 18574 | 69931 | construction |
| Pure Hedge Energy Storage Project: 20 MW / 80 MWh BESS in Windham County, Connecticut | 18573 / 18573 | 50736 | construction |
| Longtown Battery Storage Project: 5 MW / 20 MWh BESS in Fairfield County, South Carolina | 18571 / 18571 | 69195 | construction |
| Pivot Solar 58 Center: 5 MWac Solar Generation in Weld County, Colorado | 18565 / 18565 | 70357 | construction |
| Marshall Solar Project: 5 MWac Solar Generation in Marshall County, Mississippi | 18563 / 18563 | 67134 | commissioning |
| Kuihelani Solar Phase 2: 40 MWac Solar Generation in Maui County, Hawaii | 18562 / 18562 | 69743 | announced |
| Chaberton Solar Crestone: 4 MWac Solar Generation in Kent County, Delaware | 18560 / 18560 | 70374 | construction |
| Brewster Solar Energy Center: 43 MWac Solar in Polk County, Florida | 18559 / 18559 | 69522 | construction |
| Angelly Solar Project: 4 MWac Solar Generation in Saline County, Illinois | 18558 / 18558 | 69811 | commissioning |
| Westfield Solar Facility: 40 MWac Solar in Hoke County, North Carolina | 18553 / 18553 | 70306 | construction |
| Des Arc Solar Project: 5 MWac Solar Generation in Prairie County, Arkansas | 18548 / 18548 | 68230 | construction |
| Bealeton Solar Project: 14 MWac Solar in Fauquier County, Virginia | 18545 / 18545 | 70203 | announced |
| Columbus Energy Storage Project: 10 MW / 40 MWh BESS in Colorado County, Texas | 18542 / 18542 | 69865 | commissioning |
| Rhubarb One Solar Project: 10 MWac Solar in Marion County, South Carolina | 18540 / 18540 | 59596 | announced |
| MPW Solar 1 Facility: 24 MWac Solar in Muscatine County, Iowa | 18539 / 18539 | 66978 | announced |
| SR Denmark Solar Project: 42 MWac Solar in Madison County, Tennessee | 18537 / 18537 | 68229 | construction |
| Cotton Solar Project: 16 MWac Solar in Dillon County, South Carolina | 18535 / 18535 | 59572 | announced |
| Cartwright Solar II Center: 18 MWac Solar in Crook County, Oregon | 18533 / 18533 | 69782 | commissioning |
| Vonore Energy Storage System: 20 MW BESS in Monroe County, Tennessee | 18531 / 18531 | 64255 | construction |
| Shaftsbury Solar Project: 20 MWac Solar in Bennington County, Vermont | 18526 / 18526 | 64064 | announced |
| Nutes Solar Farm: 20 MWac Solar in Strafford County, New Hampshire | 18524 / 18524 | 69535 | construction |
| Shutler Energy Storage: 41 MW BESS in Gilliam County, Oregon | 18348 / 18348 | 70225 | construction |
| KCE CT 1 Battery Energy Storage System: 45 MW BESS in Windham County, Connecticut | 18332 / 18332 | 66879 | announced |
| Apple Hill Solar: 2 MW Solar Project in Bennington, Vermont, Denied a Permit by State Regulators | 15761 / 15761 | 61037 | construction |
