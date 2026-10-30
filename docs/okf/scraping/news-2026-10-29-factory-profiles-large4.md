---
type: Log
title: "Large construction buildout batch 4 — 2026-10-29"
description: "Owner requested another large batch on production. Added 25 more buildout profiles, production-first through authenticated admin APIs, and mirrored them…"
tags: [scraping, factory-profiles]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-29T18:00:00Z }
---
# Large construction buildout batch 4 — 2026-10-29

Owner requested another large batch on production. Added **25 more buildout profiles**, production-first through authenticated admin APIs, and mirrored them locally. This was a manual content batch; scheduled daily-job limits are unchanged.

Production pin identities were uniquely resolved by source URL and title before writes. No existing profiles were overwritten. All **50 profile readbacks** matched exactly. Every profile passes the real validator and the three-distinct-category display threshold. Radar scores remain null with research gaps. Fresh pin reads preceded whole-pin reference merges; author, text, prices, dates, media and parent links were preserved. Dedicated factory saves were checked against fresh pin readbacks. One strict whole-pin readback on SoFi was unstable, so saves paused. The exact saved profile, original content/identity fields and evidence citation coverage were reverified before resuming; consecutive fresh reads were stable. Already-saved matching batch profiles were verified without rewriting them.

| Project | Local ID | Production ID | Profile stage |
| --- | --- | --- | --- |
| Thessaloniki Metro Line 1 Opens After Decades of Delay | 522 | 522 | production |
| Intuit Dome, the Clippers' New Arena, Opens in Inglewood | 575 | 575 | production |
| Portland International Airport Opens New Main Terminal | 526 | 526 | production |
| Ferrero Opens Its First North American Chocolate Factory in Bloomington | 3474 | 3474 | production |
| Brightline West Breaks Ground on US High-Speed Rail | 596 | 596 | construction |
| Faroe Islands Open the Sandoy Undersea Tunnel | 582 | 582 | production |
| Abu Dhabi's Midfield Terminal Opens as Zayed International Airport | 766 | 766 | production |
| Red Sea International Airport Opens in Saudi Arabia | 667 | 667 | production |
| Taipei Performing Arts Center Officially Opens | 624 | 624 | production |
| 1915 Çanakkale Bridge Opens as World's Longest Suspension Bridge | 666 | 666 | production |
| Edinburgh's Royal Hospital for Children and Young People Finally Opens | 746 | 746 | production |
| Central Park Tower Welcomes Its First Residents | 703 | 703 | production |
| Crown Sydney Opens at Barangaroo | 697 | 697 | production |
| SoFi Stadium Opens in Inglewood With a Ribbon-Cutting | 701 | 701 | production |
| Las Vegas' $1.9BN Mega Stadium | 711 | 711 | production |
| Jewel Changi Airport Opens in Singapore | 539 | 539 | production |
| Mjøstårnet Becomes the World's Tallest Timber Tower in Brumunddal | 800 | 800 | production |
| Hong Kong-Zhuhai-Macau Bridge Opens as the World's Longest Sea Crossing | 728 | 728 | production |
| Network Rail Completes the London Bridge Station Redevelopment | 936 | 936 | production |
| Salesforce Tower Opens as San Francisco's Tallest Building | 734 | 734 | production |
| Second Avenue Subway Phase One Opens as World's Priciest Subway | 659 | 659 | production |
| Expanded Panama Canal Opens to Neopanamax Ships | 760 | 760 | production |
| 432 Park Avenue Opens on Manhattan's Billionaires' Row | 496 | 496 | production |
| Dragages Singapore Completes the Singapore Sports Hub | 934 | 934 | production |
| The Football Association Reopens Wembley Stadium With Its First Match | 961 | 961 | production |

## Status correction

Sandoy Tunnel (582): In Progress → Completed. The Faroese government explicitly confirms that the tunnel opened on 21 December 2023. The status-only repair was API-saved and GET-verified in production and locally, retaining other tags. Checks confirmed that the five English translation-source fields, author, media, prices, dates, parent links and factory profile were unchanged. No translation refresh was required.

## Evidence and scope

36 quoted source pages were opened. Quotes were checked against fetched page text on 32 pages; the four pages that blocked direct fetching were checked in the web reader. Operator date formatting for Çanakkale used a superscript, so its quote was shortened to exact “became operational”; the full date was independently verified on both the operator page and the IRF report.

- Thessaloniki covers the 9.6 km base line, excluding Kalamaria. The two-line combined investment and forecast ridership are not assigned to the base line.
- Intuit Dome’s current media kit publishes 17,927 seats; the profile retains that precision rather than the common rounded 18,000 figure.
- PDX’s first-phase opening in August 2024 is distinct from the airport’s explicitly confirmed whole main-terminal reconstruction completion on 30 June 2026. The correct airport completion release URL was resolved from its newsroom link after an obsolete URL returned unrelated content.
- Ferrero’s 70,000 sq ft chocolate-processing facility is profiled separately from the Kinder Bueno facility represented by its parent pin. The separate USD 214 million Kinder investment is excluded.
- Brightline West’s 218 miles and 200 mph are planned scope/capability. The April 2024 groundbreaking is observed; an elapsed older opening forecast is not treated as operation.
- Sandoy’s over-90% figure describes regional network connectivity, not tunnel vehicle capacity.
- Abu Dhabi Terminal A’s 45 million passengers is annual design capacity. The November 2023 schedule and February 2024 opened-terminal naming celebration are distinct; no new exact commercial-opening day is inferred from the architect’s account.
- Red Sea Airport covers the initial September 2023 service. Its twice-weekly timetable is explicitly historical at launch, not presented as the current full service schedule or proof that every later terminal phase was complete.
- Taipei has building completion and formal opening milestones rather than treating the May 2022 completion report’s future August date as an already observed opening. Theatre capacities retain their individual scopes.
- Edinburgh’s 154 beds are the original children’s hospital design program, excluding adult neuroscience and mental-health beds in the shared project. Transfer of services by March 2021 is distinct from the later royal ceremony.
- Central Park Tower’s first residential closings and the architect’s explicit 2021 completion are distinguished. Club floor area is not whole-tower floor area.
- Crown Sydney’s initial hotel/restaurant opening does not claim that the casino opened at the same time.
- SoFi’s 70,000 seats can expand to 100,000; the profile does not describe 100,000 fixed seats.
- Allegiant’s substantial completion and occupancy certificate are construction milestones, distinct from the first event with public attendance. Its cost is the USD 1.97 billion figure in the contemporaneous Raiders release, labelled as that published figure rather than audited final outturn.
- Jewel’s April public access is distinct from its October formal opening. Its 135,700 sq m is the visitor complex, not the whole airport.
- Mjøstårnet’s 11,300 sq m tower area excludes the adjacent swimming hall; the source’s March 2019 opening retains month precision.
- Hong Kong–Zhuhai–Macao’s 55 km is the whole crossing system; its six-lane design refers to the main crossing. The October 24 operational start is distinct from the ceremony.
- London Bridge’s GBP 1 billion is the station redevelopment, not all of Thameslink.
- Salesforce Tower’s architect publishes floor area and 2018 completion; the connected transit-center park is a separate facility.
- Second Avenue Subway covers phase one only. Its 200,000 daily rider figure is a forecast at opening, not measured current ridership.
- Panama Canal’s expansion is separate from the original canal and uses the authority’s inaugural-transit evidence.
- 432 Park Avenue uses the museum’s completion, floor count and GFA, without repeating an obviously inconsistent floor-plate figure from its narrative.
- Singapore Sports Hub’s 55,000 seats refer to the National Stadium within the broader 274,853 sq m complex.
- Wembley’s rebuilt-stadium March 2007 inauguration is distinguished from test events and the formal FA Cup opening; old-stadium capacity figures are excluded.

The replay catalog now contains **142 profiles**, including all 25 entries matching the saved batch exactly. No application deployment or schema change occurred. Content/schema validation and exact API readbacks were used for this data-only operation; `git diff --check` passed.

## Remaining candidates

Production and local candidate queries both return **619**, down from **644** before this batch. These are raw candidates and include pins that may not qualify. Specific unresolved scope and evidence gaps from earlier batch notes remain outstanding; this does not claim to complete the backlog or a full news run.
