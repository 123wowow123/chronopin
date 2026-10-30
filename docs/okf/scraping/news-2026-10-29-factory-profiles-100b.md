# Factory/buildout profiles — second 100-pin batch, 2026-10-29

Applied 100 new profiles to production and the same 100 locally. All 200 final API readbacks matched the submitted profiles exactly. Original authors, narrative text, media, dates, prices, source URLs, thread parents and unrelated manual tags were preserved. Added research references remain alongside existing references.

The replay catalog now contains 499 profiles. This batch contains 357 sourced metric cards and 106 dated milestones: 49 announced, 36 construction, 1 commissioning, 10 production, 4 offline. All six radar axes remain null because no documented scoring cohort/capability supported scores.

Validated 58 sourced power records in each environment: 48 generation and 10 battery-storage power records. The companion [power manifest](../../../scripts/factories/power-2026-10-29-batch100b.json) preserves capacity, period, scope, kind and source notes. Planned nameplate capacity is not presented as current production; batteries distinguish power from energy, nuclear ratings distinguish historical/design/current periods, and solar generation is separated from data-center consumption. Removed Homer City's calculated 23,652 GWh annual-use record in both environments: multiplying generating capacity by an assumed load factor did not establish site electricity use.

Applied and read back 22 construction-status corrections in each environment: 19 to In Progress and three to Completed (the original Tesla Nevada factory, the documented Mosul dam rehabilitation, and Three Gorges power-station construction). Completion was based on explicit evidence, never an elapsed target date. Conflicting physical-stage claims on Conesville, New Florence, Allen and Arkansas Cypress were retained as research gaps rather than forced status downgrades. São Paulo Line 17's partial/transitional operation does not establish completion of every construction scope, so its existing status was retained.

Research used opened project/operator/regulator sources, EIA's September 2026 preliminary generator workbook (released October 23), archived project documents and the public Pennsylvania tracker records. EIA records were matched by plant identity, state and county; separate generators and batteries remain distinct. Forecasts are labeled as such. Tracker narratives explicitly identify modeled costs, marketed versus secured power, land purchases versus construction budgets and limited public project detail. Silver Star's federal initiation notice contains inconsistent battery-power descriptions, recorded explicitly rather than resolved by assumption. Bruce A covers two generating units at one station, not two separate plants; later major-component replacement works are excluded. Campus-level data-center profiles describe one identified site.

Five initial candidates already had production profiles (15834, 15836, 15671, 16002, 15646). Preflight stopped before writes; they were replaced, leaving exactly 100 new production profiles. Shared-source reactor identities were verified by pin ID plus exact title/source URL. No deployment was performed. The five translated source-text fields were unchanged, so these updates do not invalidate their translation source hashes.

Post-batch raw gap scans: 264 production / 269 local. These are candidates requiring research, not automatically verified eligible projects. One of this batch’s 100 new profiles (Lonesome Camp) had no published price and was outside the priced-construction gap scan, so the raw priced gap decreased by 99.

Validation: production/local schema and evidence checks before mutation; exact factory readbacks; separate power and status readbacks; final content/reference preservation checks; replay catalog validation and git diff whitespace checks. Evidence, baselines, per-write receipts and final verification are retained under `.tmp/factory-100b-2026-10-29/`.

| Project | Production/local pin | Profile status |
| --- | --- | --- |
| Morel Energy Storage Complex: 220M USD, 200 MW BESS in Moffat County, Colorado | 17116 / 17116 | announced |
| Deep Space Clean Solar Farm: 320M USD, 300 MWac Photovoltaic Facility in Kiowa County, Colorado | 17125 / 17125 | announced |
| Peach Wood Clean Solar Center: 280M USD, 261 MWac Photovoltaic Plant in Mitchell County, Georgia | 17126 / 17126 | announced |
| Stagecoach LRE Clean Solar Project: 250M USD, 230 MWac Solar Plant in Pueblo County, Colorado | 17346 / 17346 | announced |
| Freedom Pine Clean Solar Center: 280M USD, 250 MWac Solar Project in York County, Maine | 17164 / 17164 | announced |
| Mill Point Clean Solar Energy Center: 325M USD, 250 MW Solar Farm in Montgomery County, New York | 18174 / 18174 | announced |
| Oso Negro Clean Energy Storage Facility: 115M USD, 100 MW BESS in Bernalillo County, New Mexico | 18108 / 18108 | announced |
| Penton Clean Solar Plant: 210M USD, 190 MWac Solar Facility in DeSoto County, Mississippi | 18046 / 18046 | announced |
| Spring Valley Clean Solar Center Phase 2: 240M USD, 200 MWac Solar Facility in Colbert County, Alabama | 17334 / 17334 | announced |
| Sherco Battery Energy Storage Project: 600 MW BESS in Sherburne County, Minnesota | 18415 / 18415 | construction |
| Scopus Clean Solar Energy Center: 220M USD, 200 MWac Solar Facility in Bollinger County, Missouri | 18071 / 18071 | announced |
| Vichy Clean Solar Energy Center: 220M USD, 200 MWac Solar Facility in Maries County, Missouri | 18073 / 18073 | announced |
| Big Elk Clean Solar Energy Center: 135M USD, 100 MW Solar Farm in Washington County, Nebraska | 18094 / 18094 | announced |
| Rock House Clean Solar Facility: 270M USD, 250 MWac Solar Project in McDuffie County, Georgia | 17127 / 17127 | announced |
| Alabama Creek Clean Solar Farm: 120M USD, 80 MWac Solar Project in Dallas County, Alabama | 17331 / 17331 | announced |
| Corazon Clean Energy Storage Center: 165M USD, 150 MW BESS in Bernalillo County, New Mexico | 18074 / 18074 | construction |
| Romero Energy Storage Center: 250M USD, 225 MW BESS in Maricopa County, Arizona | 17118 / 17118 | construction |
| Chalk Bluff Clean Solar Center: 460M USD, 450 MWac Solar Project in St. Francis County, Arkansas | 17322 / 17322 | construction |
| Blacks Creek Clean Solar Center: 420M USD, 400 MWac Solar Plant in Ada County, Idaho | 17138 / 17138 | construction |
| SR Magnolia Clean Solar Farm: 180M USD, 160 MWac Solar Facility in Monroe County, Mississippi | 18050 / 18050 | construction |
| Cunningham Solar II Clean Energy Center: 240M USD, 196 MW Solar Farm in Lea County, New Mexico | 18143 / 18143 | announced |
| Pioneer Clean Energy Solar Project: 320M USD, 300 MWac Photovoltaic Center in Yuma County, Arizona | 17152 / 17152 | construction |
| White Tank Energy Storage Project: 100 MW BESS in Maricopa County, Arizona | 18312 / 18312 | construction |
| Atlas Solar IV Clean Energy Center: 320M USD, 300 MWac Photovoltaic Plant in La Paz County, Arizona | 17150 / 17150 | commissioning |
| Mammoth South Clean Solar Energy Center: 330M USD, 300 MWac Photovoltaic Plant in Pulaski County, Indiana | 17141 / 17141 | construction |
| Star Light Energy Center: 115M USD, 100 MW BESS in Valencia County, New Mexico | 18089 / 18089 | construction |
| Buena Vista Energy Center III: 115M USD, 100 MW BESS in Otero County, New Mexico | 18086 / 18086 | construction |
| Emmons-Logan Clean Energy Storage Center: 160M USD, 140 MW BESS in Emmons County, North Dakota | 18178 / 18178 | construction |
| Windy Lane Clean Solar Energy Center: 120M USD, 90 MW Solar Farm in De Baca County, New Mexico | 18146 / 18146 | construction |
| Dry Land Prairie Energy Storage Center: 260M USD, 250 MW BESS in Cheyenne County, Colorado | 17114 / 17114 | construction |
| Arroyo Clean Solar Energy Center: 350M USD, 335 MWac Photovoltaic Center in Pueblo County, Colorado | 17124 / 17124 | construction |
| Dry Lake East Clean Energy Center: 260M USD, 200 MW Solar Farm in Clark County, Nevada | 18095 / 18095 | construction |
| Blue Moon Solar Project: 70 MWac Solar Farm in Harrison County, Kentucky | 18380 / 18380 | construction |
| NextEra Singer Solar: 200–300 MW Source Discrepancy; $350M Published Investment | 16322 / 16322 | construction |
| Arkansas Cypress Solar: 600 MW Solar and 350 MW Battery in Jefferson County, Arkansas, 1.6B USD | 15655 / 15655 | announced |
| Taft Energy Storage Facility: 200 MW BESS in Worcester County, Massachusetts | 18416 / 18416 | construction |
| BD Solar Auburn: 14.6 MW Approved, 5 MW Now Listed, Solar Array at the Port of Auburn, Maine, Targeted for 2028 | 15766 / 15766 | announced |
| Bellefield Clean Energy Storage Farm Phase 2: 500M USD, 500 MW BESS in Kern County, California | 17092 / 17092 | construction |
| Lonesome Camp Solar Plant: 75 MW Clean Energy in Osceola County, Florida | 18488 / 18488 | construction |
| Rogun Dam Targets Completion as World's Tallest | 2623 / 2623 | construction |
| Mont Cenis Base Tunnel Opens | 423 / 423 | construction |
| Homer City's Gas-Fired Data Center Campus Targets First Power in Late 2027 | 5514 / 5514 | construction |
| Golden Gate Bridge District Approves Final $1BN Seismic Retrofit Phase | 628 / 628 | announced |
| Abu Dhabi Starts Building a 5.2 GW Solar Plant With 19 GWh of Batteries | 5490 / 5490 | construction |
| Embalse Resumes Commercial Operation After Life Extension | 19762 / 19762 | production |
| Browns Ferry Unit 1 Returns to Commercial Operation After 22 Years | 19726 / 19726 | production |
| Three Mile Island Unit 1 Begins Commercial Operation | 19694 / 19694 | offline |
| Three Mile Island Unit 2 Begins Commercial Operation | 19695 / 19695 | offline |
| Palisades Begins Commercial Operation | 19708 / 19708 | offline |
| Compass Meridian Data Center Campus Construction | 19241 / 19241 | construction |
| University of Michigan–Los Alamos Research Computing Center Plans | 19244 / 19244 | announced |
| QTS Cedar Rapids: Planned $10 Billion, Seven-Building Data Center Campus | 16309 / 16309 | announced |
| NextEra High Spring Solar: 530M USD, 400 MW Solar Project in Muskogee County, Oklahoma, Targeted for December 2027 | 15879 / 15879 | announced |
| Huajin Aramco's Panjin Refinery and Petrochemical Complex Starts Up | 3019 / 3019 | construction |
| Roccasecca BESS: 127 MW / 506 MWh Energy Storage Center in Clark County, Nevada | 18403 / 18403 | construction |
| ARES Nevada Gravity Rail Storage: 55M USD, 44-50 MW Storage Plant near Pahrump, Nevada, Targeted for 2027 | 15752 / 15752 | construction |
| Hudson Yards | 150 / 150 | construction |
| Stak Proposes North Slope Data Center; Latest Estimate Exceeds US$10 Billion | 15846 / 15846 | announced |
| Aligned CMH-02 Conesville: 346 MW Data Center Campus in Coshocton County, Ohio, 2.7B USD Estimated | 15647 / 15647 | announced |
| Adams Fork Harless Data Center Energy Campus: 2,457 MW Off-Grid Gas-Powered Campus in Mingo County, West Virginia | 15643 / 15643 | announced |
| Gouldsboro Data Center Campus: 14.25B USD, 1,500 MW Planned in Lackawanna County, Pennsylvania | 15820 / 15820 | announced |
| AWS Threemile Exascale Campus: Up to 1,000 MW, 16-20 Data Centers on About 1,300 Acres Near Boardman, Oregon, 8-12B USD Estimate, Land Bought April 2026 for 37M USD | 15797 / 15797 | announced |
| Prometheus Hyperscale Casper Data Center (Falls Ranch): 1,250-1,500 MW Gas-Powered Campus in Natrona County, Wyoming, 16B USD Estimate | 15799 / 15799 | announced |
| Google New Florence: New Data Center Within $15B Missouri Infrastructure Investment | 16343 / 16343 | announced |
| Eagle Rock Pine Ridge Technology Park: 900 MW Data Center Campus on 291.5 Rezoned Acres, Twiggs County, Georgia, 5B USD per Site Application, Residents Suing | 15813 / 15813 | announced |
| Riverview Tonawanda:300 MW,500000 Sqft Proposal; Site Review Delayed June 2026 | 16400 / 16400 | announced |
| Metrobloks Martindale-Brightwood Data Center Proposal | 19211 / 19211 | announced |
| South Ripley Clean Solar Energy Center: 350M USD, 270 MW Solar Farm in Chautauqua County, New York | 18175 / 18175 | announced |
| AWS Susquehanna Nuclear Data Center Campus (Cumulus): 960 MW Co-Located Nuclear Compute Site | 18966 / 18966 | construction |
| PNK Valley View: 1,600 MW 44.5-Acre Data Center Campus in Lackawanna County | 19025 / 19025 | announced |
| 4-3 Salem Township: 3,500 MW 4,000-Acre Data Center Campus in Luzerne County | 19033 / 19033 | announced |
| Project Green Mountain: 1,600 MW 270-Acre Data Center Campus in Lackawanna County | 18994 / 18994 | announced |
| Atlas Industrial South Whitehall: 725 MW 410-Acre Data Center Campus in Lehigh County | 18997 / 18997 | announced |
| Conshohocken Data Center: 66-Acre Data Center Campus in Montgomery County | 18984 / 18984 | announced |
| Switch Data Center at Former Pitt Race Complex: 382-Acre Data Center Campus in Beaver County | 19012 / 19012 | announced |
| Fairview Crossroads Data Center: 84-Acre Data Center Campus in York County | 18973 / 18973 | announced |
| Sugarloaf Township Data Center: 185-Acre Data Center Campus in Luzerne County | 18982 / 18982 | announced |
| Calpine Peach Bottom: 828 MW Data Center Campus in York County | 19040 / 19040 | announced |
| Fezzik Aliquippa: 496 MW 86-Acre Data Center Campus in Beaver County | 19004 / 19004 | announced |
| Meta Hyperion AI Data Center Campus: 2,000 MW, $10B+ Frontier Cluster in Richland Parish, Louisiana | 18979 / 18979 | construction |
| Start Campus Sines Data Campus: 233 MW / 541K H100e Frontier AI Data Center Cluster in Sines | 19062 / 19062 | construction |
| Vantage TX1: 128 MW / 155K H100e Frontier AI Data Center Cluster in San Antonio | 19057 / 19057 | announced |
| Fort Covington Clean Solar Energy Center: 325M USD, 250 MW Solar Farm in Franklin County, New York | 18169 / 18169 | announced |
| Garnet Clean Solar Energy Center: 265M USD, 200 MW Solar Farm in Cayuga County, New York | 18172 / 18172 | announced |
| São Paulo Metro's Line 2-Green Set to Reach Penha in 2028 | 2279 / 2279 | construction |
| Cablebús Line 4 Finished Between Tlalpan and Coyoacán | 2287 / 2287 | construction |
| São Paulo's Line 17-Gold Monorail Opens to Congonhas Airport | 2276 / 2276 | production |
| Inside Tesla's $5 Billion Gigafactory - Visual Capitalist | 105 / 105 | production |
| Nord Stream 2 Pipeline Finishes Construction | 2637 / 2637 | offline |
| Iraq Awards Italy's Trevi the Contract to Repair Mosul Dam | 6117 / 6117 | production |
| Regent Terrace — Philadelphia affordable housing | 7097 / 7097 | production |
| UC San Diego adding 3,310 dorm beds to deal with growth, housing shortage, | 209 / 209 | announced |
| Allen aeroderivative addition — under construction | 14049 / 14049 | announced |
| State Water Board Votes on Sites Reservoir's Final Water Right Permit | 4915 / 4915 | announced |
| Shimane Unit 2 Resumes Commercial Operation | 19749 / 19749 | production |
| Onagawa Unit 2 Returns to Commercial Operation | 19741 / 19741 | production |
| Bruce A Completes the Two-Unit Restart Programme | 19755 / 19755 | production |
| Construction of China's Three Gorges Dam Formally Begins | 6112 / 6112 | production |
| Crane Clean Energy Center Targets 2027 Restart | 2628 / 2628 | construction |
| Leeward Silver Star Solar 1: 517-650 MW Solar with 650 MW Battery, 1B USD, in Nye County, Nevada, Planned for 2028 | 15940 / 15940 | announced |
