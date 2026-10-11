# Next ten China restaurant guides

Checked October 10, 2026. Adds Kunming, Foshan, Dongguan, Jinan, Hefei, Xiamen, Ningbo, Dalian, Shenyang and Harbin, taking mainland China to 27 city guides. City navigation remains west to east by city-center longitude. China now opens Kunming, its westernmost supported city. All ten use Asia/Shanghai.

The [reviewed import snapshot](restaurant-china-next-cities.json) contains 22 pin/content records, nine special venue records and 33 verified Azure gallery photographs. Menus, details, tiles and offers are saved through the local database management APIs, not runtime JSON fallback. No production application deployment or production database import is authorized or performed by this task. Registering new cities and the midnight-end API validation correction require an approved application deployment; once supported on production, the reviewed content can be imported through its APIs. Future menu and tile edits do not require deployment.

All four sections are supported; empty tabs hide and their links fall back to populated content. No opening dates, discounts, ratings or item prices were inferred to populate a tab. Top restaurants are Chronopin editorial selections, without invented ratings. Meng Ze Yuan uses an estimated Q4 sorting date and remains unconfirmed until restaurant service is verified.

| City | Top restaurants | Just opened | Coming soon | Specials |
| --- | --- | --- | --- | --- |
| Kunming | SUMA Bar | Molly Tea — Shuncheng | No verified named forthcoming restaurant with an announced target | No current branch offer with verified terms found |
| Foshan | Yuxi — Hilton Foshan | No verified recent branch opening with usable menu coverage | No verified named forthcoming restaurant with an announced target | No current branch offer with verified terms found |
| Dongguan | Song Shan Tea House | Haidilao Food Market Hot Pot — Qiyun Plaza | No verified named forthcoming restaurant with an announced target | Haidilao Food Market Hot Pot — Qiyun Plaza |
| Jinan | Café Spring, Zaogaofeng — Qingyuan Dajie | Hamasushi — Xicheng Paradise Walk | No verified named forthcoming restaurant with an announced target | Café Spring, Zaogaofeng — Qingyuan Dajie |
| Hefei | Yang Zi Xuan, Café Wan | Chayan Yuese — Baohe MixC | Meng Ze Yuan — planned | Café Wan |
| Xiamen | Fu Gong, Café Amoy | No verified recent branch opening with usable menu coverage | No verified named forthcoming restaurant with an announced target | Café Amoy |
| Ningbo | Shang Palace — Ningbo, Yi Café | No verified recent branch opening with usable menu coverage | No verified named forthcoming restaurant with an announced target | Yi Café |
| Dalian | Shang Palace — Dalian, i Café | No verified recent branch opening with usable menu coverage | No verified named forthcoming restaurant with an announced target | i Café |
| Shenyang | Summer Palace — Shenyang, Café Liao | No verified recent branch opening with usable menu coverage | No verified named forthcoming restaurant with an announced target | Café Liao |
| Harbin | Shang Palace — Harbin, Coffee Garden | No verified recent branch opening with usable menu coverage | No verified named forthcoming restaurant with an announced target | Coffee Garden |

## Menus, galleries and map evidence

Current branch operator pages were checked in English and Chinese, including restaurant Creations, dining details, linked menus/PDFs, official gallery/photo-video pages, offer pages and branch-specific ordering/menu-image searches. Every entry includes actual named food or drinks, or the specifically published eligible benefit; missing prices are labelled “Price not published”. Linked scanned PDFs were rendered and inspected before priced transcription. Currency is CNY; buffet prices, à la carte prices, service charges and tax qualifications remain separate. Other branches’ menus, room-only benefits, expired opening gifts and ordinary signature/tasting menus are excluded from Specials.

Shangri-La’s eight property photo-video pages were checked but displayed “No related content”; the restaurant hero and branch-specific Creations images provided verified photos instead. Photos associated with another restaurant at the same hotel were excluded. Hilton Foshan’s Chinese operator dining page supplied the Yuxi photo after its English image/gallery fetch failed. Hyatt’s English/Chinese dining and gallery image fetches failed; the hotel’s verified September 4 Song Shan Tea House announcement provided four food photographs, recovered directly from its linked operator images. These are representative images from that announcement; captions do not infer unpublished dish prices. Gallery/launch-image searches for Molly Tea Shuncheng, Hamasushi Xicheng, Zaogaofeng Qingyuan, Chayan Baohe and forthcoming Meng Ze Yuan did not recover a publicly verifiable branch image with operator provenance; unrelated rooms, other branches and third-party editorial photographs were excluded.

All selected images were inspected visually, converted to WebP in ignored temporary storage, uploaded to Azure and verified publicly for hash, dimensions and decoded image content before import. Blob/source URLs, operator credits, captions and SHA-256 hashes are retained in the snapshot. No pin photographs are added to Git.

Pin map positions use property coordinates, matched property POIs or approximate street positions, and are labelled approximate. Amap POIs use GCJ-02; the Xicheng mall, Qiyun mall, Hyatt Song Shan Lake and Baohe mall points were inverse-converted to WGS84. Qiyun and Baohe are same-building map anchors, not claims about the precise restaurant entrance. Broad Locality matches were rejected. The misleading Hyatt GeoNames point in Dongcheng was rejected in favour of the Song Shan Lake property POI. Street geocoding for Hilton was rejected because it placed the point well north of the property; the matching hotel map point was used. Qingyuan Dajie uses an approximate intersection/street position; its exact station entrance needs a better published source.

### Kunming

- **SUMA Bar**: Yunnan ingredients in cocktails and small plates at Shangri-La Kunming. The operator does not admit children after 18:00. CNY; includes 10% service charge and 6% VAT. Operator names these cocktails; individual prices not recovered from the image-heavy linked cocktail menu.
  - [SUMA Bar — research source](https://www.shangri-la.com/kunming/shangrila/dining/bars-lounges/suma-bar/)
  - [Bar food](https://sitecore-cd.shangri-la.com/-/media/Shangri-La/kunming_shangrila/dining/bars-lounges/suma/042_SUMA_Food_Menu.pdf)
  - [Signature cocktails](https://sitecore-cd.shangri-la.com/-/media/Shangri-La/kunming_shangrila/dining/bars-lounges/suma/0423_SUMA_Cocktail_Menu.pdf)
- **Molly Tea — Shuncheng**: Molly Tea opened at Shuncheng on September 2, with three Yunnan-exclusive drinks. Kunming Daily verifies this branch and its Yunnan launch drinks. Prices not published; September 2–16 opening discount expired.
  - [Molly Tea — Shuncheng — research source](https://www.kunming.cn/news/c/2026-09-03/14070784.shtml)
  - [Approximate map location](https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine=%E6%98%86%E6%98%8E%E9%A1%BA%E5%9F%8E%E8%B4%AD%E7%89%A9%E4%B8%AD%E5%BF%83&outFields=Match_addr%2CAddr_type&maxLocations=2&sourceCountry=CHN)

### Foshan

- **Yuxi — Hilton Foshan**: Cantonese and Shunde cooking with an operator-published signature-dish list and a verified restaurant photograph. Current Chinese operator page names these dishes without prices. An old May 2018 PDF is not linked from the current page and is excluded as current pricing.
  - [Yuxi — Hilton Foshan — research source](https://www.hilton.com.cn/zh-cn/hotel/foshan/hilton-foshan-fuocdhi/dinings.html)
  - [Approximate map location](https://findit.city/cn/china/foshan/places/hotels/-1530300933)

### Dongguan

- **Song Shan Tea House**: Lake-side Cantonese dining and dim sum with a September operator-published all-you-can-eat morning tea and lunch menu. Operator’s September 4 post publishes these dishes and prices for morning tea 08:00–11:30 and lunch 11:30–14:30. Individual dish prices and tax/service treatment not published. This menu has no verified discount or expiry, so is not classified as a special.
  - [Song Shan Tea House — research source](https://weibo.com/2/detail/5339386252103292)
  - [Approximate map location](https://ditu.amap.com/place/B03017UNEH)
- **Haidilao Food Market Hot Pot — Qiyun Plaza**: Haidilao’s seafood-market format began trial service on August 29 at Qiyun Plaza, with self-selected ingredients and a published autumn opening campaign. Town operator reporting names these branch broths and fresh-cut beef; prices are not published. Other Haidilao branches’ dishes and prices excluded. The city tourism report dates this branch promotion September 16–October 20, 2026. The campaign is active on those calendar dates; service hours remain unverified.
  - [Haidilao Food Market Hot Pot — Qiyun Plaza — research source](https://pub.timedg.com/a/2026-08/30/AP6a93a45ee4b0fee713194207.html)
  - [Verified branch selections](https://webzdg.sun0769.com/web/news/content/889661)
  - [September–October opening promotion](https://pub.timedg.com/s/2026-09/22/AP6ab2585de4b0fee714347363.html)
  - [Approximate map location](https://www.amap.com/place/B0M6UUQ3GL)
  - Published offer conditions: The date-wide campaign window describes offer eligibility, not 24-hour restaurant opening. Confirm restaurant service hours, eligible purchases and exclusions directly before visiting. Individual menu prices and stacking terms are not published.

### Jinan

- **Café Spring**: Jinan favourites and international dishes, with a linked priced à la carte menu and children’s buffet terms. Currently linked branch PDF; prices include service charge, government taxes and VAT. Current operator prices; confirm holiday pricing. Buffet benefit only; regular à la carte dishes are not assumed eligible. Shangri-La Circle members: up to two children aged six and below of registered hotel guests receive complimentary buffet meals with a dine-in adult. Additional children aged six and below and children aged 7–11 receive 50% off adult buffet prices. Shangri-La Circle membership applies.
  - [Café Spring — research source](https://www.shangri-la.com/jinan/shangrila/dining/restaurants/cafe-spring/)
  - [À la carte selections](https://sitecore-cd.shangri-la.com/-/media/Shangri-La/jinan_shangrila/dining/restaurants/A-La-Cart-Menu.pdf)
  - Published offer conditions: Shangri-La Circle members: up to two children aged six and below of registered hotel guests receive complimentary buffet meals with a dine-in adult. Additional children aged six and below and children aged 7–11 receive 50% off adult buffet prices. Shangri-La Circle membership applies. Buffet subject to availability. No operator expiry is published; confirm eligibility with the restaurant.
- **Hamasushi — Xicheng Paradise Walk**: Hamasushi opened its Jinan Xicheng branch on September 19. The October local report confirms salmon sushi at this new branch. Dazhong Daily’s October 4 branch report verifies salmon sushi. Launch reporting gives a basic plate price of CNY8 for two pieces without tying that price to salmon; the salmon price is therefore not inferred. Other branches’ menus excluded.
  - [Hamasushi — Xicheng Paradise Walk — research source](https://www.jinantimes.com.cn/news-39-5319910.html)
  - [Verified branch sushi](https://m.dzplus.dzng.com/share/general/0/NEWS3729975KAQBRISEWBWTF)
  - [Approximate map location](https://ditu.amap.com/place/B0JGVC7UN1)
- **Zaogaofeng — Qingyuan Dajie**: Freshly baked jujube cake in the Line 8 station hall, with a published branch purchase benefit. August 18 report confirms the branch was already operating; its exact opening date and cake price are not published. September 24 branch report publishes this benefit without an expiry. Confirm availability before ordering.
  - [Zaogaofeng — Qingyuan Dajie — research source](https://news.e23.cn/jnnews/2026-08-18/2026081800033.html)
  - [Qingyuan opening benefit](https://auto.dzwww.com/ycjp/202609/t20260924_18154135.htm)
  - [Approximate map location](https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine=%E6%B5%8E%E5%8D%97%E7%AB%A0%E4%B8%98%E7%BB%8F%E5%8D%81%E4%B8%9C%E8%B7%AF%E6%B8%85%E6%BA%90%E5%A4%A7%E8%A1%97&outFields=Match_addr%2CAddr_type&maxLocations=2&sourceCountry=CHN)
  - Published offer conditions: Minimum eligible spend CNY20. Cannot be combined with other discounts. No expiry is published; confirm current redemption with the branch.

### Hefei

- **Yang Zi Xuan**: Anhui signature cooking and Cantonese dishes, including the operator’s Cao Cao chicken and Li Hongzhang stew. Operator Creations section names these dishes. No current public item prices recovered after operator, menu/PDF, image and ordering searches.
  - [Yang Zi Xuan — research source](https://www.shangri-la.com/hefei/shangrila/dining/restaurants/yang-zi-xuan/)
- **Café Wan**: Local Anhui dishes and international buffet cooking, with lunch and dinner buffet service Friday through Sunday. Current operator prices; service/tax treatment not stated. Currently linked March 25, 2025 branch buffet menu; selection subject to availability. Individual item prices not published. Buffet benefit only; regular à la carte dishes are not assumed eligible. Up to two children under six of registered hotel guests receive complimentary buffet meals with a paying adult. Additional children under six and children aged 6–11 receive 50% off the adult buffet price. This branch does not publish a Circle membership requirement.
  - [Café Wan — research source](https://www.shangri-la.com/hefei/shangrila/dining/restaurants/cafe-wan/)
  - [Linked buffet menu selections](https://sitecore-cd.shangri-la.com/-/media/Shangri-La/hefei_shangrila/dining/restaurants/cafe-wan/250325_SLHF_Caf-Wan-Menu.pdf)
  - Published offer conditions: Up to two children under six of registered hotel guests receive complimentary buffet meals with a paying adult. Additional children under six and children aged 6–11 receive 50% off the adult buffet price. This branch does not publish a Circle membership requirement. Buffet subject to availability. No operator expiry is published; confirm eligibility with the restaurant.
- **Meng Ze Yuan — planned**: IHG lists Meng Ze Yuan at its Hefei City Center hotel, which targets opening in the fourth quarter of 2026. The restaurant’s separate opening day has not been announced. Operator dining page lists these planned breakfast dishes without prices. Restaurant service start remains unconfirmed; published planned breakfast hours 06:00–10:00.
  - [Meng Ze Yuan — planned — research source](https://www.ihg.com/holidayinn/hotels/cn/zh/hefei/hfecc/hoteldetail)
  - [Planned local breakfast selections](https://www.ihg.com/holidayinn/hotels/cn/zh/hefei/hfecc/hoteldetail/dining)
  - [Approximate map location](https://www.hotelplanner.com/Hotels/253547/Reservations-Hotel-Hefei-Hefei-Block-B-No-598-Huangshan-St-230000)
- **Chayan Yuese — Baohe MixC**: Chayan Yuese opened its Baohe MixC garden-themed branch on August 3, bringing its classic tea drinks to Hefei. Baohe district reporting names these drinks for this branch. Current individual prices are not published. Generic prices from Changsha, retail tea packs and expired launch gifts are excluded.
  - [Chayan Yuese — Baohe MixC — research source](https://ah.people.com.cn/BIG5/n2/2026/0914/c374164-41695290.html)
  - [Verified branch launch drinks](https://finance.sina.com.cn/wm/2026-07-15/doc-inihxaez7968894.shtml)
  - [Approximate map location](https://www.amap.com/place/B0KDJZ73HQ)

### Xiamen

- **Fu Gong**: Cantonese cooking and Minnan dishes at the Guanyinshan waterfront hotel. Current operator page confirms branch/cuisine; branch-specific Ctrip dish listing names these items without prices. No public current price sheet recovered; July collaboration menus and other branches excluded.
  - [Fu Gong — research source](https://www.shangri-la.com/xiamen/shangrila/dining/restaurants/fu-gong/)
  - [Branch signature dishes](https://gs.ctrip.com/html5/you/foods/fooddetail/21/21375264.html)
- **Café Amoy**: Display kitchens and international dishes, with a published children’s buffet dining benefit. Operator names the dishes without prices. Adult buffet prices are not inferred from room packages. Buffet benefit only; regular à la carte dishes are not assumed eligible. Shangri-La Circle members: up to two children aged six and below of registered hotel guests receive complimentary buffet meals with a dine-in adult. Additional children aged six and below and children aged 7–11 receive 50% off adult buffet prices. Shangri-La Circle membership applies. Children of non-registered walk-in guests under 12 receive 50% off buffet meals under the branch’s published Circle meal plan.
  - [Café Amoy — research source](https://www.shangri-la.com/xiamen/shangrila/dining/restaurants/amoy/)
  - Published offer conditions: Shangri-La Circle members: up to two children aged six and below of registered hotel guests receive complimentary buffet meals with a dine-in adult. Additional children aged six and below and children aged 7–11 receive 50% off adult buffet prices. Shangri-La Circle membership applies. Children of non-registered walk-in guests under 12 receive 50% off buffet meals under the branch’s published Circle meal plan. Buffet subject to availability. No operator expiry is published; confirm eligibility with the restaurant.

### Ningbo

- **Shang Palace — Ningbo**: Ningbo seafood and Cantonese classics, with a linked branch menu and signature-dish photographs. Currently linked branch PDF; CNY prices. Confirm current service and tax treatment with the restaurant.
  - [Shang Palace — Ningbo — research source](https://www.shangri-la.com/ningbo/shangrila/dining/restaurants/shang-palace/)
  - [Ningbo and Cantonese selections](https://sitecore-cd.shangri-la.com/-/media/Shangri-La/ningbo_shangrila/dining/restaurants/shang-palace/Shang-Palace.pdf)
- **Yi Café**: International buffet stations with published lunch and dinner prices and children’s dining terms. Current operator prices; breakfast price and tax/service treatment not published. Branch-specific dish listing; individual prices not published. Selection varies; these are not automatically included in the children’s buffet benefit. Buffet benefit only; regular à la carte dishes are not assumed eligible. Shangri-La Circle members: up to two children aged six and below of registered hotel guests receive complimentary buffet meals with a dine-in adult. Additional children aged six and below and children aged 7–11 receive 50% off adult buffet prices. Shangri-La Circle membership applies. Children of non-registered walk-in guests under 12 receive 50% off buffet meals under the branch’s published Circle meal plan.
  - [Yi Café — research source](https://www.shangri-la.com/ningbo/shangrila/dining/restaurants/yi-cafe/)
  - [Branch dish selections](https://gs.ctrip.com/html5/you/foods/fooddetail/83/263445.html)
  - Published offer conditions: Shangri-La Circle members: up to two children aged six and below of registered hotel guests receive complimentary buffet meals with a dine-in adult. Additional children aged six and below and children aged 7–11 receive 50% off adult buffet prices. Shangri-La Circle membership applies. Children of non-registered walk-in guests under 12 receive 50% off buffet meals under the branch’s published Circle meal plan. Buffet subject to availability. No operator expiry is published; confirm eligibility with the restaurant.

### Dalian

- **Shang Palace — Dalian**: Dalian seafood with Cantonese preparations, backed by a currently linked branch menu and signature photographs. Currently linked branch PDF; CNY per portion unless labelled per person. Confirm taxes, service charges and seafood availability.
  - [Shang Palace — Dalian — research source](https://www.shangri-la.com/dalian/shangrila/dining/restaurants/shang-palace/)
  - [Seafood signature selections](https://sitecore-cd.shangri-la.com/-/media/Shangri-La/dalian_shangrila/dining/restaurants/Shang-Palace/Shang-Palace-Menu-A.pdf)
- **i Café**: International buffet stations with sashimi and current operator-published buffet prices. The operator names sashimi without individual prices. Linked in-room dining and Shang Palace PDFs are excluded from i Café’s in-restaurant menu. Buffet benefit only; regular à la carte dishes are not assumed eligible. Shangri-La Circle members: up to two children aged six and below of registered hotel guests receive complimentary buffet meals with a dine-in adult. Additional children aged six and below and children aged 7–11 receive 50% off adult buffet prices. Shangri-La Circle membership applies. Children of non-registered walk-in guests under 12 receive 50% off buffet meals under the branch’s published Circle meal plan.
  - [i Café — research source](https://www.shangri-la.com/dalian/shangrila/dining/restaurants/icafe/)
  - Published offer conditions: Shangri-La Circle members: up to two children aged six and below of registered hotel guests receive complimentary buffet meals with a dine-in adult. Additional children aged six and below and children aged 7–11 receive 50% off adult buffet prices. Shangri-La Circle membership applies. Children of non-registered walk-in guests under 12 receive 50% off buffet meals under the branch’s published Circle meal plan. Buffet subject to availability. No operator expiry is published; confirm eligibility with the restaurant.

### Shenyang

- **Summer Palace — Shenyang**: Cantonese classics and Liaoning dishes with a current March 2026 branch menu. CNY prices transcribed from the linked March 14, 2026 menu. Confirm tax/service treatment.
  - [Summer Palace — Shenyang — research source](https://www.shangri-la.com/shenyang/shangrila/dining/restaurants/summer-palace/)
  - [March 2026 selections](https://sitecore-cd.shangri-la.com/-/media/Shangri-La/shenyang_shangrila/dining/restaurants/summer-palace/20260314_Sp-menu.pdf)
- **Café Liao**: International buffet and Northeast Chinese à la carte cooking with published prices and branch children’s dining terms. CNY prices are subject to 10% service charge and prevailing government taxes/VAT on the service charge. Current branch adult prices; confirm buffet tax/service treatment. Buffet benefit only; regular à la carte dishes are not assumed eligible. Shangri-La Circle member privilege: up to two children under seven receive complimentary buffet meals with a paying adult. Children aged 7–11 receive 50% off. This branch does not explicitly limit the privilege to registered hotel guests.
  - [Café Liao — research source](https://www.shangri-la.com/shenyang/shangrila/dining/restaurants/cafe-liao/)
  - [À la carte selections](https://sitecore-cd.shangri-la.com/-/media/Shangri-La/shenyang_shangrila/settings/cafe-liao-alaca-menu.pdf)
  - Published offer conditions: Shangri-La Circle member privilege: up to two children under seven receive complimentary buffet meals with a paying adult. Children aged 7–11 receive 50% off. This branch does not explicitly limit the privilege to registered hotel guests. Buffet subject to availability. No operator expiry is published; confirm eligibility with the restaurant.

### Harbin

- **Shang Palace — Harbin**: Cantonese dishes and local Northeast favourites with an August 2026 branch menu. Linked August 12, 2026 menu; CNY prices include service charge and government taxes.
  - [Shang Palace — Harbin — research source](https://www.shangri-la.com/harbin/shangrila/dining/restaurants/shang-palace/)
  - [August 2026 selections](https://sitecore-cd.shangri-la.com/-/media/Shangri-La/harbin_shangrila/dining/restaurants/shang-palace/260812_SHAR_ShangPalaceMenu.pdf)
- **Coffee Garden**: Buffet dining with newly linked August 2026 menus and a published children’s dining benefit. Current operator prices; confirm tax/service treatment. Linked August 17, 2026 dinner buffet menu. Individual item prices not published; selections subject to availability. Buffet benefit only; regular à la carte dishes are not assumed eligible. Shangri-La Circle members: up to two children aged six and below of registered hotel guests receive complimentary buffet meals with a dine-in adult. Additional children aged six and below and children aged 7–11 receive 50% off adult buffet prices. Shangri-La Circle membership applies.
  - [Coffee Garden — research source](https://www.shangri-la.com/harbin/shangrila/dining/restaurants/coffee-garden/)
  - [August 2026 dinner buffet selections](https://sitecore-cd.shangri-la.com/-/media/Shangri-La/harbin_shangrila/dining/260817_SHAR_Coffee-Garden-Dinner-Buffet-Menu.pdf)
  - Published offer conditions: Shangri-La Circle members: up to two children aged six and below of registered hotel guests receive complimentary buffet meals with a dine-in adult. Additional children aged six and below and children aged 7–11 receive 50% off adult buffet prices. Shangri-La Circle membership applies. Buffet subject to availability. No operator expiry is published; confirm eligibility with the restaurant.

## Additional opening and offer research; remaining section gaps

- **Kunming:** checked [July Banu first-store report](https://m.kunming.cn/news/c/2026-07-24/14061192.shtml), Shangri-La operator offers and SUMA launch reports. SUMA opened April 30, 2025, so is not a 2026 opening. The September 2–16 Molly Tea opening discount and September 10–27 Qidian festival are expired. JEN’s SUMA discount is an accommodation package, not unrestricted dining. No named forthcoming restaurant with verified target/menu found.
- **Xiamen:** checked local first-store reporting, SM mall operator announcements, Fu Gong’s [July two-chef event](https://fj.sina.cn/news/2026-07-07/detail-inifxxxc1603818.d.html) and hotel offers. September Universe Tea and a claimed Zi Gui Xuan launch were leads, but usable current branch menus/precise opening corroboration were not recovered. SM festival September 25–27 is expired; October merchandise pop-ups are not restaurant openings. Hotel Ancient Egyptian packages condition dining discounts on accommodation and are excluded. No verified forthcoming restaurant found.
- **Ningbo:** checked [Haishu government first-store reporting](https://www.haishu.gov.cn/col/col1229827453/art/2026/art_fbde6c5e2ac1437e896908f46cae6a92.html), Sushiro April opening and [tourism-town March recruitment](https://qf.ningbo.gov.cn/qfpt/fwbk/rcfw/rmzx/art/2026/art_3350fb4464da4ec2ad2f8e266580b33c.html). April is outside the recent-opening period. Recruitment mentions unnamed restaurants without target dates. Ctrip buffet vouchers conflict with current operator adult prices and lack usable expiry/eligibility; excluded. No qualifying recent or forthcoming branch with current menu coverage verified.
- **Hefei:** checked People’s Daily and Baohe district opening reporting, Chayan’s operator website, [Fangyuan LIVE September 30 mall opening](https://news.hefei.cc/2026/0930/030109647.shtml), Yu Mei Hua mall announcements and [Tongqinglou hotel projects](https://www.tongqinglou.cn/tql/mobile/storedisplay?bid=2&cid=8). Chayan Baohe’s August 3 opening is confirmed and the district launch report names its drinks; current item prices, hours and branch photographs remain unverified. Fangyuan’s October 1–7 coupons and Yu Mei Hua’s September 19–20 discounts expired. A forthcoming hotel without a named restaurant is insufficient. IHG does name Meng Ze Yuan and a Q4 hotel target; its separate restaurant opening date remains a gap. No unverified hotel-wide “Kids Eat Free” terms were borrowed for this forthcoming venue.
- **Jinan:** checked Jinan Times, Dazhong Daily, [station opening reporting](https://news.e23.cn/jnnews/2026-08-18/2026081800033.html), [September station offer reporting](https://auto.dzwww.com/ycjp/202609/t20260924_18154135.htm) and Hamasushi menu/ordering searches. Basic CNY8 two-piece plates do not establish the salmon item price. Other Hamasushi locations and Japan menus excluded. Zaogaofeng was already operating by August 18; September 24 is a report date, not its opening date. Its CNY5-off-CNY20 benefit has no published expiry; confirm with branch. Soy-milk launch gifts ending September 30 expired. Other sushi forthcoming leads lack an announced target/menu.
- **Shenyang:** checked [DaDong food-hall launch reporting](https://app.xinhuanet.com/news/article.html?articleId=202609011102ede711774441b9bea8b38eb3c800), [September first-store reporting](https://finance.sina.com.cn/jjxw/2026-09-16/doc-iniryefk3452261.shtml), [September 20–22 Xita festival](https://www.ln.gov.cn/web/ywdt/qsgd/ass_2_1/2026092214112523751/index.shtml) and hotel operator offers. Grocery food halls are not a named restaurant opening; September festival/food-hall launch benefits are expired. A December hotel target did not establish a named restaurant/menu. Café Liao’s under-seven Circle privilege is preserved separately from other hotels’ under-six/registered-guest rules. Holiday breakfast extensions are published but the imported ordinary weekly schedule is conservative; confirm public-holiday breakfast service.
- **Dalian:** checked Shangri-La branch offers, Hang Lung anniversary promotions, local first-store reporting and tea-chain launch leads. September 25–27 mall events expired. The hotel’s September–November discount is a multi-night room promotion. Tea-chain activity leads lacked reliable branch opening/menu evidence. Generic “gc/article” FAQ-style generated aggregations were excluded. i Café’s linked in-room/Shang Palace PDFs are not presented as its restaurant menu. No qualifying recent or forthcoming branch verified.
- **Harbin:** checked [Heilongjiang September consumption reporting](https://www.hljnews.cn/bcsy/content/2026-09/11/content_907967.html), burger festivals, mall/operator launches and [October university catering tender](https://www.ejy365.com/info/ejy425344). Food-festival clusters do not establish a named branch opening day, and a tender is not an opening. August 2026 operator menus provide current dish evidence. No qualifying new/forthcoming branch found; neither Harbin branch publishes the walk-in child clause, so it is not borrowed from Ningbo/Xiamen/Dalian.
- **Dongguan:** checked [August 29 opening](https://webzdg.sun0769.com/web/news/content/889661), [September 3 operator-site visit](https://webzdg.sun0769.com/web/news/content/894130), [September tourism campaign](https://static.nfnews.com/content/202609/23/c12846702.html), Shilong Time Street and the hotel’s September dim-sum menu. Haidilao’s current 32% off is explicitly dated September 16–October 20. The date-wide availability describes campaign validity, not 24-hour dining; its service hours, exclusions, individual prices and stacking rules remain unpublished and are disclosed on the card/pin. Earlier “first month” wording is superseded by the dated current report, rather than used to fabricate service hours. Song Shan’s CNY98/CNY138 all-you-can-eat is a regular published menu, without a verified discount or end date, so is not a special. No verified forthcoming individual restaurant found.
- **Foshan:** checked MixC World September mall opening, [Phoenix mall October preview](https://finance.sina.com.cn/wm/2026-09-24/doc-inisxhpf0410908.shtml), [Yue Lou Lan October 1 preview](https://www.fs0757.com/home/article/view/id/671423.html), [food festival](https://www.fsonline.com.cn/FS_PLUS/1073065.html), Hilton Chinese/English dining, gallery, offers and branch menu/PDF/ordering listings. Mall openings do not confirm all restaurant tenants opened simultaneously. Named preview leads lacked post-opening corroboration and verifiable current menu coverage. The September 30–October 6 festival and hotel packages ending September/March expired. Current Yuxi signatures are included without prices; the 2018 PDF is excluded as current pricing. No verified recent/forthcoming restaurant or active branch dining discount recovered.

Restaurant pages without a verified recent or upcoming opening keep those tabs hidden; no filler entries were added. Public holiday breakfast extensions require additional date-specific research before extending scheduled offer windows. Broader food types, independent restaurants, forthcoming dates and branch price sheets remain useful follow-up research where noted above.

## Local validation

Saved and read back 22 pin/content records, nine matching special venues and 33 gallery links through the local APIs. Local pin IDs: 7529, 7530 and 7532–7551; database IDs are not portable. All 40 city/view API responses were checked. Browser checks covered all ten cities in all four views, empty-tab fallbacks, the 27-city west-to-east menu, China’s Kunming redirect, Hainan’s Sanya redirect, all 22 pin pages with menus and decoded restaurant images, and mobile Hefei/Dongguan pages; no browser errors were reported.

44 focused tests passed, including branch eligibility, Friday–Sunday meal scheduling, local next-offer times, date expiry, estimated opening status, API input validation and navigation order. TypeScript and targeted ESLint passed. Management API validation now accepts `24:00` only as a window end, matching the existing offer scheduler; it continues rejecting `24:00` as a start. Haidilao’s window represents the dated campaign, with unpublished restaurant service hours explicitly disclosed. No production deployment or database write was made.


## Additional local restaurant coverage

A [follow-up batch of ten established local restaurants](restaurant-china-more-restaurants.md), one per city, adds 58 named dishes, 22 credited photographs and a separately verified merchant gift offer. Its [research/import snapshot](restaurant-china-more-restaurants.json) is saved through the local management APIs. See the follow-up notes for source checks, price and gallery gaps, and local validation.


## Second additional restaurant round

A [second follow-up batch](restaurant-china-round-two.md) adds another ten branches across the same ten cities, with 59 named dishes (six with published CNY listing prices) and 18 credited images. The [research/import snapshot](restaurant-china-round-two.json) is managed through local database APIs; see its notes for source checks, image distinctions and remaining coverage gaps.


## Third additional restaurant round

A [third follow-up batch](restaurant-china-round-three.md) adds another ten branches across the same ten cities, with 60 named dishes (24 with published CNY listing prices) and 24 credited images. The [research/import snapshot](restaurant-china-round-three.json) is managed through the local database APIs. Its notes record current-page price checks, photo sources, branch exclusions and coverage gaps.


## Fourth additional restaurant round

A [fourth follow-up batch](restaurant-china-round-four.md) adds ten established branches across the same ten cities, with 60 named dishes and 38 credited Azure images. Current prices were not verified and are explicitly labelled. The [research/import snapshot](restaurant-china-round-four.json) is saved through the local database APIs; notes document source checks, inaccessible menus/galleries, excluded promotions and remaining coverage gaps.

Fifth additional round: [ten more researched branches, dishes, galleries and a Dalian reward](restaurant-china-round-five.md), with the [reviewed DB import snapshot](restaurant-china-round-five.json).

Sixth additional round: [ten more branches with 58 dish selections and 44 credited Azure photos](restaurant-china-round-six.md), with the [reviewed DB import snapshot](restaurant-china-round-six.json).
