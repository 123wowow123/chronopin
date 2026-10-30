---
type: Log
title: "Factory/buildout profiles — third 100-pin batch, 2026-10-29"
description: "Applied 100 new profiles in production and mirrored the same 100 locally. All 200 final API readbacks matched the submitted profiles exactly. Authors,…"
tags: [scraping, factory-profiles]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-29T18:00:00Z }
---
# Factory/buildout profiles — third 100-pin batch, 2026-10-29

Applied 100 new profiles in production and mirrored the same 100 locally. All 200 final API readbacks matched the submitted profiles exactly. Authors, narrative text, media, dates, prices, source URLs, parent threads, existing references and unrelated manual tags were preserved. Only research references, the separate buildout/power records and explicitly evidenced status tags changed.

The replay catalog now contains 599 profiles. The 100 projects are 100 distinct EIA plant identities, with matching names, locations, technology and capacity. Existing-profile candidates and duplicate milestone/site records were excluded. Eight projects came from the previous priced production-gap scan; the others were found by researching the wider existing-pin inventory. Thirteen selected pins already had prices. Existing prices were preserved; EIA does not provide construction cost, so this batch does not claim to validate those budgets or invent budgets for unpriced pins.

Each profile has four sourced metric categories (capacity, equipment/scope, stage and schedule) and a dated operation milestone: 400 metric cards, 100 milestones and 500 attached evidence quotations. Profile stages: 43 construction, 49 announced, 7 commissioning, 1 production. All radar scores remain null with specific research gaps; capacity alone does not establish a manufacturing-capability score.

Research source: [EIA September 2026 preliminary monthly generator inventory](https://www.eia.gov/electricity/data/eia860m/xls/september_generator2026.xlsx), released October 23, 2026. A fresh download matched the previously parsed original workbook byte-for-byte (SHA-256 `bcef74e1af991680731aeecfda967f5950db4ce739bb584edd8b8774c7e6da17`). The source evidence retains original sheet names, row numbers and cell order. Quotes were checked verbatim against those retained cells, and published precision is preserved. The inventory is preliminary and its planned operation dates are estimates, not capacity commitments or achieved operation.

Validated 100 sourced power records in each environment: 82 generation and 18 battery-storage records. [Power manifest](../../../scripts/factories/power-2026-10-29-batch100c.json). MW means electrical nameplate generation or battery power as explicitly labeled; no battery duration, MWh, annual generation or annual site consumption was calculated. Solar and battery components of hybrid sites remain distinct. The 200-record annual-use audit found no existing energy records requiring correction.

Applied 75 status alignments per environment: 51 missing tags added (27 In Progress, 23 Proposed and one Completed), six Proposed changed to In Progress and 18 In Progress changed to Proposed because the EIA inventory explicitly says approvals pending/received and not under construction. Apple River's December 2025 operation is explicitly reported; testing/construction-complete entries remain In Progress until commercial service is documented. All status edits were read back, and pre-existing unrelated manual tags remain intact. No completion was inferred from elapsed forecasts.

Remaining raw gap candidates: 256 production / 261 local. A raw candidate still requires evidence and identity review. Source-specific gaps include construction cost, land/building area, employment, annual output and capability benchmarks; no source absence was converted into a fabricated figure. Selected component generator IDs are named in the profile so a battery phase does not inherit unrelated generation at the same station.

Validation included authenticated identity and duplicate preflight in both environments, schema/evidence checks, exact post-write profile and power readbacks, status checks, final preservation checks across all 200 pins and replay catalog consistency/whitespace checks. The five translated source-text fields were unchanged. Evidence, baselines, per-write receipts, research gaps and final verification remain under `.tmp/factory-100c-2026-10-29/`. No deployment was performed.

| Project | Production/local pin | EIA plant | Profile stage |
| --- | --- | --- | --- |
| Three Rivers Solar Power Project: 100 MW Clean Energy in Hancock County, Maine | 18428 / 18428 | 63386 | construction |
| SR Cordova Solar Farm: 100 MW Solar Center in Orangeburg County, South Carolina | 18400 / 18400 | 68555 | announced |
| Starfire Mountain Solar: 410 MW Solar Center in Perry County, Kentucky | 18389 / 18389 | 68369 | announced |
| Turkey Creek Solar Project: 200 MWac Solar Farm in Pueblo County, Colorado | 18317 / 18317 | 64744 | construction |
| Sweetleaf Clean Solar Energy Center: 125M USD, 93 MW Solar Farm in Halifax County, North Carolina | 18188 / 18188 | 68271 | announced |
| Foxtail Flats Clean Solar Energy Center: 215M USD, 170 MW Solar Farm in San Juan County, New Mexico | 18144 / 18144 | 69967 | construction |
| Boulder Solar III Clean Energy Center: 165M USD, 128 MW Solar Farm in Clark County, Nevada | 18115 / 18115 | 65141 | announced |
| Four Mile Mesa Clean Energy Storage Center: 115M USD, 100 MW BESS in San Juan County, New Mexico | 18088 / 18088 | 69966 | construction |
| Foxtrot Clean Solar Energy Project: 125M USD, 107 MWac Solar Facility in Jasper County, Missouri | 18070 / 18070 | 69481 | construction |
| Hinds Clean Solar Energy Center: 170M USD, 150 MWac Solar Facility in Hinds County, Mississippi | 18041 / 18041 | 67231 | construction |
| Foley Clean Solar Center: 120M USD, 80 MWac Solar Plant in Baldwin County, Alabama | 17332 / 17332 | 68002 | commissioning |
| Apple River Solar: 100 MW Geronimo Power Solar Farm in Polk County, Wisconsin, 116M USD | 15728 / 15728 | 69388 | production |
| Sunnyside Energy Center BESS: 40 MW Battery Storage in Dane County, Wisconsin | 18286 / 18286 | 68054 | construction |
| E.W. Brown Battery Energy Storage Center: 125 MW / 500 MWh BESS in Mercer County, Kentucky | 18800 / 18800 | 1355 | construction |
| Ninnescah Flats Solar Project: 202 MWac Solar in Pratt County, Kansas | 18771 / 18771 | 69879 | commissioning |
| Overnight Solar Project: 150 MWac Solar in San Bernardino County, California | 18736 / 18736 | 68932 | construction |
| Solway Solar Station: 50 MWac Solar in Beltrami County, Minnesota | 18699 / 18699 | 68340 | construction |
| Mills Solar Project: 50 MWac Solar in Mills County, Iowa | 18696 / 18696 | 70107 | construction |
| Little Trout Solar Project: 150 MWac Solar in Presque Isle County, Michigan | 18695 / 18695 | 67755 | commissioning |
| Goshen Solar Project: 163 MWac Solar in Goshen County, Wyoming | 18682 / 18682 | 67936 | announced |
| Cypress Harvest Energy Storage Facility: 200 MW / 800 MWh BESS in Iberville Parish, Louisiana | 18664 / 18664 | 69952 | announced |
| Atlas II Solar Project: 100 MWac Solar in La Paz County, Arizona | 18642 / 18642 | 69054 | commissioning |
| SR Tullahoma Solar Facility: 200 MWac Solar in Moore County, Tennessee | 18639 / 18639 | 68568 | construction |
| Stark Solar Project: 150 MWac Solar in Stark County, Ohio | 18626 / 18626 | 66672 | announced |
| Blue Jay Road Solar Project: 66 MWac Solar in Ralls County, Missouri | 18620 / 18620 | 68926 | construction |
| Tangelo Solar Project: 75 MWac Solar in Okeechobee County, Florida | 18615 / 18615 | 68828 | construction |
| Sandersville Solar Project: 50 MWac Solar in Washington County, Georgia | 18614 / 18614 | 67988 | announced |
| Cowboy Solar II Project: 365 MWac Solar in Laramie County, Wyoming | 18609 / 18609 | 69189 | announced |
| Parks Valley Battery Energy Storage System: 150 MW BESS in Hampshire County, West Virginia | 18606 / 18606 | 67874 | announced |
| Northern Divide Energy Storage Facility: 100 MW BESS in Burke County, North Dakota | 18605 / 18605 | 69809 | construction |
| Koshkonong Solar Energy Center: 300 MWac Solar in Dane County, Wisconsin | 18602 / 18602 | 69479 | construction |
| Beekman Solar Energy Center: 207 MWac Solar in Morehouse Parish, Louisiana | 18597 / 18597 | 69589 | construction |
| Sun Ridge Solar Project: 50 MWac Solar Facility in Rockingham County, Virginia | 18590 / 18590 | 67215 | construction |
| SR Puryear Solar Project: 50 MWac Solar Generation in Henry County, Tennessee | 18587 / 18587 | 68564 | construction |
| Lotus Solar Project: 75 MWac Solar in Darlington County, South Carolina | 18550 / 18550 | 68337 | announced |
| Border Basin Solar Center: 120 MWac Solar in Hancock County, Ohio | 18532 / 18532 | 68968 | construction |
| FRP Miller Energy Storage Project: 50 MW BESS in Duval County, Florida | 18528 / 18528 | 69626 | construction |
| Rumble Solar Facility: 250 MWac Solar in Grady County, Oklahoma | 18515 / 18515 | 69968 | construction |
| Panhandle Solar Center: 102 MWac Solar in Texas County, Oklahoma | 18514 / 18514 | 69969 | construction |
| Fiddle Leaf Solar Project: 80 MWac Solar in Delaware County, Oklahoma | 18512 / 18512 | 70271 | announced |
| Dawn Break Energy Storage Project: 180 MW BESS in Waushara County, Wisconsin | 18505 / 18505 | 69761 | announced |
| Caverns Solar Project: 75 MW Clean Energy in Jackson County, Florida | 18497 / 18497 | 68331 | announced |
| Turnpike Solar Project: 75 MW Clean Energy in Osceola County, Florida | 18477 / 18477 | 70223 | construction |
| Solstice Energy Storage Project: 200 MW BESS in Le Flore County, Oklahoma | 18469 / 18469 | 70186 | announced |
| SR Hope Hull Solar Farm: 80 MW Clean Energy in Montgomery County, Alabama | 18465 / 18465 | 68104 | announced |
| Pinecone Solar Energy Center: 75 MW Clean Energy in Calhoun County, Florida | 18464 / 18464 | 68825 | construction |
| Middle Lake Solar Energy Center: 75 MW Clean Energy in Madison County, Florida | 18463 / 18463 | 68824 | construction |
| Keene Branch Solar Project: 75 MW Clean Energy in Hillsborough County, Florida | 18462 / 18462 | 69461 | construction |
| Rollins Solar Project: 75 MW Clean Energy in Darlington County, South Carolina | 18443 / 18443 | 62295 | announced |
| Panton Solar Project: 50 MW Clean Energy in Addison County, Vermont | 18441 / 18441 | 68213 | announced |
| Crooked Trail Solar Project: 68 MW Clean Energy in Penobscot County, Maine | 18436 / 18436 | 68416 | announced |
| Bluebird Solar Project: 140 MW Clean Energy in Klickitat County, Washington | 18433 / 18433 | 69482 | announced |
| Weirs Creek Solar Project: 150 MW Clean Energy in Hopkins County, Kentucky | 18430 / 18430 | 69929 | construction |
| Warren Meadow Solar Project: 75 MW Clean Energy in Knox County, Maine | 18429 / 18429 | 65708 | announced |
| Laurens Solar Project: 150 MW Clean Energy in Laurens County, Georgia | 18426 / 18426 | 68480 | announced |
| Ironwood Solar Center: 168 MW Clean Energy in Yuma County, Arizona | 18425 / 18425 | 68397 | commissioning |
| SR Quincy Valley Solar: 130 MW Solar & 20 MW BESS in Grant County, Washington | 18414 / 18414 | 68252 | construction |
| SR Horus Solar Farm: 80 MW Solar Generating Plant in Simpson County, Kentucky | 18413 / 18413 | 68249 | construction |
| Red Butte Solar and Storage: 300 MW Solar & 300 MW BESS in Iron County, Utah | 18411 / 18411 | 68371 | announced |
| Notch Peak Solar: 324 MW Solar Center in Millard County, Utah | 18410 / 18410 | 64669 | announced |
| Highland Solar North: 75 MW Solar Facility in Highlands County, Florida | 18409 / 18409 | 64345 | announced |
| Drawhorn Solar Project: 80 MW Solar Center in Hancock County, Georgia | 18406 / 18406 | 67989 | announced |
| SR Middleton Solar Farm: 55 MW Solar Facility in Hardeman County, Tennessee | 18401 / 18401 | 68561 | construction |
| Rock Creek Solar: 150 MW Solar & 100 MW BESS in Clinton County, Iowa | 18399 / 18399 | 69540 | commissioning |
| Culpepper Solar Project: 75 MW Solar Facility in Darlington County, South Carolina | 18391 / 18391 | 62221 | announced |
| Sweet Sue Solar Project: 74 MWac Solar Facility in King William County, Virginia | 18390 / 18390 | 69474 | construction |
| SR Norwood Solar Farm: 107 MWac Solar Farm in Warren County, Georgia | 18388 / 18388 | 68563 | announced |
| SR Durhamville Solar Farm: 66 MWac Solar Farm in Haywood County, Tennessee | 18387 / 18387 | 68556 | announced |
| SR Copeland Solar Farm: 110 MWac Solar Plant in Cumberland County, Tennessee | 18386 / 18386 | 68099 | announced |
| High Noon Solar Energy Center: 300 MW Solar & 165 MW BESS in Columbia County, Wisconsin | 18383 / 18383 | 69480 | construction |
| Big Fork Solar Project: 75 MWac Solar Farm in Barnwell County, South Carolina | 18379 / 18379 | 62184 | announced |
| Raceway Solar Project: 50 MWac Solar Farm in Kent County, Delaware | 18377 / 18377 | 63846 | construction |
| Hornet Solar Project: 73 MWac Solar Farm in Gaston County, North Carolina | 18374 / 18374 | 64167 | commissioning |
| Cedar Creek Solar Project: 114 MWac Solar Farm in New Castle County, Delaware | 18373 / 18373 | 64543 | announced |
| B&K Solar Project: 75 MWac Solar Farm in Darlington County, South Carolina | 18371 / 18371 | 62181 | construction |
| SR Rochelle I Solar Project: 90 MW Solar Facility in Wilcox County, Georgia | 18366 / 18366 | 68253 | construction |
| Powell Solar Project: 56 MW Solar Facility in Crook County, Oregon | 18365 / 18365 | 67157 | announced |
| Mattaniah Solar Project: 52 MW Solar Facility in Polk County, Florida | 18363 / 18363 | 69523 | construction |
| Juniper Solar Project: 75 MW Solar Facility in Chesterfield County, South Carolina | 18362 / 18362 | 62234 | announced |
| Sunset Solar Project: 103 MWac Solar Facility in Wasco County, Oregon | 18354 / 18354 | 65326 | announced |
| SR Bacon II Solar Project: 115 MW Solar Facility in Bacon County, Georgia | 18353 / 18353 | 68553 | announced |
| Cabokenze Energy Storage: 76 MW BESS in Burke County, Georgia | 18346 / 18346 | 69823 | announced |
| Walker Solar Project: 80 MW Solar Farm in Juniata County, Pennsylvania | 18341 / 18341 | 70364 | construction |
| Conez Solar Project: 150 MW Solar Facility in Emanuel County, Georgia | 18337 / 18337 | 66671 | announced |
| Coggon Solar Project: 100 MWac Solar Farm in Linn County, Iowa | 18329 / 18329 | 68939 | construction |
| Canyonland Solar Project: 140 MWac Solar Farm in Montezuma County, Colorado | 18328 / 18328 | 64857 | announced |
| Parowan Energy Storage Project: 58 MW BESS in Iron County, Utah | 18323 / 18323 | 65823 | announced |
| Beartooth Energy Storage Project: 50 MW BESS in Yellowstone County, Montana | 18319 / 18319 | 65407 | announced |
| Harvey Solar Project: 350 MWac Solar Farm in Licking County, Ohio | 18318 / 18318 | 69796 | announced |
| Voyager Battery Energy Storage Facility: 100 MW BESS in Washtenaw County, Michigan | 18311 / 18311 | 68426 | construction |
| Powerline Battery Energy Storage System: 100 MW BESS in Citrus County, Florida | 18310 / 18310 | 69356 | construction |
| Plant Hammond Battery Energy Storage System: 57.5 MW BESS in Floyd County, Georgia | 18309 / 18309 | 708 | construction |
| Salmonfly Solar and Energy Storage Center: 247 MWac Solar and 247 MW BESS in Jefferson County, Oregon | 18298 / 18298 | 68370 | announced |
| Gale 1 Solar Center: 300 MWac Solar Farm in Millard County, Utah | 18294 / 18294 | 61170 | announced |
| Carriger Solar Project: 160 MWac Solar and 63 MW BESS in Klickitat County, Washington | 18290 / 18290 | 67653 | announced |
| Edgewater Battery Energy Storage System: 99 MW BESS in Sheboygan County, Wisconsin | 18283 / 18283 | 4050 | construction |
| Dega Solar and Storage: 200 MW Battery / 200 MW Solar EIA Plan | 16601 / 16601 | 68332 | announced |
| Centralia BESS: 200 MW EIA Plan, December 2028 Target | 16588 / 16588 | 68282 | announced |
| Mineral Basin Solar: 401.6 MW NYISO Request Targets December 2029 | 16496 / 16496 | 67378 | announced |
| Avant Prairie ESS Battery: 16-201.72 MW in Freestone County, Texas, Planned for 2028-2029 | 15935 / 15935 | 68349 | announced |
