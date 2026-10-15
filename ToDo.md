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






# Left over: link wikis for prod

As of 2026-10-04 (sizing refreshed 2026-10-11). Prod's Anthropic key has no credit, so its link wikis are written here and sent over the API (docs/okf/api/source-wikis.md, memory note prebuilt-wikis).

- **Sizing, 2026-10-11 (the live backlog):** 12,695 pending sources on 4,527 pins (12,202 pending + 493 failed with tries spent; 12,035 web, 492 pdf, 109 youtube, 58 podcast, 1 tweet; 6,735 already have fetched text; pin ids 1-7669, mostly 3000-7000). Biggest hosts: en.wikipedia.org 1,345, sec.gov 367 (long filings, costly), pennrose.com 304, myanimelist.net 199, kalshi.com 192 (JS pages), anilist.co 188, cnbc.com 179, themoviedb.org 153, then grammy.com, espn.com, rottentomatoes.com, fifa.com, federalreserve.gov, boxofficemojo.com at about 100 each. Cost measured on the 431-wiki local-sync batch: about 6k tokens per wiki (20 agents, 2.6M tokens), roughly 75% of links readable, so the whole backlog is about 55M tokens, 4.5 h of local page fetching (about 12 min per 550 links) and about 2 h of gated pushing (25 per request, 15 s apart). Not one session's work. **Tranches, best value first:** A = links of the newest ~500 pins (ids 7000+ and the near-term event window), ~830 links, ~5M tokens; B = en.wikipedia.org only, 1,345 links, ~6M tokens; skip sec.gov, kalshi.com, anilist/MAL stubs and login-walled hosts (dianping). Wikis only feed pin summaries and the pending badge, so older pins gain little. Run each tranche as export `--links FILE` (page text on the Mac), writers per batch of ~20 jobs sized by bytes, `validate`, `push` (it pauses 15 s between requests), then re-pull the pending list; retire the unreadable ones with `status failed, attempts 3` (PATCH /api/admin/db/Source/<id>) so they stop showing as pending. The 2026-10-11 local-sync batch already did this for its own 198 pins: 431 wikis pushed, 25 placeholders reset to pending, 145 unreadable links retired (`.scrape/prod-batches/local-sync-2026-10-10/`).
- **~8,600 links still pending on prod (2026-10-04 figure, superseded by the line above)** (`GET /api/admin/source-wikis` for the live count). Done so far: a pilot of 24 (pins 5884-5891), wave 1 (145 links, pins down to about 5749) and wave 2 (143 links, pins 5923-5966), 312 wikis in all, every one ready with its summary left as it was. The backfill runs newest pins first in waves of 150 (the chosen scope); wave 3 starts from the next-newest link in `GET /api/admin/source-wikis`. Unreadable so far (need the browser or another source): businesswire.com, Bloomberg, Zacks and airdatanews bot checks, a JSE PDF and a PDF-only newsroom card. The count does not fall fast, because pins other sessions post to prod without `sourceWikis` add new pending links (8,599 after the pilot, 8,632 after wave 1, 8,630 after wave 2). A session writes about 9k tokens per wiki, so the whole backlog is too big for one session. Cheaper: top up credit and run `wiki:sync` on prod, or write only each pin's main source link.
- **To continue:** `npm run wiki:prod -- export --pending --out DIR --limit 150` (server order is oldest first, so for newest first export a `--links FILE` sorted by `max(pinIds)` descending), have agents write `DIR/results/wikis/<n>.json` from `DIR/wikis/<n>.json` per `DIR/prompts.md`, then `npm run wiki:prod -- push --dir DIR --by claude-code/claude-sonnet-5-5`. Links the export could not read land in `DIR/blocked/`: businesswire.com (bot check), JSE PDFs (403) and a few thin pages need the browser or another source.
- **New pins:** `wiki:prod export --drafts DRAFTS/`, answer the jobs, `wiki:prod attach --dir DIR --drafts DRAFTS/`, then post as usual, so the pin carries its wikis (`sourceWikis`) and prod runs no wiki work.
- **Only the wiki step is skipped on prod.** Podcast cross-checks, sentiment, stocks, awards and the other save listeners still run on prod for every post; the rest of "process locally, post the final pin" is still open.
- Wikis pushed with `--rewrite` bump the version and put every citing pin's summary behind its links; leave it off for a backfill.
