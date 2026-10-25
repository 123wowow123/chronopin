# Sixth large production boundary review — 2026-10-25

**Reviewed 80 additional candidates and new source leads; no verified new layers were available to import.** Coverage remains 74 production pins and 10,245 default boundary features. All 74 saved maps still match their reviewed geometry and credits. The audit now covers 592 candidates: 74 mapped, five unresolved country gaps and 513 outside boundary scope. No production content or geometry was written, and no deployment, build, restart or VM operation occurred.

## Expanded discovery

The existing broad production search found no new candidates. A further pass searched descriptions for wildland, megafire, evacuation, perimeter, redraw/redrawn, delimitation, elected, sworn in, takes office, voting district, ballot measure, constituencies and burn scar, plus additional inauguration, voting, polling and forest-related title terms. It excluded deleted pins and deduplicated against the existing audit.

This surfaced **80 additional pins**, all reviewed as outside the requested boundary scope. They include corporate elections and appointments, professional award voting, infrastructure inaugurations, property/product names, military exercises, an evacuation commemoration and non-wildfire structural/flood evacuations. Boston's Evacuation Day anniversary is not a wildfire perimeter; Hidroituango's evacuation is a dam crisis; corporate and Oscar/Grammy/BAFTA voting do not establish public electoral jurisdictions. No generic administrative outline was added solely because a title mentioned voting, inauguration or forest.

Each new candidate has its exact pin ID, title and exclusion reason in `scripts/boundaries/backfill-audit-2026-10-25.json`. These are audit records, not newly created production pins.

## New source investigations

| Gap | Evidence checked this round | Result |
| --- | --- | --- |
| Nigeria, pin 2350 | [Brian Engelsma's academic constituency archive](https://www.brianengelsma.com/research/african-parliamentary-constituencies-shapefiles/) and its [original repository](https://github.com/bengelsma/Constituencies) | The documentation explicitly reports 348 districts with 12 missing. The downloaded Nigerian shapefile has 358 records but only 350 distinct non-empty constituency names, including four blank-name records and repeated named constituencies. The package and notes disagree, and neither establishes a verified complete 360-seat layer. |
| Russia, pin 1967 | [Yabloko's 2026 constituency map](https://www.yabloko.ru/okruga-gd-2026) and its accessible JSON bundle | The bundle is dated September 17, 2026, but has 99 constituency records across 43 regional diagrams. Rings use local image/pixel coordinates and image dimensions, not georeferenced national polygons. No complete 225-district set was obtained. |
| Morocco, pin 2979 | [Le Millénaire's election page](https://election.lemillenaire.org/soiree/maroc/legislatives/2026/), its [geometry manifest](https://election.lemillenaire.org/geo/MAR/manifeste.json), and additional result sites | The manifest contains 12 regions and 75 administrative units, not 92 local constituencies. The page explicitly says the local map remains pending. Constituency result tables alone do not supply the missing geography. |
| Gambia, pin 2354 | [Gambia Geo-portal](https://gambiageoportal.gmportals.org/) and its dataset-search endpoint | HTTPS requests failed; no geometry could be inspected. Administrative district outlines previously checked still do not establish the 53 constituencies. |
| India, pin 1978 | [ECI's Assam delimitation publication](https://www.eci.gov.in/Documents/Delimitation/DELIMITATIONASSAM_UPDATED.pdf) and renewed searches | Indexed primary-source text gives the current assembly/parliamentary composition and identifies a not-to-scale map. The live PDF request returned HTTP 406, and no fresh complete PDF/vector download was verified. This does not resolve the missing complete, georeferenced current national vector layer. Previously checked old-roster and inconsistent attributed mirrors remain unverified. |

The Nigeria archive's ZIP, documentation PDF and selected shapefiles were downloaded and inspected locally; the documentation was extracted to text. Its incomplete data was not imported. The Russia map page was accessible with curl even though the web reader returned an error; the local JSON was inspected for actual counts, fields and coordinate format. No image diagram was guessed into latitude/longitude geometry.

## Verification and retained coverage

Authenticated production read-back verification passed for all **74 saved maps and 10,245 default features**, including the existing alternate-plan geometry and source credits. No replay manifest was created for this round because there are no new approved import entries. The existing complete replay manifest is unchanged.

There remain **10 US state comparisons plus one Angola provincial comparison**, totaling 401 alternate-plan features. This round did not establish an additional verified plan pair or rewrite an existing comparison. Original pin content, authorship, dates and coordinates were not modified.

Ignored evidence is under `.scrape/boundaries/`: `large6-discovery.txt`, `large6-extra-candidates.json`, `large6-extra-queries.json`, `large6-extra-discovery.txt`, `african-constituencies-engelsma.zip`, `engelsma-notes.txt`, `russia-2026-map-large6.json`, `morocco-large6-manifest.json` and `large6-all-saved-verified.json`. The structured audit records the new source findings and precise remaining gaps.
