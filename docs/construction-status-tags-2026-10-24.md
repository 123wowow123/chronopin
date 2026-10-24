# Construction status tags — October 24, 2026

Construction and energy-project pins use three searchable topic tags: `Proposed`, `In Progress`, and `Completed`. Each eligible pin carries one status for its own construction/refurbishment scope at the represented milestone, or the latest researched state of a target pin. A historical opening remains Completed even when a later closure is threaded below it.

- Proposed: an announcement, plan, agreement or approval without verified physical work underway.
- In Progress: physical construction, refurbishment, installation, testing or commissioning underway; the stated scope is not yet verified complete.
- Completed: the stated scope is explicitly finished, opened or commercially operating. Finishing a financing/approval step is not finishing the project, and a passed target date supplies no completion evidence.

Non-construction accidents, closures, ownership transfers and monitored-storage events are excluded. Embalse’s shutdown for an explicit retubing/life-extension programme is an In Progress construction phase. Reactor criticality, grid testing and the Novelis first coil remain In Progress; they do not establish commercial completion. Camden’s opened factory construction is Completed, independently of its production/capability ramp. Taiwan restart planning remains Proposed; approvals alone are insufficient to assert physical restart work. Unsupported, halted or cancelled states need further evidence, not an invented status.

Applied to the recent nuclear restart/Three Mile Island threads and six U.S. factory milestones: 68 eligible pins per environment. Other metadata, authors, dates, thread links, costs and summaries are preserved. This is a reviewed backfill of the recent work, not a claim that every historical construction pin across the database has been reviewed.

The extraction prompt and AGENTS.md now require these exact tags for future researched construction pins. Nuclear replay data and writers retain the tags. Factory catalogs carry `constructionStatus` separately from factory operating/capability status. Existing native tag links provide search and filtering without new UI or schema.

Reviewed evidence and per-environment verification: [status catalog](../scripts/construction/status.json). Apply or replay with `node --env-file=.env.local scripts/construction/status.mjs`. The authenticated admin table API changes only the status tags, removes contradictory status names and verifies exactly one status alongside preservation of unrelated tags and pin metadata. The nuclear and factory research catalogs retain the underlying sources. No deployment was performed; the extraction prompt change takes effect when that code is next deployed.

Verification completed: 68 pins in each environment (14 Proposed, 22 In Progress, 32 Completed). Public pin responses confirmed all three status examples in both environments: Bayer, SK hynix and L3Harris. Node syntax and whitespace checks passed; ESLint reported no errors and two pre-existing unused-variable warnings in the Three Mile Island replay.
