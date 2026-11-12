# Pro tips: leftover work

State on 2026-11-11. Context: a "Pro tips" panel on the pin page (`data-pro-tip-panel`), backed by `PinProTip` (migration 0256), API `GET|PUT|DELETE /api/pins/:id/pro-tips`. Table doc: `docs/okf/tables/pin-pro-tip.md`.

## Done
- Code, migration, API, panel and UI strings in all 16 locales (`pin.proTip`, `pin.proTips`, `pin.proTipSource`). Deployed by Ian.
- 391 pins have tips on **production**, each read back and verified: rounds 0 to 5 (164 + 28 pins), then the 2026-11-11 sweep of every attendee-relevant future Festival/Conference/Shows/Travel pin (45 + 47 + 47 + 51 + 9 pins, batches 00 to 41). Pin ids: `.scrape/pro-tips/done_pin_ids.txt`. Tip JSON: `.scrape/pro-tips/tips_round{0..5}.json` and `.scrape/pro-tips/r6/tips_wave{1..5}.json`; briefs and raw agent output are in `r6/` (`brief_NN.txt`, `out_NN.json`). Posting script: `.scrape/pro-tips/post_round2.py` (reads `ADMIN_PASSWORD` from `.env.local`; `r6/post_wave*.py` are copies pointing at a different tips file; change the file name for a new round).

## Not done
1. **Local DB has tips for only the first 12 pins** (round 0). Prod has all 391. Post the rest locally if the local panel needs them.
2. **Translations: none.** The tip text is stored in one language. Per the owner (2026-11-10, "do not translate") and AGENTS.md, leave this to the translation agent. The model has no tip translation table yet.
3. **Remaining candidates: none for Festival, Conference, Shows, Travel.** The 2026-11-11 sweep covered 256 future pins (45+47+47+51+9 posted). Pins that came back empty or were dropped (no sourced attendee advice, closed-door, venue mismatch, thin source) are in `.scrape/pro-tips/r6/empty_ids.txt`: do not retry. Excluded as not attendee-relevant: government and treaty meetings, keynotes, ship, airport and hotel openings. Restaurants (2,219 pins) were discussed but not started: do it by city in sub-batches. Hotels pins and any new future pins are the remaining pool.
4. **Pins that came back empty** (no usable source; the 2026-11-11 sweep's are in `r6/empty_ids.txt`): 17400, 17813, 17835, 18019, 15275, 15286, 15288, 15290, 15298, 15807. Plus dropped as too weak: 17585, 6564, 4339, 17565, 4894, 17923.
5. Later rounds will go stale: re-check dated tips (2026 prices, hours) near the event.

## Method (what worked)
- List candidates from `https://www.chronopin.com/api/pins/search?q=tag:<Tag>` (sorted by `utcStartDateTime`, future only). Skip pins in `done_pin_ids.txt`, closed-door meetings, keynotes, unopened hotels, cruise-ship launches, news pins.
- One research agent per 4 to 6 pins, read-only, prod pin ids; 10 agents per wave. For sweeps, write the brief to a file, have each agent write its JSON to `r6/out_NN.json` and reply with one line, then skim the tips in a compact print (150 chars plus source host). Brief: a tip must be stated as advice by a page the agent fetched; paraphrase; at least two searches and one page beyond the pin's own source; no press-release feature lists, promos, sponsored content, "check the website" filler; past-edition pages only for permanent features and said so in the tip.
- Review every tip before posting. Drop: single-source thin tips, 2018/2023/2025 pages, reader or Airbnb comments, affiliate-flavoured points advice, agent inferences.
- Post one pin at a time, 2 s apart, then read every pin back from the API (terminal paste gets cut off).
- Search rate limits hit the agents in round 3 and again in the sweep (some pins got one search instead of two): tell agents to pace searches and retry, and drop tips whose only source is thin. A post can 502 once: retry that pin alone.
- Extra drops learned in the sweep: tips from a different event or venue than the pin, pins whose title and venue disagree, unofficial aggregator sites, and sources dated 2022 or earlier.
