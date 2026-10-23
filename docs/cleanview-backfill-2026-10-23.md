# Cleanview sourcing backfill — October 23, 2026

Completed one 12-pin batch: 10 content corrections and two unsupported Lighthouse building splits soft-deleted, on both local and production. This does not close the broader sourcing backlog. No application deployment.

## Verified changes

| Production and current local ID | Project | Result |
|---|---|---|
| 16300 | Lyra Storage: 500 MW Battery Queue Project in Borden County, Texas | ERCOT lists Lyra Storage, queue 26INR0636, as a 500 MW Borden County project. Its published planning target is November 12, 2026; current delivery, owner and cost need further verification. |
| 16301 | Ameresco–CyrusOne NAS Lemoore: Proposed 100 MW AI Data Center and Energy Infrastructure | Ameresco, CyrusOne and the U.S. Navy plan a 100 MW AI data center at NAS Lemoore, with onsite generation and a naval-base microgrid. First delivery is expected in 2027; the operator page does not publish a project cost. |
| 16302 | Applied Digital Adair County Data Center Proposal: Current Delivery Unverified | Adair County’s April 2024 minutes document discussion of Applied Digital’s data center proposal. The opening date, current project scope and investment remain unverified; September 2026 reporting says no developer had approached the county with current plans. |
| 16303 | Applied Digital Polaris Forge 1: 250 MW Operating, 400 MW Contracted IT Capacity | Applied Digital reported 250 MW of operational critical IT capacity at Polaris Forge 1 in Ellendale on October 2, 2026. The full contracted deployment is 400 MW; the first 50 MW phase reached service on October 27, 2025. |
| 16304 | AVAIO Taurus: $6 Billion Campus, Initial 116 MW Phase in Brandon, Mississippi | AVAIO’s Taurus campus in Brandon has a published $6 billion investment and initial 116 MW phase. Its current project listing gives Q3 2027 energization, later than the first-half 2027 target in its September 2025 announcement. |
| 16305 | Cloverleaf Project Bluestem: Kansas Data Center Rezoning Active; Power-Plant Application Withdrawn | Cloverleaf said on September 28, 2026 that its Project Bluestem data center rezoning remained active while it withdrew the initial application for a separate power-generation facility. Final capacity, investment and delivery date require verification. |
| 16306 | Crane Forest Grove Campus: 100+ MW Plan; $275.26M Qualified-Property Investment | Crane advertises a 100+ MW Forest Grove campus near Hillsboro. A June 2025 city enterprise-zone contract records $275,259,195 of estimated qualified-property investment; this is a disclosed investment scope, not a verified all-in campus cost. |
| 16307 | Metrobloks Southfield DTW-D: 89 MW Critical IT Plan; Investment Estimates Conflict | Metrobloks currently advertises 89 MW of critical IT capacity for DTW-D at 27500 Inkster Road, Southfield. Earlier approval reporting described 100 MW total power and conflicting $500 million and $1.5 billion investment estimates. |
| 16308 | Microsoft San Jose Data Center: Up to 99 MW at 1657 Alviso-Milpitas Road | The California Energy Commission identifies Microsoft’s two-building San Jose project at 1657 Alviso-Milpitas Road, with a maximum electrical load of 99 MW and estimated load of 77 MW. A verified total project budget and COD remain unavailable. |
| 16309 | QTS Cedar Rapids: Planned $10 Billion, Seven-Building Data Center Campus | QTS’s August 8, 2025 announcement describes a planned $10 billion campus with seven data center buildings on 612 acres in Big Cedar Industrial Center. The announcement does not publish power capacity or a service date. |
| 17085 | dc-vantage-stargate-lighthouse-bldg-1-wi | Soft-deleted unsupported 293 MW / $1.8B building split; retained campus pin 16311. |
| 17086 | dc-vantage-stargate-lighthouse-bldg-4-wi | Soft-deleted unsupported 293 MW / $1.8B building split; retained campus pin 16311. |

## Validation

- Read each saved pin back in both environments; checked edited fields, reference URLs, author and all existing media URLs/types.
- Downloaded all 30 retained Azure image assets successfully; six representative affected native pin pages returned HTTP 200 across local and production. QTS rendered without the wrongly attached Google cluster note.
- Verified each deletion returns 404 in both environments; removed mappings and moved both drafts to `held/`.
- Corrected power readings and removed unsupported power values for Adair, Bluestem and QTS.
- Cleared generic annual-energy calculations for Adair, Polaris Forge 1, Bluestem, Metrobloks and QTS because their capacity basis was removed or reclassified.
- Replaced QTS’s incorrectly matched Google cluster telemetry with QTS-supported 612 acres, seven buildings and water-free cooling. Cleared Adair/Bluestem unsupported telemetry and replaced Metrobloks conflicting legacy stats.
- Reconciled all 12 selected stale local mappings using current title and source identity.

## Remaining research gaps

- **battery-sb-energy-lyra-storage-tx:** PUCT Lyra BESS SGIA 35077_2225_1531568.PDF found but blocked by plain curl (403); SB Energy subsidiary list alone does not establish this queue project’s ownership. Verify current queue, owner, duration, exact parcel and COD.
- **dc-ameresco-cyrusone-nas-lemoore-ca:** Exact parcel and current contracting/construction status require confirmation.
- **dc-applied-digital-adair-ia:** Current status conflicts with legacy proposal: obtain developer response and October 14, 2026 ordinance outcome; confirm capacity, COD and parcel. Existing map/media are not newly site-verified.
- **dc-applied-digital-polaris-forge-1-nd:** Full 400 MW completion date and current campus capital cost remain unverified.
- **dc-avaio-taurus-hub-ms:** Exact site coordinates and phased full-campus delivery still require parcel-level verification.
- **dc-cloverleaf-project-bluestem-ks:** Obtain current county rezoning filing, final capacity, COD, tenant and exact site; 600–1,200 MW range is not established by these operator records.
- **dc-crane-pdx01-hillsboro-or:** Obtain commissioning or revised schedule, confirm coordinate against filed parcel and distinguish qualified investment from total campus budget.
- **dc-metrobloks-southfield-mi:** Resolve $500M/$1.5B scope discrepancy, current COD and differing acreage/floor-area figures; map coordinates not newly parcel-verified.
- **dc-microsoft-alviso-milpitas-san-jose-ca:** Verify current city addendum, generator design, construction/COD, full project cost and coordinates; prior land acquisition cost was not a campus construction cost.
- **dc-qts-cedar-rapids-ia:** Resolve reported power-capacity differences using current utility contract/filings; confirm phased COD, current construction status and parcel coordinates.

- Six unsupported legacy COD placeholders remain explicitly estimated and described as unverified because Pin.utcStartDateTime is NOT NULL. No invented replacement dates.
- Coordinates were preserved; exact parcels and USGS imagery alignment still require independent verification. Existing images are not new site-identification evidence.
- Legacy datacenter/energy/source-wiki/site-shape data outside the specifically corrected rows are not certified by this batch.
- Campus pin 16311 was retained but its 902–1172 MW range, source URL and delivery still need a separate correction against the opened current 902 MW / 2028 Vantage page.
- Original URL triage counts are historical, not fresh global totals. New state-page lead publication and remaining backfill have not been completed.

## Evidence

Opened operator and regulator URLs, resulting field values and per-environment results are in [the audit JSON](cleanview-backfill-2026-10-23.json). Full before/after API snapshots and guarded apply scripts remain in `.scrape/prod-batches/cleanview-2026-10-14/audit/backfill-2026-10-23`.

Follow-up: [round 2](cleanview-backfill-round2-2026-10-23.md) corrected retained Lighthouse campus pin 16311; its earlier capacity/source/completion gap above is historical. First energization remains unverified.
