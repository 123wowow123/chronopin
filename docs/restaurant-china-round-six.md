# Sixth additional China restaurant round

Checked October 10, 2026. Saved ten distinct established branches to the **local database**, with **58 named dish selections and 44 credited Azure photographs**. No production import, deployment, restart, commit or push was performed.

The [reviewed import snapshot](restaurant-china-round-six.json) records pin sources, menu sources, original image URLs, gallery pages, credits, public blob URLs, hashes and approximate coordinates. Runtime menus, details and landing tiles use `/api/admin/restaurant-content`; photographs use pin media records. These content updates do not require deployment.

## Restaurants and branch sources

| City | Branch | Local pin | Dishes | Photos | Research source |
| --- | --- | --- | --- | --- | --- |
| Kunming | YiKeYin — Maolu | 7641 | 6 | 5 | [Branch dishes](https://you.ctrip.com/food/kunming29/4926006.html) |
| Foshan | ShunFeng — Daliang | 7642 | 6 | 5 | [Branch dishes](https://you.ctrip.com/food/foshan207/5490137.html) |
| Dongguan | BaoNiu Beef Hotpot — Chashan Times Hui | 7643 | 6 | 3 | [Branch dishes](https://you.ctrip.com/food/dongguan212/130461555.html) |
| Jinan | KuiShengJu — Xianxi Lane | 7644 | 6 | 4 | [Branch dishes](https://you.ctrip.com/food/jinan128/120732882.html) |
| Hefei | TongQingLou — Baohe Wanda | 7645 | 6 | 5 | [Branch dishes](https://you.ctrip.com/food/hefei196/5472620.html) |
| Xiamen | Lao Song Bian Shi Dian — Xiahe Road | 7646 | 4 | 3 | [Branch dishes](https://guide.michelin.com/gb/en/fujian-province/xiamen_1031934/restaurant/lao-song-bian-shi-dian) |
| Ningbo | NingHaiShiFu — Rihu Courtyard | 7647 | 6 | 5 | [Branch dishes](https://you.ctrip.com/food/ningbo83/5225087.html) |
| Dalian | PinHaiLou — Laohutan Fisherman’s Wharf | 7648 | 6 | 5 | [Branch dishes](https://you.ctrip.com/food/dalian4/8643684.html) |
| Shenyang | XiTaDaLengMian — Shifu Avenue | 7649 | 6 | 5 | [Branch dishes](https://you.ctrip.com/food/shenyang155/5381239.html) |
| Harbin | TaDaoSi Western Restaurant — Central Street | 7650 | 6 | 4 | [Branch dishes](https://you.ctrip.com/food/harbin151/4925468.html) |

The guide date is a research date, not an opening date. These are Chronopin Top restaurants selections, without invented ratings or claims of operator endorsement. Existing country/city navigation retains its west-to-east order.

## Menu, price and gallery checks

Published Chinese dish names were matched against freshly fetched branch lists. Lao Song also uses its current [Michelin branch description](https://guide.michelin.com/gb/en/fujian-province/xiamen_1031934/restaurant/lao-song-bian-shi-dian), which confirms the specific address, noodles, pork and two wonton wrapper types. The selections are samples, not complete menus. Searches covered operator pages, branch-specific ordering listings, linked menu/PDF candidates, price-table/menu-image categories and promotion sources beyond the first result. No reliable current individual prices were recovered. All 58 selections explicitly say **“Price not published.”** Per-person averages, historical visitor receipts, unsupported prices and other-branch menus are excluded.

Ctrip originals and eight verified Dianping visitor galleries supplied photographs. Dianping official-photo routes returned HTTP 403; menu-image routes returned identity verification or timed out rather than exposing readable current menus. Those limitations are retained below. Visitor credits name the contributor and identify the photo as a visitor photograph. Unidentified Ctrip photographers are labelled explicitly; two ShunFeng photographs retain the visible SAMHUI PHOTOS watermark credit. Unlabelled food photos do not independently establish menu availability.

TongQingLou’s [official Baohe Wanda branch page and gallery](https://www.tongqinglou.cn/tql/index/storedisplay_detail?id=13) supplied three additional branch photographs, including the landing-card hero. Gallery images are historical operator publications; current furnishings are not guaranteed. A location-map image was excluded. Generic group menu photographs and QingXiaoYue photos were not substituted for this branch.

All selected photographs were visually inspected, converted to WebP and uploaded to Azure Blob Storage. Each public blob was fetched and checked for matching SHA-256 bytes and successful decoding before local DB references were saved. The pin gallery and landing hero retain source/credit metadata. No photo or thumbnail was added to Git. A map, a national-day poster, an unrelated Disney-themed room, a suspect beef-noodle bowl and a near-duplicate storefront were excluded.

## Branch checks and unresolved gaps

- **Kunming:** [YiKeYin Maolu listing](https://you.ctrip.com/food/kunming29/4926006.html) and [Dianping gallery](https://www.dianping.com/shop/558785/photos) agree on Jixiang Lane 18–19. Older Dongfeng West Road references were not used as the address. Operator/menu/ordering searches did not yield a current priced menu; official-photo access was blocked.
- **Foshan:** [ShunFeng Daliang listing](https://you.ctrip.com/food/foshan207/5490137.html), [Shunde Library restaurant profile](https://www.sdlib.com.cn/home/sdms/mscymdxqy/id/105708.html) and [Dianping gallery](https://www.dianping.com/shop/58126807/photos) establish the National Road 105 property. The Chencun branch at Jingcheng Road is excluded. No current individual menu prices or dated branch promotion were verified.
- **Dongguan:** [BaoNiu Chashan Times Hui listing](https://you.ctrip.com/food/dongguan212/130461555.html) and [Trip branch listing](https://ru.trip.com/restaurant/china/dongguan/detail/restaurant-130461555/) confirm units 137–142 and overnight service. An exact usable Dianping/operator menu or gallery was not found; three branch-listed venue photographs were retained. The Hong Kong café LianSheng was rejected: Ctrip’s Hongfu East Road 560 address conflicts with its older Tahe Road 328 Dianping album after Huolianshu redevelopment; its visitor gallery returned 404. No old-site photos or borrowed other-branch menu were imported.
- **Jinan:** [KuiShengJu Xianxi branch](https://gs.ctrip.com/html5/you/foods/fooddetail/128/120732882.html) confirms the address and split hours extending to 02:00 the next day. [Dianping branch](https://m.dianping.com/shop/GaDYaE0040j4RYyF) advertises menu images, but image access was blocked/timed out. An old membership-discount anecdote lacks current redemption terms and is not a Special. HuiQuanLou was considered but lacked a useful verified dish list, so was not selected.
- **Hefei:** The [operator branch page](https://www.tongqinglou.cn/tql/index/storedisplay_detail?id=13) confirms this venue and phone. Its [group menu](https://www.tongqinglou.cn/tql/index/carte) publishes dishes without prices; the displayed selection remains matched to the Baohe branch listing. The [external ordering shop](https://shop42504377.m.youzan.com/v2/home/BgMRH9nk7f) and operator-linked tqlscrm.com were investigated; the external shop returned a JavaScript storefront without a readable branch-specific priced menu, and tqlscrm.com failed certificate hostname validation. [Operator activities](https://tongqinglou.cn/tql/index/doing) include mooncake boxes and another city’s banquet venue, without verified Baohe Wanda current offer terms. QingXiaoYue’s separate Baohe venue and other TongQingLou branches’ buffets are excluded.
- **Xiamen:** [Michelin](https://guide.michelin.com/gb/en/fujian-province/xiamen_1031934/restaurant/lao-song-bian-shi-dian), [Ctrip branch](https://you.ctrip.com/food/xiamen21/5158600.html) and [Amap](https://www.amap.com/place/B025002MNO) match Xiahe Road 202-101. [Dianping gallery](https://www.dianping.com/shop/lanYZChjZ9i0XsR6/photos) confirms the storefront. Older articles say only two core foods; the current Michelin description verifies pork and the second wonton wrapper as well. Unrelated warm-salad dish recommendations and beef-bowl photography were excluded. Service-hour reports conflict, so hours remain unset rather than choosing an unverified timetable. Historical CNY 5–9 prices are not current verified prices.
- **Ningbo:** [Rihu branch listing](https://you.ctrip.com/food/ningbo83/5225087.html) and [Dianping gallery](https://www.dianping.com/shop/6134325/photos) match Huxi Road 280. Shanghai NingHaiShiFu menu/rating material is not used for this branch. No usable current priced operator/ordering menu or dated branch offer was recovered.
- **Dalian:** [Laohutan branch listing](https://you.ctrip.com/food/dalian4/8643684.html) and [Dianping gallery](https://www.dianping.com/shop/17224334/photos) establish Binhai East Road 72. A [November 25, 2025 visitor report](https://www.sina.cn/news/detail/5236814269121705.html) mentions a check-in puzzle/scent-card gift, but supplies no current validity or redemption conditions. The merchant-page attempt returned 404. That gift and the preceding round’s distinct Lv Da Yin Xiang reward are not applied to this branch.
- **Shenyang:** [Branch listing](https://you.ctrip.com/food/shenyang155/5381239.html), [Amap](https://www.amap.com/place/B00180BQQU) and [Dianping gallery](https://www.dianping.com/shop/551505/photos) match Shifu Avenue 31. Published phone numbers differ: the displayed number follows the Amap branch record; confirm before calling. XiTa LaoTaiTai barbecue and Sanhao Street menus/offers are excluded.
- **Harbin:** [Central Street branch listing](https://you.ctrip.com/food/harbin151/4925468.html) and [Dianping gallery](https://www.dianping.com/shop/H82oWPXRY9OD51no/photos) match number 127. [Menu-image category](https://www.dianping.com/shop/H82oWPXRY9OD51no/photos/tag-价目表-菜单) is indexed but its fetched page requires identity verification; current prices were not transcribed. No current operator-priced menu or dated promotion was verified. Portman and Lao Du Yi Chu closure notices belong to different restaurants.

## Four-section research

Coming soon, Just opened, Top restaurants and Specials remain supported by the existing DB-backed guides. This batch contributes established restaurants to Top restaurants. Branch/operator announcements, current local news, linked menus and branch promotions were checked; none of these ten branches has a verified new opening date or active/upcoming offer suitable for import. Old visitor gifts and undated blanket discount claims do not create Specials. Empty tabs stay hidden and links to them fall back to populated content. Existing verified offers remain separate.

Wider city opening/promotion searches also found these leads; their unresolved gaps are recorded rather than invented:

- [Foshan Phoenix Hui renewal report](https://finance.sina.com.cn/wm/2026-09-24/doc-inisxhpf0410908.shtml): an October 1 shopping-centre renewal and generic “from 50%” headline do not establish an individual restaurant opening date or current branch offer terms.
- [Hefei Shushan Fumao operator listing](https://www.tongqinglou.cn/tql/mobile/storedisplay?bid=2&cid=8): expected October 2026 hotel opening; individual restaurant opening date/menu still needs confirmation.
- [Ningbo October new-store report](https://finance.sina.com.cn/jjxw/2026-10-02/doc-initvprf5724161.shtml): BaQuanShiMan at H99 is expected in October and publishes three dish names, but no exact opening date/current opening status. WhaleJoy and YiBanYiRou are reported open without restaurant-specific opening dates. These are follow-up leads, not dates inferred from the report publication day.
- [Shenyang Xita festival announcement](https://www.ln.gov.cn/web/ywdt/qsgd/ass_2_1/2026092214112523751/index.shtml): September 20–22 event ended before this research date; excluded.
- [Harbin Wanda Realm German food festival report](https://finance.sina.com.cn/tjhz/2026-09-24/doc-inisxhnx5258250.shtml): October themed buffet at a different restaurant; current branch/operator price, service windows and redemption terms require separate verification.
- Kunming, Dongguan, Jinan, Xiamen and Dalian searches also covered October openings and promotions. No additional exact, verifiable branch opening dates or offer windows suitable for this import were established. Dalian cruise-ticket and Foshan real-estate discounts are unrelated to the restaurants.

## Verification

- Initial local dry run confirmed all ten pin/content sources were new.
- Read back all ten local pin/content records, all 58 menu items and explicit price labels, all landing hero references, and 44 pin-gallery links.
- All 40 city/view guide API responses passed.
- Browser checks confirmed every new restaurant’s real menu items on its card and pin, decoded its images, and reported zero page errors.
- Checked the 27-city west-to-east navigation, mobile Kunming/Dongguan pages, and China/Hainan guide redirects.
- Checked empty-view links fall back to populated content and hide empty tabs.
- Final dry run preserves all ten records and proposes no duplicate content/media.

Only local DB content and Azure media were changed. Production remains unchanged.
