# Construction status backfill — October 24, 2026

**Current: 932 candidates remain in the status research queue per environment.** Five opened-source rounds resolved 70 project records; a saved-subject audit excluded 130 non-construction records. See the follow-up below for evidence, corrections and the remaining gaps.

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

After round five, the 932 remaining records retain their own source links and follow-up reason in the backfill catalog:

| Gap | Records per environment | Required next evidence |
| --- | ---: | --- |
| Agency/county landing page without project-specific evidence | 251 | Verify project identity, developer, docket/parcel and capacity, then obtain a dated phase record; unsourced engineering and COD prose is not evidence |
| Data-center tracker parcel/phase ambiguity | 109 | Dated operator, contractor or planning evidence for the exact parcel and MW phase |
| Epoch aggregate capacity/compute trajectory | 90 | Reconcile operating buildings with proposed future buildout before tagging the entire pinned scope |
| Housing opening/build milestone source | 5 | Reopen the exact development/building's opening, placed-in-service or physical-build source; rents and applications alone do not establish completion |
| Conflicting, denied or halted scope | 43 | Resolve the specific conflict or verify resumed physical work; do not force a three-way status |
| Grid/interconnection request identity | 35 | Match the exact request ID and phase to physical-work evidence; an IA or future COD alone is insufficient |
| Other individual project/source/phase questions | 399 | Follow the retained project-specific reason and citations; distinguish the pinned unit or phase from predecessor facilities |

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


## Third research round — completed housing scopes

Saved and verified **eight more Completed records in each environment**, reducing the queue from **980 to 972**. The [round-three research/replay catalog](../scripts/construction/research-round3-2026-10-24.json) retains opened HTTPS sources, verbatim quotes, cost qualifications, original row hashes and verification receipts.

| Pin | Exact scope | Native price and evidence |
| --- | --- | --- |
| 7097 | Regent Terrace rehabilitation, 36 old apartments converted into 80 homes | USD 6.3 million total development cost; NJIT records completion in January 1989 |
| 7115 | Residences at Hayes, 150 homes | USD 34.9 million reported for the 2018 opening; developer confirms ribbon cutting and resident move-ins |
| 7124 | Phare, Orleans, 62 homes | USD 37 million; municipal materials confirm complete and leasing, and reporting explicitly corrects the earlier USD 71.6 million error |
| 7134 | Aston Heights / Montgomery Heights II, 154 homes | Rounded USD 45 million in the developer profile; permanent-loan reporting independently describes the property as newly constructed |
| 7138 | Bridgeside Estates / Little Lehigh Phase I, 50 homes | Rounded USD 24 million in the newer developer profile; contractor confirms December 19, 2024 grand opening |
| 7143 | Cottage Hill Place, Mobile, 80 homes | Null cost; builder explicitly records Complete, May 2018 |
| 7207 | Don Coppedge Village / former Fairview Village, Phoenixville, 36 homes | Null cost; developer portfolio and community property record establish built in 2013 |
| 7224 | Oaks Intown rehabilitation Phase I, 279 homes across four Albany communities | Null cost; developer confirms grand opening and completed interior modernization in November 2021 |

Regent Terrace's October 2026 listing-review date was not its construction milestone. Corrected the native date to **January 31, 1989**, with estimated confidence and an explicit month-precision explanation. This anchors the sourced January 1989 rehabilitation completion, not an invented opening day or the original building's construction. Original event duration was preserved. Other estimated month/year anchors remain qualified; newly opened evidence does not justify inventing exact event days.

Cost figures retain their published scope. Aston Heights' USD 45 million and Bridgeside's USD 24 million are rounded developer-profile values in the URA-hosted 2025 RFQ materials. Bridgeside's older Fall 2023 authority newsletter gave USD 27 million; that variation is retained in the saved research rather than calling the later profile an audited final account. Hayes retains the developer's opening-project cost: a later indexed municipal proposal could not be opened to verify its table or revised scope. Don Coppedge's indexed USD 9 million and USD 10.8 million values remain unverified because the original PDFs/articles were inaccessible. No search snippet was promoted to cost evidence. Cottage Hill searches did not establish an exact-project cost, and Oaks Intown equity/loans and other Albany master-plan budgets were excluded. These three native costs remain null with specific research gaps.

Two further records remain queued with more precise opened-source findings. **Thatcher Flats (7109)** mixes the October 2024 opening of 50-home Phase I and groundbreaking of 36-home Phase II; the builder later documents final-phase completion in November 2025. Clarify the represented phase and historical milestone before applying one status or cost. **Northside Village (7174)** covers 300 homes, while the operator's November 2020 completion and USD 29,716,977 cost fields cover only the first 89 homes; the remaining 211-home phase needs its own dated evidence. Neither received a forced tag. These move from generic housing gaps into the conflict/scope group, now 42; the housing milestone group is now 21.

Accounting per environment is **1,270 assigned + 972 queued + 334 excluded + 11 previously reviewed overlaps = 2,587 screened candidates**. Assigned statuses are **632 Proposed, 392 In Progress and 246 Completed**. Including the separate original 68-pin batch, **1,338 reviewed eligible pins per environment** carry status tags.

Replay sequentially:

```sh
node --env-file=.env.local scripts/construction/research.mjs --manifest scripts/construction/research-round3-2026-10-24.json
node --env-file=.env.local scripts/construction/status.mjs --manifest scripts/construction/research-round3-2026-10-24.json
python3 scripts/construction/reviewQueue.py --manifest scripts/construction/research-round3-2026-10-24.json
```

Both environments passed metadata, status, author and unrelated-field preservation checks. All eight public pin JSON responses per environment expose the saved statuses, native costs, citations and corrected date. Authenticated native pages for Regent Terrace, Phare, Bridgeside and Cottage Hill returned HTTP 200 with their research and Completed tags. Before snapshots and page captures are ignored under `.scrape/construction-status-research-round3-2026-10-24/`. Syntax, lint, catalog accounting and reconciliation idempotence checks passed. No deployment, production build, VM restart or resize was performed.


## Fourth research round — 25 records

Saved and verified **25 additional records in each environment: 18 Completed, six In Progress and one Proposed**. The queue decreases from **972 to 947**. Nineteen records have source-quoted native costs, while six retain null costs with specific evidence gaps. The [round-four research/replay catalog](../scripts/construction/research-round4-2026-10-24.json) records opened HTTPS sources, short verbatim quotes, exact phase/cost qualifications, original row hashes, metadata and status receipts, and public verification. Original authors, parents and unrelated tags/metadata were preserved.

| Pin | Represented scope/milestone | Status | Native cost |
| --- | --- | --- | --- |
| 484 | BT Tower communications opening, October 1965 | Completed | GBP 2.5 million original construction; not inflation adjusted, sale price or hotel conversion |
| 546 | Egypt Stadium inauguration, March 2024 | Completed | EGP 900 million stadium only; excludes the larger sports complex |
| 618 | Icon of the Seas passenger-service debut, January 2024 | Completed | USD 2 billion, stated by Royal Caribbean for the ship build |
| 670 | LaGuardia redevelopment, Terminal C completion in 2024 | Completed | USD 8 billion full represented redevelopment |
| 677 | Millennium Tower foundation-stabilization success announcement, June 2023 | Completed | USD 100 million retrofit; excludes original tower construction |
| 678 | Hong Kong three-runway simultaneous operations, November 2024 | Completed | HKD 141.5 billion project estimate in money-of-the-day prices; later Terminal 2 delivery is distinct |
| 711 | Allegiant Stadium occupancy handover, July 31, 2020 | Completed | USD 1.99 billion revised overall project cost, including third-party work |
| 800 | Mjøstårnet opening, March 2019 | Completed | Rounded NOK 500 million Hent contract, excluding VAT; not the timber subcontract or all-in audited total |
| 887 | Tønsberg shipyard launch, October 2010 | In Progress | Null: no exact individual-vessel construction price verified |
| 891 | SANY Lingang excavator-factory opening report, August 2012 | Completed | USD 818.5 million published factory build cost |
| 937 | Oleg Strashnov completed-vessel delivery, April 2011 | Completed | Approximately USD 500 million actual cost outcome quoted by Seaway’s CEO |
| 7027 | Pointe at Thomas, 67-home groundbreaking, June 2026 | In Progress | Null: capital and construction-financing amounts are not a project total |
| 7041 | Cielo / Sunnydale Block 7, 89 homes under construction | In Progress | USD 107,600,554 April 2025 Total Uses, superseding the opened March 2024 estimate |
| 7042 | Amani / Sunnydale Block 3A, 80 homes | Completed | USD 95,315,920 individual-block development cost with acquisition in the March 2024 city comparison |
| 7074 | Nia / Sunnydale Block 3B, 90 homes | Completed | USD 90,943,827 individual-block development cost with acquisition in the March 2024 city comparison |
| 7062 | 600 Seventh, 220 resident homes plus manager apartment | Completed | USD 145,333,464 total development cost with acquisition in the August 2024 city comparison |
| 7066 | The Edmonson / Barry Farm Building 1A, 139 homes | In Progress | Null: bonds, tax-credit equity and city loan are financing components |
| 7070 | Atlantic Square, 616-home tower grand opening | Completed | Null: opened ceremony reporting explicitly says cost was not disclosed |
| 7081 | Henderson Place, March 2024 pre-start redevelopment announcement | Proposed | USD 20 million exact 76-home proposal estimate; later work is a separate historical milestone |
| 7086 | 1633 Valencia, 145 senior supportive homes | Completed | Null: latest completion reporting gives only an approximate per-apartment figure |
| 7106 | Saint Luke’s Manor residential conversion, 137 senior homes | Completed | Rounded USD 39 million developer-profile development figure; excludes broader school/commercial phase |
| 7126 | Square at Merritt Mill, December 2018 groundbreaking for 75 homes | In Progress | Approximately USD 13.5 million construction estimate |
| 7131 | West Point Village Phase I, November 2022 groundbreaking report, 72 homes | In Progress | USD 13.45 million exact construction-project figure; Phase II and Texas property excluded |
| 7175 | Oaks at Park Pointe, Griffin, 84-home redevelopment | Completed | USD 13,841,017 total development budget in the developer’s RAD/LIHTC case study |
| 7230 | River Pointe I and II, Savannah, rehabilitation of 280 homes | Completed | Null: exact 2017 rehabilitation cost not established; later infill and other Savannah projects excluded |

The three historical construction-start/launch records—Merritt Mill, West Point and Tønsberg—remain In Progress at their represented milestones even though later completion exists. Tønsberg’s October 2010 hull launch is distinct from the owner’s March 2011 operation announcement. Henderson Place’s March 2024 announcement says construction is still set to begin that month, so Proposed describes that pre-start event; it does not claim construction remained unstarted in October 2026. Cielo and The Edmonson have explicit architect/builder evidence of current construction, independently of future opening dates.

Corrected two housing dates with qualified precision. **Saint Luke’s Manor (7106)** moves from its October 2026 listing-review date to **December 31, 2012**, an estimated year anchor for the opening reported in the dated 2013 housing-finance account. The later developer portfolio’s 2011 redevelopment history is retained separately; this does not date every later hospital-campus phase. **Oaks at Park Pointe (7175)** moves from November 2018 to **December 31, 2015**: the housing authority confirms 2015, while the architect says October and BLOC says December. The conflicting completion months remain explicit; no exact opening day was invented. Both date changes preserve original event duration. River Pointe’s existing December 31, 2017 anchor remains, with reasoning improved from year to month precision because Savannah’s report explicitly states December 2017.

**Allegiant Stadium (711)** previously called July 31 the Raiders’ first home game. Corrected the description and date reasoning to the source-supported **Certificate of Occupancy**, after construction wrapped July 30. The date itself is retained. Mortenson’s later account gives **USD 1.99 billion overall cost**, including third-party work, distinct from the reduced USD 1.944 billion construction budget and the older USD 1.97 billion estimate. Earlier pin evidence remains visible under a clearly marked earlier-evidence block; the new research explains the correction.

Amani and Nia have separate municipal block budgets; their builder’s USD 138 million combined construction contract was not apportioned by unit count. Cielo’s April 2025 USD 107,600,554 Block 7 budget supersedes the opened March 2024 USD 108,646,076 estimate, and excludes Luca/Block 9. Saint Luke’s rounded developer-profile development figure is distinguished from the engineer’s narrower USD 23.5 million project scope. Six cost gaps remain explicit: Pointe financing, Edmonson financing, Atlantic Square’s undisclosed total, Valencia’s approximate per-unit reporting, Tønsberg’s unpublished individual-vessel cost, and River Pointe’s missing exact rehabilitation budget. No rounded unit figure, monthly rent, loan sum or FX conversion was used to manufacture a price.

**MahaNakhon (745) remains queued.** Its saved August 2016 ceremony narrative must be reconciled with the structural designer’s full mixed-use completion in 2018/19 and the timing of observation/hotel components. The designer’s THB 20 billion broader-scope estimate is not silently substituted for the saved THB 21 billion project value. The primary ceremony PDF timed out. This newly researched issue moves from the individual-source group into the conflict/scope group, with its own follow-up reason.

Accounting per environment is now **1,295 assigned + 947 queued + 334 excluded + 11 previously reviewed overlaps = 2,587 screened candidates**. Assigned statuses are **633 Proposed, 398 In Progress and 264 Completed**. With the separate original 68-pin batch, **1,363 reviewed eligible pins per environment** carry status tags. Remaining gap groups are 251 agency/project identity, 109 tracker parcels, 90 Epoch trajectories, seven housing milestones, 43 conflicting/halted scopes, 35 grid-request identities and 412 individual source/phase questions.

Replay sequentially:

```sh
node --env-file=.env.local scripts/construction/research.mjs --manifest scripts/construction/research-round4-2026-10-24.json
node --env-file=.env.local scripts/construction/status.mjs --manifest scripts/construction/research-round4-2026-10-24.json
python3 scripts/construction/reviewQueue.py --manifest scripts/construction/research-round4-2026-10-24.json
```

Both environments passed metadata, source-reference, status and unrelated-field checks. All 25 public JSON records per environment expose the saved status, cost/currency, source links and date corrections. Authenticated native pages for Allegiant, Tønsberg, Cielo, Amani, Henderson Place, Saint Luke’s Manor and Oaks at Park Pointe returned HTTP 200 and showed their research and correct statuses. Before snapshots, downloaded evidence and page captures remain ignored under `.scrape/construction-status-research-round4-2026-10-24/`. Syntax/lint, catalog accounting, whitespace and reconciliation idempotence checks passed. No deployment, production build, VM restart or resize was performed.


## Fifth research round — 15 records

Saved and verified **15 additional records in each environment: nine In Progress, three Proposed and three Completed**. The queue decreases from **947 to 932**. Eight records have quoted native costs; seven retain null costs with specific scope or publication gaps. The [round-five research/replay catalog](../scripts/construction/research-round5-2026-10-24.json) retains opened HTTPS sources, short verbatim quotes, phase reasoning, original pin hashes and verification receipts. Original authors, parent links, unrelated tags and other pin fields were preserved.

| Pin | Represented scope/milestone | Status | Native cost |
| --- | --- | --- | --- |
| 230 | Al Maktoum first operational phase, with actual enabling and foundation work | In Progress | Null: previously stored AED 128 billion covers the broader airport plan; first-phase total unverified |
| 458 | Gross Dam June 2026 topping milestone, with additional work remaining | In Progress | Just under USD 602 million revised construction contract; rounded price and upper bound, not all-in audited cost |
| 493 | 400 Lake Shore North Tower, 635 homes | In Progress | USD 543,305,000 total development cost in June 2026 SEC filing; South Tower excluded |
| 592 | Río Indio reservoir legal approval | Proposed | USD 1.6 billion, including construction and relocation, in Panama’s 2025 government filing |
| 628 | Golden Gate seismic Contract 1 budget/award approval, towers and side spans | Proposed | USD 1,011,726,000 exact Project 2520 budget; later main-span contract separate |
| 660 | Egypt initial 660-km rail-system contract signing | Proposed | Approximately USD 4.5 billion consortium contract, including maintenance; corrected from USD 4.50 |
| 801 | Frankfurt Sky Line first-vehicle presentation before testing | In Progress | Null: EUR 300 million broader system/operations contract is not an individual vehicle price |
| 828 | Port Waratah shiploader 7.09 overhaul start | In Progress | Null: AUD 270 million program and AUD 50 million outage cover multiple projects |
| 841 | Marzahn first concrete-panel placement, July 1977 | In Progress | Null: exact first-building or installation-phase cost not established |
| 883 | Edda Freya hull launch, August 2015 | In Progress | Approximately NOK 1.4 billion individual newbuild cost |
| 930 | MOSE last-gate installation, January 2019, before full-system operation | In Progress | Approximately EUR 6.2 billion whole-project retrospective estimate in a May 2026 review; not an audited gate contract |
| 970 | Original Bori Bunder–Thane passenger railway opening, April 1853 | Completed | Null: original section’s exact construction total not established |
| 2167 | Kindred, San Diego, 126 homes under construction toward May 2027 | In Progress | USD 102 million reported full development cost |
| 7103 | Oaks at Liberty, Baltimore, 75 apartments placed in service | Completed | Null: exact residential-conversion total unverified |
| 7152 | Gloria Robinson Court Homes final-phase opening, completing the community | Completed | Null: USD 20.9/25.1 million descriptions cover only the final 70-home phase |

Historical installation, hull-launch and overhaul-start pins remain In Progress at those milestones, independently of later delivery or operation. The signed Egyptian contract and Golden Gate board approval establish Proposed at the represented events; completing a contract or approval does not complete the build. MOSE’s January 2019 gate placement precedes the documented October 2020 protective operation. Kindred’s actual groundbreaking establishes construction independently of its future target date.

Date corrections preserve each original event duration and explicitly state precision. **Al Maktoum (230)** moves to **December 31, 2032**, an estimated year anchor because the government update gives only 2032. **Río Indio (592)** moves from June to **July 31, 2024**, an estimated month anchor: Panama’s filing dates the ruling July 3 while earlier reporting says July 2. **Shiploader 7.09 (828)** moves from a July 1 placeholder to **July 31, 2025**, an estimated actual-start-month anchor supported by the operator’s July–November outage account; an indexed planned July 28 start was not promoted to a verified actual day. **Oaks at Liberty (7103)** moves from its October 2026 listing-review date to **December 31, 2001**, an estimated year anchor for HUD’s placed-in-service record MDA20010040. HUD’s Liberty Heights Avenue address and the operator’s Howard Park Avenue address identify the same corner property. **Gloria Robinson (7152)** moves from June 2016 to the confirmed **July 15, 2016** fourth/final-phase grand opening. Gross Dam’s June 3 date is retained with estimated confidence because the operator body and final-placement photo caption differ by one day; the discrepancy remains explicit.

Costs preserve source currency and scope without FX conversion. Golden Gate’s project budget is distinct from its construction contract, contingency and reserve increase; those figures are not added together. The 400 Lake Shore filing supersedes older USD 500 million descriptions for the exact North Tower. Gross Dam’s revised operator contract is distinguished from approximate court-record costs and an unverified higher counsel assertion. Edda Freya’s NOK estimate is retained rather than its dollar equivalent; differing February/April 2016 delivery accounts do not alter the 2015 launch. MOSE’s newer rounded review estimate is qualified against older figures and complementary-work scopes. Al Maktoum’s broader AED 128 billion and Gloria Robinson’s final-phase-only budgets are not assigned to mismatched scopes. Null costs retain specific follow-up reasons.

Accounting per environment is **1,310 assigned + 932 queued + 334 excluded + 11 previously reviewed overlaps = 2,587 screened candidates**. Assigned statuses are **636 Proposed, 407 In Progress and 267 Completed**. Including the separate original 68-pin batch, **1,378 reviewed eligible pins per environment** carry status tags. Remaining groups are 251 agency/project identities, 109 tracker parcels, 90 Epoch trajectories, five housing milestones, 43 conflicting/halted scopes, 35 grid-request identities and 399 individual source/phase questions. Prior unresolved findings for Grace, Thatcher Flats, Northside Village and MahaNakhon remain queued.

Replay sequentially:

```sh
node --env-file=.env.local scripts/construction/research.mjs --manifest scripts/construction/research-round5-2026-10-24.json
node --env-file=.env.local scripts/construction/status.mjs --manifest scripts/construction/research-round5-2026-10-24.json
python3 scripts/construction/reviewQueue.py --manifest scripts/construction/research-round5-2026-10-24.json
```

All 15 public JSON records per environment passed status, author, native cost/currency, citation and corrected-date checks. Authenticated native pages for Al Maktoum, Gross Dam, Egypt’s initial railway contract, shiploader 7.09, Oaks at Liberty and Gloria Robinson returned HTTP 200 with their research and correct statuses. Metadata and status saves were re-read and unrelated fields checked. Before snapshots, opened evidence and page captures remain ignored under `.scrape/construction-status-research-round5-2026-10-24/`. Syntax/lint, catalog accounting, whitespace and reconciliation idempotence checks passed. No deployment, production build, VM restart or resize was performed.
