# Construction status backfill — October 24, 2026

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

## Final result

Saved and verified **1,240 additional pins in each environment**: 632 Proposed, 380 In Progress and 228 Completed. With the earlier 68-pin batch, this maintains construction-status tags on 1,308 reviewed eligible pins per environment.

The screen leaves **1,132 candidate records per environment in the research queue**, each with its source and specific reason. They are not claimed as fully resolved construction pins. Another 204 keyword matches are excluded as non-construction events or unsupported statuses, and 11 candidates were already covered by the earlier reviewed batch. These counts sum to the 2,587 screened candidates. Many of the earlier 68 nuclear milestones do not match generic facility keywords, so the candidate-overlap count is smaller than 68.

All saved rows were verified with exactly one status and unrelated metadata preserved. Public pin JSON and native pages were checked for Daimler’s historical groundbreaking (In Progress at that milestone), Google Hamina’s operating data center (Completed), and Carrier’s announced Fort Worth factory (Proposed), in both environments. Final unit/phase corrections distinguish NEO-01 from NEO-02–04, Aratina 1 from Aratina 2, and an unverified Coal Creek demand proposal from physical construction. Node syntax, Python execution, ESLint and whitespace checks passed.
