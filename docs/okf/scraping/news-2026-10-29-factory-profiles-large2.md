---
type: Log
title: "Large construction buildout batch 2 — 2026-10-29"
description: "Owner requested another large batch on production. Added 25 more buildout profiles, saved production-first through the authenticated admin APIs and mirrored…"
tags: [scraping, factory-profiles]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-29T18:00:00Z }
---
# Large construction buildout batch 2 — 2026-10-29

Owner requested another large batch on production. Added **25 more buildout profiles**, saved production-first through the authenticated admin APIs and mirrored locally. This is a manual profile batch, not a complete news job and not a change to the scheduled daily run limits.

Production identities were uniquely matched by source URL, title-checked, and checked for existing profiles before writes. All 50 profile readbacks matched exactly, including metric keys and milestones. Every profile passes the real profile validator and the three-distinct-category buildout display threshold. Six radar axes remain null with stated gaps; no capability scores were invented. Existing authors, dates, prices, text, media and parent links were preserved during reference/profile saves.

| Project | Local ID | Production ID | Profile stage |
| --- | --- | --- | --- |
| Major Construction Is Due to Start on SEA's S Concourse Rebuild | 2191 | 2191 | announced |
| Capital One Arena's Rebuild Finishes for the 2027-28 Season | 2201 | 2201 | construction |
| Minneapolis METRO Green Line Extension Opens to Eden Prairie | 4916 | 4916 | commissioning |
| Kindred Affordable Apartments Completes in Cortez Hill | 2167 | 2167 | construction |
| CDG Express Starts Running From Gare de l'Est to Roissy | 2292 | 2292 | construction |
| Austin Light Rail Breaks Ground on Its First Line | 2183 | 2183 | announced |
| Mexico's AIFA-Pachuca Passenger Train Starts Running | 2301 | 2301 | construction |
| Rastatt Tunnel Goes Into Operation on the Karlsruhe-Basel Line | 4949 | 4949 | construction |
| Trunk Road T2 and the Cha Kwo Ling Tunnel Complete Route 6 | 2237 | 2237 | construction |
| CTA Breaks Ground on the Red Line Extension to 130th Street | 2168 | 2168 | construction |
| Second Avenue Subway Phase 2 Breaks Ground in East Harlem | 2216 | 2216 | construction |
| Gatwick's Northern Runway Is Due to Enter Full Use as a Second Runway | 2288 | 2288 | announced |
| Sites Reservoir Targets Construction Start in 2027 | 192 | 192 | announced |
| Vancouver's Broadway Subway Delayed to Fall 2027 | 579 | 579 | construction |
| Hampton Roads Bridge-Tunnel Expansion | 449 | 449 | construction |
| New Nissan Stadium Set to Open for the Titans | 462 | 462 | construction |
| Billings West End Water Treatment Plant Delivers First Water | 4937 | 4937 | construction |
| New $362M Mobile International Airport Terminal Opens | 4935 | 4935 | construction |
| New Highmark Stadium Opens for the Buffalo Bills | 478 | 478 | production |
| Gordie Howe International Bridge Opens | 277 | 277 | production |
| Otay Mesa East Port of Entry Is Due to Open | 2164 | 2164 | construction |
| GTX-B Express Line Opens Between Incheon and Namyangju | 2255 | 2255 | construction |
| 400 Lake Shore Drive's North Tower Rises From Chicago's Old Spire Hole | 493 | 493 | construction |
| DC Tower 2 Set to Complete Vienna's Donau City Skyline | 513 | 513 | construction |
| Tour Triangle Is Due to Be Delivered at Porte de Versailles | 2295 | 2295 | construction |

## Status repairs

- Rastatt Tunnel (4949): Proposed → In Progress. DB reports physical line works and overhead-line energization in June 2026; the end-2026 operational target is not treated as an achieved opening.
- Mobile International Airport terminal (4935): Proposed → In Progress. The airport authority’s May 2026 construction showcase and associated roadwork reporting establish work underway, with spring 2027 still a planned opening.

Both status-only repairs were API-saved and GET-verified in production and locally, retaining all other tags. Checks confirmed the five English source-hash fields, author, media, source, threading, dates, prices and profiles were unchanged, so no translation refresh was caused by this batch.

## Research and validation

36 source pages were opened. Quotations matched raw page text on 31 fetchable pages; the other five were checked in the opened web pages. Quotes are short and verbatim, with publication dates supplied only when established. Every quoted page was attached to the corresponding pin before its profile was saved.

Key distinctions retained:

- Kindred has 125 affordable apartments plus one manager’s unit; 4,400 sq ft is commercial space rather than total building area.
- Green Line extension is testing/training/constructing, not open to passengers; 12 June 2027 remains planned.
- JFK first-phase, Aramco opening and White Stadium reopening pins were not profiled simply to clear milestone entries; parent project identity must be checked first.
- Highmark and Gordie Howe have explicit opening evidence and production profiles; elapsed target dates were not used to infer operation.
- Site-specific apartment totals for 400 Lake Shore cover the North Tower, excluding the separate proposed South Tower.
- Trunk Road T2’s HKD 10.918 billion main construction contract is not the full-project budget. Its renamed official project page matches the existing road/tunnel identity.
- Sites Reservoir’s 2027 limited start, 2028 ramp-up and 2033 construction program are stated as planned.
- Historic construction percentages and workforces (AIFA–Pachuca, Nissan) retain the dates of their observations; they are not represented as current measurements.
- GTX-B’s March 2024 figures are explicitly dated; its older 2030 forecast was not promoted into a current completion milestone.
- DC Tower 2’s supplier completion-year entry and Triangle’s contractor construction-period entry do not prove either tower is open. Triangle’s April 2026 topping-out report is an observed milestone.

The research/replay catalog now contains **92 profiles**, including these 25 entries. New entry identities match the saved batch exactly. `git diff --check` passed. No application code or schema changed; exact API/schema/preservation checks were appropriate for this content-only operation.

## Remaining work

The production SQL candidate query returns **669**, matching the local candidate query, down from **694** before this batch. These are raw candidates and include entries that may not qualify.

- JFK 3595 (parent 571), Aramco 3026 (parent 3025) and White Stadium 2199 (parent 3173): review the parent project and milestone distinction before assigning another profile.
- Hillingdon 2290: the opened July 2026 contract release does not supply enough project metrics or a physical start milestone; consult the council/NHS project documents rather than inventing beds, price or dates.
- Réunion 475: EIB’s 2026 appraisal concerns the remaining roughly 3 km phase, with a separate EUR 1.07 billion scope and permitting work; do not substitute this for the whole-road investment or assume phase-two physical construction.
- GTX-B: establish the latest completion forecast before extending its timeline beyond the observed 2024 groundbreaking.
- Triangle: reconcile the contractor’s 2022–2026 building period with the pin’s later delivery window before declaring an exact public-opening date.

No new pins, production deployment, build, restart or schema migration occurred. Existing translation-script edits in the workspace were untouched.

Detailed gitignored artifacts: `.tmp/factory-large2-2026-10-29/batch.json`, `results.json`, `source-checks.json` and `repairs-results.json`.
