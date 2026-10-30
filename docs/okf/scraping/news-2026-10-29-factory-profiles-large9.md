---
type: Log
title: "Large factory-profile batch 9 — 2026-10-29"
description: "Owner requested a large batch following the earlier five-profile production run. Added 25 new buildout profiles through authenticated admin APIs, production…"
tags: [scraping, factory-profiles]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-29T18:00:00Z }
---
# Large factory-profile batch 9 — 2026-10-29

Owner requested a large batch following the earlier five-profile production run. Added **25 new buildout profiles** through authenticated admin APIs, production first, and mirrored all 25 locally. No application deployment, build, restart or schema change occurred. Scheduled task limits were not changed.

All 50 final profile readbacks matched exactly. A final catalog check caught an existing ballpark project profile on pin 3347 after an opening-thread profile had been added to 2212. The new profile on 2212 was removed in both environments and exact original-pin preservation verified; it was replaced in the final batch with Eneus (15815). The existing 3347 profile was preserved. Every entry passed the real schema validator, pin citation-coverage check, and display threshold of at least three distinct sourced metric categories. Production identities were uniquely resolved by source URL and checked against titles. Existing profiles were checked absent before writes; no existing manual profile was replaced. All six radar scores remain null with explicit research gaps.

| Project | Local ID | Production ID | Profile stage |
| --- | --- | --- | --- |
| Ferrara's Orangeburg Candy Plant Starts First Production Lines | 3509 | 3509 | construction |
| Cypress Creek Steel River Energy Center: 2.5 GWdc Solar and 2.9 GWh Battery in Mississippi County, Arkansas, 4.5B USD, Google Offtake, Fully Operational by 2029 | 15885 | 15885 | construction |
| SB Energy PORTS-Pike Technology Campus Data Center: 4,250-8,000 MW IT (DOE Cites 10,000 MW), 33.3B USD Tied to Gas Power, Planned for 2028 in Pike County, Ohio | 16001 | 16001 | construction |
| Nscale Monarch Compute Campus: 1,350 MW Phase 1 (Cleanview 720 MW Buildings, 8 GW Plus Planned) in Mason County, West Virginia, 20B USD, Delivery Targeted for Early 2028 | 15831 | 15831 | announced |
| PointOne / CyrusOne Lee County Phase One: 90 MW IT, $900M, Early 2028 | 16482 | 16482 | announced |
| Aligned Project Phoenix: 2,000 MW Data Center Campus at Shippingport, Pennsylvania, 10B USD Investment | 15650 | 15650 | construction |
| Tract Pole Canyon Technology Park: 7B USD, 400-1,700 MW Data Center Park in Utah, Planned for 2028 | 15857 | 15857 | announced |
| Enbridge Cowboy Project Phase 1: 365 MW Solar and 200 MW / 1,600 MWh Battery for Meta Near Cheyenne, Wyoming, 1.2B USD, Online End of 2027 | 15893 | 15893 | construction |
| CyrusOne Yorkville Technology Campus: 600 MW, 1B+ USD, Under Construction in Kendall County, Illinois | 15809 | 15809 | construction |
| AVAIO Leo: 296-Acre Power Campus; Current Grid-Energization Target Q4 2027 | 16434 | 16434 | construction |
| Carlyle Fort Bliss Data Center: 2,500-3,000 MW Army Enhanced-Use-Lease Campus on 1,384 Acres Near El Paso, Texas, About 2B USD, Lease Not Final | 15798 | 15798 | announced |
| Arevon Avocet Energy Storage: 200 MW / 800 MWh Battery in Carson, California, Planned for 2027 | 15691 | 15691 | announced |
| Creekstone Delta Gigasite: 4,706-10,000 MW AI Data Center Campus in Millard County, Utah, Data Center Deliveries Planned From 2027 | 15812 | 15812 | announced |
| CleanArc VA1 Campus: 900 MW (Nearly 1 GW per Governor), Three-Building Data Center Campus in Caroline County, Virginia, 8.8B USD Total, First 300 MW Targeted for 2027 | 15800 | 15800 | construction |
| AVAIO Digital Appomattox Campus (Project Hercules): 3B USD, 300 MW, Planned in Appomattox County, Virginia | 15980 | 15980 | announced |
| Alpha Digital Campus: 2,000 MW Data Center and Power Campus in Reeves County, Texas, 49.7B USD Estimated | 15645 | 15645 | announced |
| Aligned Project Caprock: 540 MW, Six-Building Data Center Campus at Abernathy, Texas, 5B USD | 15680 | 15680 | construction |
| Prime Phoenix Avondale: 240 MW IT Campus, Five Buildings, $3B+ Investment | 16331 | 16331 | construction |
| Childersburg Industrial Park Data Center: 500 MW, 6B USD, Land Surplus Approved for Western Hospitality Partners in Talladega County, Alabama | 16012 | 16012 | announced |
| Aligned DFW-03 Data Center: 86.4 MW (72 MW IT) in Mansfield, Texas, 120.5M USD Building Cost Filed, Initial Capacity Targeted Q4 2025 | 15795 | 15795 | construction |
| Aligned DFW-04: 86 MW (Cleanview) AI Data Center for Lambda in Plano, Texas, 700M USD | 15734 | 15734 | construction |
| Ryan Companies Southwest Crossing Data Park: 687.5M USD, 400 MW, Approved by Eloy Council for Arizona's Pinal County | 16011 | 16011 | announced |
| Tract Buckeye Tech Corridor: 20B USD, 1,800 MW Data Center Park in Arizona, Approved 2024 | 15852 | 15852 | announced |
| Hecate Otter Creek Solar: 1 GW / $1B Coffey County Proposal | 16486 | 16486 | announced |
| Eneus Energy RGV Data Center: 14B USD, 1,000-2,000 MW, Planned in Cameron County, Texas | 15815 | 15815 | announced |

## Factual corrections and preservation

Two status corrections were applied and GET-verified in both environments:

- **Cowboy Phase One (15893): Completed → In Progress.** The operator's current Cowboy Solar I & II / BESS project page explicitly states under construction; its May 2026 partnership announcement forecasts service at end-2027. Physical work and future operation are distinct.
- **AVAIO Leo (16434): Proposed → In Progress.** The current operator project page explicitly reports groundbreaking. The profile uses its current 296-acre footprint, 570 MW grid-power plan and Q4 2027 energization target, rather than conflating them with the older 760-acre announcement and June 2027 forecast.

Three PinPower entries were sourced and verified in both environments, with notes distinguishing planned capacity and output:

- Steel River (15885): 2,500 MW **generation**, explicitly solar DC nameplate for all three phases, with separate 2.9 GWh storage. No operating generation or AC export is inferred.
- Cowboy (15893): 365 MW **generation**, repairing a title-derived storage classification. Separate battery capability is 200 MW / 1,600 MWh; the note identifies construction and the future service target.
- Otter Creek (16486): 1,000 MW **generation**, explicitly proposed photovoltaic capacity, with undisclosed AC/DC basis and annual generation recorded as gaps.

Separate final comparisons against pre-write snapshots verified preservation of original authors, all five English translation-source fields, prices/currencies, event dates, media, source URLs, parent links, existing references and unrelated manual tags. Reference merges used fresh whole-pin reads through the real API. No English translation-source text changed, so these updates did not require refreshing wholeTranslation hashes. Profile saves and power saves were independently checked for unrelated field changes.

The replay catalog now contains **273 profiles**, with all new entries matching their saved profiles exactly.

## Evidence and project scope

Thirty quoted HTTPS pages were opened. **116 quotations** matched normalized text downloaded from their pages; the other **nine quotations**, from Prime's Avondale release and the DCD Eneus report, were checked in the web reader because direct requests returned 403. The batch contains 125 sourced metric/milestone entries. Additional pages were read to check scope, later schedules and exclusions.

- Ferrara covers the Orangeburg plant: USD 675 million, 750,000 sq ft and projected jobs, with first lines expected in Q1 2029 and full opening later in 2029. Groundbreaking is demonstrated; future employment and opening are planned.
- Steel River distinguishes all three phases from Google's first-two-phase support. DC solar capacity and battery energy are different measures.
- PORTS-Pike uses DOE's 189-acre initial phase, projected workforce and March 20 groundbreaking. It does not promote DOE's broad 10 GW headline or the gas project's investment into a measured campus IT figure.
- Monarch separates 1.35 GW Phase One design from the conditional 8 GW-plus expansion path. PointOne Lee County is specifically the one-building 90 MW IT / USD 900 million Phase One; its fall-2026 construction forecast is not treated as proof of physical start.
- Project Phoenix uses Aligned's September 10 groundbreaking release, with regional investment and projected jobs. The supporting power station is not profiled as operating data-centre equipment.
- Tract Pole Canyon and Buckeye distinguish acquired land, unbuilt master plans and future utility capacity. No building-level opening date is invented where none is stated.
- Yorkville preserves the current site's stated site-work history and late-2027 first-building / 2028 full-operations forecasts. A proposed reduction of building area is not treated as an approved final floor plan.
- Fort Bliss remains a conditional Army agreement with a fiscal-year IOC forecast; the separate Dugway project is excluded.
- Avocet uses the City of Carson environmental filing for its 200 MW storage system, 6.96-acre site and equipment scope. A 2024 release's elapsed Q2 2026 target does not establish operation.
- Creekstone separates the more-than-1,100-acre data centre footprint from the separate 13,000-acre solar lease, and total master-plan capacity from phase IT load.
- CleanArc distinguishes USD 8.8 billion across the three-building campus from each approximately USD 2.93 billion building. Appomattox uses the newer March 2026 report's 2027–2028 initial-building construction plan.
- Alpha Digital's 2 GW is planned co-located generation, not current IT demand. Its first-power and large-generation forecasts remain conditional.
- Caprock distinguishes campus buildout from the Q1 2027 LBB-01 target. Prime distinguishes 240 MW campus IT, 144 MW first-phase IT and 250 MW substation capacity; the substation milestone does not complete the data centres.
- Childersburg distinguishes the land-surplus action, future workforce and proposed facility/buffer scope from an operating campus.
- Mansfield retains the published Q4 2025 initial-capacity target as historical, without inferring opening. Its groundbreaking report supplies September 30 without an explicit year, preserved in the profile. Plano excludes the article's apparent portfolio-scale 5,000 MW figure from facility capacity.
- Ryan Southwest Crossing distinguishes the described 855,000-sq-ft plan from the economic study's 1.25-million-sq-ft potential buildout cost basis. Otter Creek retains proposed status and generic MW basis. Eneus uses the developer-commissioned investment estimate, proposed acreage and data halls; the May pre-permitting/moratorium report establishes neither construction nor cancellation.

## Remaining candidates and specific gaps

Independent post-run queries return **489 raw production candidates** and **494 local candidates**. The two databases have existing coverage differences outside this batch. Raw lists include duplicates, non-build events and projects that do not yet have enough evidence; this batch does not complete the backlog.

- **Prometheus Casper / Natrona (15799) was excluded.** The opened October 28 report quotes the company's president confirming it is not moving forward in Natrona or Converse counties. Its proposed-stage record needs a separate cancellation/content maintenance pass, with translation synchronization if article text changes. Do not give it a normal announced/construction profile merely from September's plan. Source: https://cowboystatedaily.com/2026/10/28/prometheus-abruptly-drops-natrona-data-center-project-eyes-new-wyoming-locations/
- Gouldsboro (15820) needs reconciliation of its project scope and the August zoning judgment before a profile. Cameron County / Eneus (15815) has been profiled as announced; obtain a newer county permit reading before changing that stage or reconciling the reported IT/interconnection MW scopes.
- Conesville (15647) needs an opened project-specific current physical-work/operation source before reconciling the elapsed mid-2026 target and unverified tracker MW; it was excluded from the final batch.
- For master-planned data parks and future multi-building phases, add per-building pins when distinct named-building milestones are sourceable. The current batch does not allocate a programme cost among unidentified facilities.
- PointOne Lee, Monarch, Avocet, Otter Creek and Alpha need explicit physical-start or operation evidence before their next stage change. Published plans and elapsed targets are insufficient.
- Appomattox's current operator site uses a revised 436-acre footprint and a 2027 power target. The profile avoids repeating the older acreage; reconcile any pin acreage narrative in a dedicated sourced correction, with translations if edited.
- Several pins retain previously recorded total-price estimates not independently established by the pages used for these profiles (including Alpha and PORTS-Pike). Those prices were preserved; the profiles do not present them as newly sourced project-cost cards.

Earlier batch-specific evidence gaps remain outstanding.
