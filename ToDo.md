# To Do

## Japan restaurant guides — next session (research wrapped October 14, 2026)

Target remains **30 distinct eligible restaurants in each tab of each city**. Release `157e1750` is deployed. All213 restaurant/menu records,114Specials profiles and479 gallery links were verified on production. Batch42 closes this research session; the target is not complete. Count each venue once per tab, even with multiple offers. Verified local/production audit:324 memberships,398 missing; Sapporo's two extra Specials do not offset other shortages.

| City (west to east) | Coming soon | Just opened | Top restaurants | Specials |
| --- | ---: | ---: | ---: | ---: |
| Fukuoka | 8/30 | 10/30 | 14/30 | 20/30 |
| Osaka | 6/30 | 14/30 | 9/30 | 13/30 |
| Kyoto | 4/30 | 30/30 | 9/30 | 8/30 |
| Nagoya | 7/30 | 5/30 | 11/30 | 12/30 |
| Tokyo | 8/30 | 8/30 | 22/30 | 29/30 |
| Sapporo | 5/30 | 10/30 | 30/30 | 32/30 |

Continue researching every under-target section, especially Coming soon across all cities and Nagoya Just opened. Refresh counts first: recent openings age out after90days and dated offers expire. Tokyo needs one more Specials venue; preserve the evidence rules rather than filling with unsupported dates, ratings or discounts.

Use the [24-tab audit](docs/restaurant-japan-30-target-2026-10-14.md), [count CSV](docs/restaurant-japan-30-counts-2026-10-14.csv), [batch research notes](docs/restaurant-japan-30-progress-2026-10-13.md) and [latest production rollout snapshot](docs/restaurant-japan-production-2026-10-14.json). The snapshot contains latest saved profiles through batch42; older batch JSON files are research history and should not overwrite later menu/API corrections. Production pin IDs differ from local IDs: match exact branch source URLs.

Next leads, not yet imported or counted: [Sapporo November openings](https://sapporo-list.info/open/november-open/), [Uwajima Basho Sapporo Soen employer listing](https://bistroplus-saiyo.jp/job/-/info/detail/M0000631), [Shokudo Hokuto Sapporo Station November recruitment](https://townwork.net/viewjob/jobid_341b77381f38889a/), [PADDLERS COFFEE Fukuoka/Ropponmatsu November report](https://konohen.media/articles/paddlers-coffee-fukuoka-ropponmatsu-open-202611/), [provisional4F Gorilla Fukuoka employer listing](https://job.inshokuten.com/kyushu/work/detail/94165/fulltime?searchJobCharacteristicId=58). Confirm dates, exact addresses and current operator evidence; do not borrow other branches' menus or photos.

Revisit specific gaps in the batch notes: MAMA Kyoto contradictory November/December floors; future Solamachi/Gong cha/Whity launch menus and actual galleries; SMAAK Hakata courses; STANDARD DONUTS tax/signature price conflict; Yamaya Shinsaibashisuji dessert/free-drink duration and stale booking copy; Taco Bell Dotonbori exact branch prices; expired/expiring offers. Save ordinary content via `/api/admin/restaurant-content`, offers via `/api/admin/restaurant-specials`, use fresh revisions/full merged profiles, preserve original authors and unrelated sections, verify public pins/guide counts after saving. Pin images remain in Azure with source credits. Production application deploys still require a fresh explicit owner request; this session's rollout request is not standing deploy authorization.
