# China, Hainan and Hong Kong restaurant opening dates (2026-10-11)

105 guide pins (12 catalogs: `restaurant-china-*.json`, `restaurant-hainan-guides.json`, `restaurant-hong-kong-guide.json`) were originally dated 2026-10-10, the day the guide was checked, with the note "the guide date is not its opening date". Their start dates were researched in three passes and written to the catalogs and, through `PUT /api/pins/:id?lightweight=1`, to production pins (2026-10-11). Each pin's `dateConfidenceReasoning` says what the date rests on.

## Outcome

| Result | Pins |
| --- | --- |
| Exact opening day from a venue or operator source (`confirmed`) | 7 |
| Best estimate (`estimated`) | 97 |
| No usable evidence; kept at the 2026-10-10 verification date (Shen He, Tangxia) | 1 |

Month- or year-only dates sit on the period's last day, purely for sorting. Registration dates, hotel or mall openings and earliest-dated-review upper bounds are proxies and are labelled as such in each reasoning field.

## What counted as evidence

- **Hotel restaurants:** the hotel's opening release or ceremony (the restaurant is listed among launch outlets). Where a restaurant was relaunched (for example Mio, Beijing, reopened 2026-04-16), the first opening is used and the relaunch is in the reasoning.
- **Independent venues:** the operator's own page; company registration at the exact address (Aiqicha, Qichacha, BOSS Zhipin; searching registered name + address + 成立日期 works); Baidu Baike; mall opening reports; earliest dated customer review as an upper bound.
- **Not used as the venue's date:** brand founding years, other branches, predecessor shops, award or guide listing dates, and reviewer "N years open" remarks when anything better existed.

## Known weak dates

Upper bounds only (the shop probably opened earlier): Lao Chang Zhongyang St (2017), NingHaiShiFu (2019), A La Ming Zao (2019), Li Liangui (2020), Zaogaofeng (announcement date 2026-09-24; no day published). Lower bounds only: Gang Ya Gou (Tianyi Square completed 2002-10). Registration-date proxies: Cui He (1994, street number unverified), Laobian, Mei Fei, Cang Qiao, Tie Ge Bi, Fuzhaolou, Xiding, YiKeYin, KuiShengJu, Geng Fu Xing, Lao Fengtian Ma Jia Shaomai, Wan Bao.

## Gaps

- **Shen He Food Shop (Tangxia):** only a 2025-07-15 SMZDM post about a similarly named shop that may be a different venue. Needs a Dianping/Meituan page or local press.
- **Zaogaofeng (resolved 2026-10-11):** two stores exist. The Line 4 Wenlvcheng store (e23.cn, 2026-08-18) is now its own pin (13906, estimated 2026-08-18, OSM station point), and the Line 8 Qingyuan Dajie pin (7512) is sourced to the Dazhong Net article (2026-09-24, estimated). The swap re-keyed the Qingyuan pin's source, created new content (503) and special (1176) records for it, and repurposed the old content (430) and special (944) records for Wenlvcheng, which keeps the e23 source. Neither store has a published opening day.
- **Source URLs:** the third pass's registry citations are search-result evidence without captured page URLs; titles and quotes are in the working notes only.
- **Name variants:** Ctrip names differ from some guide titles (Hao Ge Xian Sao / 蚝哥蚬嫂, Lao Chang / 老昌春饼, Lv Da Yin Xiang / 旅大印象, Jia Wei Zai Tian / 佳味再添). Titles were not changed. Renxin Laopu's Dongle Road address may be stale (Bing Maps lists Huagai Road 93).

## Process notes

- The per-turn WebSearch quota (about 200, shared by all parallel agents) ran out in the first two passes, and Bing/Baidu/Sogou/DuckDuckGo through WebFetch returned junk. The third pass used the Claude-in-Chrome tools against www.bing.com and baike.baidu.com, which worked; call `get_page_text` in a separate step from `navigate`.
- Run no more than about three Chrome research agents at once; they share one browser.
