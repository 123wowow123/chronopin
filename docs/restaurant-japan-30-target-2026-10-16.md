# Japan restaurant target audit — October 16, 2026

Target: **30 distinct eligible restaurants in every tab of every city**. **425 verified memberships; 300 still missing**. This target remains incomplete; surplus in another tab does not offset a shortage.

All 24 local and production public guide counts agree after batch 66 at **425 memberships / 300 missing**, refreshed 2026-10-17T16:27:53.619480+00:00 (October 18, 01:27 JST / October 17, 09:27 PDT). Kyoto Coming soon10, Tokyo Coming soon12 and Fukuoka Specials24. Tokyo Specials has aged from33to32since the prior audit; its surplus does not reduce another tab’s shortage. Current Japan-local date is October18. Specials count each venue once across available/upcoming windows. Earlier batch checkpoints below are historical.

| City (west to east) | Coming soon | Just opened | Top restaurants | Specials |
| --- | ---: | ---: | ---: | ---: |
| Fukuoka | 10/30 | 17/30 | 14/30 | 24/30 |
| Osaka | 11/30 | 14/30 | 10/30 | 19/30 |
| Kyoto | 10/30 | 31/30 | 10/30 | 30/30 |
| Nagoya | 11/30 | 24/30 | 12/30 | 17/30 |
| Tokyo | 12/30 | 12/30 | 24/30 | 32/30 |
| Sapporo | 7/30 | 12/30 | 30/30 | 32/30 |

## Each remaining shortage

| City | Tab | Local | Production | Target | Shortfall |
| --- | --- | ---: | ---: | ---: | ---: |
| Fukuoka | Coming soon | 10 | 10 | 30 | 20 |
| Fukuoka | Just opened | 17 | 17 | 30 | 13 |
| Fukuoka | Top restaurants | 14 | 14 | 30 | 16 |
| Fukuoka | Specials | 24 | 24 | 30 | 6 |
| Osaka | Coming soon | 11 | 11 | 30 | 19 |
| Osaka | Just opened | 14 | 14 | 30 | 16 |
| Osaka | Top restaurants | 10 | 10 | 30 | 20 |
| Osaka | Specials | 19 | 19 | 30 | 11 |
| Kyoto | Coming soon | 10 | 10 | 30 | 20 |
| Kyoto | Just opened | 31 | 31 | 30 | 0 |
| Kyoto | Top restaurants | 10 | 10 | 30 | 20 |
| Kyoto | Specials | 30 | 30 | 30 | 0 |
| Nagoya | Coming soon | 11 | 11 | 30 | 19 |
| Nagoya | Just opened | 24 | 24 | 30 | 6 |
| Nagoya | Top restaurants | 12 | 12 | 30 | 18 |
| Nagoya | Specials | 17 | 17 | 30 | 13 |
| Tokyo | Coming soon | 12 | 12 | 30 | 18 |
| Tokyo | Just opened | 12 | 12 | 30 | 18 |
| Tokyo | Top restaurants | 24 | 24 | 30 | 6 |
| Tokyo | Specials | 32 | 32 | 30 | 0 |
| Sapporo | Coming soon | 7 | 7 | 30 | 23 |
| Sapporo | Just opened | 12 | 12 | 30 | 18 |
| Sapporo | Top restaurants | 30 | 30 | 30 | 0 |
| Sapporo | Specials | 32 | 32 | 30 | 0 |

## Verification and continuation

37 new restaurant records, 22 new Specials profiles, 340 ordinary menu entries, 68 offer-profile menu entries and 56 credited Azure gallery links were saved and read back in both environments. Batch 55 separately preserves and extends an existing venue profile with two dated offers and 11 published menu entries; it adds no distinct-venue membership. Raw menu counts include the same dish appearing in both ordinary and offer profiles or different course variants; they are not counts of unique dishes.

Batch 56 adds four dated offers, 60 menu entries and three Azure gallery links to three existing profiles. Public pin pages and guide-card menus were verified in both environments, including MYPLACE’s November 1 18:00 JST start and Teori’s October 19 15:00 JST Halloween successor. WIND BREAKER Nagoya retains five 70-minute seatings separately from November SAKAMOTO DAYS. No new venue membership is claimed. See [batch 56 saved profiles](restaurant-japan-30-japan56-2026-10-16.json).

Nineteen cumulative branch opening-date repairs were read back in both environments: ten confirmed and nine explicitly estimated. Six placeholders remain with specific source-backed research gaps; no report, promotion or rename date was substituted for an unverified branch opening. See the [correction audit](restaurant-opening-date-corrections-2026-10-16.json).

Checked exact complete saved profiles, original author presence, native public pin pages and all ordinary menu items, Azure image decode/hash/credit metadata, all 37 new venue cards across paginated guide APIs, native pin identifiers/links and upcoming offer start times. All six production guide HTML pages also returned HTTP 200 with native pin title/image links. The existing Eggs ’n Things pin exposes all 11 new menu entries; the successor starts October 21 at 09:00 JST and retains the prior October 20 expiry.

Continue every under-target cell. Highest Coming soon deficits: Sapporo 23, Kyoto 21, Fukuoka 20, Osaka/Nagoya/Tokyo 19. Nagoya Just opened remains six short. Kyoto Specials reaches 30, but dated offers expire and must be replenished. Detailed sources, held leads and October 17–22 expiry watch are in [research notes](restaurant-japan-30-progress-2026-10-16.md). [CSV](restaurant-japan-30-counts-2026-10-16.csv) and [production delta](restaurant-japan-production-2026-10-16.json) cover this session; older snapshots are history, not permission to overwrite current API profiles.

No application code changes, build, restart or deployment. Release `157e1750` remains the previously documented deployed baseline; this content-maintenance session did not change it.

Batch60 enriched the existing Sushisei Kyoto Isetan ordinary menu with43 priced entries and four credited Azure gallery links. Its autumn offer and opening-history gap remain separate. Post-save all24 local/production counts still agree at405 memberships /320 missing; no new venue membership claimed.

Batch61 adds three distinct branch pins,99 ordinary menu entries, one Specials profile containing three dated offers and28 offer-menu entries, and eight Azure gallery links. Public exact profiles, menus, credits and native guide title/image links verified in both environments; multiple offers at Anchor count once. See [batch61](restaurant-japan-30-japan61-2026-10-16.json).

Batch62 adds three branches,45ordinary menu entries and eight credited Azure gallery links. No new Special or opening-date repair claimed. Toka’s service-charge rate/course roster remain unpublished; promotional renders/artwork are explicitly captioned. See [batch62](restaurant-japan-30-japan62-2026-10-16.json).


## Batch 63 production retry completed

All four branches are now published and publicly verified in both environments. All 24 counts agree at **416 memberships / 310 missing**, refreshed 2026-10-17 13:41 UTC (October 17, 22:41 JST / October 17, 06:41 PDT). The earlier timeout was resolved by paced API retries; no deployment or restart. [Batch verification](restaurant-japan-30-japan63-2026-10-16.json).


## Batch 64 completed

Four new branches and two existing-profile enrichments published through APIs. Full profiles, all 169 menu entries, 25 gallery credits and native guide cards verified. Both environments agree at **420 / 306**. [Batch evidence](restaurant-japan-30-japan64-2026-10-17.json). No new offer, opening-date repair or deployment.


## Batch 65 completed

Three new branches and an existing upcoming branch menu refresh published through APIs. Full profiles, all 309 menu entries, 18 gallery credits and native guide cards verified. Both environments agree at **423 / 303**. [Batch evidence](restaurant-japan-30-japan65-2026-10-17.json). No new offer, opening-date repair or deployment.


## Batch 66 completed

Three new exact branches,104menu entries and18credited Azure links published through APIs, with one Specials venue and ten dated windows (six current/upcoming). Both environments and public native links/menus/cards verified;11boundary checks include holiday pricing and November11at11:11cutoff. **425memberships /300missing**. [Batch evidence](restaurant-japan-30-japan66-2026-10-17.json). Six opening-history placeholders and nine precision gaps persist. No deployment.
