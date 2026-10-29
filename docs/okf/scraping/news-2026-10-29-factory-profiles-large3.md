# Large construction buildout batch 3 — 2026-10-29

Owner requested another large batch on production. Added **25 more buildout profiles**, production-first through the authenticated admin APIs, and mirrored them locally. This is a manual profile batch; scheduled news-job limits are unchanged.

All production identities were uniquely resolved by source URL and title, with no existing profiles overwritten. All **50 profile readbacks** matched the prepared data. Every entry passes the real profile validator and the three-distinct-category display threshold. All six radar scores remain null with research gaps. Reference additions preserved authors, text, dates, prices, media and parent links; profile saves preserved the whole pin response. Fresh pin reads preceded reference mutations.

| Project | Local ID | Production ID | Profile stage |
| --- | --- | --- | --- |
| SEA Gateway Project Completes at Seattle-Tacoma's Main Terminal | 2299 | 2299 | production |
| Major Construction Begins on the New Long Bridge Over the Potomac | 2202 | 2202 | construction |
| PortMiami Breaks Ground on Royal Caribbean's Cruise Terminal G | 2226 | 2226 | construction |
| The Las Vegas Convention Center Finishes Its $600 Million Renovation | 3396 | 3396 | production |
| Metro Express Opens on Miami's South Dade TransitWay | 2298 | 2298 | production |
| Los Angeles Breaks Ground on Its Convention Center Expansion | 2194 | 2194 | construction |
| San Diego Airport's New Terminal 1 Opens With 19 Gates | 3225 | 3225 | production |
| The LAX/Metro Transit Center Opens, Bringing Rail to LAX | 3358 | 3358 | production |
| Arizona Finishes the I-10 Broadway Curve Rebuild | 2206 | 2206 | production |
| Metro Opens the Rail to Rail Bike and Walk Path Through South LA | 3344 | 3344 | production |
| Changi Airport Breaks Ground on Terminal 5 | 2232 | 2232 | construction |
| Tesla's Shanghai Megafactory Starts Megapack Production | 4796 | 4796 | production |
| TxDOT Breaks Ground on the I-35 Capital Express Central Rebuild | 2182 | 2182 | construction |
| Construction Starts on Diriyah's 20,000-Seat Arena Superblock | 2247 | 2247 | construction |
| Mumbai's Aqua Line Metro Reaches Cuffe Parade, Completing the Line | 2248 | 2248 | production |
| Mexico City Metro Line 1 Fully Reopens After Its Rebuild | 2285 | 2285 | production |
| MARTA Opens the Rapid A-Line, Its First Bus Rapid Transit Route | 2228 | 2228 | construction |
| Noida International Airport Starts Commercial Flights at Jewar | 2264 | 2264 | production |
| Auckland City Rail Link Opens | 268 | 268 | production |
| Panama Metro Line 3 Opens | 269 | 269 | construction |
| New Harbor Bridge Opens in Corpus Christi | 613 | 613 | production |
| Silvertown Tunnel Opens Under the Thames | 586 | 586 | production |
| Kai Tak Sports Park Opens on Former Hong Kong Airport Site | 578 | 578 | production |
| Hong Kong Airport's Three-Runway System Reaches Full Operation | 678 | 678 | production |
| LaGuardia Airport's $8BN Redevelopment Fully Wraps Up | 670 | 670 | production |

## Status corrections

- Tesla Shanghai Megafactory (4796): In Progress → Completed. The government-published report explicitly confirms mass production launched 11 February 2025.
- MARTA Rapid A-Line (2228): Completed → In Progress for the whole construction project. MARTA confirms first-phase service began 18 April 2026 but still describes remaining construction and final revenue service as targeted for Fall 2026. First-phase operation is recorded separately and no full-completion date is inferred.

Both corrections were saved and read back in production and locally, retaining all other tags. The five English translation-source fields, authors, media, prices, dates, parent links and factory profiles were checked unchanged. No translation refresh was required.

## Evidence and scope

31 quoted source pages were opened. Quotes on 27 pages were checked against fetched page text; four pages requiring the web reader were checked there. The Metro corridor opening quote was corrected to the exact “grand opening” wording before saves. Changi's products card was then expanded with the sourced Automated People Mover scope and re-saved/read back in both environments.

- SAN Terminal 1 covers the opened 19-gate Phase 1A; later gates and the USD 3.8 billion whole-program cost are excluded. The airport's official opening celebration is dated 23 September 2025 in its release.
- SEA Gateway excludes unrelated concourse, restroom and airport-wide security performance figures.
- LAX/Metro Transit Center operation does not establish that the separate airport people mover was operating.
- The I-10 card labels 300,000 daily vehicles as observed corridor demand, not design capacity; major construction completion is 31 May 2025.
- Diriyah's SAR 5.75 billion contract covers the whole Arena Block, while 74,000 sq m and 20,000 seats apply to the arena. A July 2026 trade report explicitly confirms the first steel lift in May 2026.
- Tesla's 10,000 units / 40 GWh is annual design capacity, not measured annual production; 200,000 sq m is site/plant area rather than assumed floor area.
- Noida commercial operations began 15 June 2026, distinct from the March inauguration. The passenger figure is a phase-one design rating.
- Auckland public service started 13 September 2026; practical completion, official opening and train-length provision are distinguished.
- Panama Line 3 uses the reported revised 24.5 km / 12-station scope. Contract delivery dates in 2027 and 2028 remain planned and do not prove passenger service.
- Corpus Christi's first-traffic milestone is explicitly southbound opening; Arup's completed-project description supports the operating bridge configuration.
- Silvertown has explicit supplier confirmation of an April 2025 opening; no exact day is fabricated from a month-only source.
- Kai Tak's HKD 30 billion is the whole park cost; 50,000 seats refers to its main stadium.
- Hong Kong's runway-system start is explicitly confirmed by the Civil Aviation Department as 28 November 2024; this is not a claim that all terminal construction was finished.
- LaGuardia's USD 8 billion and 78 gates refer to the whole redevelopment, with terminal completion dates separately recorded.

The replay catalog now contains **117 profiles**, with all 25 new entries exactly matching the saved batch. This was content maintenance through APIs; no application deployment or schema change occurred.

## Remaining candidates

Production and local candidate queries both return **644**, down from **669** before this batch. These are raw candidates and include pins that may not qualify.

Messina Bridge (619) was left for a separate review of approval/court status and verified physical work. Parent/phase identity checks and specific gaps from earlier batch notes remain outstanding; this batch does not claim to clear them or complete a full news run.
