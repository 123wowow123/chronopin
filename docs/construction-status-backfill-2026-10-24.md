# Construction status backfill — October 24, 2026

**Current: 980 candidates remain in the status research queue per environment.** Two opened-source rounds resolved 22 project records; a saved-subject audit excluded 130 non-construction records. See the follow-up below for evidence, corrections and the remaining gaps.

Read the complete live-pin inventories through authenticated admin APIs: 12,909 local and 12,963 production records. Screened 2,587 project/physical-facility candidates in each snapshot, including infrastructure, housing, factories, power generation, storage and data centers. Previously reviewed nuclear/factory pins were preserved rather than treated as new assignments. The inventory is a dated snapshot; the candidate screen is broad and includes false positives such as events hosted at stadiums.

Status describes the construction/refurbishment scope represented by the pin. A historical groundbreaking is In Progress at that milestone, while a historical opening is Completed even when a later closure exists. A future target is assessed against the latest stage evidence in its saved research. Completing an announcement, financing, study or permit does not complete construction. Criticality, a first coil, grid testing and energizing a campus substation do not prove an entire project's commercial completion.

## Evidence review

The backfill uses the pins' existing cited research, explicit project-stage blocks, reviewed titles and narrative statements. This pass did not newly open every underlying source. Each assigned record retains the evidence statement, source URLs, original identity and per-environment verification in the replay catalog. Ambiguous or contradictory scopes are withheld. Old target dates alone never yield Completed.

Screening checks explicit operational/under-construction titles, actual opening/construction-start milestones, developer/HUD placed-in-service or resident-opening records, development requests and sourced timeline stages. Exception review distinguishes construction planning/documentation/permitting from actual physical construction, old construction history from a later completed building, and construction of a neighboring/preceding unit from the pinned expansion. Fifteen regression cases covered future openings, negation, planning, withdrawn proposals, noun “Open” in a project name, and criticality versus completion.

Examples of reviewed distinctions:

- Aligned NEO-02–04 remains Proposed: NEO-01 being under construction does not prove those three buildings started.
- IREN Sweetwater 1 is In Progress: the substation is energized but the pinned data-center buildout continues.
- Gran Torre Costanera and Steinway Tower are Completed: historical construction-start paragraphs do not override explicit later completion evidence.
- Western Sydney passenger-opening scope is In Progress at the October 24 check; passenger service is scheduled for October 25, while completed terminal/runway and cargo activity are described separately.
- Housing with an explicit HUD placed-in-service date or developer opening/resident-move-in statement can be Completed. Published rents or an application link alone are insufficient.
- Studies and active interconnection requests remain Proposed when no physical work is established. A study's network-upgrade cost or requested service date is not evidence the plant was built.

## Unresolved and excluded records

The research queue is explicit and retained in the catalog; these records have not been forced into a status. Major gaps include thin parcel/permit listings with no construction stage, Epoch AI pins whose full pinned capacity must be reconciled with operating versus future site trajectories, anonymous grid requests, conflicting tracker/operator stages, halted projects and unverified exact unit/phase mapping.

The current [Epoch overview](https://epoch.ai/data/ai-data-centers) was opened and describes operating and future trajectories; it does not independently settle every existing pin's entire buildout scope. A direct research-tool request to Data Center Tracker's North Carolina page failed. Neither limitation was treated as permission to infer a status. Source URLs and specific follow-up reasons are retained per queued record.

Non-construction exclusions include product/brand names that happen to contain “factory” or “tower,” sports or music events hosted at venues, tariffs, ownership transfers, recognition records, accidents, closures and unrelated policy/legal events. Cancelled, withdrawn, denied, halted and mixed-scope projects require a supported state rather than one of the three tags being assigned merely to fill the field.

## Saving and verification

Used the authenticated admin table API in batches, changing only construction-status tag rows. Every batch checked pin ID/title/author against the inventory, preserved unrelated tag rows, re-read the saved status, and checked author, parent, title and summary preservation. Contradictory status names are removed so each assigned pin has exactly one of Proposed, In Progress and Completed. Private before snapshots are retained under ignored `.scrape/construction-status-2026-10-24/`.

Replay: `node --env-file=.env.local scripts/construction/status.mjs --manifest scripts/construction/backfill-2026-10-24.json`. The writer now handles larger batches with paginated tag reads. The dated screen/exception rules are retained in `scripts/construction/auditBackfill.py`; they read the ignored inventory snapshots and produce audit files, without writing to the database. All assignments are reviewable in the [backfill catalog](../scripts/construction/backfill-2026-10-24.json).

No deployment, VM restart, resize or production build was performed.

## Initial backfill result

Saved and verified **1,240 additional pins in each environment**: 632 Proposed, 380 In Progress and 228 Completed. With the earlier 68-pin batch, this maintains construction-status tags on 1,308 reviewed eligible pins per environment.

The initial screen left **1,132 candidate records per environment in the research queue**, each with its source and specific reason. They are not claimed as fully resolved construction pins. Another 204 keyword matches are excluded as non-construction events or unsupported statuses, and 11 candidates were already covered by the earlier reviewed batch. These counts sum to the 2,587 screened candidates. Many of the earlier 68 nuclear milestones do not match generic facility keywords, so the candidate-overlap count is smaller than 68.

All saved rows were verified with exactly one status and unrelated metadata preserved. Public pin JSON and native pages were checked for Daimler’s historical groundbreaking (In Progress at that milestone), Google Hamina’s operating data center (Completed), and Carrier’s announced Fort Worth factory (Proposed), in both environments. Final unit/phase corrections distinguish NEO-01 from NEO-02–04, Aratina 1 from Aratina 2, and an unverified Coal Creek demand proposal from physical construction. Node syntax, Python execution, ESLint and whitespace checks passed.


## Opened-source research and queue audit follow-up

Reviewed the saved subject, source and phase gap of all 1,132 queued records per environment. This is a full queue triage, not a claim to have newly researched 1,132 projects. Newly opened HTTPS project, operator, transport-agency, parliamentary and delivery-engineer sources resolved **10 additional project records in both local and production**: nine In Progress and one Completed. Source titles, short verbatim quotes, phase reasoning, original pin hashes and verification results are retained in the [research/replay catalog](../scripts/construction/research-2026-10-24.json). The authenticated admin APIs saved the costs, citations, research blocks and date corrections. Original authors, thread links, unrelated tags and earlier research were preserved.

| Pin | Exact reviewed scope | Status | Sourced cost |
| --- | --- | --- | --- |
| 224 | Sydney Metro West passenger railway; station and systems work continues after tunnelling | In Progress | AUD 25.3 billion |
| 225 | Brenner Base Tunnel railway system, including remaining construction and commissioning | In Progress | EUR 11.7 billion |
| 268 | Auckland City Rail Link public passenger opening | Completed | NZD 5.493 billion |
| 442 | Complete E39 Rogfast tunnel, rather than an individual contract | In Progress | NOK 29.290 billion |
| 449 | HRBT expansion, including tunnels, bridges and highway approaches | In Progress | USD 3.9 billion |
| 462 | New Nissan Stadium build | In Progress | USD 2.2 billion, rounded in September 2026 reporting |
| 476 | Second Gotthard road-tunnel tube, excluding later original-tube refurbishment | In Progress | CHF 2.14 billion, ±15%, excluding VAT |
| 516 | Montreal Olympic Stadium roof replacement, including lifting and commissioning | In Progress | CAD 870 million |
| 573 | Full Förbifart Stockholm bypass, rather than a partial section opening | In Progress | SEK 51.5 billion probable final cost, in 2021 prices |
| 637 | Western Harbour Tunnel, separate from the Warringah Freeway upgrade | In Progress | AUD 7.4 billion |

Brenner's operator revised regular train service to **2034** on October 20–21, 2026. Corrected pin 225 from June 2032 to December 31, 2034 with estimated confidence and an explicit year-precision explanation; the day is a timeline anchor. The operator expects construction completion in 2033, with testing and approvals in 2034. Auckland's operator confirms passenger services began **September 13, 2026**, distinct from the September 11 ceremony. Corrected pin 268 from November 1 to September 13 with confirmed confidence. Both date corrections preserve the original event duration.

Rogfast's newest opened transport-budget table forecasts **NOK 29,290 million** in final cost, distinct from the **NOK 35,233 million** upper framework. This supersedes the project landing page's older 2020-price estimate. All cost figures are stored in the currency stated by the source, without FX conversion. Montreal's October 8 update describes roof assembly on the playing field and preparations for lifting; it does not establish stadium reopening. Bored tunnels, completed roof assembly and partial road openings were not promoted to full-project completion.

The scope audit moved **130 records per environment** from the queue into documented exclusions. These are product/software/design launches, policy and legal proceedings, elections, corporate/ownership events, hosted events, accidents, closures and other subjects without the pinned construction scope. No construction tag was invented and these pin records were not deleted or rewritten. The [scope-review catalog](../scripts/construction/queue-scope-review-2026-10-24.json) retains every title, original queue reason, saved description and specific exclusion reason. Those exclusions are based on saved subject matter; no new underlying-source visit is claimed for them.

After the first follow-up, accounting per environment was **1,250 assigned + 992 queued + 334 excluded + 11 previously reviewed candidate overlaps = 2,587 screened candidates**. Assigned counts are 632 Proposed, 389 In Progress and 229 Completed. Together with the separate original 68-pin batch, this maintains status tags on **1,318 reviewed eligible pins per environment**.

### Remaining source and phase gaps

After round two, the 980 remaining records retain their own source links and follow-up reason in the backfill catalog:

| Gap | Records per environment | Required next evidence |
| --- | ---: | --- |
| Agency/county landing page without project-specific evidence | 251 | Verify project identity, developer, docket/parcel and capacity, then obtain a dated phase record; unsourced engineering and COD prose is not evidence |
| Data-center tracker parcel/phase ambiguity | 109 | Dated operator, contractor or planning evidence for the exact parcel and MW phase |
| Epoch aggregate capacity/compute trajectory | 90 | Reconcile operating buildings with proposed future buildout before tagging the entire pinned scope |
| Housing opening/build milestone source | 31 | Reopen the exact development/building's opening, placed-in-service or physical-build source; rents and applications alone do not establish completion |
| Conflicting, denied or halted scope | 40 | Resolve the specific conflict or verify resumed physical work; do not force a three-way status |
| Grid/interconnection request identity | 35 | Match the exact request ID and phase to physical-work evidence; an IA or future COD alone is insufficient |
| Other individual project/source/phase questions | 424 | Follow the retained project-specific reason and citations; distinguish the pinned unit or phase from predecessor facilities |

Fehmarnbelt research also opened the operator's April 2026 factsheet and May 17 phased-opening announcement. The latter withdraws the single 2029 opening assumption, separates road and rail, and says a revised schedule will follow immersion experience. The April factsheet omits the budget shown in March. A new exact full-scope opening date and any revised cost require follow-up; no replacement date was invented. These limitations do not establish completion.

Replay the metadata first, then the status tags, sequentially:

```sh
node --env-file=.env.local scripts/construction/research.mjs
node --env-file=.env.local scripts/construction/status.mjs --manifest scripts/construction/research-2026-10-24.json
python3 scripts/construction/reviewQueue.py
```

The metadata writer supports `--dry-run`, checks saved pin hashes before the first write in each environment, matches affected values to reject conflicting edits, retains private before snapshots, adds quoted references without removing previous references, and verifies every changed field plus unrelated pin metadata. The queue reconciliation refuses to remove researched records until both metadata and status writes are verified. The original `auditBackfill.py` remains a historical screening reproduction; run the follow-up reconciliation to retain the reviewed outcomes rather than treating its original queue as current.

Verification: all ten public pin JSON responses expose the saved status, cost, currency, date, original author and source links in each environment. Authenticated native pages for Brenner, Auckland and Montreal returned HTTP 200 and contained the research blocks and correct statuses in both environments. Metadata replay dry-run, Node syntax, ESLint, Python syntax and whitespace checks passed.

No deployment, production VM restart, resize or production build was performed.


## Second research round — housing phases

Saved and verified **12 more housing records in each environment**, with three In Progress and nine Completed. The queue falls from **992 to 980**; no additional exclusions were made this round. Full source URLs, opened dates, verbatim quotes, precise cost scopes, live-row hashes, verification flags and unresolved research are in the [round-two catalog](../scripts/construction/research-round2-2026-10-24.json).

| Pin | Reviewed scope | Status | Native price and cost scope |
| --- | --- | --- | --- |
| 7021 | The Becker's 190 homes within Riverwalk, San Diego | In Progress | USD 140 million development; separate from the whole Riverwalk master plan |
| 7043 | The Rise on Madison's 250-home Bellwether component | Completed | Null: the USD 150.7 million reported tower cost combines The Rise and Blake House; no separate component total established |
| 7048 | Mary Ellen McCormack Building A, 94 apartments | In Progress | USD 108,420,430 total development cost in the June 2026 HIT SEC filing; separate from the earlier USD 62 million building-only and USD 8 million infrastructure descriptions |
| 7055 | Legacy at Herndon Square / Phase II, 201 homes | Completed | USD 57 million phase investment, including supporting infrastructure; adjacent Phase III is separate |
| 7060 | Rose Apartments, Venice, 35 total units | Completed | USD 22,204,143 updated total development cost in the March 2026 Los Angeles HHH report |
| 7076 | Chrysalis replacement building, Denver, 70 homes | In Progress | Rounded USD 36 million with a lower-bound field; January 2026 reporting says a little more than USD 36 million, superseding the 2024 USD 20 million announcement |
| 7078 | The Ethel's 100 supportive apartments, Washington DC | Completed | USD 35 million builder-published construction contract; explicitly not all-in development cost, financing or the neighboring Park Kennedy budget |
| 7080 | New Hope Housing Berry's 180 residential homes | Completed | Null: no quoted full residential-project total established; the TDLR record scopes community/preschool buildings and financing amounts are not substituted |
| 7084 | Vista Ballona, 50 homes, Los Angeles | Completed | USD 33.7 million development; the operator's later property sheet confirms built in 2022 |
| 7087 | The Aries at Bitter Lake, 200 homes, Seattle | Completed | USD 76.3 million development; separate from the adjacent North Star and from sums of construction/permanent loans |
| 7198 | Village at Nauset Green, 65 homes, Eastham | Completed | USD 23 million development, confirmed by Pennrose's later completed-development account |
| 7208 | Doverbrook's rebuilt 64-home community, Easton | Completed | USD 25 million redevelopment; replaces 50 old homes and adds 14 |

Berry's original May 31, 2025 placeholder conflated its opening with the ribbon-cutting period. Opened KPRC reporting says the apartments opened in **March 2025**, with the ribbon cutting scheduled for May 16. Corrected the native start to **March 31, 2025**, retained estimated confidence, and explained that the day is a month-precision anchor. The original event duration was preserved. The architect independently records completion in 2025. The later preschool service start does not prevent residential completion.

Rose's latest opened government cost table gives **USD 22,204,143** for HIMS project **18-125046**, with 35 total units and 34 supportive units. This supersedes older USD 20.6 million reporting and is distinct from its USD 6,888,468 HHH loan. The May 19, 2022 ceremony date remains separate from the March 18 ready-to-occupy milestone. Mary Ellen McCormack Building A remains In Progress: its future occupancy target is insufficient to prove completion, while the funder's April 30, 2026 list and developer foundation-work release establish actual construction.

**Grace Manor (7073) remains queued with a specific primary-source conflict.** CHA's December 1, 2025 report describes the opening of its 65 homes, but the June 2026 HIT SEC filing still puts the same 65-unit Chicago project under construction as of April 30. The filing gives USD 30,215,493 development cost, versus earlier USD 40 million trade reporting. Research must establish whether the funder list lags physical completion and reconcile the cost scopes. Neither primary source was silently discarded, and no tag or cost was forced onto this record.

The total accounting is now **1,262 assigned + 980 queued + 334 excluded + 11 previously reviewed candidate overlaps = 2,587 candidates per environment**. Assigned counts are **632 Proposed, 392 In Progress and 238 Completed**. Including the separate 68-pin original batch, **1,330 reviewed eligible pins per environment** now carry status tags. The remaining housing milestone-source group has 31 records; the conflict/halted group has 40 after removing The Becker and adding the new Grace Manor conflict. Other queue group counts are unchanged.

Replay this round sequentially:

```sh
node --env-file=.env.local scripts/construction/research.mjs --manifest scripts/construction/research-round2-2026-10-24.json
node --env-file=.env.local scripts/construction/status.mjs --manifest scripts/construction/research-round2-2026-10-24.json
python3 scripts/construction/reviewQueue.py --manifest scripts/construction/research-round2-2026-10-24.json
```

Both environments passed the saved metadata, status and unrelated-field checks. All 12 public JSON responses were verified per environment, and authenticated native pages for The Becker, The Rise, Rose and Berry returned HTTP 200 with their saved research and statuses. Before snapshots and page captures are ignored under `.scrape/construction-status-research-round2-2026-10-24/`. The replay writer accepts a manifest and separate snapshot directory; queue reconciliation preserves newly researched unresolved reasons on later reruns. Node syntax, ESLint, Python syntax, catalog accounting and idempotence checks passed. No deployment, production build, VM restart or resize was performed.
