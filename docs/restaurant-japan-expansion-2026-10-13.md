# Japan restaurant expansion — October 13, 2026

Saved locally through the authenticated pin, restaurant-content and restaurant-specials management APIs. This batch adds 21 restaurant pins (15282–15302), 21 content profiles, 10 special venues and 33 verified Azure gallery photos. Existing records and authors were preserved. The reviewed API import snapshot is [restaurant-japan-expansion-2026-10-13.json](restaurant-japan-expansion-2026-10-13.json); temporary downloads and credentials stay in the ignored research directory.

Added Fukuoka, Nagoya and Sapporo to the shared city registry. Japan navigation now follows Fukuoka, Osaka, Kyoto, Nagoya, Tokyo, Sapporo by longitude. `/restaurants/japan` opens Fukuoka. All use `Asia/Tokyo`; the existing four-section, empty-tab fallback, expiry and next-local-start behavior is retained.

## Verified local coverage

Counts are distinct restaurants, including a restaurant only once in Specials even when it has several offers. Checked October 13 against the public guide APIs and rendered guide HTML.

| City | Coming soon | Just opened | Top restaurants | Specials |
| --- | ---: | ---: | ---: | ---: |
| Fukuoka | 1 | 1 | 1 | 2 |
| Osaka | 1 | 1 | 3 | 4 |
| Kyoto | 1 | 2 | 3 | 1 |
| Nagoya | 1 | 1 | 2 | 1 |
| Tokyo | 2 | 1 | 3 | 2 |
| Sapporo | 1 | 2 | 2 | 3 |

This is a sourced first expansion, not comprehensive city coverage. Every section was researched: operator releases and branch sites, linked reservation menus, local opening reporting, restaurant galleries and dated promotions. More verified entries can be added through the management APIs without deployment.

## Sources and menu checks

Tax, service, advance booking, branch scope and date restrictions remain in the saved menus. Course component prices are not invented. Published names without individual prices show “Price not published.” Established pins use a clearly identified guide verification date, not an invented opening date. Seasonal menus in Specials are marked limited-time rather than advertised as discounts.

| Restaurant | Sources checked and result |
| --- | --- |
| Chef’s Theatre | [source 1](https://www.mesm.jp/en/eat-drink/chefs-theatre.html), [source 2](https://www.mesm.jp/en/news/Autumn-Semi-LunchBuffet2026.html). Autumn Table of Northwest France: 5 published items. |
| Grand Kitchen | [source 1](https://en.palacehoteltokyo.com/restaurant/grand-kitchen/), [source 2](https://en.palacehoteltokyo.com/wp-content/uploads/2026.10.16-Grand-Kitchen-Weekday-Lunch-Menu.pdf), [source 3](https://en.palacehoteltokyo.com/wp-content/uploads/2026.10.01-Grand-Kitchen-Weekday-Lunch-Menu.pdf). Weekday lunch through October 15: 6 published items. |
| YEBISU BEER HALL TOKYO | [source 1](https://www.ginzalion.jp/yebisu-beerhall-tokyo/), [source 2](https://www.sapporobreweries.com/newsroom/release/detail/20260918000050.html). Launch course: 1 published items. |
| Hyotei — Kyoto main store | [source 1](https://hyotei.co.jp/en/), [source 2](https://hyotei.co.jp/gallery/). Main-store kaiseki: 4 published items. |
| Kikunoi Honten | [source 1](https://kikunoi.jp/restaurant/), [source 2](https://kikunoi.jp/cuisine/menu.html). Honten kaiseki: 6 published items. |
| Maeda Coffee — Heisei Chishinkan pop-up | [source 1](https://www.kyohaku.go.jp/eng/announcements/post_260928.html), [source 2](https://www.maedacoffee.com/shopinfo/). Pop-up menu: 0 published items. |
| P72 | [source 1](https://patinahotels.com/osaka/drink-and-dine/p72). Autumn Harvest Market: 6 published items; MINORU Mont Blanc: 1 published items. |
| Pierre | [source 1](https://icosaka.com/offer/pierre_autumnmenu/). Autumn Menu Pierre: 6 published items. |
| FUJIYAMA TOKYO — Osaka Umeda | [source 1](https://jblm2024.wixsite.com/fujiyama-tokyo/%E8%A4%87%E8%A3%BD-namba-osaka), [source 2](https://prtimes.jp/main/html/rd/p/000000909.000014510.html). October thank-you sushi buffet: 6 published items. |
| Restaurant Hiramatsu Hakata | [source 1](https://www.hiramatsurestaurant.jp/hiramatsu-hakata/), [source 2](https://www.hiramatsurestaurant.jp/hiramatsu-hakata/menu/). Hakata courses: 5 published items; Christmas lunch and dinner: 6 published items. |
| Eggs ’n Things — Canal City Hakata | [source 1](https://www.eggsnthingsjapan.com/hakata/), [source 2](https://prtimes.jp/main/html/rd/p/000000330.000012385.html), [source 3](https://www.eggsnthingsjapan.com/news/260918.html), [source 4](https://www.eggsnthingsjapan.com/wp-content/uploads/TakeOut.pdf). Hakata linked takeaway menu: 12 published items; Autumn chestnut and apple menu: 4 published items. |
| SMAAK Hakata | [source 1](https://prtimes.jp/main/html/rd/p/000000063.000041874.html), [source 2](https://www.tablecheck.com/ja/shops/smaak-hakata/reserve). Hakata planned courses: 2 published items. |
| PERGOLA | [source 1](https://www.associa.com/nma/restaurant/pergola/), [source 2](https://www.associa.com/nma/restaurant/pergola/menu/). Autumn roast beef and dolce lunch buffet: 6 published items. |
| MIKUNI NAGOYA | [source 1](https://www.associa.com/nma/restaurant/mikuni/), [source 2](https://www.associa.com/nma/restaurant/mikuni/menu/). Autumn lunch courses: 7 published items. |
| Chanko Kokonoe | [source 1](https://www.tkp-food.net/restaurant/chanko-kokonoe/), [source 2](https://prtimes.jp/main/html/rd/p/000000561.000024137.html). Published launch menu: 7 published items. |
| Totomaru — Tenpaku | [source 1](https://totomaru.ec-design.co.jp/news/detail/26831504-ec46-4b96-8ef6-c5349bb7f52e), [source 2](https://jouhou.nagoya/totomaru-tenpaku/), [source 3](https://totomaru.ec-design.co.jp/flyers), [source 4](https://totomaru.ec-design.co.jp/flyers?selectedPrefecture=23&selectedShop=0a3009b1-fe04-427a-a4ad-f70713cdf684). Tenpaku autumn dine-in menu: 9 published items. |
| SKY J | [source 1](https://www.jrhotels.co.jp/tower/restaurant/skyj/). SKY J September–October dinner: 7 published items. |
| BAR & GRILL Splish | [source 1](https://www.tokyuhotels.co.jp/sapporostream/restaurant/splish/plan/angel_devil/index.html), [source 2](https://prtimes.jp/main/html/rd/p/000004263.000005113.html). Angel or Devil afternoon tea: 8 published items. |
| Matsu Grill & Bar | [source 1](https://www.hyatt.com/hyatt-centric/ja-JP/ctsct-hyatt-centric-sapporo/dining), [source 2](https://prtimes.jp/main/html/rd/p/000000006.000182545.html), [source 3](https://www.tablecheck.com/ja/matsu-grill-bar/reserve/message). Matsu three-course lunch: 6 published items; Opening dinner toast: 1 published items. |
| PAIRINGx HOKKAIDO | [source 1](https://prtimes.jp/main/html/rd/p/000000135.000082555.html). Published opening dishes: 6 published items. |
| Hakodate Shunka — Sapporo | [source 1](https://sapporo-list.info/shop/kaitensushi-hunka-sapporo/), [source 2](https://www.branch-sc.com/tsukisamu/shop/pop-eventnews.jsp?id=8179). Sapporo opening menu: 0 published items. |

## Evidence conflicts and remaining gaps

- **SMAAK Hakata:** the Granada launch announcement supplies a November opening estimate and course starting prices. Named dishes and food photos in that announcement are explicitly from Yokohama and are excluded. The tentative Hakata reservation page retains Yokohama parking boilerplate; do not import its ancillary conditions. Operator announcement, reservation page and `smaak_hakata` Instagram were checked. Keep November 30 only as a month-end sorting placeholder; recheck the exact day, Hakata dishes, service conditions and actual branch gallery before opening. No representative Hakata photo is verified yet.
- **Hakodate Shunka Sapporo:** the landlord confirms November, while Sapporo List reports November 20. Local listings conflict on street number (1-24 / 1-26). Retain the official month estimate and omit the disputed street number. Operator site, linked Instagram, landlord recruitment notice and Sapporo List were checked. No Sapporo-specific menu, prices, service hours or venue photos are verified; do not use Hakodate dishes or restaurant photos for the Sapporo branch.
- **Maeda Coffee Heisei Chishinkan pop-up:** Japanese/English museum notices confirm October 6–November 29 and 11:00–16:00 service. Museum restaurant information and Maeda shop listings do not publish this temporary restaurant's dishes or prices. Keep link-only menu coverage; the permanent Kyohaku cafe is a separate space. The museum's garden-view restaurant photograph is attached with its caption.
- **YEBISU BEER HALL TOKYO:** the operator confirms October 27 and a ¥8,800 two-hour course. Its live menu section still says “Coming soon.” Preserve the verified course and price; don't borrow dishes from the Ebisu beer hall or Yebisu Brewery Tokyo. Live branch site, brewer announcement and linked booking information were checked.
- **Chanko Kokonoe:** use the live branch website's ¥6,000 Yokozuna and ¥5,000 Ozeki course prices; the TKP launch release lists ¥10,000 and ¥8,000. Both sources are retained. Dinner opens October 16; lunch is only announced for November, without an exact day.
- **Totomaru Tenpaku:** the operator confirms October 10 soft opening and October 21 full opening/takeaway start. The official flyer is returned with Tenpaku specifically selected, so its nine autumn items and tax-inclusive prices are transcribed. Its only named branch exception is Aeon Mall Okazaki. The local article's Moriyama branch food photos are excluded; only its Tenpaku exterior is used.
- **Eggs ’n Things Hakata:** seasonal menu prices are dine-in totals. The undated takeaway PDF is currently linked by the branch; its twelve transcribed takeaway prices are identified separately. The September opening giveaway is expired and excluded. The chestnut/apple promotion excludes Roppongi Hills, not Hakata.
- **Hyotei:** keep Kyoto main-store kaiseki prices separate from annex breakfast/bento and Hibiya. Published November 1 price increases are labelled with their effective date. The Kyoto exterior is the representative image; gallery vessels and other-branch images are excluded from the photo batch.
- **Pierre:** the operator PDF publishes ingredient combinations but no course price. Those named components remain visible without invented individual prices; the 15% service addition and minimum age 13 are retained.
- **Photo access:** Grand Hyatt Fukuoka's English and Japanese galleries returned a browser block; Fortune Garden Kyoto returned CloudFront 403 for both checked URLs. These venues were not added with substitute images. Selected venues' own accessible galleries and operator release photos were downloaded with plain curl, decoded, visually reviewed, uploaded to Azure and downloaded again to verify hashes. No pin photos were added to Git.

## Specials verification

Active/upcoming offers include Chef’s Theatre's October–November lunch, P72's dated harvest sessions and Mont Blanc, Pierre's dated autumn menu, FUJIYAMA TOKYO Umeda's restricted October discount, Hiramatsu Hakata's December Christmas courses, Eggs ’n Things Hakata's autumn items, PERGOLA's dated autumn lunch, SKY J's autumn courses, Splish's Sunday–Tuesday afternoon tea and Matsu's dinner-course welcome drink. Conditions retain published prices, service charges and time windows. FUJIYAMA's October 12 holiday exclusion is explicit; Splish's additional Halloween Saturday is not incorrectly repeated every Saturday.

## Validation

All six guide responses have populated four-section counts and correct city headings. All 21 added pins return their saved titles, and all 21 content profiles match the reviewed menus after save. Special profiles and photo provenance were verified through the admin API. The country entry redirects to Fukuoka. Forty-four existing navigation, offer scheduling, content and offer validation tests pass; TypeScript and focused ESLint pass. This task changed local content and source files; no production deployment was requested or performed.
