# Factual factory buildout profiles — October 24, 2026

Added a factual **Factory buildout** section alongside the capability radar. It requires at least three distinct populated metric categories. The separate radar still requires at least three scored axes. Neither factual investment/jobs/area nor timeline entries are converted into scores.

| Factory | Populated categories | Sourced milestones | Radar eligible |
|---|---:|---:|---|
| Bayer New Albany | 4 | 3 | No |
| SK hynix West Lafayette | 5 | 3 | Yes |
| Avio Hurt | 6 | 3 | Yes |
| U.S. Steel Fairfield | 5 | 2 | Yes |
| L3Harris Camden | 3 | 1 | Yes |
| Novelis Bay Minette | 5 | 2 | No |

Cards support investment, employment, building size, site size, production capacity, production target, project stage, and products/processes. Unpublished fields remain absent. Each displayed value carries its source and planned/demonstrated basis. Construction and permanent jobs, floor and site area, and planned capacity versus actual output remain distinguished. Camden's standalone project cost is still unpublished, so no investment card is invented.

The project-stage strip highlights only the reported current stage; earlier stages are not automatically marked complete. The dated timeline uses separately sourced observed milestones and planned targets, preserving precision such as “Late 2028” or “Second quarter of 2027”. Multiple dates count as one timeline category rather than inflating the three-field threshold.

The existing JSON profile/API now supports optional metric category keys and milestones. Existing saved profiles with recognized legacy labels remain compatible. No database migration is needed. Raw figures were removed from the radar’s collapsed metrics list so the factual section is their main display. UI labels cover all sixteen supported languages.

## Validation and deployment status

All six updated profiles were saved through the local factory API and, after the owner reported deployment, through the production API, then read back exactly. Replay verification confirmed unchanged pin authors, text, dates, costs, references and media. Browser checks passed for all six pages, including the independent factual/radar thresholds, source links, stage highlight and timelines, plus phone layout and a Japanese phone page. Typecheck, targeted lint and 41 focused/regression tests passed.

After the owner reported deployment, replayed `npx tsx scripts/factories/capability.ts --apply --base https://www.chronopin.com`. All six updated profiles, including metric keys and sourced milestones, matched on GET. Production pins 19702–19707 now carry the factual buildout profiles. No deployment, migration, build or restart was performed by this session.

- [API contract](okf/api/factory-capability.md)
- [Source-backed catalog](../scripts/factories/capability.json)
- [Verification record](research/factory-buildout-profiles-2026-10-24.json)

Production browser verification passed for all six native pages: 4/5/6/5/3/5 factual cards respectively, sourced timelines, a single reported-stage highlight, four visible radars, and hidden Bayer/Novelis radars. Phone layout and the Japanese phone page passed with no browser exceptions.
