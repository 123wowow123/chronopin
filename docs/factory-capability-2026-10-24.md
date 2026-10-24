# Factory capability radar — October 24, 2026

Implemented the six-axis factory capability profile, native API, pin-detail radar, per-axis evidence, planned/demonstrated labels, raw project figures, assessment date, sector and 2026 criteria. There is no composite score. UI messages cover all sixteen supported languages. Factory chart labels are plain labels because no factory search operator exists yet.

## Saved locally

| Factory | Local / production pin | Status assessed | Scored axes (out of 5) |
|---|---|---|---|
| Bayer New Albany | 19643 / 19702 | Announced | Technical 3 planned; supply chain 2 planned |
| SK hynix West Lafayette | 19644 / 19703 | Construction | Technical 3 planned; supply chain 3 planned; workforce 2 planned |
| Avio Hurt | 19645 / 19704 | Construction | Technical 3 planned; supply chain 3 planned; workforce 2 planned |
| U.S. Steel Fairfield | 19646 / 19705 | Construction | Technical 2 planned; supply chain 3 planned; workforce 2 planned |
| L3Harris Camden | 19647 / 19706 | Commissioning | Technical 3 demonstrated; automation 3 demonstrated; supply chain 3 planned |
| Novelis Bay Minette | 19648 / 19707 | Commissioning | Technical 3 demonstrated; supply chain 3 planned |

All six were saved locally using the factory API and GET-verified against the catalog; pin authors, dates, text, prices, media and references were verified unchanged by the rubric writes. The additional Axios automation reference was separately added to Camden in both environments through the admin table API, with its source wiki saved and original authors/media/dates/prices preserved. Other axes remain null with specific gaps. Scale and efficiency require a sourced comparable cohort of at least five facilities before the API accepts a score. Neither investment size nor job totals substitutes for such a benchmark.

“Demonstrated” on technical capability refers only to an installed specialized factory or a witnessed cold-mill commissioning step. It does not certify achieved design output, qualified products or normal commercial operation. Camden’s operator opening announcement still describes production as upcoming; Bay Minette’s first coil precedes planned Q2 2027 commercial shipments. Both therefore remain in commissioning in this assessment.

## Production and replay

The production factory endpoint returned 404 on a read-only preflight. The six new rubric profiles have **not** been written to production. No production schema migration, build, restart or deployment was performed. Production pin IDs and exact identities are prepared in the replay catalog for use after an explicitly requested deployment.

- Criteria and API contract: [factory-capability.md](okf/api/factory-capability.md)
- Sourced, replayable profiles: [capability.json](../scripts/factories/capability.json)
- API replay/verification: [capability.ts](../scripts/factories/capability.ts)
- Schema migration: [0214_pin_factory.sql](../scripts/db/schema/0214_pin_factory.sql)

## Verification

- Local migration applied successfully; all six profiles PUT/GET-verified.
- TypeScript check and targeted ESLint passed.
- 34 focused factory, API authorization and existing rubric regression tests passed.
- Browser checks passed for Bayer and Novelis on desktop, Novelis on a 390px phone viewport, and SK hynix in Japanese on phone. Evidence links, unknown-score labels, planned labels, unsupported-search-link absence and radar rendering checked; no browser exceptions.
- Fixed the factory chart’s lower label clearance after inspecting the phone rendering. An existing 3px page overflow from the confidence pill is outside the factory panel; the factory panel itself does not overflow.

## Research gaps

All six lack a defensible comparable capacity cohort and output-normalized resource-efficiency benchmark. Five lack named automated workflows sufficient to score automation; Camden has independent reporting of robotic station-to-station movement and casting, curing and inspection cells. Bayer, Camden and Novelis lack verified project-specific workforce programs sufficient for scoring. Avio’s training program and Fairfield’s training facility remain planned; SK hynix’s Purdue relationship does not establish a completed apprenticeship pathway or placement outcome. Higher technical/supply-chain scores require quantified benchmarks or independently demonstrated outcomes. Follow-up should improve these facts rather than fill empty axes with estimates.
