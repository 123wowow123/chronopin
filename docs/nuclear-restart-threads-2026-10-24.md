# Nuclear restart threads — October 24, 2026

Content maintenance through authenticated admin and native pin APIs, in local and production environments. No deployment or production VM work.

## Coverage

Full coverage of currently announced U.S. commercial-reactor restarts following retirement: Crane/Three Mile Island Unit 1 (the existing 11-pin thread), Palisades and Duane Arnold. PNNL’s September 3, 2026 [restart review](https://www.pnnl.gov/news-media/us-nuclear-power-plant-restarts-gain-momentum-pnnl-support), DOE project releases, operator updates and October reporting were checked for the current U.S. pipeline. The selection also adds the historical U.S. long-shutdown recovery programmes at Browns Ferry and Sequoyah. These earlier outages are distinguished from the unprecedented U.S. return from the formal decommissioning process.

International coverage is a selection of comparable long-shutdown or refurbishment restarts, with planned returns distinguished from completed operation. It does not claim every worldwide restart or routine refuelling outage. Sites: Kashiwazaki-Kariwa Unit 6, Onagawa Unit 2 and Shimane Unit 2 (Japan); Bruce A Units 1 and 2 (Canada); Metsamor Unit 2 (Armenia); Embalse (Argentina); Maanshan and Kuosheng (Taiwan); Kori Unit 2 (South Korea).

The expansion adds 13 plant threads containing 68 milestones: 65 new pins and three existing records. Together with Three Mile Island, the collection covers 14 plant histories and 79 milestones. Existing Palisades 5506, Duane Arnold 5517 and Maanshan 6594 retain their authors and identities. Maanshan’s new milestones use @TaiwanDesk, the author of 6594, because native thread traversal follows children by the same author. Other new threads use @EnergyDesk.

## Event and generation treatment

Each thread begins with original commercial operation and follows the relevant shutdown, decision, approvals, reactor startup, grid connection and commercial return or conditional target. Month, quarter and year evidence uses explicitly estimated anchors. A reactor reaching criticality, a licence amendment or a financing announcement is not described as an electricity-generating restart.

Every milestone has native `PinPower` data (`kind: generation`), source URL and a status note. Historical reference electrical ratings come from the unit’s WNA/IAEA PRIS annual table, rather than applying the latest uprate to an old event. Published annual electricity supplied is included as GWh and distinguished from MW capacity. Combined-site capacities identify their unit scope. Operator restart capacities are proposed capacity until an operating return is verified. Gross ratings appear separately where published: Kashiwazaki-Kariwa 6 (1,356 MWe gross / 1,315 MWe net), Onagawa 2 (825 / 796), Shimane 2 (820 / 789), and Embalse’s 683 MW post-refurbishment gross rating versus the historical 2019 net reference rating of 608 MWe.

Palisades’ original-era badge uses 700 MWe, supported by early operating history, rather than its later 805 MWe rating. Duane Arnold’s actual last generating date is August 10, 2020; the October database/formal-certification marker is explained separately. Proposed Duane Arnold capacity is the DOE’s 615 MW, distinct from its 601 MWe final historical reference rating. Browns Ferry Unit 1 distinguishes June 2, 2007 pre-commercial operation from August 1 commercial operation. TVA’s original Sequoyah records support May and November 1988 returns at month precision.

Palisades’ existing target pin now reflects Holtec’s October 21, 2026 recovery of the tilted fuel assembly. It does not claim generation has resumed. March 31, 2027 remains a contract-backstop/quarter boundary, not a verified startup appointment. Duane Arnold uses a conditional Q1 2029 target. Maanshan’s 2028 marker is an earliest-year possibility, not permission to operate. Kuosheng has no invented restart date: conflicting reports about a March 2026 application remain a specific research gap, while the dated September report records planning only.

## Costs and remaining gaps

Only event-matched published costs are assigned, in the source’s currency without FX or inflation conversion. Exact quotes and source links are retained in references and details:

| Scope | Amount | Evidence |
| --- | ---: | --- |
| Palisades original construction | USD 149 million | Michigan Building Trades historical account: “The plant cost $149 million” |
| Browns Ferry Unit 1 restart | USD 1.84 billion | September 2008 TVA Inspector General report, project cost through FY2007 including revenue credits and an AFUDC adjustment; subsequent FY2008 credits disclosed separately |
| Onagawa 2 completed restart safety scope | JPY 570 billion | Tohoku Electric CDP disclosure, including shared station safety facilities; later anti-terrorism work is separate |
| Shimane 2 restart safety upgrades | JPY 600 billion | POWER’s account of the revised Chugoku estimate; Unit 3 construction is separate |
| Bruce A combined Units 1 and 2 programme | CAD 4.8 billion | WNA Canadian project history; not allocated as a fabricated per-unit cost |
| Embalse life extension | USD 2.149 billion | Argentine regulator’s 2019 IFNEC presentation, superseding rounded USD 2.140 billion early coverage |

Palisades’ USD 1.52 billion and Duane Arnold’s USD 1.9 billion DOE amounts are financing, not assumed total construction costs. NextEra had not published a precise total restart budget; an Iowa fiscal-model assumption is not substituted. Kashiwazaki-Kariwa’s reported JPY 1.2 trillion is site-wide safety spending, with no verified Unit 6 allocation. Metsamor’s contemporary fuel/refurbishment ranges do not establish a single final project price. No verified separate restart budget was established for Sequoyah, Maanshan, Kuosheng or Kori 2. Kori 1 decommissioning, an older simulator contract, Taiwan decommissioning provisions and Lungmen costs are different scopes. Unverified original construction costs and unallocated phases remain null. Per-plant research gaps and all source URLs are in the catalog.

Sources checked include operator publications, DOE/Federal Register, TVA filings and archival records, TEPCO’s dated commercial-operation statement, Tohoku Electric releases and CDP report, Chugoku investor materials, Bruce Power’s history and annual report, the Armenian plant’s anniversary account, the Argentine regulator’s presentation, Taiwan’s regulator and contemporary reporting, and KHNP restart reporting. The SEC direct fetch was blocked; the opened TVA annual-report mirror supports the operating chronology and the separately opened Inspector General PDF supplies the cost. POWER’s contradictory fuel-loading dates are not used; Chugoku’s own financial-results timeline supplies Shimane’s dates.

## Photos and verification

All selected photos were downloaded with plain curl, visually inspected and uploaded as originals to Azure Blob Storage. Each public blob was fetched and its byte count checked before use. No pin images were added to Git. Sources, photographer/operator credits, licence information and accurate date/context captions are retained in the catalog and pin details.

Official galleries/pages checked: Holtec Palisades press kit (selected aerial); NextEra’s Duane Arnold project page (selected plant exterior); TVA’s legacy official plant pages (Browns Ferry and Sequoyah exteriors); TEPCO’s January 21, 2026 startup photo library (selected Unit 6 control room); Tohoku’s virtual tour and JAIF pages; Chugoku operator materials; Bruce Power’s official history and 2022 annual report (selected Bruce A Unit 3 photograph, explicitly station context rather than a Unit 1/2 restart image). Armenia’s official gallery was inaccessible; a historic Metsamor control-room photo was verified through Mediamax’s retrospective gallery. Embalse, Shimane, Kori and Kuosheng use attributed operator/archive photos carried by World Nuclear News. Onagawa uses an October 24, 2024 Kyodo/AP station photograph published by China Daily. Maanshan uses Jnlin’s April 29, 2006 Wikimedia photograph, CC BY-SA 3.0, with licence link. No usable additional operator gallery was verified for Maanshan, Kuosheng, Embalse or Kori during this pass. Event-day exterior photos remain a gap for most historical milestones; these images are labelled location or programme context.

The replay saves and verifies native generation immediately after each pin, reloads authors, parent links, costs, dates and references, and checks every thread’s membership. Shared historical source pages can support several distinct events: when another pin already owns a main source URL, the new event retains the actual URL in references/citations and leaves its main `sourceUrl` empty. No fabricated query strings or anchors are used to evade URL uniqueness. Existing media and unrelated references are preserved.

Machine-readable IDs, verified capacities, source evidence, photo metadata and parent links: [research catalog](research/nuclear-restart-threads-2026-10-24.json). Repeatable API writer: [nuclearRestartThreads.mjs](../scripts/power/nuclearRestartThreads.mjs). Before snapshots, downloaded originals, page responses and detailed checks remain in ignored `.scrape/nuclear-restarts-2026-10-24/`.

## Saved production threads

| Plant | Milestones | Thread |
| --- | ---: | --- |
| Palisades | 8 | [Open thread](https://www.chronopin.com/pin/19708/palisades-begins-commercial-operation) |
| Duane Arnold | 5 | [Open thread](https://www.chronopin.com/pin/19711/duane-arnold-begins-commercial-operation) |
| Browns Ferry | 6 | [Open thread](https://www.chronopin.com/pin/19712/browns-ferry-unit-1-begins-commercial-operation) |
| Sequoyah | 5 | [Open thread](https://www.chronopin.com/pin/19724/sequoyah-unit-1-begins-commercial-operation) |
| Kashiwazaki-Kariwa Unit 6 | 4 | [Open thread](https://www.chronopin.com/pin/19725/kashiwazaki-kariwa-unit-6-begins-commercial-operation) |
| Onagawa Unit 2 | 5 | [Open thread](https://www.chronopin.com/pin/19728/onagawa-unit-2-begins-commercial-operation) |
| Shimane Unit 2 | 5 | [Open thread](https://www.chronopin.com/pin/19738/shimane-unit-2-begins-commercial-operation) |
| Bruce A | 7 | [Open thread](https://www.chronopin.com/pin/19739/bruce-a-unit-1-begins-commercial-operation) |
| Metsamor Unit 2 | 4 | [Open thread](https://www.chronopin.com/pin/19745/metsamor-unit-2-begins-commercial-operation) |
| Embalse | 4 | [Open thread](https://www.chronopin.com/pin/19753/embalse-begins-commercial-operation) |
| Maanshan | 6 | [Open thread](https://www.chronopin.com/pin/19757/maanshan-unit-1-begins-commercial-operation) |
| Kuosheng | 5 | [Open thread](https://www.chronopin.com/pin/19758/kuosheng-unit-1-begins-commercial-operation) |
| Kori Unit 2 | 4 | [Open thread](https://www.chronopin.com/pin/19765/kori-unit-2-begins-commercial-operation) |

All 68 milestones were saved and verified in both environments. Final corrections use 1,145 MWe for Sequoyah Unit 2’s calendar-1982 reference rating and 948 MWe for Kuosheng Unit 2’s original design rating; its 1983 annual entry is unpublished. The known Onagawa/Shimane overall restart safety budgets also appear on their startup and grid milestones, explicitly labelled as programme totals rather than additional incremental spending. Bruce’s agreement pin carries the latest combined programme cost retrospectively.

The public production API was unusually slow during this pass. The remaining content saves used an isolated local checkout of the identical deployed commit, authenticated admin/native APIs and an SSH database tunnel; public Azure media and production database were used. No code was deployed or service restarted. Public-site reload checks were then performed separately.

Final verification: all 26 native root pages (13 per environment) rendered the expected title, generation section and selected Azure photo. Public thread APIs included every expected milestone. Re-read native power rows matched all 136 environment-specific records. Script syntax and whitespace checks passed. The temporary worker and tunnel were shut down after verification.
