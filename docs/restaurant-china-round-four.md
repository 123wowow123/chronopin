# Fourth additional China restaurant round

Checked October 10, 2026. Added ten distinct established branches, one per city, through the **local** pin and restaurant-content APIs. Includes 60 named branch dishes and 38 credited Azure photographs. No production database import, deployment, restart, commit or push was performed.

The [reviewed import snapshot](restaurant-china-round-four.json) preserves source URLs, photo credits, original image URLs, public blob URLs, SHA-256 hashes and approximate location evidence. Runtime menus, visit details and landing tiles are stored in the database. Editorial changes use `/api/admin/restaurant-content`; verified offers use `/api/admin/restaurant-specials`.

## Restaurants

| City | Branch | Local pin | Menu items | Photos |
| --- | --- | --- | --- | --- |
| Kunming | Yun Ping Feng Wei Yuan, Huguo Road | 7621 | 6 | 4 |
| Foshan | Huang Dan Ji, Qiaonan Road old shop | 7622 | 6 | 4 |
| Dongguan | Hai Cheng Xuan Seafood Restaurant, Humen | 7623 | 6 | 4 |
| Jinan | Mei Fei Restaurant, Sangyuan Road | 7624 | 6 | 4 |
| Hefei | Sun Fu Da Yuan, pedestrian street | 7625 | 6 | 4 |
| Xiamen | 1980 Roast Pork Zongzi, Zhongshan Road | 7626 | 6 | 4 |
| Ningbo | Cang Qiao Mian Jie, Zhenming Road | 7627 | 6 | 4 |
| Dalian | Da Di Spring Pancakes, Dongbei Road | 7628 | 6 | 4 |
| Shenyang | Bao Fa Yuan, Tianyuan Lane | 7629 | 6 | 3 |
| Harbin | Zhang Bao Pu, Daowai | 7630 | 6 | 3 |

Cities retain their existing west-to-east order. The restaurant guide date records research, not an opening date. These additions appear in Top restaurants as Chronopin selections; no rating was fabricated or copied into an operator endorsement.

## Menu and gallery research

Every branch was checked beyond the first result: fetched Ctrip branch dishes/address/contact details, linked Dianping visitor galleries, official-photo and menu-image categories, plus operator-site, ordering, PDF, current promotion and price searches. Ctrip dish lists were checked against all 60 Chinese item names before import. These are real published dish selections, **not complete operator menus**.

Dianping official-photo routes returned HTTP 403. Menu-image routes returned identity-verification pages, not readable menu photographs. Regular visitor galleries were accessible for nine branches. Bao Fa Yuan's initially indexed Dianping identifier returned 404, so its verified Ctrip branch gallery supplied the photographs instead. Gallery links were inspected and relevant pictures selected; an unrelated-looking storefront, decorative objects, a promotional event portrait, a dining portrait and redundant pictures were excluded. Some accessible visitor images are small; larger original URLs explicitly published in Ctrip's branch JSON supply nine card images. Ctrip does not identify those photographers, and the credit says so. A branch-gallery food photograph does not independently establish its dish name or current availability. Brand-style food photos retain that limited gallery attribution rather than being called authenticated operator photographs.

Photos were downloaded only into ignored `.scrape` files, visually inspected, converted to WebP and uploaded to Azure Blob Storage. Every public blob passed byte-hash, dimensions and decode checks before the database references were saved. No pin photo or thumbnail was added to Git.

**Current prices remain unresolved for all 60 dishes.** Each item explicitly displays “Price not published,” with a menu note explaining that current prices and conditions were not verified. Old visitor prices and ambiguous other-branch pricing were recorded as research leads rather than presented as current charges. No regular-menu dish was assigned to a special without evidence.

### Kunming — Yun Ping Feng Wei Yuan

- [Ctrip Huguo Road branch](https://you.ctrip.com/food/kunming29/5199268.html): address 35–39 Huguo Road, published clay-pot dishes and milk-rice desserts, contact and approximate coordinates.
- [Qunar branch listing](https://touch.go.qunar.com/poi/3305651): corroborates branch address, contact and local snacks. Old visitor pricing is not an operator menu.
- [Dianping branch gallery](https://www.dianping.com/shop/2057989/photos), [official photos](https://www.dianping.com/shop/2057989/officialphotos), [menu images](https://www.dianping.com/shop/2057989/photos/tag-%E4%BB%B7%E7%9B%AE%E8%A1%A8-%E8%8F%9C%E5%8D%95).
- [Trip.com branch](https://hk.trip.com/restaurant/china/kunming/detail/yun-ping-feng-wei-yuan-huguo-road-branch-11349033/): lists 08:30–21:30; a directory lists 21:00 closing. Difference disclosed on the visit details.
- Remaining gap: no authenticated full operator menu, current item prices, verified branch-specific active offer or opening announcement recovered.

### Foshan — Huang Dan Ji

- [Ctrip Chencun old shop](https://you.ctrip.com/food/foshan207/283375.html): Qiaonan Road shops 1–2, Chencun rice sheets, Shunde dishes, split service hours and contact.
- [Foshan News old-shop report](https://www.foshannews.net/h/5860/20240419/704892.html) and [Ministry of Commerce brand profile](https://lzhbwg.mofcom.gov.cn/edi_ecms_web_front/thb/detail/ab84bf4baba44337b907f1c8a20c940d): corroborate the old shop and culinary background. News gallery checked; attached images use accessible, separately credited branch galleries.
- [Dianping old-shop gallery](https://www.dianping.com/shop/3043351/photos), [official photos](https://www.dianping.com/shop/3043351/officialphotos), [price-table category](https://www.dianping.com/shop/3043351/photos/tag-%E4%BB%B7%E7%9B%AE%E8%A1%A8).
- Rejected: the Chencun Vanke/Jingming Road branch's dishes/pricing as evidence for this old shop, and an undated old review's cash-voucher conditions as an active special.
- Remaining gap: full current priced menu and dated branch offer.

### Dongguan — Hai Cheng Xuan

- [Ctrip Humen branch](https://you.ctrip.com/food/dongguan212/5505123.html): Mingyuan Resort, 162 Jinlong South Road, dim sum dishes, hours and contact.
- [Trip.com branch and galleries](https://jp.trip.com/restaurant/china/dongguan/detail/restaurant-11656052/): corroborates the same property and links menu/food/interior photographs.
- [Dianping Humen gallery](https://www.dianping.com/shop/5737828/photos), [official photos](https://www.dianping.com/shop/5737828/officialphotos), [menu images](https://www.dianping.com/shop/5737828/photos/tag-%E4%BB%B7%E7%9B%AE%E8%A1%A8-%E8%8F%9C%E5%8D%95).
- Operator/Mingyuan hotel, menu, PDF and ordering searches did not recover a verifiable current priced branch menu. Results for similarly named restaurants outside Dongguan were excluded.
- Remaining gap: authenticated operator gallery, full menu prices and active dim-sum promotion terms.

### Jinan — Mei Fei

- [Ctrip Sangyuan Road branch](https://you.ctrip.com/food/jinan128/5273052.html): current listing address 9-1 Sangyuan Road, Shandong dishes, split lunch/dinner hours and phone.
- [Dianping branch gallery](https://www.dianping.com/shop/583966/photos), [official photos](https://www.dianping.com/shop/583966/officialphotos), [menu images](https://www.dianping.com/shop/583966/photos/tag-%E4%BB%B7%E7%9B%AE%E8%A1%A8-%E8%8F%9C%E5%8D%95).
- [2020 visitor report](https://live.16fan.com/info/224006.html) distinguishes Minghui Haoting and an older shop address. Its historical dish prices were excluded from the current branch menu; old 981-address references were not substituted for the freshly fetched 9-1 listing.
- Remaining gap: current authenticated price list, portion conditions and dated branch promotion.

### Hefei — Sun Fu Da Yuan

- [Ctrip pedestrian-street branch](https://you.ctrip.com/food/hefei196/5473076.html): Huaihe Road Agricultural Bank building, level 5, opposite Parkson; published Anhui dishes and contact.
- [2024 branch visit](https://you.ctrip.com/travels/hefei196/4138901.html): additional pedestrian-street context.
- [Dianping branch gallery](https://www.dianping.com/shop/5442902/photos), [official photos](https://www.dianping.com/shop/5442902/officialphotos), [menu images](https://www.dianping.com/shop/5442902/photos/tag-%E4%BB%B7%E7%9B%AE%E8%A1%A8-%E8%8F%9C%E5%8D%95).
- Rejected: Baoye branch menu and masked app-only group-buy pricing. One gallery storefront did not clearly identify this restaurant and was excluded.
- Remaining gap: current hours, full priced menu and verifiable promotion. Hours omitted rather than inferred.

### Xiamen — 1980 Roast Pork Zongzi

- [Ctrip Zhongshan Road branch](https://you.ctrip.com/food/xiamen21/319441.html): 353 Zhongshan Road, published zongzi, shacha noodles and snack dishes, contact.
- [Branch visit and gallery](https://gs.ctrip.com/html5/you/travels/21/4010063.html): checks the Zhongshan Road shop rather than borrowing Gulangyu branch details.
- [Dianping branch gallery](https://www.dianping.com/shop/547928/photos), [official photos](https://www.dianping.com/shop/547928/officialphotos), [menu images](https://www.dianping.com/shop/547928/photos/tag-%E4%BB%B7%E7%9B%AE%E8%A1%A8-%E8%8F%9C%E5%8D%95).
- [Tripadvisor branch page](https://cn.tripadvisor.com/Restaurant_Review-g297407-d3634584-Reviews-1980Shao_RouZong_Zhongshan_Road-Xiamen_Fujian.html) includes a menu-photo category and old visitor prices. Other reports range from CNY 5 to 12 over different years; they do not verify a current operator price.
- Remaining gap: current price table, hours and special conditions. Gulangyu's hours/menu were not reused.

### Ningbo — Cang Qiao Mian Jie

- [Ctrip Zhenming Road shop](https://you.ctrip.com/food/ningbo83/10385727.html): 118 Zhenming Road, published noodle/soup dishes and phone.
- [Branch-specific local feature](https://www.sohu.com/a/494123819_120730227): corroborates Zhenming Road and the morning/lunch focus; does not establish current exact service hours.
- [Dianping gallery](https://www.dianping.com/shop/2371207/photos), [official photos](https://www.dianping.com/shop/2371207/officialphotos), [menu images](https://www.dianping.com/shop/2371207/photos/tag-%E4%BB%B7%E7%9B%AE%E8%A1%A8-%E8%8F%9C%E5%8D%95).
- Rejected: Lao Cang Qiao Tou at Huayan Street 89, Jinyu Road branch and nearby Old Lady noodle-shop prices/hours; they are distinct venues. An unrelated-looking decorative gallery photograph was excluded.
- Remaining gap: complete current menu, exact hours and active offers.

### Dalian — Da Di Spring Pancakes

- [Ctrip Dongbei Road branch](https://you.ctrip.com/food/dalian4/5046953.html): 105 Dongbei Road, spring pancakes and Northeast dishes, hours and phone.
- [Dianping branch gallery](https://www.dianping.com/shop/3452653/photos), [official photos](https://www.dianping.com/shop/3452653/officialphotos), [menu images](https://www.dianping.com/shop/3452653/photos/tag-%E4%BB%B7%E7%9B%AE%E8%A1%A8-%E8%8F%9C%E5%8D%95).
- [2026 brand-labelled article](https://www.sohu.com/a/1017088108_122731880) discusses multiple branches and custom group meals but gives no complete branch-specific priced package or current offer calendar. Its shared dishes were not substituted for the Ctrip branch selections.
- [2013 visitor post](https://ameblo.jp/kichelin-guide-dalian/entry-11472451831.html) contains old menu prices and a late-service discount anecdote; excluded from current price/special coverage.
- Remaining gap: full current price list and verified dated package terms.

### Shenyang — Bao Fa Yuan

- [Ctrip Tianyuan Lane restaurant](https://you.ctrip.com/food/shenyang155/366375.html): branch dishes, address, phone, approximate coordinates and original gallery URLs.
- [Ministry of Commerce profile](https://lzhbwg.mofcom.gov.cn/edi_ecms_web_front/thb/detail/ef9fb809001c4a63838365445ec269cf): corroborates the four traditional dishes and establishment. The ministry's pan-fried meatball description is not silently merged with the separately named sauced meatballs in the branch dish list.
- [Trip.com branch](https://www.trip.com/restaurant/china/shenyang/detail/bao-fa-yuan-signature-restaurant-401105/): hours and additional gallery/review links checked.
- Initially indexed Dianping ID 12039720 returned 404 for the visitor gallery; official route returned 403 and menu route verification. Ctrip originals supply three credited photos. Repeated IDs embedded in old Ctrip URLs were not assumed to be valid Dianping shops.
- Remaining gap: current authenticated price/menu document, usable official gallery and branch offer terms.

### Harbin — Zhang Bao Pu

- [Ctrip Daowai branch](https://you.ctrip.com/food/harbin151/4925426.html): Nanxun Street 303, bun varieties and other dishes, hours and phone. A visitor writes 305; the current listing's address is used with approximate entrance positioning.
- [Qunar branch listing](https://touch.go.qunar.com/poi/3244370): dish and ordering accounts checked. Conflicting old minimum-order descriptions are not treated as a confirmed current rule.
- [Dianping gallery](https://www.dianping.com/shop/2340811/photos), [official photos](https://www.dianping.com/shop/2340811/officialphotos), [menu images](https://www.dianping.com/shop/2340811/photos/tag-%E4%BB%B7%E7%9B%AE%E8%A1%A8-%E8%8F%9C%E5%8D%95).
- CNY 6 bun prices appear in visitor/listing excerpts, with no authenticated current price date or resolved ordering minimum; current prices remain unverified rather than presented as operator-guaranteed charges.
- Remaining gap: current full menu prices, minimum-order conditions and active promotion.

## Opening and special coverage

No new verified dated offer was recovered for these ten branches. Existing specials and opening entries from earlier rounds are preserved. Empty sections retain the existing fallback behavior; no date, discount or menu eligibility was invented to activate a tab.

Additional current-city checks included operator announcements, recent local reporting and holiday promotions:

- [Kunming consumer-scene report](https://zixun.kunming.cn/c/9482765.shtml) and [Yunnan holiday report](https://www.ynxc.gov.cn/html/2026/zsdt_0928/3037819.html): shopping-centre openings and city-wide promotions do not establish these restaurants' opening dates or offer eligibility. The described October 7 campaign has expired.
- [Foshan/Danzao holiday report](https://fs0757.com/home/article/view/id/671423.html): a Yue Lou Lan opening lead needs independent venue identity, restaurant status, current menu and branch photo verification. It is not an opening date for Huang Dan Ji.
- [Peng Xiao Xian operator](https://www.pengxiaoxian.cn/) lists Jinan branches; the October “coming soon” marker belongs to **Zibo**, not Jinan. No Jinan coming-soon entry was inferred. [Honglou 1905 reporting](https://jinan.sdnews.com.cn/sh/202608/t20260821_4726503.htm) gives a shopping-district estimate rather than a restaurant's confirmed opening date.
- [Hefei Fangyuan LIVE report](https://news.hefei.cc/2026/0930/030109647.shtml) confirms a shopping-centre opening. Its [campaign report](https://news.hefei.cc/2026/0930/030109657.shtml) describes October 1–7 coupons: expired by this research date, with no eligibility evidence for Sun Fu Da Yuan.
- [Ningbo Evening News restaurant/retail roundup](https://finance.sina.com.cn/jjxw/2026-10-02/doc-initvprf5724161.shtml) includes restaurant leads at Hankyu, MixC and Hongtai H99. It confirms some venues are open and others are behind hoarding or expected sometime in October, but not their exact restaurant opening dates. Branch menu, venue-gallery and date verification remain pending; no precise day was manufactured from a publication date or month-only estimate.
- [Shenyang ticket-offer report](https://finance.sina.com.cn/jjxw/2026-09-24/doc-iniswezt0832294.shtml) describes partner campaigns and flight discounts, not verified Bao Fa Yuan/Harbin restaurant-specific terms. Broad city or payment-platform discounts were not assigned to these pins.

Coverage gaps remain for new branch-specific openings and active specials in these cities. Fresh source checks do not imply exhaustive coverage of every restaurant in China.

## Map positions and validation

All ten locations use the freshly fetched Ctrip `gaodeCoord` branch property POI, converted from GCJ-02 to WGS84 with iterative inversion. The snapshot records the original coordinate, source and conversion. Points remain approximate; the venue entrance/floor should be confirmed from the published address. Baidu coordinates and similarly numbered `googleCoord` values were not substituted without datum verification.

Local verification checks database content against every dish name, price label and menu note; verifies 38 pin-media gallery links and matching card photo URLs; exercises all 40 city/section guide API responses; and checks actual menus, unpriced labels and image decoding on all ten cards and pins. Browser checks cover all ten city pages, the 27-city west-to-east navigation, China/Hainan redirects and mobile Kunming/Dongguan layouts. All checks passed: ten pins/cards, 60 dish names and missing-price labels, 38 linked images, 40 guide API responses, navigation/redirects and mobile pages, with zero browser errors. The final dry-run replay preserved all ten pins/content records and required no additional media links.
