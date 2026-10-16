# Japan restaurant target audit — October 16, 2026

Target: **30 distinct eligible restaurants in every tab of every city**. **395 verified memberships; 330 still missing**. This target remains incomplete; surplus in another tab does not offset a shortage.

All 24 local and production public guide counts agree after batches 51–54 and the batch 55 existing-venue update. Refreshed baseline was 357 memberships / 368 missing; this session adds 38 eligible memberships. Specials are deduplicated across available/upcoming offers by venue, never counted per offer. Audit at 2026-10-16T14:40:12.053395+00:00 (2026-10-16 23:40 JST); eligibility uses Japan local time. Recent openings age out after 90 days, expired offers drop out automatically.

| City (west to east) | Coming soon | Just opened | Top restaurants | Specials |
| --- | ---: | ---: | ---: | ---: |
| Fukuoka | 10/30 | 11/30 | 14/30 | 21/30 |
| Osaka | 9/30 | 14/30 | 10/30 | 15/30 |
| Kyoto | 9/30 | 31/30 | 10/30 | 30/30 |
| Nagoya | 9/30 | 18/30 | 12/30 | 15/30 |
| Tokyo | 11/30 | 11/30 | 24/30 | 32/30 |
| Sapporo | 7/30 | 10/30 | 30/30 | 32/30 |

## Each remaining shortage

| City | Tab | Local | Production | Target | Shortfall |
| --- | --- | ---: | ---: | ---: | ---: |
| Fukuoka | Coming soon | 10 | 10 | 30 | 20 |
| Fukuoka | Just opened | 11 | 11 | 30 | 19 |
| Fukuoka | Top restaurants | 14 | 14 | 30 | 16 |
| Fukuoka | Specials | 21 | 21 | 30 | 9 |
| Osaka | Coming soon | 9 | 9 | 30 | 21 |
| Osaka | Just opened | 14 | 14 | 30 | 16 |
| Osaka | Top restaurants | 10 | 10 | 30 | 20 |
| Osaka | Specials | 15 | 15 | 30 | 15 |
| Kyoto | Coming soon | 9 | 9 | 30 | 21 |
| Kyoto | Just opened | 31 | 31 | 30 | 0 |
| Kyoto | Top restaurants | 10 | 10 | 30 | 20 |
| Kyoto | Specials | 30 | 30 | 30 | 0 |
| Nagoya | Coming soon | 9 | 9 | 30 | 21 |
| Nagoya | Just opened | 18 | 18 | 30 | 12 |
| Nagoya | Top restaurants | 12 | 12 | 30 | 18 |
| Nagoya | Specials | 15 | 15 | 30 | 15 |
| Tokyo | Coming soon | 11 | 11 | 30 | 19 |
| Tokyo | Just opened | 11 | 11 | 30 | 19 |
| Tokyo | Top restaurants | 24 | 24 | 30 | 6 |
| Tokyo | Specials | 32 | 32 | 30 | 0 |
| Sapporo | Coming soon | 7 | 7 | 30 | 23 |
| Sapporo | Just opened | 10 | 10 | 30 | 20 |
| Sapporo | Top restaurants | 30 | 30 | 30 | 0 |
| Sapporo | Specials | 32 | 32 | 30 | 0 |

## Verification and continuation

37 new restaurant records, 22 new Specials profiles, 340 ordinary menu entries, 68 offer-profile menu entries and 56 credited Azure gallery links were saved and read back in both environments. Batch 55 separately preserves and extends an existing venue profile with two dated offers and 11 published menu entries; it adds no distinct-venue membership. Raw menu counts include the same dish appearing in both ordinary and offer profiles or different course variants; they are not counts of unique dishes.

Checked exact complete saved profiles, original author presence, native public pin pages and all ordinary menu items, Azure image decode/hash/credit metadata, all 37 new venue cards across paginated guide APIs, native pin identifiers/links and upcoming offer start times. All six production guide HTML pages also returned HTTP 200 with native pin title/image links. The existing Eggs ’n Things pin exposes all 11 new menu entries; the successor starts October 21 at 09:00 JST and retains the prior October 20 expiry.

Continue every under-target cell. Highest Coming soon deficits: Sapporo 23, Osaka/Kyoto 21, Nagoya 21, Fukuoka 20, Tokyo 19. Nagoya Just opened remains 12 short after three additions. Kyoto Specials reaches 30, but dated offers expire and must be replenished. Detailed sources, held leads and October 17–22 expiry watch are in [research notes](restaurant-japan-30-progress-2026-10-16.md). [CSV](restaurant-japan-30-counts-2026-10-16.csv) and [production delta](restaurant-japan-production-2026-10-16.json) cover this session; older snapshots are history, not permission to overwrite current API profiles.

No application code changes, build, restart or deployment. Release `157e1750` remains the previously documented deployed baseline; this content-maintenance session did not change it.
