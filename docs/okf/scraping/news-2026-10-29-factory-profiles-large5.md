---
type: Log
title: "Large construction buildout batch 5 — 2026-10-29"
description: "Owner requested another large batch on production. Added 25 more buildout profiles, saved production-first through authenticated admin APIs and mirrored…"
tags: [scraping, factory-profiles]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-29T18:00:00Z }
---
# Large construction buildout batch 5 — 2026-10-29

Owner requested another large batch on production. Added **25 more buildout profiles**, saved production-first through authenticated admin APIs and mirrored locally. This was a manual content batch; scheduled daily-job limits are unchanged.

Production identities were uniquely matched by source URL and checked against titles before writes. No existing profiles were overwritten. All **50 profile readbacks** matched exactly. A temporary production GET 502 interrupted the initial pass after 12 verified saves; the resumable pass reverified those exact profiles and original content before continuing, without overwriting them. Every profile passes the real validator and the three-distinct-category buildout display threshold. All six radar scores remain null with stated research gaps. Fresh pin reads preceded reference merges. Reference additions preserved authors, text, prices, dates, media and parent links; profile saves preserved the whole pin response.

| Project | Local ID | Production ID | Profile stage |
| --- | --- | --- | --- |
| Sydney Opera House Officially Opens | 737 | 737 | production |
| Habitat 67 Opens at Montreal's Expo 67 | 626 | 626 | production |
| Golden Gate Bridge Opens to Pedestrians | 762 | 762 | production |
| Sir William Arrol & Co.’s Forth Bridge Opens as the World’s Longest Cantilever Span | 943 | 943 | production |
| The Brooklyn Bridge Opens | 694 | 694 | production |
| Metropolitan Railway Opens the World's First Underground Line | 975 | 975 | production |
| The Millau Viaduct Opens to Traffic | 535 | 535 | production |
| The Channel Tunnel Opens | 594 | 594 | production |
| London's Docklands Light Railway Opens | 744 | 744 | production |
| Inside Australia's Tallest New Skyscraper | 710 | 710 | production |
| Hamburg Port Authority Opens the Rethebrücke as Europe's Largest Rail Bascule Bridge | 967 | 967 | production |
| Platov International Airport Opens Near Rostov-on-Don | 753 | 753 | production |
| Daimler begins construction on a $562 million lithium-ion battery factory in Germany | 111 | 111 | production |
| Ferrero Breaks Ground on $214M Kinder Bueno Plant in Bloomington | 3469 | 3469 | production |
| East Colfax Bus Rapid Transit Construction | 4689 | 4689 | construction |
| Metro's A Line Opens Its Extension to Pomona | 3362 | 3362 | production |
| Techo International Airport Opens in Phnom Penh | 544 | 544 | production |
| Chenab Rail Bridge Opens as World's Highest Railway Bridge | 479 | 479 | production |
| Marina Bay Sands breaks ground on its fourth tower | 488 | 488 | construction |
| The Athletics Break Ground on Their Las Vegas Ballpark | 3347 | 3347 | construction |
| CHOP Tops Out the Roberts Children's Health Tower | 2220 | 2220 | construction |
| Beijing Tongzhou Station Opens as Asia's Largest Underground Station | 2300 | 2300 | production |
| Danjiang Bridge Opens in Taiwan | 425 | 425 | production |
| Danube Valley Bridge Opens in Linz, Austria | 615 | 615 | production |
| The Ethel — Washington, DC affordable housing | 7078 | 7078 | production |

## Factual repairs

Three status corrections were saved and read back in production and locally:

- Kamenz second battery factory (111): In Progress → Completed. Mercedes-Benz explicitly confirms operation began in 2018. Pin cost was corrected from a bare 562,000,000 without currency to **EUR 500,000,000**, using the manufacturer’s native-currency investment announcement, without FX conversion.
- Ferrero Kinder Bueno facility (3469): In Progress → Completed. Ferrero’s 30 September 2024 release explicitly confirms opening. The profile retains the source’s rounded USD 214 million investment figure; the pin’s earlier more precise USD 214.4 million figure was preserved rather than treating rounding as proof of a changed budget.
- Danjiang Bridge (425): In Progress → Completed. New Taipei City explicitly confirms opening on 12 May 2026. Completion was not inferred from the older target date.

All unrelated tags were retained. Checks confirmed the five English translation-source fields, authors, media, dates, parent links and factory profiles were unchanged by these repairs. No translation refresh was required.

## Evidence and scope

30 quoted source pages were opened. Quotes matched fetched page text on 26 pages. Three blocked pages were checked in the web reader; the Afcons press release PDF was read directly, including its dated 9 June 2025 heading and wind-design specification. Ethel’s publication date was independently checked in the official page’s datePublished metadata and visible attribution.

- Sydney Opera House uses historical AUD cost and historical construction participation, without present-day conversion or treating construction workers as permanent employment.
- Habitat 67 uses original 158 residences, not a current post-combination unit count. An inconsistent module count was not repeated.
- Golden Gate’s USD 35 million construction/financing account is distinguished from structure-only spending. The opening is explicitly pedestrian access on 27 May 1937; an inconsistent vehicle-opening date on another facts page was not used.
- Forth Bridge’s overall length and peak historical construction workforce are sourced separately from modern traffic figures.
- Brooklyn Bridge’s published usage figures are explicitly dated 2024 and are not represented as a new 2026 traffic measurement. Original completion is distinct from later rehabilitation contracts.
- The Metropolitan Railway uses the museum’s own three-and-a-half-mile description and historical 40,000 opening-day passengers, not present network traffic.
- Millau’s 14 December 2004 inauguration is not relabelled as the first public-traffic day.
- Channel Tunnel’s terminal-to-terminal length, historical workforce, normal shuttle journey time and official opening are separately labelled; later services are not conflated with the ceremony.
- DLR covers its initial three-terminus, 15-station network; royal opening and first public service are distinct.
- Australia 108 uses the architect’s 138,000 sq m, 1,105 apartments and 2021 completion. The separate topping-out pin (721) was not given a duplicate project profile.
- Rethe’s partial road opening in July 2016 is distinct from its rail opening on 15 December 2017; 64 m is navigation-channel width.
- Platov’s 3.23 million passengers is its first-year observed traffic, not present-day traffic or design capacity.
- Kamenz covers the second factory. The two-factory campus’s 80,000 sq m, cumulative battery output and total workforce are not assigned to the second building alone.
- Ferrero’s Kinder Bueno facility is distinct from the chocolate-processing facility profiled in batch 4; the latter remains its own threaded pin/profile.
- East Colfax’s bus-only-lane/roadway reopening does not establish full BRT operation; end-2027 service remains planned.
- A Line extension’s USD 1.5 billion, nine miles and four stations refer to Azusa–Pomona; its September 30 celebration report is not asserted to be the first passenger-service day.
- Techo Airport’s 15 million annual passengers is first-phase design capacity; construction participation is not permanent airport staffing.
- Chenab’s 266 km/h is structural wind resistance, not train speed. Wider USBRL project costs are excluded.
- Marina Bay Sands’ 570 suites, separate 15,000-seat arena and 200,000 sq ft meeting space belong to the new development, excluding the existing resort.
- Athletics’ April construction start and June ceremonial groundbreaking are distinct, with February 2028 still an estimated completion.
- CHOP’s topping out on 28 January 2026 does not establish hospital operation; 2028 remains planned. The USD 125 million donation is not treated as whole-project cost.
- Tongzhou’s three underground levels, two mezzanines and launch timetable are station-scoped. Nearby metro openings and whole transport-hub area totals are excluded.
- Danjiang’s 920 m is bridge length, not the 450 m main span. Future light rail provision is not described as an operating railway.
- Linz Danube Valley Bridge uses the engineer’s 305 m span and four-lane design; the card does not claim all four designed lanes are currently open. The completion celebration is reported at source-date precision.
- Ethel’s 100 supportive homes exclude combined Hill East Phase 1 housing and retail totals for Ethel plus Park Kennedy.

The replay catalog now contains **167 profiles**, including all 25 entries matching the saved batch. No application deployment or schema change occurred. Real schema validation, exact API readbacks and preservation checks were used for this content-only batch; `git diff --check` passed.

## Remaining candidates and specific gaps

Production and local candidate queries both return **594**, down from **619** before this batch. These are raw candidates and include entries that may not qualify.

- Port Authority terminal (2219): direct reads of the current official releases returned only a shell. Obtain a readable current release before profiling or applying newly indexed cost/timetable figures; search snippets alone were not used as evidence.
- Australia 108 topping-out pin (721): reconcile with canonical project 710 before assigning another profile.
- Australia 108 cost: architect publishes a different dollar figure from the existing AUD 900 million pin amount; clarify construction-cost versus development-value scope before changing the pin price. The profile omits an investment card.

Earlier batch notes’ unresolved scope/evidence gaps remain outstanding. This does not claim to complete the full backlog or a whole news run.
