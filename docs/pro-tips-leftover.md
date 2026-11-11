# Pro tips: leftover work

State on 2026-11-10. Context: a "Pro tips" panel on the pin page (`data-pro-tip-panel`), backed by `PinProTip` (migration 0256), API `GET|PUT|DELETE /api/pins/:id/pro-tips`. Table doc: `docs/okf/tables/pin-pro-tip.md`.

## Done
- Code, migration, API, panel and UI strings in all 16 locales (`pin.proTip`, `pin.proTips`, `pin.proTipSource`). Deployed by Ian.
- 164 pins have tips on **production** (rounds 0 to 3), each read back and verified. Pin ids: `.scrape/pro-tips/done_pin_ids.txt`. Tip JSON per round: `.scrape/pro-tips/tips_round{0,1,2,3}.json`. Posting script: `.scrape/pro-tips/post_round2.py` (reads `ADMIN_PASSWORD` from `.env.local`; change the tips file name for a new round).

## Not done
1. **Local DB has tips for only the first 12 pins** (round 0). Prod has all 164. Post the rest locally if the local panel needs them.
2. **Translations: none.** The tip text is stored in one language. Per the owner (2026-11-10, "do not translate") and AGENTS.md, leave this to the translation agent. The model has no tip translation table yet.
3. **Remaining candidate pins (~1,000), prod counts by tag:** Travel 784, Conference 199, Festival 180, Shows 57, Hotels about 47 (nearly all done; 15286, 15288, 15290, 15298, 15807 returned no usable sourced tips, so stop retrying). Most remaining Travel and event pins are dated February 2027 onward. Restaurants (2,219 pins) were discussed but not started: do it by city in sub-batches, since many branches will have no sourced advice.
4. **Pins that came back empty** (no usable source): 17400, 17813, 17835, 18019, 15275, 15286, 15288, 15290, 15298, 15807. Plus dropped as too weak: 17585, 6564, 4339, 17565, 4894, 17923.
5. Later rounds will go stale: re-check dated tips (2026 prices, hours) near the event.

## Method (what worked)
- List candidates from `https://www.chronopin.com/api/pins/search?q=tag:<Tag>` (sorted by `utcStartDateTime`, future only). Skip pins in `done_pin_ids.txt`, closed-door meetings, keynotes, unopened hotels, cruise-ship launches, news pins.
- One research agent per 4 pins, read-only, prod pin ids. Brief: a tip must be stated as advice by a page the agent fetched; paraphrase; at least two searches and one page beyond the pin's own source; no press-release feature lists, promos, sponsored content, "check the website" filler; past-edition pages only for permanent features and said so in the tip.
- Review every tip before posting. Drop: single-source thin tips, 2018/2023/2025 pages, reader or Airbnb comments, affiliate-flavoured points advice, agent inferences.
- Post one pin at a time, 2 s apart, then read every pin back from the API (terminal paste gets cut off).
- Search rate limits hit the agents in round 3: use smaller batches or a pause between rounds.
