---
type: Research Run
title: "Factory/buildout profiles — round of 150, October 30, 2026"
description: "Added 150 sourced profiles and timelines in both environments, verified status tags, repaired stale energy content and synchronized 15 locales."
tags: [scraping, factory-profiles]
---

# Factory/buildout profiles — round of 150, October 30, 2026

Completed **150 new profiles** in production and locally, with **608 sourced metric cards and 226 timeline milestones**. All **300 final exact profile readbacks** passed. Every profile passes the real schema and three-distinct-category display checks and has a sourced timeline. All **834 attached quotations** matched the opened source artifacts. The replay catalog now contains **866 profiles**.

Final native construction tags are **25 Proposed, 73 In Progress, and 52 Completed**. Exactly one of these tags was verified for each pin in both environments. **42 tags were added or corrected per environment**; already correct tags were retained. The two commissioning-stage projects remain In Progress. Neither expired target dates nor financing announcements were treated as completed construction. All six capability axes remain null with explicit source/benchmark gaps.

## Which backlog this round covers

This batch uses the wider inventory of existing unprofiled construction pins: **52 AI data-center buildouts, 40 energy projects, 20 named HUD housing projects, and 38 other infrastructure/construction projects**. None of these 150 belonged to the prior priced raw gap scan. That narrower scan remains **247 production / 247 local candidates** after this round. It includes duplicate milestones, unsupported building-specific claims, broken project links and multi-site programmes; it must not be reported as 97 simply by subtracting 150 from 247.

Six overlapping AI-campus records were excluded and linked in the replay notes to the existing project/phase profiles: Fairwater, Milam, Hyperion, QTS Cedar Rapids, Lighthouse and Meta Aiken. Frontier 18396 and Rippon 18352 were excluded when current physical-stage/scope evidence did not cleanly resolve the preliminary inventory versus existing pin claims. These are specific research gaps, not author-allowlist refusals. The CATL profile belongs to the Debrecen project-announcement pin 15672, rather than counting its trial-production milestone pin as another plant.

## Sources, dates and physical scope

- **AI campuses:** opened each Epoch AI directory page and matched its dated physical-stage quotations to the source’s structured timeline. Modeled IT power and chip estimates are explicitly research estimates, not measured demand or utility commitments. Completed-building scopes are kept distinct from remaining campus construction, and later inferred operation dates do not automatically complete a project. Epoch’s modeled compute-plus-building capital costs were not saved as construction prices.
- **Energy:** freshly downloaded the [EIA September 2026 inventory](https://www.eia.gov/electricity/data/eia860m/xls/september_generator2026.xlsx), released October 23. SHA-256 `bcef74e1af991680731aeecfda967f5950db4ce739bb584edd8b8774c7e6da17` matched the earlier parsed workbook. All **42 selected generator rows** for 40 distinct pin identities were checked directly against the fresh workbook for plant ID/name, state/county, generator ID, technology, nameplate capacity, operation month/year and stage. Separate unit/technology scopes were retained.
- **Housing:** freshly queried HUD’s LIHTC service and matched twenty named records by unique HUD_ID, project name/phase and city, with location/address retained. HUD’s layer attribution identifies the U.S. Department of Housing and Urban Development and U.S. Census Bureau. Unit counts and `YR_PIS` are the specific tax-credit project’s scope; the year is not represented as original building construction, a later rehabilitation opening or an exact ceremony day. Sentinel years were excluded. Separate phase numerals were manually selected where needed, including Cloisters III.
- **Other construction:** opened operator, regulator, builder or credible contemporary reporting for each selected project. Source precision is preserved for years, seasons and months. For 1633 Valencia and Atlantic Square, completion/opening is explicitly established **by the dated report**, without substituting the report day for an exact opening day. National Western’s ceremony does not establish a physical construction start. Glenarden Phase I and Gloria Robinson’s final 70-home phase are distinguished from broader redevelopment totals.

## Corrections and preserved fields

Researched content/date/cost corrections were applied to **42 pins in each environment**, with all **84 correction readbacks** verified. Forty energy pins now distinguish inventory-reported operation from forecasts, generation nameplate MW from battery MW, and named components from unrelated units. Earlier unsupported forecasts and numeric claims were replaced with cited inventory facts. Native month markers are explicitly estimated month-only anchors, never invented exact commissioning days. Dates without sufficient start/completion precision were not expanded into fabricated construction intervals.

Two native-currency costs were established from primary sources: **EUR 7.34 billion** for CATL’s Debrecen project announcement and **approximately USD 20.9 million** for Gloria Robinson Court Homes’ described final phase. No foreign-exchange conversion, financing-package substitution, programme allocation or modeled economic-output figure was used as construction cost. Unpublished budgets remain null.

Forty power records were verified per environment. The regulator’s preliminary approved-plan **260 MW solar** scope is used for Nolin Hills’ main generation record, with the conflicting **300 MW EIA proposal** recorded explicitly. Oregon’s July 2026 request to extend the construction-start deadline to July 2029 is a request, not an achieved start or automatic approval; EIA’s December 2027 operation forecast remains visibly conflicted. No annual generation or site consumption was invented. Storage MW is power, not an assumed four-hour MWh rating.

Atlas VIII’s two units retain **December 2026 and January 2027** forecasts, supported by separate literal quotations for the non-adjacent workbook rows. Black Walnut retains its distinct **November 2027 solar and December 2028 battery** forecasts. Rosamond South II selects the **92 MW RSBA** generator and excludes the separate 48 MW battery row. All six source-precision refinement readbacks passed.

Authors, media, parent threads, source identities, existing reference content and unrelated tags were preserved. Only the documented source/content/date/cost repairs, references and separate profile/power records changed. Reference IDs can be regenerated by the native whole-pin PUT; reference URLs and metadata were preserved. No new pins were posted.

## Translations and final verification

Refreshed **600 production translation rows** for edited English text, with zero skipped saves. Mirrored **2,250 complete production translation rows** locally. Final checks covered **150 pins × 15 locales × two environments = 4,500 current/complete translation records**, using matching English source hashes and the real whole-translation checks across title, description, long-form summary, date reasoning and delay reasoning. No public tracking-note leaks were detected. Translation service attribution was recorded accurately as Google Translate only in backing SourceWiki records; unbuilt Source status/wikiVersion were not changed.

Final verification also checked exact profile equality, every source remaining in native pin references, status uniqueness, exact power fields, the documented content/date/cost patches, authors/media/thread preservation, and original reference URLs. Catalog and whitespace checks passed. The construction skill now records the identity, phase, HUD-year and research-estimate distinctions used in this round.

No deployment, build, restart, schema change or scheduled-job-limit change occurred. Evidence, raw source downloads, baselines, per-write receipts and the final audit are in `.tmp/factory-150-2026-10-30/`.

Replay records: [profile catalog](../../../scripts/factories/capability.json), [power records](../../../scripts/factories/power-2026-10-30-round150.json), [content/date/cost and source-scope corrections](../../../scripts/factories/corrections-2026-10-30-round150.json).

| Project | Production / local pin | Status tag | Milestones |
| --- | --- | --- | --- |
| OpenAI Stargate Abilene AI Data Center Buildout | 18974 / 18974 | In Progress | 3 |
| Coreweave Helios AI Data Center Buildout | 19041 / 19041 | In Progress | 3 |
| Google New Albany AI Data Center Buildout | 19045 / 19045 | In Progress | 2 |
| OpenAI Stargate UAE AI Data Center Buildout | 19047 / 19047 | In Progress | 2 |
| Amazon Ridgeland AI Data Center Buildout | 19050 / 19050 | In Progress | 2 |
| Meta Prometheus AI Data Center Buildout | 19051 / 19051 | In Progress | 2 |
| Google Columbus AI Data Center Buildout | 19055 / 19055 | In Progress | 2 |
| VNET Bayin Ulanqab AI Data Center Buildout | 19056 / 19056 | In Progress | 2 |
| OpenAI Stargate Shackelford AI Data Center Buildout | 19058 / 19058 | In Progress | 2 |
| Google Fort Wayne AI Data Center Buildout | 19060 / 19060 | In Progress | 2 |
| Huawei Horinger AI Data Center Buildout | 19065 / 19065 | In Progress | 2 |
| Google Red Oak AI Data Center Buildout | 19067 / 19067 | In Progress | 2 |
| Anthropic Lake Mariner AI Data Center Buildout | 19077 / 19077 | In Progress | 2 |
| Anthropic Barber Lake AI Data Center Buildout | 19079 / 19079 | In Progress | 2 |
| EcoDataCenter 2 AI Data Center Buildout | 19083 / 19083 | In Progress | 2 |
| Microsoft Narvik Norway AI Data Center Buildout | 19086 / 19086 | In Progress | 2 |
| Huawei Wuhu AI Data Center Buildout | 19088 / 19088 | In Progress | 2 |
| Meta Bowling Green AI Data Center Buildout | 19089 / 19089 | In Progress | 2 |
| CoreWeave Lancaster Greenfield site AI Data Center Buildout | 19090 / 19090 | In Progress | 2 |
| Envision Galaxy Ulanqab AI Data Center Buildout | 19097 / 19097 | In Progress | 2 |
| Amazon Madison Mega Site AI Data Center Buildout | 19159 / 19159 | In Progress | 2 |
| OpenAI Stargate Lordstown AI Data Center Buildout | 19164 / 19164 | In Progress | 2 |
| STACK Infrastructure NVA02 AI Data Center Buildout | 19165 / 19165 | In Progress | 2 |
| Microsoft-Nebius New Jersey AI Data Center Buildout | 19166 / 19166 | In Progress | 2 |
| Microsoft Goodyear AI Data Center Buildout | 19167 / 19167 | In Progress | 2 |
| OpenAI Stargate Michigan AI Data Center Buildout | 19170 / 19170 | In Progress | 2 |
| Google Cedar Rapids AI Data Center Buildout | 19172 / 19172 | In Progress | 2 |
| Google Lincoln AI Data Center Buildout | 19179 / 19179 | In Progress | 2 |
| CoreWeave Muskogee OK AI Data Center Buildout | 19180 / 19180 | In Progress | 2 |
| Google Papillion AI Data Center Buildout | 19181 / 19181 | In Progress | 2 |
| CoreWeave Ellendale ND AI Data Center Buildout | 19183 / 19183 | In Progress | 2 |
| CoreWeave Chester VA AI Data Center Buildout | 19185 / 19185 | In Progress | 2 |
| Google Storey County AI Data Center Buildout | 19187 / 19187 | In Progress | 2 |
| QTS Richmond 3 AI Data Center Buildout | 19189 / 19189 | In Progress | 3 |
| AWS New Albany AI Data Center Buildout | 19190 / 19190 | In Progress | 2 |
| QTS Eagle Mountain AI Data Center Buildout | 19194 / 19194 | In Progress | 2 |
| AWS Berwick AI Data Center Buildout | 19197 / 19197 | In Progress | 3 |
| Anthropic-Amazon New Carlisle AI Data Center Buildout | 19161 / 19161 | In Progress | 3 |
| Meta Montgomery AI Data Center Buildout | 19169 / 19169 | In Progress | 3 |
| Google Pryor (North) AI Data Center — Completed Buildings | 19052 / 19052 | Completed | 2 |
| Microsoft Project Osmium AI Data Center — Completed Buildings | 19053 / 19053 | Completed | 3 |
| CoreWeave Marble NC AI Data Center — Completed Buildings | 19068 / 19068 | Completed | 2 |
| Oracle Batam AI Data Center — Completed Buildings | 19069 / 19069 | Completed | 3 |
| Google Lancaster AI Data Center — Completed Buildings | 19075 / 19075 | Completed | 2 |
| Microsoft SAT14 AI Data Center — Completed Buildings | 19076 / 19076 | Completed | 2 |
| Google Arcola AI Data Center — Completed Buildings | 19078 / 19078 | Completed | 2 |
| Meta Eagle Mountain AI Data Center — Completed Buildings | 19080 / 19080 | Completed | 2 |
| CoreWeave Norway AI Data Center — Completed Buildings | 19081 / 19081 | Completed | 2 |
| CoreWeave Dalton 1 & 2 AI Data Center — Completed Buildings | 19082 / 19082 | Completed | 2 |
| Microsoft SAT40 AI Data Center — Completed Buildings | 19184 / 19184 | Completed | 2 |
| Google Bristow AI Data Center — Completed Buildings | 19191 / 19191 | Completed | 2 |
| Google Waltham Cross AI Data Center — Completed Buildings | 19198 / 19198 | Completed | 2 |
| Wynne Senior Residences — Philadelphia affordable housing | 7202 / 7202 | Completed | 1 |
| Vernon House — Philadelphia affordable housing | 7197 / 7197 | Completed | 1 |
| Universal Court I — Philadelphia affordable housing | 7194 / 7194 | Completed | 1 |
| Roosevelt Manor — Camden affordable housing | 7184 / 7184 | Completed | 1 |
| River Street Commons — Red Bank affordable housing | 7183 / 7183 | Completed | 1 |
| Providence Square — New Brunswick affordable housing | 7180 / 7180 | Completed | 1 |
| Marlton Residences — Philadelphia affordable housing | 7167 / 7167 | Completed | 1 |
| Livingston Manor — New Brunswick affordable housing | 7164 / 7164 | Completed | 1 |
| Liberty House — Phoenixville affordable housing | 7162 / 7162 | Completed | 1 |
| Jefferis Square — Chester affordable housing | 7160 / 7160 | Completed | 1 |
| Iris at Park Pointe — Griffin affordable housing | 7159 / 7159 | Completed | 1 |
| Crest Manor — Willow Grove affordable housing | 7144 / 7144 | Completed | 1 |
| Cloisters III — Philadelphia affordable housing | 7142 / 7142 | Completed | 1 |
| Academy Place — Trenton affordable housing | 7133 / 7133 | Completed | 1 |
| Terraces at the Park — Griffin affordable housing | 7130 / 7130 | Completed | 1 |
| St. Stephen’s Apartments — Washington DC affordable housing | 7116 / 7116 | Completed | 1 |
| Chapel Green — Baltimore affordable housing | 7104 / 7104 | Completed | 1 |
| Renaissance at Reservoir Hill — Baltimore affordable housing | 7101 / 7101 | Completed | 1 |
| Maher Manor — Old Bridge affordable housing | 7165 / 7165 | Completed | 1 |
| Oaks at Liberty — Baltimore affordable housing | 7103 / 7103 | Completed | 1 |
| Jakarta Sets September 2026 Groundbreaking for Its Giant Sea Wall | 501 / 501 | Proposed | 1 |
| Crane Forest Grove Campus: 100+ MW Plan; $275.26M Qualified-Property Investment | 16306 / 16306 | In Progress | 1 |
| Microsoft San Jose Data Center: Up to 99 MW at 1657 Alviso-Milpitas Road | 16308 / 16308 | In Progress | 3 |
| Vantage Trident at Windler: Aurora Proposal Under Review; Capacity and Budget Unverified | 16333 / 16333 | Proposed | 1 |
| Ameresco / CyrusOne NAS Lemoore: 100 MW Data Center and Energy Plan | 16469 / 16469 | Proposed | 1 |
| Mass General's Ragon Building Opens Its First Tower to Patients | 2198 / 2198 | In Progress | 1 |
| Broncos Target the 2031 Season to Open Their Burnham Yard Stadium | 2209 / 2209 | Proposed | 1 |
| National Western Center Targets Early 2027 Start for Its Equestrian Center | 2211 / 2211 | Proposed | 1 |
| LAX's Terminal 4 Modernization Tops Out | 3376 / 3376 | In Progress | 2 |
| First Structure of the New Île-aux-Tourtes Bridge Opens | 4918 / 4918 | In Progress | 3 |
| CATL Announces €7.34 Billion Debrecen Battery Manufacturing Project | 15672 / 15672 | In Progress | 2 |
| Melbourne Airport Rail Link | 424 / 424 | In Progress | 1 |
| Australia High Speed Rail Reaches Sydney | 433 / 433 | Proposed | 1 |
| Goldin Finance 117 Targeted to Finally Complete in Tianjin | 494 / 494 | In Progress | 1 |
| Queensland Reverses Course, Commits to Rebuilding Paradise Dam Wall in Place | 570 / 570 | Proposed | 1 |
| Glenarden Hills Phase I Completes 114 Family and Senior Homes | 7151 / 7151 | Completed | 1 |
| Cyprus Brings 10,000 m3/Day Mobile Desalination Unit Online at Limassol Port | 18244 / 18244 | Completed | 1 |
| Doheny Ocean Desalination Plant Heads Toward Construction Notice in Nov 2026 | 18248 / 18248 | Proposed | 1 |
| Nebius Birmingham AI Factory Under Construction | 19193 / 19193 | In Progress | 2 |
| Microsoft Granger Data Center Enters Site Construction | 19203 / 19203 | In Progress | 1 |
| RadiusDC Nashville I Groundbreaking | 19284 / 19284 | In Progress | 2 |
| Google Buffalo Putnam County Data Center Planning | 19297 / 19297 | Proposed | 1 |
| New Manila International Airport Runway Delayed to 2028 | 463 / 463 | In Progress | 1 |
| McCook Reservoir's Second Stage Delayed to 2032 | 636 / 636 | In Progress | 1 |
| UC San Diego Targets Summer 2027 Start for New Hillcrest Hospital | 2166 / 2166 | Proposed | 2 |
| 1633 Valencia — San Francisco affordable housing | 7086 / 7086 | Completed | 1 |
| Atlantic Square — Miami affordable housing | 7070 / 7070 | Completed | 1 |
| Surge Development Knightstown Data Center — Planned Development | 19206 / 19206 | Proposed | 1 |
| Prism Capital Partners Nutley Site — Planned Development | 19251 / 19251 | Proposed | 1 |
| Cottage Hill Place — Mobile affordable housing | 7143 / 7143 | Completed | 2 |
| The Pointe at Thomas Affordable Housing Groundbreaking Announced in Seattle | 7027 / 7027 | In Progress | 1 |
| The Rise on Madison — Seattle affordable housing | 7043 / 7043 | Completed | 1 |
| Wilhelmsen Launches Tønsberg as the World's Largest Ro-Ro Ship | 887 / 887 | Completed | 1 |
| New Hope Housing Berry — Houston affordable housing | 7080 / 7080 | Completed | 2 |
| Bristol Technology Center — Planned Development | 19205 / 19205 | Proposed | 2 |
| Fairfax Energy Storage Project: 200 MW BESS Planned in Linn County, Iowa | 18482 / 18482 | Proposed | 1 |
| Gloria Robinson Court Homes — Jersey City affordable housing | 7152 / 7152 | Completed | 1 |
| Drake Storage Project: Up to 80 MW BESS Planned in Middlesex County, Virginia | 18282 / 18282 | Proposed | 2 |
| Clark Solar-Longwood: 2.5 MW electrical generation nameplate in Clark County, WI | 18821 / 18821 | Completed | 1 |
| Spooner: 2.3 MW electrical generation nameplate in Washburn County, WI | 18794 / 18794 | In Progress | 1 |
| Teeple Creek: 2.5 MW electrical generation nameplate in Allamakee County, IA | 18772 / 18772 | In Progress | 1 |
| Mondovi: 3 MW electrical generation nameplate in Buffalo County, WI | 18770 / 18770 | In Progress | 1 |
| San Juan Clean Energy Solar Center: 200 MWac Solar in San Juan County, New Mexico | 18759 / 18759 | Completed | 1 |
| Gage Solar Project: 200 MWac Solar in McCracken County, Kentucky | 18693 / 18693 | Proposed | 1 |
| Abercrombie Solar Project: 295 MWac Solar in Richland County, North Dakota | 18691 / 18691 | Proposed | 1 |
| Dutchman Solar Project: 499 MWac Solar in Converse County, Wyoming | 18681 / 18681 | Proposed | 1 |
| Ross Solar Farm: 75 MWac Solar in Darlington County, South Carolina | 18613 / 18613 | Proposed | 1 |
| Orchard Battery Energy Storage System: 10 MW BESS in Fort Bend County, Texas | 18595 / 18595 | In Progress | 1 |
| Pike Solar Facility: 18 MWac Photovoltaic Array in Fayette County, Illinois | 18586 / 18586 | In Progress | 1 |
| Ringe: 2.5 MW electrical generation nameplate in Olmsted County, MN | 18578 / 18578 | Completed | 1 |
| Jamaica Energy Storage Facility: 5 MW / 20 MWh BESS in Kings County, New York | 18569 / 18569 | In Progress | 1 |
| Vienna Solar Project: 5 MWac Solar Generation in Oneida County, New York | 18566 / 18566 | In Progress | 1 |
| Gunnar Reliability Project: 150 MW battery power in Hidalgo County, TX | 18432 / 18432 | In Progress | 1 |
| Murch Solar, LLC: 85 MW electrical generation nameplate in Van Buren County, MI | 18427 / 18427 | In Progress | 1 |
| Greer Solar Plant: 200 MW electrical generation nameplate in Washington County, MS | 18408 / 18408 | In Progress | 1 |
| Cherrywood Solar I: 145 MW Solar Facility in Caroline County, Maryland | 18405 / 18405 | Completed | 1 |
| Morgnec Solar Project: 56 MWac Solar Farm in Kent County, Maryland | 18376 / 18376 | Completed | 1 |
| Broadleaf Solar: 200 MW electrical generation nameplate in Hartford County, CT | 18372 / 18372 | Proposed | 1 |
| MC Solar Project: 50 MW Solar Facility in Mercer County, Pennsylvania | 18364 / 18364 | In Progress | 1 |
| Beavertail Solar Project: 400 MW Solar Facility in Henry County, Missouri | 18349 / 18349 | In Progress | 1 |
| Grayson Battery Energy Storage System: 75 MW BESS in Glendale, California | 18347 / 18347 | Completed | 1 |
| Pleasant Prairie Solar Energy LLC: 200 MW electrical generation nameplate in Franklin County, OH | 18316 / 18316 | In Progress | 1 |
| Crossvine Solar: 100 MW electrical generation nameplate in Dubois County, IN | 18313 / 18313 | In Progress | 1 |
| Nolin Hills Solar: 260 MW Approved-Plan Component; EIA Lists 300 MW Proposed Nameplate | 18297 / 18297 | Proposed | 2 |
| Duke Energy Asheville Energy Storage: 17.3 MW / 69 MWh Battery Under Construction in Arden, North Carolina | 15934 / 15934 | Completed | 1 |
| Alina Energy (Anila Solar): 200 MW Solar Plus 200 MW / 400 MWh Storage in Wilson County, Texas, Targeting 2028 | 15759 / 15759 | Proposed | 1 |
| Albemarle Beach Solar: 80-130 MW SunEnergy1 Solar Farm in Roper, North Carolina, Operating Since December 2020 | 15758 / 15758 | Completed | 1 |
| American Kings Solar: 123 MWac First Solar Plant in Kings County, California, Owned by Goldman Sachs | 15726 / 15726 | Completed | 1 |
| Alligator Creek Solar: 80-104 MW Data-Center-Backed Solar Farm in Wheeler County, Georgia, Targeted for End of 2026 | 15724 / 15724 | In Progress | 1 |
| Alfred Oaks Solar: 100 MW Solar and 20 MW Battery in Allegany County, New York, Planned for 2029 | 15723 / 15723 | Proposed | 1 |
| Alberta Solar: 3 MW Dominion Energy Solar Facility in Brunswick County, Virginia, Planned for 2026 | 15722 / 15722 | In Progress | 1 |
| Fleming Solar Farm: 188.5-235 MW Acciona Solar Plant in Fleming County, Kentucky, Under Construction for 2028 | 15718 / 15718 | In Progress | 1 |
| Accalia Point Solar: 221 MWp Westbridge Solar Project in Cameron County, Texas, Planned for 2029 | 15717 / 15717 | Proposed | 1 |
| Atlas Solar VI: 135 MWdc (100 MWac) Solar Phase of Atlas Energy Park in La Paz County, Arizona, Sold to Chrysalis Renewables | 15702 / 15702 | Completed | 1 |
| AES Armadillo Solar: 204 MW Solar Project Near Corsicana, Texas, Operational Target 2027 | 15697 / 15697 | In Progress | 1 |
| TransGrid Atlas VIII Battery Storage: 382.4 MW / 1,529.6 MWh in La Paz County, Arizona, Planned for 2026 | 15690 / 15690 | In Progress | 2 |
| Rosamond South II Energy Storage Project: 92 MW BESS in Kern County, California | 18494 / 18494 | In Progress | 1 |
| Black Walnut Solar: 80 MW Solar and Separate 32 MW Battery Proposal in Jones County, North Carolina | 18806 / 18806 | Proposed | 2 |
