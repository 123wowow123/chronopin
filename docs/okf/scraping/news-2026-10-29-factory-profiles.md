---
type: Log
title: "Construction buildout batch — 2026-10-29"
description: "Owner-requested manual factoryProfiles batch, completed on production and mirrored locally. This covers only the construction profile task, not a full news…"
tags: [scraping, factory-profiles]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-29T18:00:00Z }
---
# Construction buildout batch — 2026-10-29

Owner-requested manual `factoryProfiles` batch, completed on production and mirrored locally. This covers only the construction profile task, not a full news run. The scheduled 18:00 America/Los_Angeles news job was not changed.

Five profiles were saved through authenticated admin APIs and GET-verified in both environments. Each has at least three distinct sourced metric categories and dated milestones. All radar axes remain null with explicit evidence gaps. Existing authors, titles, text, dates, prices, media and parent links were preserved. Additional primary sources were added through whole-pin API round-trips where needed; the preservation checks passed.

| Project | Local ID | Production ID | Profile stage |
| --- | --- | --- | --- |
| O’Hare terminal program | 674 | 674 | construction |
| Brenner Base Tunnel | 225 | 225 | construction |
| One London tower | 547 | 547 | announced |
| Rogfast tunnel | 442 | 442 | construction |
| North Station Draw One Bridge replacement | 3348 | 3348 | construction |

Evidence is retained in `scripts/factories/capability.json`, including exact source titles, publication dates where available, short verbatim quotations and planned/demonstrated distinctions. The five new entries are session assessments. Replay identities were resolved by source URL, not assumed from local IDs. All ten profile readbacks matched exactly, including metric keys and milestones, so the production API supports the complete profile shape.

Sources opened: ORDNext’s official progress page; BBT SE’s revised 20–21 October 2026 forecasts and active construction-lot page; Eric Parry Architects’ 1 June 2026 One London announcement; Statens vegvesen’s Rogfast project page; and project engineer STV’s 23 September 2026 Draw One report. MBTA’s own page was inaccessible, so the Draw One profile explicitly identifies the project-engineer source. One London’s existing-site deconstruction is distinguished from the planned 2028 tower construction start. Its cost is stated as more than GBP 1 billion, not a fixed final budget. Rogfast’s older 2020-price cost on the project page was not substituted for the newer pin investment figure.

## Remaining work

The local candidate query counted 724 before this batch and 719 after it; these are unfiltered local candidate counts, not a production audit or a count of qualifying projects. No profile was fabricated merely to remove a candidate.

- Google Springboard Building 4 (local 18091): building-specific milestone, investment and capacity evidence was not established in this batch. Leave for focused research; do not inherit campus totals.
- Mont Cenis (423) and Lyon–Turin (634): potentially overlapping project pins. Resolve canonical identity and construction status before adding profiles to both.
- Draw One completion milestone (3352) remains unprofiled: the project’s parent pin 3348 now carries the profile. Future runs should skip 3352 as a threaded completion event rather than duplicate the parent’s profile.
- Remaining candidates await later batches under the normal approximately-five-project limit.

No deployment, production restart, build or schema change was performed. Verification details are in gitignored `.tmp/factory-2026-10-29/results.json`.
