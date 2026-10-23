# Japan restaurant research — third round, October 22, 2026

This round follows [round two](restaurant-japan-round2-2026-10-22.md). It enriches three existing Nagoya Coming soon pins from a **new retailer announcement published October 22**, and continues Sapporo/Kyoto/Tokyo research before Osaka/Fukuoka. [Batch117](restaurant-japan-30-japan117-2026-10-22.json) stores the exact payloads, prior profiles, source hashes, photo provenance, schedules and verification results. No new restaurant or standalone food-product pin is created.

## JR Nagoya Takashimaya: new prices, paid opening bundles and gallery

[October 22 retailer announcement](https://prtimes.jp/main/html/rd/p/000000513.000047031.html) adds information absent from the [October 15 launch announcement](https://prtimes.jp/main/html/rd/p/000000508.000047031.html). It explicitly identifies the six counters and distinguishes the November 12 opening of the new zone from the three brands that opened in June. The existing exact branch pins and their authors, dates and original text are preserved.

| Branch and existing pin | Verified ordinary menu update | Dated bundle |
| --- | --- | --- |
| THE CITY BAKERY,15900 | Pretzel croissant **¥454** inclusive; existing coffee retains “Price not published” | **¥3,520**, November 12 only,30 sets, one set per person. Eco bag, mug and bagel assortment; bagel varieties/counts and other contents are unpublished. |
| PAUL,15901 | Added **パルミエ・ショコ・リュクス ¥994** and **クロワッサン・ブリュレ ¥648**, inclusive. Existing plain croissant/baguette remain unpriced. | **¥3,300**, November 12–17,50 sets advertised without a daily qualifier, up to three sets per person. Original tote and five breads; exact bread names unpublished. |
| le suprême,15902 | Existing Anpan now **¥281**; added **ほうじ茶マロン ¥508** and the **¥3,240** renewal set, inclusive. | Renewal set is November 12 only,100 sets, up to two per person, six breads and a knife. Saved as a dated ordinary-menu preview; no new Specials membership in this pass. |

The CITY/PAUL bundles are **paid limited-time menus**, saved through `/api/admin/restaurant-specials` with `limitedTime: true`, `discounted: false`. No savings percentage, component valuation, guaranteed stock or daily replenishment is invented. An opening food bundle with a published price is distinct from an inferred free-merchandise offer. The calendar cannot guarantee remaining stock.

CITY/PAUL open **10:00–20:00 on November 12**; PAUL's following November 13–17 service starts **07:30**. The [exact CITY BAKERY operator directory](https://thecitybakery.jp/shop) independently corroborates that branch's normal 07:30–20:00 and opening-day 10:00. le suprême is explicitly **10:00–20:00** and does not inherit another counter's early opening. **23 boundary, next-start and expiry assertions passed**, including the special first-day start and PAUL's final closing boundary.

Five original ordinary menu rows are retained; two previously missing prices are resolved. Four ordinary rows are added. Two offer menus add four rows, comprising the two paid bundles and their explicitly unnamed food components. Photos alone do not identify exact bundle contents: the pictured CITY cookie/coffee packets and PAUL's photographed five breads are not promised as named entitlements.

### Gallery, sources and remaining branch gaps

All seven selected retailer photographs were downloaded with plain curl, decoded and visually reviewed against adjacent captions. Each is credited to JR Nagoya Takashimaya and its brand. Public Azure downloads were hash checked and decoded before saving references. Ordinary cards use relevant food photos; offer cards use the corresponding bundle photo. The three original gallery images are preserved. New images are labelled **branch-specific promotional product examples**, not completed venue photographs or guaranteed launch stock.

Checked the operator sites/directories and linked galleries. [PAUL's directory](https://www.pauljapan.com/shop/) still lists its distinct Canal Doors branch rather than the new Takashimaya counter; those prices/photos/hours are not transferred. The retailer floor-page request timed out. CITY LACHIC is a separate branch and receives none of these Takashimaya updates.

Remaining gaps: full final launch rosters, coffee/plain-bread prices, named bundle varieties, connected direct branch phones, actual completed counter/interior photos and any launch exceptions. le suprême's B1-to-1F renewal must remain distinct from its historic first service; this round preserves its original existing Pin record and queues the finer chronology instead of creating another opening or Specials membership.

## Kyoto: THIS IS MATCHA — new research lead, not published

The [operator announcement](https://www.nanasgreentea.com/blogs/news/tim_20261015) establishes the first takeout branch at Kyoto Yodobashi1F in **early December 2026**. Checked the [teaser](https://www.nanasgreentea.com/pages/thisismatcha), linked [official Instagram](https://www.instagram.com/thisismatcha_jp/), exact Tabelog listing and [local report](https://asobi-and-play.jp/this-is-matcha-kyoto-yodobashi-open/).

No named final menu, price roster, exact opening day or visually verified completed branch gallery was established. The teaser's brand graphic is not a completed restaurant photo. Do not copy parent nana's green tea, ATELIER MATCHA or other tea shops' menus. Tabelog's unconfirmed/listing-hold state does not override the operator's future-opening announcement or prove a closure. Continue exact branch menu/date/gallery research.

## Tokyo: Tottsuan Asakusabashi — chronology held

The [local report](https://tokyo-gurume.com/asakusabashi-nikuju-tottsuan-open/) says November 6; the [exact Tabelog listing](https://tabelog.com/tokyo/A1311/A131103/13327470/) says November 10; current employer search results say November 13. The [managed Gurunavi branch page](https://r.gnavi.co.jp/6e9nwv560000/) has own menu/photo leads but copied Ikebukuro category wording. Check customer-facing operator launch confirmation and original first-service history before selecting a date. No branch pin, borrowed menu or inferred room/photo claim was published this round.

## Sapporo: RIN and Sapporo-en — specific gaps retained

RIN has an [updated exact local November 3 announcement](https://chamonix-cakes.com/kaiten-ab0uasvia8gicm2bno/), but the identity transition at the former Q premises and own launch menu/gallery remain unresolved. Tokyo/Kyoto RIN menus and staff shifts are not Sapporo customer evidence.

The [operator-managed Sapporo-en listing](https://tabelog.com/hokkaido/A0101/A010103/1086269/) identifies November 19 and17:00–03:00, last order02:30. It currently exposes no menu/gallery. Continue own operator/menu/photo research; no generic yakiniku dishes were invented. The stale Teine Yakisoba no Susume2025 history already documented in earlier research is not revived from a mixed-year November roundup.

## Verification and release

Exact profile read-back, all 13 public menu rows, seven new photo credits, preservation of the existing pins/media and five native guide memberships are verified separately in each environment. All 24 local/production sections agree at **643 memberships / 117 missing**; Nagoya Specials is **34/30**. Exact saved profiles and verification results are recorded in batch117. Two new Specials memberships do not reduce under-target Coming soon or Fukuoka Just opened shortages.

The owner explicitly requested the push/deploy for this round. Runtime content uses management APIs; repository research is pushed separately. Deployment uses only `npm run deploy` after any existing rollout finishes, with GitHub image builds and no production VM build.
