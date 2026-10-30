---
type: Log
title: "Large factory-profile batch 10 — 2026-10-29"
description: "Owner requested another large batch and then said go while it was running. Added 25 new buildout profiles on production, mirrored all 25 locally, and…"
tags: [scraping, factory-profiles]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-29T18:00:00Z }
---
# Large factory-profile batch 10 — 2026-10-29

Owner requested another large batch and then said “go” while it was running. Added **25 new buildout profiles on production**, mirrored all 25 locally, and verified all **50 exact profile readbacks**. No deployment, build, restart or schema change occurred. Scheduled job limits were unchanged.

Every profile passed the real schema validator, pin citation coverage and at least three distinct sourced metric categories. All six radar scores remain null with specific research gaps. Production identities were uniquely resolved by source URL and checked against titles; all selected profiles were absent before writes. Catalog keys, pin identities and project names were checked against the existing catalog before saving. Existing manual profiles were preserved.

| Project | Local ID | Production ID | Stage |
| --- | --- | --- | --- |
| RWE Elliot Battery Storage: 200 MW BESS, 200M USD, Approved by Vanderburgh County, Indiana, to Run by November 2031 | 15867 | 15867 | announced |
| Oak Run Solar: 1 Billion USD, 800 MW Solar and 300 MW Battery in Madison County, Ohio, Permit Reapproved in September 2026 | 15881 | 15881 | announced |
| Clenera Blackwater Solar: 500-800 MW Solar Farm in Sussex County, Virginia, About 1.1B USD, Approved After 2024 Denial, Targeted for 2030 | 15874 | 15874 | announced |
| Aligned Project Star: 864 MW Data Center Campus in Coal City, Illinois, 15.1B USD Total Investment | 15670 | 15670 | announced |
| Vista Sands Solar: 1,200-1,315.6 MW Solar and 300 MW Battery in Portage County, Wisconsin, Nearly 2 Billion USD, Targeted for 2028 | 15889 | 15889 | announced |
| Jupiter Power Trimount: 700 MW / 2,800 MWh Battery at the Former Exxon Terminal in Everett, Massachusetts, 500M+ USD | 15660 | 15660 | announced |
| Alabama Solar Park: 130 MW Solar Project in Genesee County, New York, 117M USD, Planned for 2028 | 15720 | 15720 | announced |
| Antelope Data Center: 68.21B USD, 420-1,500 MW, First Phase Planned for 2028 in Iron County, Utah | 15979 | 15979 | announced |
| IREN Project Emerald: 1,200-1,600 MW AI Data Center Campus on 2,000 Acres Near Kiowa, Oklahoma, 50B USD in Two Phases, Tax Districts Tabled in June 2026, Power From 2028 | 15827 | 15827 | announced |
| Zenith Volts Roswell Data Center: 1,250-1,300 MW Off-Grid Campus 20 Miles South of Roswell, New Mexico, 11.7B USD, Targeted for November 2027 | 15866 | 15866 | announced |
| Ranger Power Beavertail Solar: 650M USD, 400 MW Solar Project Under Construction in Henry County, Missouri, Due 2027 | 15872 | 15872 | construction |
| NV Energy Sierra Solar: 1.5B USD, 400 MW Solar With 1,600 MWh Battery in Churchill County, Nevada, Due April 2027 | 15884 | 15884 | construction |
| Swenson Ranch Solar: 900M USD, 600 MW Solar for Meta in Stonewall County, Texas, Planned for 2027 | 15888 | 15888 | announced |
| Invenergy Tip Top Solar: 110 MW, $200M Investment, Target End-2026 | 16319 | 16319 | construction |
| Greenbacker Cider Solar Farm: 500 MWac (674 MWdc) in Genesee County, New York, 950M USD, Under Construction for Late 2026 | 15878 | 15878 | construction |
| Oppidan 5MW Temple Data Center: 5 MW, 31M USD, 61,554 sq ft in Bell County, Texas, Registered for October 2026 | 15771 | 15771 | announced |
| CloudBurst San Marcos Gigacenter: 1,200 MW Gas-Powered Data Center Campus in Hays and Guadalupe Counties, Texas, 14.5B USD, First 50 MW Due Q4 2026 | 15824 | 15824 | construction |
| AWS Wallula Gap (Amazon Attalia) Data Center Campus: 4.8B USD, Up to 1,200 MW (Tracker Estimate), Planned in Walla Walla County, Washington | 15981 | 15981 | announced |
| Project Red Clay Data Center: 1-1.5B USD, 1,500 MW, Planned in Lowndes County, Alabama | 15838 | 15838 | announced |
| Nebo North (Project Nebo) Data Center: 750 MW Campus Near Mona, Utah, 10B USD, Conditional Use Permit Approved April 2026 | 15845 | 15845 | announced |
| Prologis Project Sail: Roughly 900 MW, Nine-Building Data Center Campus on 829 Acres Near Newnan, Georgia, 17B USD Investment Cited, Rezoning Approved April 2026 | 15839 | 15839 | announced |
| Prologis Shelbyville Data Center: Up to 900 MW (Cleanview Estimate), 11-13 Buildings on 429 Acres in Shelby County, Indiana, Up to 2B USD, Council Approved April 2026 | 15840 | 15840 | announced |
| Redstone concentrated solar power — operational | 14054 | 14054 | production |
| Bash wind farm — operational | 14060 | 14060 | production |
| Dzhankeldy wind farm — operational | 14061 | 14061 | production |

## Verification and preserved content

All 50 final profile comparisons passed against separate production/local pre-write baselines. Original authors, all five English translation-source fields, event dates, prices/currencies, media, source URLs, parent links, existing references and unrelated manual tags were preserved. Fresh whole-pin reads preceded reference merges through the real API. No translation-source text was changed; no wholeTranslation refresh was required by this batch.

The replay catalog now contains **299 profiles**, including these 25 exactly matching saved profiles. Thirty-nine quoted HTTPS pages were opened. Of 125 metric/milestone citations, 119 quotes matched normalized downloaded page text and six from the Oppidan filing report were checked in the web reader after direct requests were blocked. PDF evidence was extracted and relevant report pages rendered for scope checks, including Project Star’s annotated building-count note and Redstone’s achieved operation month and separate annual-output design forecast.

## Sourced generation records

Twelve PinPower generation entries were updated in each environment, with **24 verified readbacks** and checks that profile and pin fields were preserved:

- Oak Run (15881): 800 MW solar generation, repairing storage classification; separate 300 MW battery power.
- Vista Sands (15889): PSC application scope of 1,315.6 MWac solar, repairing storage classification; separate 300 MW battery. Operator’s 1.2 GW marketing scope is recorded distinctly.
- Sierra Solar (15884): 400 MW solar generation, repairing storage classification; separate 1,600 MWh battery. Battery completion does not establish whole-project completion.
- Blackwater (15874): the dated WHRO proposal reports 500 MW generation. The operator FAQ describes 600 MWac transmission potential; the final permitted nameplate remains an explicit gap, and no operating generation is asserted.
- Alabama Solar (15720): proposed 130 MW; Beavertail (15872): 400 MW under construction; Swenson Ranch (15888): planned 600 MW; Tip Top (16319): current developer 110 MW scope under construction. Notes preserve the relevant proposed/construction status and exclude unrelated portfolio or historical scopes.
- Cider (15878): 500 MW project schedule scope, with about one million MWh/year expected output separately identified as a forecast.
- Redstone (14054): 100 MW operating electrical CSP nameplate, achieved commercial operation in May 2025; NDB’s 491 GWh/year design expectation is not measured annual output.
- Bash (14060) and Dzhankeldy (14061): 500 MW each, operating per explicit contractor statements. The combined programme’s 3.59 TWh/year forecast is not allocated between the plants.

No construction status tags or numeric pin prices were changed in this batch. Completion of Redstone, Bash and Dzhankeldy follows explicit operation evidence rather than elapsed forecast dates.

## Scope decisions

- Elliot remains in development: the county agreements impose an end-2029 groundbreaking deadline and November-2031 latest operating forecast. They do not prove construction has started.
- Oak Run uses September permit reapproval after court remand; agricultural requirements are project features, not invented capability scores.
- Blackwater’s county update lists approval with pending plan submission. Older 500 MW, later 600 MWac transmission potential and legacy 800 MW title scopes are not collapsed into a synthetic rating. The profile clearly identifies the dated 500 MW proposal and the unresolved final scope.
- Project Star’s July economic report states USD 15.1 billion including developer buildings and tenant equipment. Its red annotation distinguishes ADC’s nine-building designation from the analyst’s five interpreted footprints; the profile retains gross area without selecting an unsupported count. Modelled 2027–2033 construction is a forecast.
- Trimount’s battery power/energy and project/storage footprints are separated. Site remediation and regulatory clearance do not alone establish battery installation or operation.
- Alabama Solar’s 2,000 acres under agreement are distinct from its approximately 550-acre solar footprint. The project is in New York, not Alabama state.
- Antelope keeps the county-reported combined energy/data centre capital estimate and direct jobs, without converting on-site gas capacity to IT demand.
- IREN Emerald uses the operator’s 1.6 GW, approximately 2,000-acre campus and 2028 power ramp, excluding the global 4.5 GW portfolio figure.
- Zenith Volts uses the developer’s 300-acre, 1.25-GW-plus capacity and November-2027 target. These are announced designs, not installed capacity.
- Beavertail, Sierra, Tip Top and Cider have explicit physical-work evidence. Published service forecasts remain planned.
- Oppidan Temple uses the filing report’s rounded floor area and original schedule, without inferring opening from the elapsed October 2026 target.
- CloudBurst separates the initial 50 MW target from full-campus buildout. Amazon Attalia uses the current 134-acre application parcel and three 220,000-sq-ft buildings, rather than the much larger land transaction. Application completeness is not development approval.
- Red Clay’s 1,500 MW is a utility request, not awarded IT capacity. Nebo, Sail and Shelbyville remain proposed/announced despite application or rezoning progress.
- Redstone annual output is an earlier design forecast; the later NDB evaluation explicitly supplies the achieved May-2025 commercial-operation month. Bash and Dzhankeldy have separate per-plant costs and capacities, not an allocated share of a programme total.

## Remaining candidates and evidence gaps

Independent post-run candidate queries returned **463 production** and **468 local** raw gaps. Existing environment coverage differs outside this batch. Raw candidates include duplicates, non-build events and unresolved projects; this batch does not complete the backlog.

- West Gardner’s primary URL is unavailable; obtain current operator or county project documents before profiling.
- Silver Star’s current environmental/permitting pages were not reliably readable. Resolve present scope and environmental schedule before adding a profile.
- Crusoe Warrenton: the municipal bond plan distinguishes equipment acquisition/refresh financing from buildings and land. Confirm project-specific current physical work before reconciling the In Progress tag and the early-2027 equipment schedule. Do not treat the USD 85 billion bond ceiling as construction cost.
- Aligned ORD-03 Northwest Point: the Daily Herald report gives 520,000 sq ft per building, while DCD’s headline uses a larger campus number. Current operator listing does not alone establish construction or operation. Reconcile before profiling or altering tags.
- Excelsior: the operator’s pre-construction notice is a forecast. EIA report URLs redirected to the electricity landing page on opened reads; search-index snippets were excluded as evidence. Obtain the actual current generator file or an opened physical-work report before stage changes.
- QTS Cedar Rapids document retrieval was blocked. GW Ranch needs independently verified building-specific scope rather than campus power allocation; no split of its total into assumed per-building costs was made.
- Blackwater and Vista Sands require reconciliation of final permitted versus marketed capacities. No annual generation figures were invented for projects where they were not published in the opened sources.
- Existing forecast dates, title MW estimates and prices omitted from a new profile remain separate future maintenance work where the evidence is insufficient. They were not silently promoted to newly sourced metric cards.

Earlier batch-specific gaps remain outstanding.
