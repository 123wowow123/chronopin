# Construction status backfill — October 24, 2026

**Current: 699 candidates remain in the status research queue per environment.** Ten opened-source rounds resolved 303 project records; a saved-subject audit excluded 130 non-construction records. See the follow-up below for evidence, corrections and the remaining gaps.

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

After round eight, the 829 remaining records retain their own source links and follow-up reason in the backfill catalog:

| Gap | Records per environment | Required next evidence |
| --- | ---: | --- |
| Agency/county landing page without project-specific evidence | 251 | Verify project identity, developer, docket/parcel and capacity, then obtain a dated phase record; unsourced engineering and COD prose is not evidence |
| Data-center tracker parcel/phase ambiguity | 109 | Dated operator, contractor or planning evidence for the exact parcel and MW phase |
| Epoch aggregate capacity/compute trajectory | 90 | Reconcile operating buildings with proposed future buildout before tagging the entire pinned scope |
| Housing opening/build milestone source | 1 | Reopen the exact development/building's opening, placed-in-service or physical-build source; rents and applications alone do not establish completion |
| Conflicting, denied or halted scope | 45 | Resolve the specific conflict or verify resumed physical work; do not force a three-way status |
| Grid/interconnection request identity | 35 | Match the exact request ID and phase to physical-work evidence; an IA or future COD alone is insufficient |
| Other individual project/source/phase questions | 298 | Follow the retained project-specific reason and citations; distinguish the pinned unit or phase from predecessor facilities |

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


## Sixth research round — 10 records

Saved and verified **10 additional records in each environment: seven In Progress and three Proposed**. The queue decreases from **932 to 922**. Six pins have source-quoted native costs; four retain null cost/currency because the exact phase total is unverified. The [round-six research/replay catalog](../scripts/construction/research-round6-2026-10-24.json) retains opened HTTPS sources, verbatim excerpts, precise budget qualifications, original hashes and verification receipts. Original authors, parent links, unrelated tags and unpatched fields were preserved.

| Pin | Reviewed scope | Status | Native cost |
| --- | --- | --- | --- |
| 192 | Sites Reservoir planned construction start | Proposed | Approximately USD 9.9 billion year-of-expenditure Governance Forecast through 2035, including contingency |
| 463 | New Manila airport first-runway delivery | In Progress | Null: PHP 735/740 billion airport/aerotropolis totals are not a runway-phase budget |
| 475 | Entire Nouvelle Route du Littoral completion | In Progress | Approximately EUR 2.5 billion latest opened explicit whole-road estimate, dated September 2024; newer Phase 2 appraisal separate |
| 530 | Complete 23-km Kvesheti–Kobi road | In Progress | Approximately GEL 1.2 billion, confirmed in project FAQ and October 2026 reporting |
| 571 | JFK New Terminal One first 14-gate phase | In Progress | Null: USD 9.5 billion covers the full 23-gate terminal |
| 619 | Messina bridge final-design approval, August 2025 | Proposed | EUR 13.532 billion whole link, including road and railway connections |
| 636 | McCook Reservoir Stage 2 | In Progress | Null: combined-stage tables and individual contracts do not establish a Stage 2-only total |
| 674 | O’Hare terminal redevelopment program | In Progress | USD 12.5 billion in August 2026 aviation reporting; narrower approvals/contracts distinguished |
| 2166 | Hillcrest replacement hospital major-construction start | Proposed | Null: five-phase campus range is not the redesigned approximately 300-bed hospital budget |
| 2220 | CHOP Roberts Children’s Health tower topping out | In Progress | USD 2.59 billion new patient tower, distinct from the USD 125 million gift |

**Sites Reservoir (192)** was still carrying a 2024 start headline and date. The Authority’s October 2026 baseline and contractor-outreach page now anticipate construction in **2027**, so the headline/description are corrected and the native date becomes **December 31, 2027**, an estimated year anchor. This remains a construction-start pin, not a reservoir-opening pin. The latest baseline distinguishes the **USD 9.9 billion year-of-expenditure Governance Forecast** from the **USD 7.5 billion constant-2024-dollar Governance Estimate** and **USD 6.6 billion Management Estimate**. The source itself supplies those bases; no inflation calculation or FX conversion was performed. The forecast includes governance contingency and construction/noncontract scope, not recurring operating costs.

**New Manila (463)** moves from the older Q2 2028 target to **December 31, 2028**, an estimated year-end anchor for the CEO’s September 2026 first-runway target. June reporting explicitly describes runway land surcharging, establishing actual work. **Kvesheti–Kobi (530)** moves from spring 2027 to **December 31, 2028**, an estimated year anchor for October 2026 reporting; tunnel excavation is finished but bridge and tunnel-system work continues. **JFK Phase 1 (571)** moves from November 2026 to **March 31, 2027**, an estimated first-quarter anchor for the terminal’s early-2027 update. Its headline and description are corrected. None of these anchors is presented as an exact announced opening day, and every changed start date preserves the original event duration.

**Hillcrest (2166)** is specifically the replacement inpatient hospital, not the already opened outpatient pavilion or the whole campus. UC San Diego lists **Design Development**, with major construction anticipated in summer 2027; the advance-work phase is only described as expected in late summer 2026. No elapsed target establishes actual commencement. Its headline/description now say the start is targeted; June 21, 2027 remains explicitly an estimated seasonal anchor. Campus-wide USD 2.5–3 billion, older differently sized hospital estimates, multi-project capital needs and unverified aggregator ranges are not assigned as the new hospital’s current budget.

**Messina (619)** remains Proposed at its historical final-design approval. The project company conditioned works on legal effectiveness, and its 2025 accounts record the later Court of Auditors registration refusal. The approval does not establish construction or current legal effectiveness. **CHOP (2220)** remains In Progress at the January 28, 2026 final-beam placement, before its planned 2028 patient opening; the operator page was successfully opened by a direct HTTPS request after the research tool returned 403.

Costs retain their exact scope and evidence date. Nouvelle Route du Littoral’s **EUR 2.5 billion** is the latest opened explicit whole-road estimate, reported in September 2024; the **EUR 1.07 billion** July 2026 EIB estimate is Phase 2-only, not a cumulative replacement or a figure to add to the already inclusive whole-road estimate. A revised cumulative budget remains a follow-up. Its unsupported USD-denominated lower/upper bounds are cleared when saving the sourced EUR figure. O’Hare’s **USD 12.5 billion** August 2026 report supersedes the saved USD 12 billion; narrower ORDNext approvals and the individual Concourse D contract have different scopes/cost bases. Its 2034 estimated terminal-program anchor remains qualified against component schedules. McCook retains the operator’s explicitly estimated **December 31, 2032** target; Stage 1 operation does not complete the excavated Stage 2. No airport master-plan figure, shared-stage budget, gift or loan was allocated to an unsupported individual phase.

Accounting per environment is **1,320 assigned + 922 queued + 334 excluded + 11 previously reviewed overlaps = 2,587 screened candidates**. Assigned statuses are **639 Proposed, 414 In Progress and 267 Completed**. Including the separate original 68-pin batch, **1,388 reviewed eligible pins per environment** carry status tags. Remaining groups are 251 agency/project identities, 109 tracker parcels, 90 Epoch trajectories, five housing milestones, 43 conflicting/halted scopes, 35 grid-request identities and 389 individual source/phase questions. Earlier unresolved research findings remain preserved.

Replay sequentially:

```sh
node --env-file=.env.local scripts/construction/research.mjs --manifest scripts/construction/research-round6-2026-10-24.json
node --env-file=.env.local scripts/construction/status.mjs --manifest scripts/construction/research-round6-2026-10-24.json
python3 scripts/construction/reviewQueue.py --manifest scripts/construction/research-round6-2026-10-24.json
```

The metadata writer now accepts an explicitly recorded original title when applying a source-supported headline correction; the original row hash, author guard, affected-field comparison and unrelated-field verification remain required. Both original and saved title states passed replay validation. All ten public JSON records per environment passed status, author, native cost/currency, citation, corrected-date and revised-headline checks. Authenticated native pages for Sites, New Manila, Kvesheti–Kobi, JFK Phase 1, Messina, Hillcrest and CHOP returned HTTP 200 with research and correct statuses. Before snapshots, opened evidence and page captures remain ignored under `.scrape/construction-status-research-round6-2026-10-24/`. Syntax/lint, accounting, whitespace and reconciliation idempotence checks passed. No deployment, production build, VM restart or resize was performed.


## Seventh research round — 50 records reviewed

Reviewed **50 queued records** and saved/verified **49 in both environments: 15 Proposed, 27 In Progress and seven Completed**. Freedom Village I & II (7149) remains untagged pending exact phase evidence. The queue decreases from **922 to 873**. The [round-seven research/replay catalog](../scripts/construction/research-round7-2026-10-24.json) retains opened HTTPS sources, short verbatim excerpts, cost qualifications, original pin hashes, field patches and per-environment verification receipts. Thirty-two records have sourced native costs; seventeen retain null cost/currency with explicit scope or source-access gaps. Original authors, threads, unrelated tags and unpatched fields were preserved.

| Pin | Reviewed scope | Status | Native cost |
| --- | --- | --- | --- |
| 2163 | SAN complete 30-gate New Terminal 1 | In Progress | USD 3.834 billion |
| 2180 | Fort Worth convention-center Phase 2 | Proposed | USD 606 million |
| 2184 | Austin Concourse B and tunnel construction authorization | Proposed | USD 1.031 billion construction authorization; design separate |
| 2191 | SEA S Concourse major-construction start | Proposed | USD 2.5 billion |
| 2193 | LAX SkyLink systems testing | In Progress | USD 3.34 billion |
| 2198 | Mass General Ragon first tower | In Progress | Null: exact scope/source gap recorded |
| 2199 | White Stadium rebuild | In Progress | USD 325 million |
| 2201 | Capital One Arena rebuild | In Progress | USD 1 billion (published lower threshold) |
| 2209 | Broncos Burnham Yard stadium | Proposed | Null: exact scope/source gap recorded |
| 2211 | National Western Equestrian Center planned actual start | Proposed | Null: exact scope/source gap recorded |
| 2214 | Hard Rock guitar-tower topping out | In Progress | Null: exact scope/source gap recorded |
| 2237 | Trunk Road T2 / Cha Kwo Ling Tunnel opening | In Progress | HKD 16.017 billion construction estimate; investigation/design separate |
| 2244 | King Salman Stadium design/preconstruction | Proposed | Null: exact scope/source gap recorded |
| 2248 | Mumbai Aqua Line final Phase 2B opening | Completed | INR 122 billion |
| 2254 | GTX-A Samseong station and reinforcement | In Progress | Null: exact scope/source gap recorded |
| 2257 | Yongsan public site/infrastructure groundbreaking | In Progress | KRW 12 trillion |
| 2264 | Noida Airport Phase I commercial opening | Completed | INR 112 billion |
| 2278 | Congonhas terminal expansion | In Progress | BRL 2 billion (published lower threshold) |
| 2279 | São Paulo Line 2 Vila Prudente–Penha | In Progress | BRL 15 billion |
| 2281 | Scarborough subway extension | In Progress | Null: exact scope/source gap recorded |
| 2287 | Cablebús Line 4 | In Progress | MXN 4.7 billion (published lower threshold) |
| 2290 | Hillingdon replacement-hospital main build | Proposed | GBP 1–1.5 billion capital envelope; native price is lower endpoint |
| 2626 | Mailuu-Suu remediation through final work parts | In Progress | EUR 40.1 million |
| 2633 | LNG Canada initial commercial-export opening | Completed | Null: exact scope/source gap recorded |
| 2653 | Hebron topsides mating/integration | In Progress | Null: exact scope/source gap recorded |
| 2932 | B&W Canadian refinery scrubber contract | Proposed | USD 40 million |
| 2938 | B&W CO2-capture engineering/long-lead notice | Proposed | USD 80 million |
| 2940 | B&W air-quality retrofit development/engineering notice | Proposed | USD 130 million |
| 2960 | ESMC Dresden fab topping out | In Progress | EUR 10 billion (published lower threshold) |
| 3340 | Ocean Beach adaptation major-construction start | Proposed | USD 175 million |
| 3376 | LAX Terminal 4 topping out | In Progress | Null: exact scope/source gap recorded |
| 3391 | Lighthouse campus October 2025 announcement | Proposed | USD 15 billion |
| 3395 | Metro D Line Section 3 to Westwood/VA | In Progress | USD 3.6 billion including finance charges, December 2024 phase report |
| 3406 | Saline campus October 2025 announcement | Proposed | USD 16 billion |
| 3415 | Saline April 2026 financing milestone with actual work | In Progress | USD 16 billion |
| 3444 | Saline June 2026 active campus construction | In Progress | USD 16 billion |
| 3834 | Vuori original Encinitas store opening | Completed | Null: exact scope/source gap recorded |
| 4916 | METRO Green Line Extension passenger opening | In Progress | USD 2.86 billion |
| 4917 | Tapia bridge first-half opening | In Progress | Null: exact scope/source gap recorded |
| 4918 | Île-aux-Tourtes first-structure opening | In Progress | Null: exact scope/source gap recorded |
| 4919 | Hassyan 180MIGD water plant, all phases | In Progress | AED 3.377 billion |
| 5101 | Long Thanh Airport Phase I | In Progress | VND 109.1 trillion |
| 14012 | BYD Szeged December 2023 factory announcement | Proposed | EUR 4 billion |
| 15657 | LG Paraná February 2026 investment announcement | In Progress | USD 310 million |
| 15674 | CATL Debrecen first two cell lines in trial | In Progress | Null: exact scope/source gap recorded |
| 19330 | Amazon Toaster civil/core-and-shell package | Proposed | USD 100 million |
| 7101 | Renaissance at Reservoir Hill, 64 placed-in-service homes | Completed | Null: exact scope/source gap recorded |
| 7112 | The Allegheny at 401 W Commons | Completed | Null: exact scope/source gap recorded |
| 7158 | Imani Village Phase I, 74 homes | Completed | Null: exact scope/source gap recorded |
| 7149 | Freedom Village I & II combined scope | Still queued | Phase I USD 17.5m is not a verified combined-phase total |

Historical events retain their own stage. The Lighthouse, Saline and BYD factory announcements remain **Proposed** at announcement, even where later campus work is verified. The separate Saline April/June milestones are **In Progress** because their releases explicitly describe actual construction. B&W limited notices cover engineering, development and procurement; those notices alone do not establish installation at the unnamed host plants. These are equipment-retrofit scopes, with no invented host generation capacity. ESMC, Hard Rock, LAX Terminal 4, Hebron and CATL testing/topping/mating milestones remain **In Progress**, rather than completed plants or venues.

Several exact-scope costs differ from the saved broad totals. SAN’s **USD 3.834bn** covers all 30 New T1 gates, excluding the wider capital program. Austin’s **USD 1.031bn** authorization excludes its separately approved design amount. Mumbai’s approximately **INR 12,200 crore** is Phase 2B, while Noida’s approximately **INR 11,200 crore** is the opened Phase I. Long Thanh Phase I is approximately **VND 109.1 trillion**. Native units expand source-stated crore/trillion figures without FX conversion. The Saline campus’s **USD 16bn** project value corrects the unsupported USD 7bn on its June milestone; debt, equity and equipment are not added to that value. Yongsan’s approximately **KRW 12tn** is the public site/infrastructure stage, separate from the entire district. IAEA’s revised Mailuu-Suu table separates **EUR 40.1m remediation**, **EUR 2.5m studies** and **EUR 42.6m combined total**; the remediation figure replaces an older grant amount.

Published whole-project costs are withheld from narrower phases: Ragon’s first tower, Hard Rock’s guitar tower, LAX Terminal 4, Hebron mating, Tapia’s first bridge half, Île-aux-Tourtes’ first structure and CATL’s first two trial lines do not receive a whole-campus/project total. LNG Canada’s first-export milestone is distinguished from later train ramp-up and the broader pipeline/upstream investment. Scarborough’s stations/rail/systems contract is not an invented all-in extension cost. Hillingdon’s **GBP 1–1.5bn** envelope is saved with both bounds; other unsupported old bounds are cleared. Source dates and continuing budget gaps are explicit, including Metro Section 3’s December 2024 budget and Ocean Beach’s approval-era estimate. No newer figure for another phase silently replaces those costs.

Date corrections preserve the original event duration. The official T2 banner moves its opening target to **December 6, 2026**, still estimated before commissioning. After initial research-tool timeouts, the complete 2026 government budget PDF downloaded successfully over HTTPS. Its exact project row verifies **HKD 16.017bn construction cost/approved estimate**, with **HKD 133.6m investigation/design** separately stated. The native cost uses the published construction figure, without adding separate contract values. Ragon’s first tower moves to an estimated **2027 year anchor**. Fort Worth uses an estimated early-2030 quarter anchor, and National Western uses an estimated early-2027 quarter anchor for actual construction, separate from its ceremonial groundbreaking. Mailuu-Suu moves to an estimated **2032 year anchor**. Metro Section 3 uses an estimated fall-2027 anchor; Tapia’s first half uses an estimated spring-2027 anchor, with the second half separately due in 2030. Austin’s early-2030s and Samseong’s conflicting 2028 dates remain expressly provisional. Scarborough’s 2033 date remains an unconfirmed reported estimate, not an official opening promise.

LNG Canada’s native opening moves from its July 1 publication date to the operator-confirmed **June 30, 2025** initial export event. HUD’s exact Renaissance record MDA20060090 confirms **2006 placed in service**, while the branch-specific Allegheny property record gives **built in 2000**. Both replace October 2026 listing-check dates with explicitly estimated year anchors. Allegheny’s 75 total units and 71 income-restricted apartments are distinguished. Imani’s historical August 16, 2022 opening covers **Phase I’s 74 homes**; the title now identifies that scope. Vuori’s original completed Encinitas store is verified, but the exact retained June 2016 party timestamp remains estimated because the contemporary article is inaccessible.

**Freedom Village I & II (7149)** remains queued under conflicting/mixed-phase scope. The opened New Jersey release verifies the 70-home first building and USD 17.5m development cost. The combined operator listing also describes a separate 55+ Phase II building; it does not establish both buildings were completed at the pin’s 2015 milestone. The release date is not assumed to be the ceremony day. Obtain separate Phase II completion/opening evidence and reconcile the combined timeline and cost before assigning a status. Earlier unresolved findings remain preserved.

Accounting per environment is **1,369 assigned + 873 queued + 334 excluded + 11 previously reviewed overlaps = 2,587 screened candidates**. Assigned statuses are **654 Proposed, 441 In Progress and 274 Completed**. Including the original separate 68-pin batch, **1,437 reviewed eligible pins per environment** carry status tags. Remaining groups are 251 agency/project identities, 109 tracker parcels, 90 Epoch trajectories, one housing milestone, 44 conflicting/halted scopes, 35 grid-request identities and 343 individual source/phase questions.

Replay sequentially:

```sh
node --env-file=.env.local scripts/construction/research.mjs --manifest scripts/construction/research-round7-2026-10-24.json
node --env-file=.env.local scripts/construction/status.mjs --manifest scripts/construction/research-round7-2026-10-24.json
python3 scripts/construction/reviewQueue.py --manifest scripts/construction/research-round7-2026-10-24.json
```

Metadata and status writes were re-read through authenticated admin APIs. All 49 public JSON records per environment were checked for one exact status, original author, native price/currency/bounds, citations and corrected dates/titles. Twelve authenticated native pages per environment were checked for the research block and status. Private snapshots, downloaded evidence and page captures remain ignored under `.scrape/construction-status-research-round7-2026-10-24/`. Catalog accounting, source validation, syntax/lint, whitespace and reconciliation idempotence checks passed. No deployment, production build, VM restart or resize was performed.


## Eighth research round — 50 records reviewed

Reviewed **50 queued records** and saved/verified **44 in both environments: 23 Proposed, 16 In Progress and five Completed**. Six retain specific physical-stage or phase gaps without forced tags. The queue decreases from **873 to 829**. The [round-eight research/replay catalog](../scripts/construction/research-round8-2026-10-24.json) retains 69 source entries for resolved records, short verbatim excerpts, native cost qualifications, original row hashes, field patches and verification receipts, plus opened evidence and precise follow-ups for all six unresolved records. Seventeen records have source-quoted native costs; twenty-seven retain null exact-scope costs. No FX conversion was performed. Original authors, parent links, unrelated tags and unpatched fields were preserved.

| Pin | Exact reviewed scope | Status | Native cost |
| --- | --- | --- | --- |
| 501 | Jakarta sea-wall start announcement, January 2026 | Proposed | Null: exact scope/source gap recorded |
| 567 | Eiffel twentieth painting campaign during Olympic preparations | In Progress | Null: exact scope/source gap recorded |
| 681 | Brooklyn Tower built and occupied residential scope | Completed | USD 750 million published development estimate; takeover/debt separate |
| 823 | Volvo Ghent truck-factory CO2-free conversion | Completed | Null: exact scope/source gap recorded |
| 2655 | ITER PF1 manufactured coil and completed delivery | Completed | Null: exact scope/source gap recorded |
| 3244 | Midway Rising whole redevelopment at deal negotiation | Proposed | USD 4.2 billion |
| 3250 | SANDAG airport rail-link procurement/planning | Proposed | Null: exact scope/source gap recorded |
| 3400 | Lighthouse first customer-delivery milestone | In Progress | Null: exact scope/source gap recorded |
| 3454 | Saline first customer-delivery milestone | In Progress | Null: exact scope/source gap recorded |
| 4915 | Sites Reservoir water-right vote before construction | Proposed | USD 9.9 billion |
| 4939 | Caprock LBB-01 first-building service target | In Progress | Null: exact scope/source gap recorded |
| 4941 | Kazakhstan Data Center Valley first 50MW facility | In Progress | Null: exact scope/source gap recorded |
| 5907 | NextEra/Google new-campus partnership announcement | Proposed | Null: exact scope/source gap recorded |
| 15744 | GE Vernova Sesto factory expansion announcement | Proposed | USD 30 million |
| 15754 | East River battery-storage construction | In Progress | USD 132 million July 2021 estimate; updated account remains a gap |
| 15798 | Fort Bliss conditional campus/lease selection | Proposed | USD 2 billion |
| 15814 | EdgeCore Shannon Hill land/development announcement | Proposed | USD 17 billion |
| 15822 | Hassayampa Ranch rezoning | Proposed | Null: exact scope/source gap recorded |
| 15827 | IREN Emerald two-phase campus plan | Proposed | USD 50 billion reported two-phase infrastructure/server plan value |
| 15833 | OpenAI Camellia full four-building campus plan | Proposed | USD 30 billion (published lower threshold) |
| 15846 | Stak North Slope proposed campus | Proposed | USD 10 billion (published lower threshold) |
| 15859 | Tract South Valley acquisition/master planning | Proposed | Null: exact scope/source gap recorded |
| 15866 | Zenith Roswell county-approved campus proposal | Proposed | USD 11.7 billion |
| 15995 | Hyperscale Dowagiac proposed expansion to 340MW | Proposed | Null: exact scope/source gap recorded |
| 16304 | AVAIO Taurus initial 116MW delivery | In Progress | Null: exact scope/source gap recorded |
| 16306 | Crane Forest Grove campus construction | In Progress | Null: exact scope/source gap recorded |
| 16308 | Microsoft Alviso/San Jose actual site construction | In Progress | Null: exact scope/source gap recorded |
| 16328 | Aligned Phoenix Shippingport groundbreaking | In Progress | Null: exact scope/source gap recorded |
| 16331 | Prime full five-building Avondale campus | In Progress | USD 3 billion (published lower threshold) |
| 16412 | Prime full five-building Avondale campus, separate existing pin | In Progress | USD 3 billion (published lower threshold) |
| 16333 | Vantage Trident third city review | Proposed | Null: exact scope/source gap recorded |
| 16343 | Google New Florence campus construction | In Progress | USD 13.4 billion real-property improvements; equipment/bonds separate |
| 16345 | Prometheus Evanston permitted proposal | Proposed | USD 10 billion historical operator flagship estimate; revised design budget remains a gap |
| 16372 | Google Storey County existing operating campus | Completed | Null: exact scope/source gap recorded |
| 16383 | Google Omaha existing built campus | Completed | Null: exact scope/source gap recorded |
| 16384 | Meta Aiken build before spring-2027 operation | In Progress | USD 800 million (published lower threshold) |
| 16399 | Rowan Bauxite II construction/topping out | In Progress | Null: exact scope/source gap recorded |
| 16459 | Microsoft Malaga March-2023 concept session | Proposed | Null: exact scope/source gap recorded |
| 16469 | NAS Lemoore data-center/energy plan | Proposed | Null: exact scope/source gap recorded |
| 16472 | Prologis STEM Park Building D concept | Proposed | Null: exact scope/source gap recorded |
| 16481 | DC BLOX Nashville Grassmere evaluation | Proposed | Null: exact scope/source gap recorded |
| 16490 | Archer Faribault environmental review | Proposed | Null: exact scope/source gap recorded |
| 17021 | Switch Tahoe Reno 3 historical site development | In Progress | Null: exact scope/source gap recorded |
| 18222 | Aguas Marítimas desalination/conveyance approval | Proposed | USD 5 billion |
| 16568 | Chirisa Piscataway PNJ-01/02: 90 MW Campus Power, 2027 Delivery Plan | Still queued | Exact stage/phase and cost follow-up retained |
| 4976 | Bitdeer AI's 21.7MW A201 Johor Data Center Energizes | Still queued | Exact stage/phase and cost follow-up retained |
| 4977 | Bitdeer AI's 9.5MW A102 Malaysia Data Center Energizes | Still queued | Exact stage/phase and cost follow-up retained |
| 15780 | Aligned West Jordan SLC-05 to SLC-07: 198-338 MW Data Center Expansion in Utah, Gas-Turbine Powered, Cost Not Published | Still queued | Exact stage/phase and cost follow-up retained |
| 15865 | xAI Colossus 2 Data Center: 735 to 1,300 MW in Memphis, Tennessee, Powered by Gas Turbines in Southaven, NAACP Sues Over Permits | Still queued | Exact stage/phase and cost follow-up retained |
| 16422 | Rowan Bauxite I:Substantial Completion in 2025; Financing Is Not Campus Cost | Still queued | Exact stage/phase and cost follow-up retained |

**Historical stage and physical progress.** EdgeCore’s June 2025 development announcement, Tract’s October 2023 land acquisition, GE Vernova’s factory-expansion announcement, the NextEra/Google partnership and Malaga’s March 2023 concept session remain Proposed at those historical milestones. Later work on another phase does not rewrite the announcement. Actual progress is separately supported for Lighthouse by Wisconsin DNR, Saline by Oracle, Crane by its contractor/investor, Microsoft Alviso by Microsoft’s earthmoving/soil-remediation update, Bauxite II by Rowan’s topping-out post, and Tahoe Reno 3 by Switch’s dated issuer filing. Prime’s commissioned substation does not complete its five-building campus. Caprock’s first building and Kazakhstan’s first 50MW facility are separated from later campus buildout. The latter’s August 13, 2026 report explicitly documents excavation and foundations; purchased substation capacity is not operating compute.

**Costs follow their own scope and basis.** Midway Rising’s latest opened October reporting gives **USD 4.2bn whole-redevelopment construction cost**, superseding USD 3.9bn, with a proposed early-2028 start rather than the older 2027 aspiration. Sites uses the Authority’s **USD 9.9bn** October baseline Governance Forecast in year-of-expenditure dollars through 2035, including contingency. Stak’s chief strategy officer now estimates **more than USD 10bn**, replacing the earlier USD 500m state-document figure. OpenAI’s compute-strategy vice president is reported estimating Camellia at **more than USD 30bn full buildout**, replacing the earlier USD 20bn county figure. Native lower bounds preserve those published thresholds; no amount is manufactured by adding finance, equipment, infrastructure contributions or benefits.

Google New Florence is **In Progress** based on actual July construction reporting. The May 21 cost-benefit-plan account separately quotes **approximately USD 13.4bn in real-property improvements**. That is the saved construction/development basis, distinguished from **USD 56–87.5bn personal-property/equipment investment**, **USD 100bn bond authorization ceiling**, and the operator’s broader **USD 15bn Missouri infrastructure announcement**. These bases are not interchangeable. Prime’s own full-campus investment is **more than USD 3bn**, excluding its customers’ separate computing investment. Both existing Prime pins receive the same verified whole-campus scope without deleting or merging them. Meta’s **USD 800m-plus** Aiken investment retains its lower threshold and a spring-2027 target, not completed operation. Fort Bliss’s attributed **USD 2bn per base project** is not the combined USD 4bn two-site figure.

Hassayampa’s **USD 25bn** is a potential completed-site **valuation**, not construction expenditure; native price/currency are cleared and the headline makes that distinction. Crane’s **USD 275,259,195** is qualified-property investment in a tax agreement, not a source-quoted all-in campus budget; it is cleared from the native price while the tax figure remains evidence context. Taurus’s **USD 6bn** is the whole campus, not the pinned first 116MW delivery phase, so native price becomes null. Lighthouse/Saline first customer-delivery phases do not receive the USD 15bn/USD 16bn whole-campus totals from their separate project-announcement pins. Caprock’s regional USD 5bn, Kazakhstan’s broader investment agreements, Bauxite construction debt, Switch’s USD 65.3m quarterly multi-building spending, and forecast cloud revenue are not assigned as individual building costs.

Some retained cost figures are explicitly dated and remain budget follow-ups: Brooklyn Tower’s published **USD 750m** development estimate is distinct from loans and the USD 672m takeover; East River’s **USD 132m** is the July 2021 exact battery-project estimate, with later construction but no newer exact budget established; Evanston’s **USD 10bn** is the older operator flagship estimate, with a revised design and conditional future construction. Emerald’s **USD 50bn** is an attributed two-phase economic-development plan including infrastructure and servers, not a new operator tender. A later revised county-plan estimate remains unverified. The native cost notes retain these dates and limitations. No unrelated power-generation project’s cost or capacity was imported into a factory retrofit, battery, data-center or ITER-coil scope.

**Jakarta’s date correction.** Pin 501 previously used **September 30, 2026**, the end of the proposed construction month. Its own event is the governor’s announcement, explicitly dated **January 20, 2026** in both opened accounts. Native start moves to that confirmed announcement date, preserving the original duration. Later reporting still awaited central direction. Ongoing NCICD walls and Demak’s separate mangrove/sea-wall projects do not prove the announced Jakarta 19km scope actually started. USD 1bn annual spending over eight years is not multiplied into a source quote, and the Java-wide up-to-USD 80bn estimate is not allocated to Jakarta.

**Eiffel’s repaint is not completed by ring installation.** The operator confirms **June 7, 2024** as the Olympic-ring installation, not repaint completion. The opened public audit says almost all of the twentieth painting campaign was done before the Games and lists the wider campaign horizon through 2026. The historical painting scope is therefore In Progress, the headline is qualified, and June 7 remains expressly an estimated Olympic-preparation anchor rather than a finished-repaint day. The old **USD 60m** is cleared: older reporting stated **EUR 60m**, while the newer audited **EUR 142.5m** painting envelope also includes the next campaign and contingencies. Individual contract amendments are not summed into an invented twentieth-campaign total.

**Completed scopes remain precise.** Volvo explicitly presents its Ghent truck factory’s CO2-free conversion as operational in September 2007; the separate Volvo Cars factory, Tuve conversion and prize fund are excluded. ITER’s Completed status applies only to PF1’s manufactured-and-delivered coil, not ITER installation, fusion operation or a commercial power plant. Brooklyn Tower’s residential building is built and occupied; its permit’s permanent/extended-temporary descriptions and later amenities remain explicit caveats, with April 25, 2025 estimated as the certificate milestone rather than first occupancy. Google’s Storey County and Omaha campuses are explicitly built/operating. Storey County’s 2020/2021 operator-year discrepancy and Omaha’s 2022 built/announcement wording remain date-precision gaps; statewide investment is not apportioned into campus prices or unverified future expansions.

**Six unresolved cases retain opened-source follow-ups:**

- **4976, Bitdeer A201:** contracted revenue, procured racks and future energization do not establish the host building’s exact construction/fit-out/commissioning stage. Verify the named site and actual works; USD 1.7bn is expected five-year revenue.
- **4977, Bitdeer A102:** sold-out capacity/customer prepayments and Q1-2027 service target do not establish a physical-stage receipt. USD 800m-plus is expected revenue, not cost.
- **15780, Aligned SLC-05–07:** shared-site turbine permission does not map the three tracker building phases to actual work; verify exact operator/contractor/building evidence and separate scope costs.
- **15865, xAI Colossus 2:** compute buildings, Southaven turbines and operating/expansion capacity are mixed. Turbine operation or litigation is not a full compute-campus completion receipt; the adjacent-building permit is not campus cost.
- **16422, Bauxite I:** substantial completion in 2025 does not establish full four-building final completion, all capacity energized or commercial operation at the precise pinned milestone. Verify handover/occupancy/commissioning, or exact remaining works; financing is not total cost.
- **16568, Chirisa PNJ-01/02:** reserved 2027 delivery and campus power availability do not distinguish planned shells from active fit-out or commissioning. Verify the exact existing-shell and adjacent-greenfield phases; other Chirisa campuses explicitly in construction are not evidence for PNJ.

Five headlines are qualified for Eiffel, Hassayampa, Camellia, Stak and the proposed Dowagiac expansion. Hyperscale’s existing approximately 30MW operation does not complete its planned 340MW expansion. Other retained target dates remain expressly estimated, with unsupported legacy markers identified as unverified rather than promoted to operator forecasts. Current Taurus Q3-2027 delivery supersedes its release’s H1-2027 horizon. Expired Crane/East River targets never establish actual operation. Permits and procurement at Nashville, Faribault, NAS Lemoore and STEM Park do not establish physical work.

Accounting per environment is **1,413 assigned + 829 queued + 334 excluded + 11 previously reviewed overlaps = 2,587 screened candidates**. Assigned statuses are **677 Proposed, 457 In Progress and 279 Completed**. Including the original separate 68-pin batch, **1,481 reviewed eligible pins per environment** carry status tags. Remaining groups are 251 agency/project identities, 109 tracker parcels, 90 Epoch trajectories, one housing milestone, 45 conflicting/halted scopes, 35 grid-request identities and 298 individual source/phase questions. Earlier unresolved findings remain preserved.

Replay sequentially:

```sh
node --env-file=.env.local scripts/construction/research.mjs --manifest scripts/construction/research-round8-2026-10-24.json
node --env-file=.env.local scripts/construction/status.mjs --manifest scripts/construction/research-round8-2026-10-24.json
python3 scripts/construction/reviewQueue.py --manifest scripts/construction/research-round8-2026-10-24.json
```

Metadata and status saves were re-read through authenticated admin APIs. All 44 public JSON records per environment were checked for one exact status, original author, native price/currency/bounds, source citations and corrected dates/titles. Twelve authenticated native pages per environment were checked for the research block and status. Opened evidence, private before snapshots and page captures remain ignored under `.scrape/construction-status-research-round8-2026-10-24/`. Source/identity validation, catalog accounting, syntax/lint, task-file whitespace and reconciliation idempotence checks passed. No deployment, production build, VM restart or resize was performed.

Final checks also reopened Prometheus’s August 27 power-permit recommendation and October 14 Trident alternative-site reporting. Neither is a physical groundbreaking or completed relocation. Chaves County’s generic August discussion did not adjudicate Zenith’s construction. All six unresolved raw pin rows were re-read in both environments and remain unchanged and without construction-status tags.


## Ninth opened-source round — 50 records reviewed, 35 resolved

Reviewed **50 queued records per environment**: transport, desalination, industrial refurbishment, housing and data-center phases. Saved and re-read **35 supported assignments in local and production: 18 Proposed, 14 In Progress and three Completed**. The other **15 remain queued** with the opened evidence and specific withdrawal, identity, inspection-only or phase gaps below. No tag was forced to reach the batch size. The [round-nine research/replay catalog](../scripts/construction/research-round9-2026-10-24.json) records sources, short verbatim quotes, exact scope/cost reasoning, original hashes and saved receipts.

**16 records have sourced native costs; 19 retain null exact-scope costs.** Original authors, thread links, other tags, existing citations and earlier research were preserved. Fourteen tracker headlines/descriptions are rewritten around verified scope rather than unsupported aggregate MW or parcel defaults. Glenarden’s headline now identifies completed Phase I, and Jordan’s headline separates financial close from physical construction. RadiusDC’s native groundbreaking date changes from September 9 to **September 4, 2025**, explicitly dated by the operator; original duration is preserved. Other unsupported target-day precision is marked estimated rather than promoted to a verified opening.

| Pin | Reviewed scope | Status | Native cost and basis |
| --- | --- | --- | --- |
| 276 | Lima Metro Line 2 Fully Open | In Progress | Null: exact-scope cost gap recorded |
| 424 | Melbourne Airport Rail Link | In Progress | Null: exact-scope cost gap recorded |
| 426 | Al Maktoum International Airport Phase 1 | In Progress | Null: exact-scope cost gap recorded |
| 433 | Australia High Speed Rail Reaches Sydney | Proposed | Null: exact-scope cost gap recorded |
| 494 | Goldin Finance 117 Targeted to Finally Complete in Tianjin | In Progress | Null: exact-scope cost gap recorded |
| 570 | Queensland Reverses Course, Commits to Rebuilding Paradise Dam Wall in Place | Proposed | Null: exact-scope cost gap recorded |
| 2969 | NVIDIA Secures the PORTS-Pike AI Campus in Ohio With SB Energy and OpenAI | Proposed | Null: exact-scope cost gap recorded |
| 6117 | Iraq Awards Italy's Trevi the Contract to Repair Mosul Dam | Proposed | EUR 273,000,000 |
| 7151 | Glenarden Hills Phase I Completes 114 Family and Senior Homes | Completed | Null: exact-scope cost gap recorded |
| 18225 | AIIB Approves $45M for ACWA Power's Caspian Desalination Plant in Azerbaijan | Proposed | USD 431,500,000 |
| 18226 | Alkimos Desalination Plant Finishes Its Two Undersea Tunnels | Completed | Null: exact-scope cost gap recorded |
| 18244 | Cyprus Brings 10,000 m3/Day Mobile Desalination Unit Online at Limassol Port | Completed | Null: exact-scope cost gap recorded |
| 18248 | Doheny Ocean Desalination Plant Heads Toward Construction Notice in Nov 2026 | Proposed | Null: exact-scope cost gap recorded |
| 18251 | Energy Recovery Wins PX Q650 Order for a Top-10 Saudi Desalination Plant | Proposed | Null: exact-scope cost gap recorded |
| 18252 | Metinvest Adria Piombino Electric Steel Plant: 3.2B EUR, 2.7 Mt/yr, About 1.8 TWh/yr of Power, Construction May Slip to 2027, Italy | Proposed | EUR 3,200,000,000 |
| 18253 | Namibia's Erongo Sunam Desalination Plant Targets 2026-2028 Build | Proposed | NAD 2,100,000,000 (published lower threshold; older feasibility basis) |
| 18256 | Oman's 300,000 m3/Day Ghubrah III Desalination Plant Targets Q1 2027 | In Progress | OMR 127,000,000 (December 2024 construction estimate; financing separate) |
| 18258 | Tiwai Point Smelter Line 4 Restart: 50 MW More Power for New Zealand's 572 MW Aluminium Smelter, Contact Energy Deal Targets 2030 | Proposed | Null: exact-scope cost gap recorded |
| 18263 | Jordan’s Aqaba-Amman Desalination Project Targets Q4 Financial Close | Proposed | USD 6,000,000,000 |
| 18264 | Chennai's 400 MLD Perur Desalination Plant Heads Toward End-2026 Finish | In Progress | INR 58,140,000,000 (quoted design-build-operate project estimate) |
| 18267 | Conagua Awards Rosarito Desalination Plant to Cox, Lowest of Three Bids | Proposed | MXN 5,291,565,898.31 (awarded contract, excluding IVA) |
| 19193 | Nebius Birmingham AI Factory Under Construction | In Progress | Null: exact-scope cost gap recorded |
| 19203 | Microsoft Granger Data Center Enters Site Construction | In Progress | Null: exact-scope cost gap recorded |
| 19211 | Metrobloks Martindale-Brightwood Data Center Proposal | Proposed | USD 500,000,000 |
| 19216 | Edged Des Moines 13.2MW Data Center Under Construction | In Progress | USD 187,000,000 |
| 19217 | Meta Davenport Data Center Planning | Proposed | Null: exact-scope cost gap recorded |
| 19223 | Microsoft La Porte Data Center Site Works | In Progress | USD 1,000,000,000 (historical initial-campus investment) |
| 19235 | TPC Data Center MidAtlantic Laurel Proposal | Proposed | Null: exact-scope cost gap recorded |
| 19241 | Compass Meridian Data Center Campus Construction | In Progress | USD 10,000,000,000 |
| 19244 | University of Michigan–Los Alamos Research Computing Center Plans | Proposed | USD 1,250,000,000 |
| 19248 | Metrobloks Liberty Planned 150MW Data Center | Proposed | USD 1,400,000,000 |
| 19275 | Cologix COL5 Lewis Center Campus Under Construction | In Progress | USD 1,000,000,000 |
| 19277 | 5C Springfield Data Center Retrofit and Expansion | In Progress | USD 1,300,000,000 |
| 19284 | RadiusDC Nashville I Groundbreaking | In Progress | Null: exact-scope cost gap recorded |
| 19297 | Google Buffalo Putnam County Data Center Planning | Proposed | Null: exact-scope cost gap recorded |

The completion assignments are deliberately limited. **Glenarden is Phase I’s 114 homes/community building in March 2019**, not the later 430-home masterplan. Pennrose’s USD108m all-phases cost is not assigned to Phase I; county material indicating a USD34.1m phase budget remains a source-body verification follow-up. **Alkimos is only the two finished undersea tunnels**, not the full plant, remaining connections or commissioning. Its AUD2.8bn plant-wide budget is cleared from this component milestone. **Limassol is the individual 10,000m³/day mobile desalination unit in normal operation after tests**, not all Cyprus emergency/permanent water projects.

Actual physical work supports Melbourne’s first railway stage, resumed Goldin 117 construction, unfinished Lima Line 2, Al Maktoum piling/excavation and Ghubrah III construction. On data centers, Microsoft’s Granger account documents active dusty site works and La Porte’s operator update confirms grading before vertical construction. Edged’s actual groundbreaking is distinct from its delivery forecast. Cologix’s COL5 has land preparation underway, 5C Springfield is being retrofitted/expanded, Compass Meridian has a verified groundbreaking, and RadiusDC’s historical start is not rewritten as a completed 2026 opening. No commissioning date is inferred from an expired tracker target.

Several old prices described a different basis. Australia’s **AUD659.6m** is design/development funding rather than high-speed railway construction. Paradise Dam’s **AUD60m** primarily funds geotechnical work, rather than its redesigned permanent wall. Al Maktoum’s USD35bn/AED128bn final-airport development is not a verified Phase-I-only total. Melbourne’s AUD4.1bn Sunshine package serves other railway projects too, and the old full-link total lacks an updated exact-scope receipt. NVIDIA’s corporate investment, community benefits and grid commitments are not PORTS-Pike’s full construction cost. Published annual exports at Tiwai are not restart expenditure.

The newest opened **AIIB September 28 project summary quotes USD431.5m** for Caspian desalination, superseding the older USD418m operator figure and separating the USD45m loan. This is the proposed main desalination-plant scope at financing approval; construction of worker accommodation is disclosed separately and does not independently establish main-train work. **IFC’s current disclosure, last updated February 25, 2026, quotes approximately USD6bn** for the Jordan desalination/conveyance project subject to optimization; the September stage report supplies no revised cost and explicitly says formal construction still awaits financial close. Trevi’s **EUR273m signed repair contract** is used as a later exact-scope cost for the historical February 2016 award; it does not change that award milestone to completed repair or imply present hydroelectric generation.

Ghubrah III’s **OMR127m** is a dated construction estimate; the newer **USD370m** financial-close package is not treated as a replacement construction quote. A revised exact construction-only total remains a follow-up. Perur’s **INR58.14bn** is explicitly the reported design-build-operate estimate including twenty years of O&M in its described scope, rather than an invented plant-only capital number. Rosarito preserves the awarded contract’s **MXN5,291,565,898.31 excluding IVA**, without currency conversion or adding its fixed/unit-price components twice. Erongo preserves the source’s **at-least NAD2.1bn** threshold and older feasibility basis pending final tender costs. Piombino’s EUR3.2bn already includes its public funding.

Local and production initially differed on Edged and Liberty prices; both now match the researched **USD187m Edged project** and **USD1.4bn Liberty total investment**. Liberty’s real/personal property components are not re-added. The unsupported USD1bn difference on the unresolved Amazon Clinton record remains untouched pending exact parcel mapping. Davenport’s assessed valuation and Nebraska-style statewide/company-wide investment figures are not construction budgets. La Porte’s USD1bn is explicitly the initial-campus historical investment, not all later adjoining land. Nebius’s multi-decade investment/tax projections are not an exact current construction total.

**Fifteen unresolved records remain unchanged and untagged in both environments:**

- **712 — LA's $14BN Airport Upgrade:** LAX record mixes a USD14bn airport-wide headline, a USD3.34bn people-mover amount and an October 2026 target. Opened July reporting describes continuing APM delivery uncertainty, not exact whole-program completion. Map the pin to APM or the full airport program and verify that scope’s physical/service milestone and current cost before tagging.
- **4736 — Sable Starts Digging Up 12 Spots on Its Pipeline to Check for Corrosion:** Sable excavation is inspection to determine whether repairs are needed, not verified construction/refurbishment. Opened Noozhawk account distinguishes exploratory validation digs from possible future repairs. Verify an actual authorized physical repair scope before applying a construction tag; no exact repair budget verified.
- **18962 — TECfusions Keystone Connect: 1,000 MW Adaptive Reuse AI Data Center on 1,395 Acres in Upper Burrell, PA:** TECfusions Keystone campus mixes the live first building, ongoing adaptive reuse and 1–3GW future buildout. The August issuer release verifies live GPU service only for the initial facility, not construction/completion of the pin’s whole 1,000MW scope. Reconcile phases and confirm actual buildout and exact cost before tagging; marketing power capacity and corporate financing are insufficient.
- **18963 — CoreWeave Lancaster AI Data Center: $6B, 300 MW Frontier GPU Supercomputer Campus in PA:** CoreWeave Lancaster’s contractor release says it will build an initial 100MW with potential to scale to 300MW. It does not establish actual physical work on the full pinned 300MW expansion. Verify initial versus full-campus stage and schedule. More than USD6bn is explicitly an equipment commitment, not a source-quoted standalone construction budget.
- **19209 — AUBix + Core Scientific Data Center: 16 MW Data Center Campus in Alabama:** Core Scientific Auburn mixes the operating AUBix shell with a new 16MW HPC conversion and later expansions. The opened issuer release states planned initial USD135m investment, total expected to exceed USD400m with future partner capex, but does not establish exact July-2026 conversion/handover stage. Verify actual refurbishment or completed service and correct phase budget before tagging; a cooling permit is not completion.
- **19226 — TeraWulf Hawesville: 480 MW Data Center Campus in Kentucky:** Hawesville’s issuer update distinguishes 480MW gross available power, 401MW leased critical IT and future phased 2027–2028 delivery. The energized former-smelter substation does not establish the new compute campus stage. Local early-works/demolition accounts could not be opened successfully; obtain exact site-work evidence and reconcile phase before tagging. Acquisition, lease revenue and corporate financing are not construction cost.
- **19228 — DartPoints Former Lexmark Data Center Redevelopment: 100 MW Data Center Campus in Kentucky:** DartPoints Lexmark record mixes an existing legacy data center with a proposed expansion, and Lexington moratorium reporting requires a verified permitting/exception decision for this parcel. Opened June report states planned 20–30MW then 70MW, not tracker 100MW. Verify actual physical expansion or binding halt before tagging; USD29m property acquisition is not construction cost.
- **19229 — Holyoke Data Center: 20 MW Data Center Campus in Massachusetts:** Holyoke’s proposed 20MW paper-mill conversion conflicts with the city’s later outright ban on future data centers. Do not force Proposed or Completed at the saved June milestone. Obtain the exact parcel’s permit/vested-rights decision and any revised live proposal before tagging; USD200m proposal estimate is not spent construction.
- **19238 — Deep Green Lansing Data Center: 24 MW Data Center Campus in Michigan:** Deep Green withdrew the Lansing application on April 6. The prior 24MW/USD120m proposal and February announcement do not justify forcing an active construction status after withdrawal. Verify a revived application and actual physical scope before tagging.
- **19240 — Amazon Clinton: 100 MW Data Center Campus in Mississippi:** Amazon Clinton tracker parcel remains unmapped to a primary named-campus phase. Opened Amazon USD25bn Mississippi release covers multiple sites; Clinton-based Birdsong is a contractor location, not proof a named Clinton data center is under construction. Local/prod previously differ on an unsupported USD1bn. Obtain exact parcel/operator site announcement, physical milestone and standalone budget before any metadata/tag write.
- **19252 — American Tower Mount Royal: 4 MW Data Center Campus in New Jersey:** American Tower formally withdrew the Mount Royal/East Greenwich application, and its special June 30 hearing was cancelled. Do not force an active construction tag from the earlier application or infer completion of a 4MW edge facility. Verify a revived application and exact facility scope/cost before tagging.
- **19257 — Andover Data Center: 100 MW Data Center Campus in New Jersey:** Andover’s airport-site redevelopment concept conflicts with a subsequent proposed AI-data-center ban and reported litigation. Opened ordinance concept and May 10 ban announcement do not establish a buildable permitted scope or actual construction. Verify adopted ordinance, applicability and lawsuit/permit outcome before tagging; the generic 100MW is unverified.
- **19263 — Natelli Investments New Hill Digital Campus: 250 MW Data Center Campus in North Carolina:** Apex’s approved March 9 board minutes explicitly record withdrawal of Natelli’s New Hill annexation, rezoning and UDO applications. The developer’s older concept page conflicts with that later primary withdrawal; no active construction tag is forced. Verify a new application outside/inside the moratorium and reconcile 250/300MW scopes and exact budget before tagging.
- **19271 — AWS Hillard Scioto Campus: 382 MW Data Center Campus in Ohio:** AWS Scioto tracker aggregates 382MW without mapping the campus buildings to operating versus expansion phases. AEP’s new 72.9MW fuel-cell component and its 2026–2027 schedule do not establish the compute campus’s full build stage. Reconcile exact buildings/IT versus utility demand and verify work/operation before tagging; no full-campus construction cost verified.
- **19295 — 5C Memphis Data Center: 60 MW Data Center Campus in Tennessee:** 5C Memphis catalog lists committed 20MW and future 64MW, not a receipt that the pinned 60MW is fully operating or all in construction. The phase-four permit report could not be fully opened; obtain dated exact conversion/commissioning evidence and reconcile phase totals before tagging. USD575m phase permit and prior permits are not summed into a campus budget.

Accounting per environment is **1,448 assigned + 794 queued + 334 excluded + 11 previously reviewed overlaps = 2,587 screened candidates**. Assigned statuses are **695 Proposed, 471 In Progress and 282 Completed**. Including the original separate 68-pin batch, **1,516 reviewed eligible pins per environment** carry tags. Remaining queue groups are **282 individual source/phase questions, 54 conflicting/halted scopes, 35 grid-request identities, 251 agency/project identities, 82 tracker parcels and 90 Epoch trajectories**. The last housing milestone was resolved to its exact Phase-I scope; earlier unresolved follow-ups remain preserved.

Replay sequentially:

```sh
node --env-file=.env.local scripts/construction/research.mjs --manifest scripts/construction/research-round9-2026-10-24.json
node --env-file=.env.local scripts/construction/status.mjs --manifest scripts/construction/research-round9-2026-10-24.json
python3 scripts/construction/reviewQueue.py --manifest scripts/construction/research-round9-2026-10-24.json
```

Metadata and status receipts were re-read through authenticated admin APIs. All **35 public JSON records per environment** were checked for one exact status, original author, price/currency/bounds, research/source preservation and corrected titles/descriptions/date. Twelve native pages per environment were checked for status and research text. All 15 unresolved raw pin rows were checked against their before snapshots and remain unchanged and without construction-status tags. The La Porte source update is month-precision, so its reference published-date field is null rather than an invented July 1 day. Private source downloads, snapshots and page captures remain under ignored `.scrape/construction-status-research-round9-2026-10-24/`.

Source-quote/identity validation, catalog accounting, syntax/lint, task-file whitespace and reconciliation idempotence checks passed. No deployment, production build, VM restart or resize was performed.


## Tenth opened-source round — 200 records reviewed, 95 resolved

Reviewed **200 queued records per environment**: all 90 remaining Epoch capacity trajectories, all 82 remaining tracker parcels, and 28 battery/storage records. Saved and re-read **95 supported assignments in local and production: 25 Proposed, 56 In Progress and 14 Completed**. **105 remain queued**, with specific phase, identity, permit, withdrawal or source-access gaps. The [round-ten research/replay catalog](../scripts/construction/research-round10-2026-10-24.json) preserves the selected partition, exact opened HTTPS sources and short quotations, original Pin hashes, field corrections, native generation profile and per-environment saved receipts. Research began October 24; final saving and verification continued October 25.

**Eight records have sourced native USD costs; 87 have null exact-scope construction costs.** No currency conversion, modeled replacement cost, financing amount, network-upgrade quote, standalone land purchase or hardware revenue is substituted for the pinned construction scope. Authors, threads, unrelated tags and earlier evidence were preserved. Estimated calendar markers remain explicitly estimated rather than exact opening dates. The completed scopes are the specific buildings described by the source, rather than every later campus expansion.

Epoch’s dated physical observations establish 47 ongoing builds and 13 completed building scopes; 30 trajectories still depend on assumed commissioning, unclear tenant allocations or later capacity ramps. Actual cooling-fan motion, steam, explicit handover or completed-building observations are distinguished from estimates that simply add months after a roof appears. Epoch’s 2025-dollar total includes compute hardware and is not a source-native construction budget. Generic 250MW headline values are removed from the affected resolved records; this round does not certify every legacy native data-center metric.

The fresh **September 2026 EIA preliminary inventory, released October 23**, is used for exact battery units, including Arlington ABESS, Edgewater BESS1, Greenwater GREE, Sunnyside SNSB and Overnight OSBA. Medway’s 250MW/500MWh unit is operating with March 2026 as its reported actual operating month. Its former February 25 target is corrected to a month-precision March anchor. Other planned batteries are not completed from elapsed request dates. Fremont’s 49.5MW/198MWh contract conflicts with EIA’s 198MW entry and remains queued. Story County’s battery is not its older wind farm; Marshalltown’s proposed 100MW is not the existing 0.3MW battery.

The current Fairfax operator page describes **200MW**, superseding the imported 100MW headline, and expects construction in 2027. Drake’s current account describes an expanded **up-to-80MW** proposal. Both native `PinPower` storage profiles are corrected, saved and re-read in both environments, with guarded original payloads preserved. Greenwater’s USD400m financing is cleared as an unverified construction cost. MGE’s **USD70m Sunnyside battery investment** is separate from the solar project: the 2026 presentation’s trailing superscript 2 is a footnote, not USD702m. The earlier 2025 presentation and current deck are both cited, with the updated expected service year distinguished from actual construction status.

Homer City’s issuer confirms actual vertical construction in April 2026 and major equipment installed in September. The current operator FAQ describes **up to 4.4GW of planned gas-fired electrical generation**. Native `PinPower` is saved and verified through `PUT /api/pins/18965/power` in both environments as `4400` MW, `kind: 'generation'`; it is not operating output, IT usage or the retired coal units’ historical rating. Net/gross basis and published annual output remain unspecified. The exact old `PinEnergy` **23,652GWh calculated annual usage** at an assumed 60% load factor is removed, after preserving and checking its original payload, because it was calculated from a generating rating misclassified as data-center usage. No annual generation is invented. The operator’s over-USD10bn power/site-readiness component is not assigned as the full combined power-and-data-center campus budget.

Newer withdrawal and restriction evidence overrides stale proposal labels. Kingsboro withdrew before Edgecombe’s two-year moratorium; Sanford extended its moratorium; Frenchtown’s board records Cherry Blossom no longer proceeding; Marvel has conflicting stop-letter/site-activity evidence. Ironwood, Redline, Kalkaska and Cumulus require revival evidence. Linfield’s later warehouse alternative and the old data-center land swap are not treated as the same active use.

| Pin | Saved scope | Status | Native cost |
| --- | --- | --- | --- |
| 18974 | OpenAI Stargate Abilene AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 18977 | Microsoft Fairwater Wisconsin AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19041 | Coreweave Helios AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19045 | Google New Albany AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19047 | OpenAI Stargate UAE AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19050 | Amazon Ridgeland AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19051 | Meta Prometheus AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19055 | Google Columbus AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19056 | VNET Bayin Ulanqab AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19058 | OpenAI Stargate Shackelford AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19060 | Google Fort Wayne AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19061 | OpenAI Stargate Milam AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19065 | Huawei Horinger AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19067 | Google Red Oak AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19077 | Anthropic Lake Mariner AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19079 | Anthropic Barber Lake AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19083 | EcoDataCenter 2 AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19086 | Microsoft Narvik Norway AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19088 | Huawei Wuhu AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19089 | Meta Bowling Green AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19090 | CoreWeave Lancaster Greenfield site AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19097 | Envision Galaxy Ulanqab AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19159 | Amazon Madison Mega Site AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19160 | OpenAI Stargate Abilene AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19163 | Meta Hyperion AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19164 | OpenAI Stargate Lordstown AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19165 | STACK Infrastructure NVA02 AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19166 | Microsoft-Nebius New Jersey AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19167 | Microsoft Goodyear AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19170 | OpenAI Stargate Michigan AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19172 | Google Cedar Rapids AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19173 | OpenAI Stargate Wisconsin AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19175 | QTS Cedar Rapids AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19179 | Google Lincoln AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19180 | CoreWeave Muskogee OK AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19181 | Google Papillion AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19183 | CoreWeave Ellendale ND AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19185 | CoreWeave Chester VA AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19187 | Google Storey County AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19189 | QTS Richmond 3 AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19190 | AWS New Albany AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19194 | QTS Eagle Mountain AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19197 | AWS Berwick AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19158 | Microsoft Fairwater Wisconsin AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19161 | Anthropic-Amazon New Carlisle AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19169 | Meta Montgomery AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19177 | Meta Aiken AI Data Center Buildout | In Progress | Null — exact-scope gap |
| 19052 | Google Pryor (North) AI Data Center — Completed Buildings | Completed | Null — exact-scope gap |
| 19053 | Microsoft Project Osmium AI Data Center — Completed Buildings | Completed | Null — exact-scope gap |
| 19068 | CoreWeave Marble NC AI Data Center — Completed Buildings | Completed | Null — exact-scope gap |
| 19069 | Oracle Batam AI Data Center — Completed Buildings | Completed | Null — exact-scope gap |
| 19075 | Google Lancaster AI Data Center — Completed Buildings | Completed | Null — exact-scope gap |
| 19076 | Microsoft SAT14 AI Data Center — Completed Buildings | Completed | Null — exact-scope gap |
| 19078 | Google Arcola AI Data Center — Completed Buildings | Completed | Null — exact-scope gap |
| 19080 | Meta Eagle Mountain AI Data Center — Completed Buildings | Completed | Null — exact-scope gap |
| 19081 | CoreWeave Norway AI Data Center — Completed Buildings | Completed | Null — exact-scope gap |
| 19082 | CoreWeave Dalton 1 & 2 AI Data Center — Completed Buildings | Completed | Null — exact-scope gap |
| 19184 | Microsoft SAT40 AI Data Center — Completed Buildings | Completed | Null — exact-scope gap |
| 19191 | Google Bristow AI Data Center — Completed Buildings | Completed | Null — exact-scope gap |
| 19198 | Google Waltham Cross AI Data Center — Completed Buildings | Completed | Null — exact-scope gap |
| 19204 | Bloomfield Data Center Proposal — Planned Development | Proposed | Null — exact-scope gap |
| 19205 | Bristol Technology Center — Planned Development | Proposed | Null — exact-scope gap |
| 19206 | Surge Development Knightstown Data Center — Planned Development | Proposed | Null — exact-scope gap |
| 19210 | Clarksville Data Center — Planned Development | Proposed | USD 8,000,000,000 |
| 19215 | Project Domino — Site Work Underway | In Progress | USD 10,000,000,000 (published lower threshold) |
| 19218 | Decatur Technology Park — Planned Development | Proposed | USD 2,000,000,000–3,000,000,000 |
| 19231 | Microsoft Gaines Township — Planned Development | Proposed | Null — exact-scope gap |
| 19237 | Clarksdale Data Center — Planned Development | Proposed | Null — exact-scope gap |
| 19239 | Project Flex — Planned Development | Proposed | Null — exact-scope gap |
| 19246 | CRG Festus — Planned Development | Proposed | USD 6,000,000,000 |
| 19250 | Gateway Digital Campus — Planned Development | Proposed | Null — exact-scope gap |
| 19251 | Prism Capital Partners Nutley Site — Planned Development | Proposed | Null — exact-scope gap |
| 19254 | Meramec Valley Technology Park — Planned Development | Proposed | USD 16,000,000,000 |
| 19259 | Lumon Solutions Marshfield Webster — Site Work Underway | In Progress | Null — exact-scope gap |
| 19269 | Project Fighting Pike — Planned Development | Proposed | Null — exact-scope gap |
| 19274 | Project Cosmos — Site Work Underway | In Progress | Null — exact-scope gap |
| 19279 | Project Klondike — Planned Development | Proposed | USD 1,000,000,000 (published lower threshold) |
| 19293 | Perry Township Data Center — Planned Development | Proposed | Null — exact-scope gap |
| 19296 | Jailhouse Studios — Planned Development | Proposed | USD 80,000,000–100,000,000 |
| 19307 | DBT Jessup — Planned Development | Proposed | Null — exact-scope gap |
| 18965 | Homer City Energy and AI Campus — Construction Underway | In Progress | Null — exact-scope gap |
| 15708 | Snohomish County PUD Arlington Battery Storage: 25 MW Tesla Megapack System Built by Ameresco, Washington | In Progress | Null — exact-scope gap |
| 15868 | Medway Grid Battery Storage: 250 MW / 500 MWh — Operating Since March 2026 | Completed | Null — exact-scope gap |
| 18283 | Edgewater Battery Energy Storage System: 99 MW BESS in Sheboygan County, Wisconsin | In Progress | Null — exact-scope gap |
| 18285 | Greenwater Energy Storage Project: 200 MW BESS Under Construction | In Progress | Null — exact-scope gap |
| 18286 | Sunnyside Energy Center BESS: 40 MW Battery Storage in Dane County, Wisconsin | In Progress | USD 70,000,000 |
| 18307 | Fortress Solar & Energy Storage Project: 150 MW BESS in Morgan County, Colorado | Proposed | Null — exact-scope gap |
| 18322 | Overnight Solar & Energy Storage Project: 150 MW BESS in San Bernardino County, California | In Progress | Null — exact-scope gap |
| 18323 | Parowan Energy Storage Project: 58 MW BESS in Iron County, Utah | Proposed | Null — exact-scope gap |
| 18332 | KCE CT 1 Battery Energy Storage System: 45 MW BESS in Windham County, Connecticut | Proposed | Null — exact-scope gap |
| 18346 | Cabokenze Energy Storage: 76 MW BESS in Burke County, Georgia | Proposed | Null — exact-scope gap |
| 16340 | RWE Fourth Quarter BESS: 300 MW, Four-Hour Storage — Planned | Proposed | Null — exact-scope gap |
| 18282 | Drake Storage Project: Up to 80 MW BESS Planned in Middlesex County, Virginia | Proposed | Null — exact-scope gap |
| 18360 | Tulsa Battery Energy Storage System: 200 MW Proposal | Proposed | Null — exact-scope gap |
| 18482 | Fairfax Energy Storage Project: 200 MW BESS Planned in Linn County, Iowa | Proposed | Null — exact-scope gap |

**The 105 unresolved records remain unchanged and without construction status tags in both environments:**

- **18978 — xAI Colossus 2 Memphis Supercluster: 946 MW, 555,000 NVIDIA GPU Frontier AI Data Center:** The modeled 946MW/555,000-GPU Colossus-2 scope must be reconciled with the S-1’s compute/server-power definitions, phased GPU deployments and separate Southaven power facilities. A reported operating initial cluster or turbine plant does not prove this entire aggregate complete. Latest inspected timeline entry: 2026-06-15. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19042 — Microsoft Fairwater Atlanta: 636 MW / 769K H100e Frontier AI Data Center Cluster in Fayetteville:** The June four-building operating entry follows a May commissioning account without an explicit operator handover for the full 636MW cluster. Confirm actual full service and whether nearby new shells belong to Microsoft; do not use a completed roof or assumed ramp time as completion. Latest inspected timeline entry: 2026-06-14. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19046 — Alibaba Zhangbei: 169 MW / 32K H100e Frontier AI Data Center Cluster in Zhangbei:** The January completion of chillers is explicitly an expectation following December observed work/snow on fans. Confirm actual finished upgrade and operating extent for Buildings 4–6; a forecast is not a completed 169MW AI cluster. Latest inspected timeline entry: 2026-01-03. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19049 — Google Council Bluffs (East): 237 MW / 256K H100e Frontier AI Data Center Cluster in Council Bluffs:** Three cooling-equipped buildings are reported operating, while adjacent clearing suggests two more. Reconcile whether the exact 237MW pin covers only three buildings or the growing campus, and verify the full service scope before tagging. Latest inspected timeline entry: 2026-07-07. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19054 — Meta Jeffersonville: 178 MW / 203K H100e Frontier AI Data Center Cluster in Jeffersonville:** The June operating entry follows an explicit three-month March commissioning allowance. Obtain actual two-building handover/commercial-service evidence for the 178MW AI scope; the current source derives operation from elapsed time. Latest inspected timeline entry: 2026-06-04. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19059 — Google Midlothian: 103 MW / 144K H100e Frontier AI Data Center Cluster in Midlothian:** The July full-completion row is explicitly estimated; April described missing cooling towers and possible across-road expansion. Verify the exact 103MW upgraded building versus expansion and actual finished commissioning. Latest inspected timeline entry: 2026-07-01. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19063 — CoreWeave Denton TX: 282 MW / 272K H100e Frontier AI Data Center Cluster in Denton:** The latest entry schedules a September interior fit-out under TDLR rather than verifying it started. Reconcile the 282MW modeled buildout with the 260MW contracted delivery and the separate USD110m Building-A fit-out; no total is manufactured. Latest inspected timeline entry: 2026-09-01. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19064 — Meta Rosemount: 178 MW / 216K H100e Frontier AI Data Center Cluster in Rosemount:** Both June operating buildings are explicitly estimated from a March commissioning allowance. Verify actual Rosemount handover/service at the pinned 178MW extent; the parent campus’s announcement or financing does not finish the new AI cluster. Latest inspected timeline entry: 2026-06-19. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19066 — Google Mesa: 183 MW / 290K H100e Frontier AI Data Center Cluster in Mesa:** August operation of Building 2 is estimated from May near-completion. Site preparation for another building is separate. Verify the exact 183MW two-building service milestone rather than transferring a larger campus expansion’s stage. Latest inspected timeline entry: 2026-08-15. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19070 — DayOne Nusajaya: 473 MW / 584K H100e Frontier AI Data Center Cluster in Johor Bahru:** October operation of Buildings 7–10 is explicitly predicted by adding three construction and three ramp months to April imagery. Verify actual Phase-2 commissioning at the full 473MW scope; operator aggregate Johor capacities mix campuses. Latest inspected timeline entry: 2026-10-02. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19071 — Google The Dalles: 154 MW / 175K H100e Frontier AI Data Center Cluster in The Dalles:** Both new AI buildings’ operating dates are estimates based on external equipment and cars. Existing Google The Dalles operations do not by themselves prove commissioning of this exact 154MW two-building expansion. Latest inspected timeline entry: 2026-04-29. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19072 — Bridge Data Centres MY06: 243 MW / 221K H100e Frontier AI Data Center Cluster in Kulai:** September imagery reports no visible construction at Buildings 8–10 but no evidence of their use; March footage shows fans operating at 5–7 only. Reconcile the 243MW operating/unused-building scope and obtain actual handover/commissioning evidence. Latest inspected timeline entry: 2026-09-13. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19073 — Meta Cheyenne: 207 MW / 236K H100e Frontier AI Data Center Cluster in Cheyenne:** July operation is explicitly estimated, while the pin reaches 207MW in February 2027. Reconcile initial two-building delivery with later capacity ramp and obtain actual remaining-work or service evidence for that exact extent. Latest inspected timeline entry: 2026-07-25. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19074 — DayOne Kempas: 421.7 MW / 481K H100e Frontier AI Data Center Cluster in Kempas:** September/October operating entries explicitly assume roof-to-operation and commissioning delays. Verify actual 421.7MW scope and campus/building service; the operator’s combined Johor capacity is not a Kempas-only receipt. Latest inspected timeline entry: 2026-10-01. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19084 — Nebius Mantsala: 145 MW / 226K H100e Frontier AI Data Center Cluster in Mantsala:** Nebius explicitly confirms the earlier 75MW Mäntsälä expansion operating, but this pin targets 145MW in a later period. Reconcile that planned doubling with the separately announced 310MW Lappeenranta plant and verify actual work on the Mäntsälä-only remaining phase. Latest inspected timeline entry: 2026-06-29. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19085 — Meta Huntsville: 146 MW / 167K H100e Frontier AI Data Center Cluster in Huntsville:** June operation is an estimate based on 120 days after construction, nine months after roof/cooling and other Meta schedules. Verify actual service/handover for this 146MW Huntsville AI scope rather than the existing older campus. Latest inspected timeline entry: 2026-06-02. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19087 — QTS Richmond 1: 238 MW / 243K H100e Frontier AI Data Center Cluster in Sandston:** The latest entries merely report no visible changes. Reconcile the five-building 238MW Richmond-1 extent with actual operator handover; lack of change alone does not verify complete operation or active works. Latest inspected timeline entry: 2026-02-13. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19096 — Nscale Keflavik: 10.2 MW / 12K H100e Frontier AI Data Center Cluster in Reykjanesbær:** Nscale confirms production benchmarking across 64 racks in June, but the pin targets 10.2MW in a later December capacity state. Verify the expanded rack/building scope rather than marking the full target complete from the earlier 5.11MW tranche. Latest inspected timeline entry: 2026-07-27. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19162 — Colossus 1: 250 MW Frontier AI Hyperscale Data Center:** The June tenant-access date is explicitly assumed from a May announcement. Verify actual completion/use of the precise Colossus-1 scope, separate from Colossus-2 and its Southaven power plant; the generic 250MW marker is unsupported. Latest inspected timeline entry: 2026-06-15. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19168 — Meta Temple: 250 MW Frontier AI Hyperscale Data Center:** The September operating entry is based on a TDLR scheduled completion date, not a completion receipt. Verify actual Building-3 handover versus the two older operating Temple buildings; the generic 250MW marker is not a published campus rating. Latest inspected timeline entry: 2026-09-30. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19171 — Crusoe Abilene Expansion: 250 MW Frontier AI Hyperscale Data Center:** January land clearing predates reports that Oracle/OpenAI dropped the Abilene expansion. Reconcile the exact expansion owner/tenant, revived construction and capacity after the reported withdrawal; ongoing works at the original eight buildings are separate. Latest inspected timeline entry: 2026-01-15. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19174 — Stream Phoenix: 250 MW Frontier AI Hyperscale Data Center:** May first-building operation is estimated from three months after January structural completion; Building-6 acceleration is not a dated physical-work or handover receipt. Reconcile the full Stream Phoenix AI scope and actual remaining-phase work. Latest inspected timeline entry: 2026-05-01. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19176 — Meta Kuna: 250 MW Frontier AI Hyperscale Data Center:** The first two buildings and arriving servers are distinguished from two smaller northern structures. Solar supply/rising modeled load are not an exact completed 250MW AI scope. Verify whether northern structures belong to the pinned cluster and its actual full-delivery milestone. Latest inspected timeline entry: 2026-06-01. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19178 — Meta Gallatin: 250 MW Frontier AI Hyperscale Data Center:** August operation is inferred from six months after structural completion. Verify the exact Gallatin AI building and remaining expansion against operator commissioning evidence; the generic 250MW value is not a published phase rating. Latest inspected timeline entry: 2026-08-24. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19182 — Meta Sarpy: 250 MW Frontier AI Hyperscale Data Center:** August operation is explicitly estimated from May near-completion. Existing Sarpy campus operations do not independently verify the new AI-building handover or the generic 250MW scope. Latest inspected timeline entry: 2026-08-02. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19186 — QTS Richmond 2: 250 MW Frontier AI Hyperscale Data Center:** May operation of Building 5 is explicitly estimated from February remaining perimeter work. Confirm exact Richmond-2 campus/phase handover rather than inferring from a three-month allowance or the 250MW placeholder. Latest inspected timeline entry: 2026-05-14. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19188 — Core42 Lake Mariner: 250 MW Frontier AI Hyperscale Data Center:** The Core42 allocation is mixed with CB2A/CB2B partial delivery, a March target and later imagery; prior footage showed no fan movement. Verify exact customer-buildings/service and distinguish Core42 from Fluidstack/Anthropic and the 250MW placeholder. Latest inspected timeline entry: 2026-07-23. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19192 — xAI QTS Atlanta: 250 MW Frontier AI Hyperscale Data Center:** Sources distinguish 12,000 purchased GPUs/equipment, an existing X tenancy and later unchanged imagery. Obtain actual service/handover and reconcile the named xAI cluster with the generic 250MW placeholder; equipment purchase does not complete commissioning. Latest inspected timeline entry: 2026-07-10. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19195 — Meta-QTS Hillsboro 2: 250 MW Frontier AI Hyperscale Data Center:** The directory states four operating buildings but the saved 250MW AI scope is generic and no exact operator/customer-building mapping was established. Verify Meta’s leased halls versus the broader QTS Hillsboro campus and actual delivery scope. Latest inspected timeline entry: 2026-04-17. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19196 — Southgate Melbourne: 250 MW Frontier AI Hyperscale Data Center:** The August operating date is explicitly estimated by adding three months after May cooling work. Verify actual first-stage Melbourne delivery and 18,400/18,500-GPU scope; combined Tasmania/Melbourne investment is not a single campus construction total. Latest inspected timeline entry: 2026-08-09. No exact construction-only native-currency budget established; modeled 2025-dollar hardware/campus amounts are not project quotes.
- **19199 — Project Marvel: 1200 MW Data Center Campus in Alabama:** October reporting records an October 19 cease-and-desist letter while site activity continues. Reconcile the current permit/stop-order authority and exact lawful active scope before tagging Project Marvel. No exact latest construction-only budget established for the unresolved scope.
- **19200 — Project Pyramid: 500 MW Data Center Campus in Arkansas:** The official project announcement and earlier USD1bn initial facility differ from the tracker’s full multi-building scope and cost. Verify current physical stage and exact whole-campus scope; an announcement is not a start receipt. No exact latest construction-only budget established for the unresolved scope.
- **19201 — St. Georges Business Park Data Center: 100 MW Data Center Campus in Delaware:** County planning records describe warehouse/residential uses without an exact confirmed data-center project identity. Verify the parcel and approved use before tagging. No exact latest construction-only budget established for the unresolved scope.
- **19202 — Project Washington: 1200 MW Data Center Campus in Delaware:** The DNREC permit denial was upheld in March 2026. Resolve the denied/halted scope rather than marking a completed approval or active construction. No exact latest construction-only budget established for the unresolved scope.
- **19207 — South Bend Data Center: 100 MW Data Center Campus in Indiana:** South Bend planning discussion is distinguishable from denied New Carlisle rezoning, but the exact Ceres parcel and current approved build scope need a project-specific receipt; the original reporting is inaccessible or incomplete. No exact latest construction-only budget established for the unresolved scope.
- **19208 — Newark White Clay Creek Business Park Data Center: 100 MW Data Center Campus in Delaware:** July 2026 reporting describes a pause and consideration of alternative uses at White Clay. Verify an active revived data-center scope before tagging. No exact latest construction-only budget established for the unresolved scope.
- **19212 — Project Lincoln: 100 MW Data Center Campus in Kentucky:** The original La Grange site was withdrawn and a different industrial site proposed. Reconcile the pin location with the replacement parcel and current project before tagging. No exact latest construction-only budget established for the unresolved scope.
- **19213 — Project Ginger: 100 MW Data Center Campus in Iowa:** Ginger East and West have separate project pages and milestones. Obtain accessible dated construction evidence for both within the pin’s combined scope; do not add two independently quoted budgets into an invented total. No exact latest construction-only budget established for the unresolved scope.
- **19214 — Project Redline: 100 MW Data Center Campus in Indiana:** Redline was withdrawn in May 2025. Verify a separately revived project before applying any active construction tag. No exact latest construction-only budget established for the unresolved scope.
- **19219 — Pittsboro Middle Township Data Center: 100 MW Data Center Campus in Indiana:** No project-specific developer, parcel or physical-phase source established for this Pittsboro/Middle Township entry. Identify the actual proposed data center before assigning a status. No exact latest construction-only budget established for the unresolved scope.
- **19220 — Project Morgan: 100 MW Data Center Campus in Iowa:** The operating older Apple campus and the proposed AZ2 fit-out have different extents. Verify actual work or completion on the pin’s exact remaining building scope. No exact latest construction-only budget established for the unresolved scope.
- **19221 — Project Louie: 1200 MW Data Center Campus in Indiana:** Google’s Monrovia project identity and reported investment are established, but accessible article text does not establish a sufficiently clear dated physical milestone for the exact campus. Obtain direct construction evidence. No exact latest construction-only budget established for the unresolved scope.
- **19222 — Project Alluvion: 100 MW Data Center Campus in Iowa:** The operating Alluvion facilities and Microsoft’s later West Des Moines projects need exact phase reconciliation. Current summary tables and old investment announcements do not independently establish this pin’s completed whole scope. No exact latest construction-only budget established for the unresolved scope.
- **19224 — Piney Reach Data Center Development: 100 MW Data Center Campus in Maryland:** Piney Reach is advertised as data-development land. Establish an actual developer-led construction proposal, not merely a broker’s land offering and advertised available power. No exact latest construction-only budget established for the unresolved scope.
- **19225 — 32 Mile Road Technical Campus: 100 MW Data Center Campus in Michigan:** The official township record labels the rezoning application withdrawn. Verify a revived exact parcel/scope before applying an active status. No exact latest construction-only budget established for the unresolved scope.
- **19227 — Harrodsburg Data Center: 645 MW Data Center Campus in Kentucky:** Harrodsburg sources advertise available land/power through a broker. Establish the developer, formal project and current approval or actual-work milestone. No exact latest construction-only budget established for the unresolved scope.
- **19230 — Loring Air Force Base Data Center: 2 MW Data Center Campus in Maine:** Loring LiquidCool’s financing and power arrangements are described as prospective and the state moratorium threshold may affect the phased proposal. Verify enacted restrictions and the actual phase/power scope rather than relying on a six-month forecast. No exact latest construction-only budget established for the unresolved scope.
- **19232 — Sanford Woods Industrial and Technical Campus: 100 MW Data Center Campus in Maine:** Sanford extended its moratorium through January 2027 in August 2026. Verify the exact Woods project’s exemption or resumed authorization rather than treating earlier planning as active development. No exact latest construction-only budget established for the unresolved scope.
- **19233 — Rocklocker Kalkaska: 1000 MW Data Center Campus in Michigan:** The Kalkaska/Rocklocker public-land proposal was withdrawn in November 2025. No revived exact scope verified. No exact latest construction-only budget established for the unresolved scope.
- **19234 — Project Pulse: 100 MW Data Center Campus in Kentucky:** Project Pulse’s land agreement was terminated in May 2026. The tracker also mismatches Arkansas/Kentucky jurisdiction; resolve identity and the cancelled scope. No exact latest construction-only budget established for the unresolved scope.
- **19236 — Sansone York Township Data Center: 1000 MW Data Center Campus in Michigan:** York Township imposed a 2026 moratorium while Sansone’s plan remained preliminary. Verify any later authorization and a formal exact project before tagging. No exact latest construction-only budget established for the unresolved scope.
- **19242 — Project Ironwood: 100 MW Data Center Campus in Michigan:** Newer reporting describes withdrawal of the Dundee Ironwood agreement. The older operator proposal cannot establish a current active phase; obtain withdrawal/revival records. No exact latest construction-only budget established for the unresolved scope.
- **19243 — Project Steamboat: 100 MW Data Center Campus in Mississippi:** AWS’s Warren County announcement establishes a planned investment, but later reporting does not provide a verified actual construction milestone for this exact campus. Separate it from Madison County and the statewide investment program. No exact latest construction-only budget established for the unresolved scope.
- **19245 — Project Cherry Blossom: 100 MW Data Center Campus in Michigan:** Frenchtown’s June 9, 2026 board statement confirms the proposal no longer proceeding. Resolve the withdrawn golf-course scope and the tracker’s mismatched former-hospital location. No exact latest construction-only budget established for the unresolved scope.
- **19247 — Pavilion Township Data Center: 100 MW Data Center Campus in Michigan:** Pavilion’s proposal was paused/withdrawn in November 2025. Verify a revived exact scope rather than force an active tag. No exact latest construction-only budget established for the unresolved scope.
- **19249 — Sugar Hill Portland Data Center: 100 MW Data Center Campus in New York:** The former Golf City/Sugar Hill site remains under community and municipal review, including discussion of a moratorium. Verify formal project acceptance and current restriction before a phase tag. No exact latest construction-only budget established for the unresolved scope.
- **19253 — Monroe Township Data Center: 100 MW Data Center Campus in New Jersey:** Monroe’s zoning ban/rejection and the developer’s lawsuit remain unresolved. Litigation and claimed damages are not construction work or project cost. No exact latest construction-only budget established for the unresolved scope.
- **19255 — Jasper County Powered Data Park: 100 MW Data Center Campus in Missouri:** The Jasper powered-data-park concept combines solar, storage and data-center land. Verify the exact compute phase’s developer, approvals and current viability before assigning an active tag. No exact latest construction-only budget established for the unresolved scope.
- **19256 — Project Cumulus: 100 MW Data Center Campus in Missouri:** The Cumulus/CRG application was withdrawn in August 2025. Obtain a current accepted replacement application before assigning an active phase. No exact latest construction-only budget established for the unresolved scope.
- **19258 — Princeton Nurseries Data Center: 100 MW Data Center Campus in New Jersey:** The former Princeton Nurseries proposal lacks accessible current municipal/application evidence for its exact data-center scope. Reconcile the parcel and current active application. No exact latest construction-only budget established for the unresolved scope.
- **19260 — Kingsboro Data Center: 300 MW Data Center Campus in North Carolina:** Kingsboro’s developer withdrew July 6, 2026 and Edgecombe imposed a two-year data-center moratorium in August. Do not retain an active proposal from older investment announcements. No exact latest construction-only budget established for the unresolved scope.
- **19261 — Aurum Capital Ventures Bismarck: 100 MW Data Center Campus in North Dakota:** Aurum’s old concept lacks accessible current project-specific municipal or developer phase evidence. Verify the exact parcel and continuing proposal rather than tagging from an old directory label. No exact latest construction-only budget established for the unresolved scope.
- **19262 — Kenwood Commons: 100 MW Data Center Campus in New York:** Kenwood Commons has ownership/fire/litigation issues and later state restrictions. Verify a currently authorized data-center redevelopment; insurance/valuation figures are not construction budgets. No exact latest construction-only budget established for the unresolved scope.
- **19264 — Tarboro Data Center Campus: 300 MW Data Center Campus in North Carolina:** Tarboro’s denial was followed by a July 2026 settlement under which the developer would not build; county restrictions also changed. Verify a distinct revived scope before any active tag. No exact latest construction-only budget established for the unresolved scope.
- **19265 — Massena Petawatt Data Center Site Advertisement: 200 MW Data Center Campus in New York:** Massena sources mix marketed power-ready land, substation approval and prospective compute buildings. Verify an actual funded data-center construction proposal, separate from the substation budget. No exact latest construction-only budget established for the unresolved scope.
- **19266 — Project Mila: 250 MW Data Center Campus in Ohio:** Trenton sources establish a Prologis proposal but contain different investment/valuation bases. Verify current physical stage and exact construction budget before assigning a phase/cost to the full pinned campus. No exact latest construction-only budget established for the unresolved scope.
- **19267 — Person County Mega Park: 100 MW Data Center Campus in North Carolina:** Person County sources combine early designs and countywide water/wastewater works. Verify the exact Microsoft parcel’s own physical stage; public utility work alone does not establish campus construction. No exact latest construction-only budget established for the unresolved scope.
- **19268 — Rural Hall Data Center: 100 MW Data Center Campus in North Carolina:** Newer records describe Forsyth County’s July 2026 denial of Rural Hall rezoning F-1669. Obtain the final disposition and any accepted replacement proposal rather than use the earlier pending label. No exact latest construction-only budget established for the unresolved scope.
- **19270 — Logistix Hamilton: 200 MW Data Center Campus in Ohio:** Hamilton Logistix feasibility was paused in January 2026; published cost figures refer to differing extents. Verify a revived active proposal and exact construction scope. No exact latest construction-only budget established for the unresolved scope.
- **19272 — AWS Wilmington: 400 MW Data Center Campus in Ohio:** The Wilmington AWS development was blocked in court in March 2026. Resolve the current ruling and exact permitted scope before tagging. No exact latest construction-only budget established for the unresolved scope.
- **19273 — Van Wert Mega Site: 500 MW Data Center Campus in Ohio:** The acquisition release describes power-service design/construction, but does not separately establish actual compute-building construction. Reconcile the pin’s campus scope with the utility work and current stage. No exact latest construction-only budget established for the unresolved scope.
- **19276 — J.M. Stuart Revitilization Project: 650 MW Data Center Campus in Ohio:** Sprigg Township’s February 2026 moratorium affects the JM Adams proposal. Verify an exemption or lifted restriction before assigning an active phase. No exact latest construction-only budget established for the unresolved scope.
- **19278 — Mt. Orab Mega Site: 2000 MW Data Center Campus in Ohio:** Mount Orab is marketed as an industrial megasite with an undisclosed tenant. Establish the data-center project identity and current zoning/physical stage; advertised power is not an operating compute rating. No exact latest construction-only budget established for the unresolved scope.
- **19280 — Killen Revitilization Project: 650 MW Data Center Campus in Ohio:** The Killen/Monroe Township former power site is distinct from Sprigg’s moratorium jurisdiction. Establish an actual data-center proposal rather than infer one from a power-ready land listing. No exact latest construction-only budget established for the unresolved scope.
- **19281 — Hannibal Data Center Campus: 300 MW Data Center Campus in Ohio:** The operating Long Ridge power plant is separate from the older proposed Hannibal compute campus. Obtain a current exact data-center physical milestone; plant operation does not complete data centers. No exact latest construction-only budget established for the unresolved scope.
- **19282 — EdgeConneX Ashville: 200 MW Data Center Campus in Ohio:** Ashville’s original annexation was rejected and a smaller site later considered. Reconcile original versus reduced acreage and the exact mapped phase before tagging. No exact latest construction-only budget established for the unresolved scope.
- **19283 — Microsoft Heath Data Center: 100 MW Data Center Campus in Ohio:** Operator construction updates could not be opened successfully. Obtain a dated exact Heath project work receipt; the reported Ohio/Heath-plus-Hebron investment is not a Heath-only budget. No exact latest construction-only budget established for the unresolved scope.
- **19285 — Microsoft New Albany: 100 MW Data Center Campus in Ohio:** The opened New Albany tax-abatement report supports an earlier proposed investment, but accessible operator construction updates are absent. Verify the current physical phase instead of treating the tax deal as a start. No exact latest construction-only budget established for the unresolved scope.
- **19286 — QTS Salem: 100 MW Data Center Campus in Pennsylvania:** QTS’s Salem concept and revised master plan do not prove current physical work. Reconcile precise campus stage and exclude the USD580m land purchase and Pennsylvania-wide program from construction cost. No exact latest construction-only budget established for the unresolved scope.
- **19287 — Marysville South Data Center: 800 MW Data Center Campus in Ohio:** Marysville South/Anadonna is separate from AWS at US33 Innovation Park. Reconcile the purchased parcel versus the full master site and actual infrastructure/compute phase before tagging; the USD205m land purchase is not construction cost. No exact latest construction-only budget established for the unresolved scope.
- **19288 — Keel Infrastructure Panther Creek: 350 MW Data Center Campus in Pennsylvania:** Panther Creek sources describe financing, long-lead procurement, early engineering and legacy mining operations. Verify actual new AI-building works and exact phased scope; neither funding nor mining operation completes the conversion. No exact latest construction-only budget established for the unresolved scope.
- **19289 — Buck Canyon Properties Data Center: 1300 MW Data Center Campus in Ohio:** Buck Canyon mixes a large future load request with a Sprigg moratorium and multi-owner land. Verify exact permitted site/exemption and actual project viability; interconnection requests and land prices are not construction. No exact latest construction-only budget established for the unresolved scope.
- **19290 — Bitdeer Weathersfield Project: 300 MW Data Center Campus in Ohio:** Bitdeer’s Weathersfield target is prospective, and article references to buildings under construction concern a different site. Obtain a current exact Ohio project milestone and distinguish utility MW from compute load. No exact latest construction-only budget established for the unresolved scope.
- **19291 — Project Boson: 1600 MW Data Center Campus in Pennsylvania:** Boson’s tracker scope conflicts with newer single-building descriptions and a separate Project Gravity. Reconcile developer, buildings, litigation and exact campus identity before assigning a stage. No exact latest construction-only budget established for the unresolved scope.
- **19292 — Morabito Slavic Village Data Center: 150 MW Data Center Campus in Ohio:** Morabito’s Slavic Village permit was rejected. Resolve a revived authorized scope; the old proposal and differing investment/construction figures do not establish active works. No exact latest construction-only budget established for the unresolved scope.
- **19294 — Linfield Data Center: 100 MW Data Center Campus in Pennsylvania:** The Linfield data-center land-swap concept was followed by a warehouse alternative. Reconcile the current proposed use and exact parcel before assigning any data-center status. No exact latest construction-only budget established for the unresolved scope.
- **19298 — Monarch Compute Campus and Mountaineer Gigasystem: 2000 MW Data Center Campus in West Virginia:** Monarch’s current page quotes a major planned investment but not a sufficiently explicit dated physical start for its exact compute phase. Distinguish the separate power/hydrogen development and initial versus ultimate capacity. No exact latest construction-only budget established for the unresolved scope.
- **19301 — Comcast Moorestown: 100 MW Data Center Campus in New Jersey:** Comcast’s former-bank conversion report is inaccessible and no independent dated physical-phase receipt was established for the exact Moorestown site. No exact latest construction-only budget established for the unresolved scope.
- **19302 — Appalachian Mega Site: 200 MW Data Center Campus in West Virginia:** Hog Lick/Appalachian sources market power-ready land and future capacity paths. Establish an actual developer-led compute project and accepted physical scope. No exact latest construction-only budget established for the unresolved scope.
- **19304 — Brookhaven Logistics Center: 176 MW Data Center Campus in New York:** Brookhaven/Yaphank imposed a 2026 moratorium. Verify exact restrictions and a permitted active project; the warehouse acquisition price is not the data-center construction cost. No exact latest construction-only budget established for the unresolved scope.
- **19306 — QTS Kearneysville Data Center Complex: 100 MW Data Center Campus in West Virginia:** Accessible primary construction or current municipal phase evidence was not established for both sides of the QTS Kearneysville campus. Reconcile Berkeley approvals with the separate Jefferson proposal. No exact latest construction-only budget established for the unresolved scope.
- **18308 — Fremont Energy Storage Project: 49.5 MW BESS in Iron County, Utah:** Fremont’s published power contract describes 49.5MW/198MWh, but EIA lists the under-construction BA1 battery at 198MW. Reconcile the reporter’s capacity units and exact battery phase before assigning a status to the 49.5MW pin; do not silently treat MWh as MW.
- **18331 — Cimarron Battery Energy Storage System: 166 MW BESS in Gray County, Kansas:** Cimarron’s 166MW Gray County pin may correspond to SPP GEN-2026-SR2 at 165.6MW, but the developer/parcel and exact scope are not verified. A similarly named wind farm is not the battery.
- **18343 — Balsam Battery Energy Storage System: 200 MW BESS in Kenosha County, Wisconsin:** Balsam 200MW/J1895 and Robin’s newer Wheatland battery share a substation vicinity but are not proven to be the same approved scope. Reconcile queue identity, owner and exact phase before using Robin’s current timetable.
- **18368 — Morrison Battery Storage: 220 MW BESS in Noble County, Oklahoma:** Morrison’s 220MW Noble County record may match SPP GEN-2025-SR8; exact operator, parcel and current project identity were not established from an opened primary row. A surplus queue request is not physical work.
- **18370 — Oakwood Battery Storage: 209 MW BESS in Dewey County, Oklahoma:** Oakwood’s 209MW Dewey County record may match SPP GEN-2025-SR30; exact developer and current physical stage remain unverified. Study progress is not construction progress.
- **18467 — Earleys Energy Storage Project: 100 MW BESS in Hertford County, North Carolina:** Earleys’ 100MW Hertford County scope was not matched to a current exact PJM request. Withdrawn 30MW Carolina-Earleys AH1-435 and 135MW Cashie-Earleys AG1-443 concern other counties/scopes.
- **18468 — Marshalltown Energy Storage Project: 100 MW BESS in Marshall County, Iowa:** Marshalltown’s 100MW J2949 request is distinct from the existing 0.3MW battery. The current primary MISO row is inaccessible; obtain exact active/withdrawn phase evidence rather than use the older operating unit.
- **18470 — Story County Energy Storage Project: 150 MW BESS in Story County, Iowa:** Story County’s 150MW S1181 battery has conflicting secondary planned/operational labels. Obtain the current primary MISO row and exact unit; the 2008 wind farm is not the battery.
- **18471 — Werner West Energy Storage Project: 150 MW BESS in Outagamie County, Wisconsin:** Werner West’s 150MW J2326 appears in a 2025 MISO study, but its current active/withdrawn disposition could not be opened. The USD37.86m study amount is network upgrades, not battery construction; an elapsed request target is not completion.
- **18478 — Andes Energy Storage Project: 200 MW BESS in Madison County, Mississippi:** No exact operator, parcel, queue ID or project-specific primary source was established for Andes 200MW in Madison County. A state agency homepage does not establish a project phase or cost.
- **18479 — Carville Energy Storage Project: 106 MW BESS in Queen Anne's County, Maryland:** Carville’s 106MW Queen Anne’s County record appears to match PJM AG2-380, but current exact primary project evidence was not opened. Reconcile the request and scope before assigning a physical phase.
- **18481 — Colby Energy Storage Project: 100 MW BESS in Cerro Gordo County, Iowa:** Colby’s 100MW Cerro Gordo County record appears to match MISO J3158, but secondary records have a conflicting state path and the current primary row is inaccessible. Verify the actual Iowa project and disposition.
- **18483 — Huttig Energy Storage Project: 100 MW BESS in Union County, Arkansas:** No exact developer, parcel or current queue entry was established for Huttig’s 100MW Union County battery. The generic Arkansas air-permit page is not a project or physical-stage receipt.
- **18288 — Threeforks Energy Storage: 100 MW BESS in Martin County, Kentucky:** The opened PJM agreement identifies a 100MW Threeforks battery, but the current interconnection disposition and exact battery phase versus Martin County Solar remain unverified. The agreement alone does not prove a continuing active proposal or construction.

Accounting per environment is **1,543 assigned + 699 queued + 334 excluded + 11 previously reviewed overlaps = 2,587 screened candidates**. Assigned statuses are **720 Proposed, 527 In Progress and 296 Completed**. Including the separate original 68-pin batch, **1,611 reviewed eligible pins per environment** carry tags. Current queue groups: 85 conflicting-or-halted-scope, 28 epoch-capacity-phase, 35 grid-request-identity, 271 individual-source-or-phase, 245 project-source-not-established, 35 tracker-parcel-phase. Earlier unselected rows and unresolved follow-ups remain preserved.

Replay sequentially; the power step restores the exact sourced generation profile and removes only the guarded obsolete calculation:

```sh
node --env-file=.env.local scripts/construction/research.mjs --manifest scripts/construction/research-round10-2026-10-24.json
node --env-file=.env.local scripts/construction/power.mjs --manifest scripts/construction/research-round10-2026-10-24.json
node --env-file=.env.local scripts/construction/status.mjs --manifest scripts/construction/research-round10-2026-10-24.json
python3 scripts/construction/reviewQueue.py --manifest scripts/construction/research-round10-2026-10-24.json
```

All **95 public JSON records per environment** were checked for the exact status, original author, native price/currency/bounds, corrected text/date and source preservation. **19 native pages per environment** were checked for research and status text. All **105 unresolved raw rows per environment** match their original snapshots and have no construction-status tags. Explicit source publication dates and **195 short literal source quotations** were verified against opened documents or exact EIA worksheet cells. Native generation and the absence of the obsolete annual-usage estimate were re-read from both APIs. Unrelated author/thread/metadata and tag preservation were checked by the guarded writers; unselected catalog rows were compared with the private pre-round catalog.

The replay scripts passed syntax/lint checks, the native power replay passed a second guarded run, and default plus round-ten queue reconciliation is idempotent. Downloads, raw snapshots, page captures and detailed verification receipts remain in ignored `.scrape/construction-status-research-round10-2026-10-24/`. No deployment, production build, VM restart or resize was performed.
