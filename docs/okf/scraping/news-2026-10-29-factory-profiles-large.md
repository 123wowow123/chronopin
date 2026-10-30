---
type: Log
title: "Large construction buildout batch — 2026-10-29"
description: "Owner explicitly requested a large batch on production after the earlier five-profile batch. This manual batch expanded the scope to 25 additional profiles;…"
tags: [scraping, factory-profiles]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-29T18:00:00Z }
---
# Large construction buildout batch — 2026-10-29

Owner explicitly requested a large batch on production after the earlier five-profile batch. This manual batch expanded the scope to 25 additional profiles; it does not change the normal daily-job limit or schedule.

All 25 profiles were saved through authenticated production APIs and mirrored locally. Production identities were resolved by unique source URL, then title checked before writes. Every profile has at least three distinct sourced metric categories, dated milestones, explicit planned/demonstrated distinctions and six null radar axes with evidence gaps. All 50 profile readbacks matched exactly, including keys and milestones. No hand-entered profile was overwritten.

| Project | Local ID | Production ID | Profile stage |
| --- | --- | --- | --- |
| Eglinton Crosstown West Extension Opens to Renforth | 2280 | 2280 | construction |
| JR East's Haneda Airport Access Line Opens to Tokyo Station | 2250 | 2250 | construction |
| Antwerp's Oosterweel Link Targets Phased Opening From 2030 | 590 | 590 | construction |
| Francis Scott Key Bridge Rebuilt | 260 | 260 | construction |
| Second Gotthard Road Tunnel Due to Complete | 476 | 476 | construction |
| Seine-Nord Europe Canal | 440 | 440 | construction |
| Stockholm's Förbifart Bypass Tunnel Now Targets 2030 | 573 | 573 | construction |
| Bishoftu International Airport | 435 | 435 | construction |
| New Ontario Science Centre Is Due to Open at Ontario Place | 2282 | 2282 | construction |
| Dubai Metro's Blue Line Is Due to Open on the Metro's 20th Anniversary | 2241 | 2241 | construction |
| Chacao Channel Bridge Opens | 262 | 262 | construction |
| Miami International Airport's New Concourse K Is Due to Open | 2225 | 2225 | construction |
| Phoenix Sky Harbor Starts Building Its Third Terminal | 2207 | 2207 | announced |
| Kvesheti-Kobi Highway Nears Completion in Georgia | 530 | 530 | construction |
| Sydney Western Harbour Tunnel Set to Open | 637 | 637 | construction |
| Montreal's Olympic Stadium Roof Targeted to Reopen in 2028 | 516 | 516 | construction |
| Fort Worth Finishes the Second Phase of Its Convention Center | 2180 | 2180 | announced |
| Austin-Bergstrom Opens Concourse B and Its Passenger Tunnel | 2184 | 2184 | announced |
| UCSF Opens the Helen Diller Hospital at Parnassus Heights | 2186 | 2186 | construction |
| Congonhas Airport's New Terminal Due to Finish in June 2028 | 2278 | 2278 | construction |
| Torch Tower Completes as Japan's Tallest Building | 2251 | 2251 | construction |
| Denver Airport's Great Hall Program Targets 2027 Completion | 652 | 652 | construction |
| SFO's Terminal 3 West Expansion Opens | 2187 | 2187 | construction |
| Kwu Tung Station Opens on the East Rail Line | 2238 | 2238 | construction |
| The Park at Penn's Landing Is Due to Open Over a Capped I-95 | 2222 | 2222 | construction |

## Factual corrections

All three repairs were API-saved and GET-verified locally and on production, preserving author, media, parent links and the new profile.

- Oosterweel (590): corrected construction price to EUR 10 billion at 2024 prices and status to In Progress. Clarified phased motorway opening from 2030 versus full works in 2033; replaced outdated source-comparison text with the operator’s current account. The 2030 date remains a year-precision anchor for phased opening. The EUR 13.6 billion accounting value including financing is explicitly distinguished.
- Francis Scott Key Bridge (260): corrected status to In Progress based on observed trestle and pile construction. Retained the existing published USD 4.3–5.2 billion cost-range context and the uncertain end-2030 goal.
- Seine-Nord Europe Canal (440): corrected price to EUR 7.3 billion and estimated navigation date to 2032-12-31, a year anchor rather than an announced opening day. Updated description, summary and date/delay reasoning from the operator’s current budget and calendar.

## Sources and verification

35 opened source pages/PDF were used. Exact short quotations were checked against raw page text where fetchable (27 pages), with other quotations checked in the opened web pages or developer PDF. The Torch Tower table was used for Building B’s own floor area rather than the district total. Sources were attached to the relevant pins before the profiles were saved.

Important scope distinctions: airport-wide passenger goals were not assigned to single concourses; Fort Worth phase-two cost excludes phase one; Austin’s service authorizations are not treated as the full airport budget; Gotthard’s second tube is separate from the first-tube refurbishment; Bishoftu phase-one and full-airport capacities remain distinct. Chacao’s conflicting construction-delivery and later inauguration outlooks are retained explicitly. An elapsed date is never treated as proof of completion.

The replay catalog is synchronized at `scripts/factories/capability.json` (67 profiles including the earlier entries). The renamed Oosterweel entry uses the final saved title.

The two English-text repairs (590 and 440) were translated across all 15 supported production locales: 30 rows saved, zero skipped. The due-locale API returned no remaining work for either pin, establishing current source hashes and complete translation shapes. Public API spot-checks passed for Spanish, Japanese and German on both pins. Translation attribution was recorded only in SourceWiki, accurately naming Google Translate HTTP POST, which the synchronization script actually used; the user’s in-progress translation script files were not edited.

## Remaining candidates and specific gaps

The production candidate query now returns **694**, matching the local query. The local count was 719 before this batch, a reduction of 25. These are raw candidates, not a count of verified qualifying construction projects.

- Google Springboard and Lincoln building-level entries: require phase-specific evidence of milestone, cost and capacity. Campus totals and generic homepage links do not establish individual buildings.
- Mont Cenis (423) and Lyon–Turin (634): resolve potentially overlapping canonical identity before duplicating a project profile.
- Draw One completion event (3352), Ferrara first-production event (3509), and San Diego final-gate event (2163): review their parent project profiles instead of automatically profiling threaded event milestones.
- Cielo Cherokee County (15985): the governor’s release describes four facilities and a campus-level initial-operations window. Individual facility milestones were not established, so no arbitrary per-building allocation or profile was created.
- RWE Elliot, Mailuu-Suu remediation, Vadhavan and the remaining unprocessed projects remain for later research/batches; the opened sources and limits do not justify calling them completed or assigning unsupported figures.

No application deployment, restart, production build, schema change or new pin creation occurred. No broad test suite was needed for this researched content-only batch; validation consisted of profile-schema checks, quote checks, exact API readbacks, preservation checks, translation-state verification, the production candidate count and `git diff --check`.

Detailed gitignored artifacts: `.tmp/factory-large-2026-10-29/batch.json`, `results.json`, `source-checks.json`, `repairs-results.json`, `translations-readback.json` and `public-translation-checks.json`.
