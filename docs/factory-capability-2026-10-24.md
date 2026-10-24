# Factory capability radar — October 24, 2026

Implemented the six-axis factory capability profile, native API, pin-detail radar, per-axis evidence, planned/demonstrated labels, raw project figures, assessment date, sector and 2026 criteria. There is no composite score. UI messages cover all sixteen supported languages. Factory chart labels are plain labels because no factory search operator exists yet.

## Saved locally and in production

| Factory | Local / production pin | Status assessed | Scored axes (out of 5) |
|---|---|---|---|
| Bayer New Albany | 19643 / 19702 | Announced | Technical 3 planned; supply chain 2 planned |
| SK hynix West Lafayette | 19644 / 19703 | Construction | Technical 3 planned; supply chain 3 planned; workforce 2 planned |
| Avio Hurt | 19645 / 19704 | Construction | Technical 3 planned; supply chain 3 planned; workforce 2 planned |
| U.S. Steel Fairfield | 19646 / 19705 | Construction | Technical 2 planned; supply chain 3 planned; workforce 2 planned |
| L3Harris Camden | 19647 / 19706 | Commissioning | Technical 3 demonstrated; automation 3 demonstrated; supply chain 3 planned |
| Novelis Bay Minette | 19648 / 19707 | Commissioning | Technical 3 demonstrated; supply chain 3 planned |

All six were saved locally and, after the owner reported deployment, in production using the factory API and GET-verified against the catalog; pin authors, dates, text, prices, media and references were verified unchanged by the rubric writes. The additional Axios automation reference was separately added to Camden in both environments through the admin table API, with its source wiki saved and original authors/media/dates/prices preserved. Other axes remain null with specific gaps. Scale and efficiency require a sourced comparable cohort of at least five facilities before the API accepts a score. Neither investment size nor job totals substitutes for such a benchmark.

“Demonstrated” on technical capability refers only to an installed specialized factory or a witnessed cold-mill commissioning step. It does not certify achieved design output, qualified products or normal commercial operation. Camden’s operator opening announcement still describes production as upcoming; Bay Minette’s first coil precedes planned Q2 2027 commercial shipments. Both therefore remain in commissioning in this assessment.

## Production and replay

After the owner reported deployment, the production factory endpoint returned 204 (installed API, no profile yet). Replayed all six profiles using `npx tsx scripts/factories/capability.ts --apply --base https://www.chronopin.com`. Every saved profile matched the catalog on GET, and the replay verified unchanged authors, text, dates, prices, media and references. The production rubric profiles are now saved on pins 19702–19707. This follow-up performed content API writes only; no production schema migration, build, restart or deployment was performed by this session.

- Criteria and API contract: [factory-capability.md](okf/api/factory-capability.md)
- Sourced, replayable profiles: [capability.json](../scripts/factories/capability.json)
- API replay/verification: [capability.ts](../scripts/factories/capability.ts)
- Schema migration: [0214_pin_factory.sql](../scripts/db/schema/0214_pin_factory.sql)

## Verification

- Local migration applied successfully; all six profiles PUT/GET-verified in both environments.
- Production browser verification passed for all six native pin pages: radars, scores, planned/unknown labels and HTTPS evidence links. The phone panel fits at 390px, with no browser errors. [Saved verification results](research/factory-capability-production-2026-10-24.json).
- TypeScript check and targeted ESLint passed.
- 34 focused factory, API authorization and existing rubric regression tests passed.
- Browser checks passed for Bayer and Novelis on desktop, Novelis on a 390px phone viewport, and SK hynix in Japanese on phone. Evidence links, unknown-score labels, planned labels, unsupported-search-link absence and radar rendering checked; no browser exceptions.
- Fixed the factory chart’s lower label clearance after inspecting the phone rendering. An existing 3px page overflow from the confidence pill is outside the factory panel; the factory panel itself does not overflow.

## Research gaps

All six lack a defensible comparable capacity cohort and output-normalized resource-efficiency benchmark. Five lack named automated workflows sufficient to score automation; Camden has independent reporting of robotic station-to-station movement and casting, curing and inspection cells. Bayer, Camden and Novelis lack verified project-specific workforce programs sufficient for scoring. Avio’s training program and Fairfield’s training facility remain planned; SK hynix’s Purdue relationship does not establish a completed apprenticeship pathway or placement outcome. Higher technical/supply-chain scores require quantified benchmarks or independently demonstrated outcomes. Follow-up should improve these facts rather than fill empty axes with estimates.

## Display threshold update

Owner requested at least three filled axes before showing the factory rubric. The entire section is now hidden below that threshold, while the saved profile stays available through the API. A valid zero counts as filled. With the present catalog, Bayer and Novelis are hidden; SK hynix, Avio, Fairfield and Camden remain eligible. This code change has not been deployed by this session.

## Factual buildout profile update

Added a separate factual profile, visible with at least three distinct populated metric categories, while retaining the three-scored-axis radar threshold. All six factories now qualify locally and in production for the factual cards and sourced timeline; Bayer and Novelis still do not qualify for the radar. [Implementation and verification](factory-buildout-profiles-2026-10-24.md). After the owner reported deployment, the updated catalog was replayed and GET-verified in production, including metric categories and milestones. No deployment was performed by this session.
