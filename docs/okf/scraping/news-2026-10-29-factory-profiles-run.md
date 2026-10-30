---
type: Log
title: "Factory profiles production run — 2026-10-29"
description: "Ran the factoryProfiles task by hand for its standard five-profile batch. Added five sourced buildout profiles through authenticated production admin APIs,…"
tags: [scraping, factory-profiles]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-29T18:00:00Z }
---
# Factory profiles production run — 2026-10-29

Ran the factoryProfiles task by hand for its standard five-profile batch. Added five sourced buildout profiles through authenticated production admin APIs, then mirrored locally. This was content maintenance; no deployment, build, restart or schema change.

Every identity was uniquely resolved by source URL and checked against its title before writes. Existing profiles were checked absent. All profiles passed the real schema validator, citation coverage and the three-distinct-category display threshold. All six radar scores remain null with specific evidence gaps. The dated project timelines preserve forecast precision; regulatory-review completion is not construction completion.

| Project | Production ID (same local ID) | Stage |
| --- | --- | --- |
| Brookfield Paducah AI Data Center Campus: 100B USD, 1,800 MW, Planned for 2032 in Kentucky | 15834 | announced |
| Project Arrowhead Data Center: 1,250 MW, 4.22 Million Sq Ft Campus in Irwin County, Georgia, 6B USD, Phase 1 Targeted for 2030 | 15836 | announced |
| ACS Fort Worth Data Center Campus: 350 MW in Five Buildings on 107 Acres, 2.1B USD Investment | 15646 | announced |
| 75 South Data Center Campus: 450 MW (Estimated) in Seven Buildings in Spalding County, Georgia, 13.7B USD Estimated | 15671 | announced |
| Carrollton Industrial Campus: 638-800 MW Data Center by Poe Companies and PowerHouse, 9.6B USD, Planned for 2030 in Carroll County, Kentucky | 16002 | announced |

All ten exact profile readbacks passed. Separate final comparisons against pre-write snapshots confirmed preservation of authors, English translation-source fields, dates, prices/currencies, media, source URLs, parent links, unrelated manual tags and existing references. Newly quoted pages were merged into references from fresh pin reads. No public translation-source text changed, so no translation refresh was needed for this batch.

Sources were opened in the web reader. Arrowhead and 75 South use the Georgia DCA's initial forms and application histories. Brookfield separates utility capacity from compute capacity and excludes the dedicated generation from campus compute. Carrollton uses the developer's September project-specific economic analysis, with future capacity and dates explicitly identified as forecasts. ACS uses sourced original campus investment, site area and employment targets; no unsupported campus MW card was added.

Catalog synchronized: **247 profiles**, including these five. Local raw gap count fell from **519 to 514**. Production readbacks verify these five formerly absent profiles; a full independent production gap count was not performed. The remaining raw candidates still require individual qualification.

## Specific evidence gaps

- ACS Fort Worth (15646): reconcile the existing 350 MW title/metadata with the operator's July release describing approximately 140 MW critical IT load contracted across three facilities plus rights to approximately 100 MW future expansion across two more. These may use different utility/IT scope. Obtain project-specific physical-work confirmation before changing the stage; permission to grade and elapsed construction targets alone are insufficient. Operator source opened: https://coravel.com/news/acs-group-global-infrastructure-partners-launch-coravel-secure-first-major-hyperscaler-customer-agreement
- 75 South (15671): the existing FOX 5 reference describes Wallace Jackson's separate ten-building, five-million-sq-ft campus, not Industrial VI's seven-building campus. It was excluded from this profile's evidence. Reconcile/remove that inherited reference and research the native investment/MW estimates before making related article/price changes. The DCA review's “Completed” status is completion of review, not completion of the campus.
- Carrollton (16002): the September analysis forecasts 150 MW by 2029 and up to 800 MW by 2031. The profile preserves these as forecasts; reconcile the older 2030 event target on a subsequent date-maintenance pass.

Previous batch gaps remain outstanding. This five-profile run does not complete the backlog or the whole news job.
