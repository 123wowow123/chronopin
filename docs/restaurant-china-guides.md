# China restaurant guides

Checked October 10, 2026. Country entry `/restaurants/china` redirects to Kunming, the westernmost supported city. Mainland China now has 27 city guides, ordered west to east: Kunming, Chengdu, Chongqing, Xi’an, Sanya, Haikou, Changsha, Foshan, Guangzhou, Zhengzhou, Dongguan, Shenzhen, Wuhan, Beijing, Jinan, Hefei, Tianjin, Xiamen, Nanjing, Hangzhou, Qingdao, Suzhou, Shanghai, Ningbo, Dalian, Shenyang and Harbin. All use `Asia/Shanghai`.

The [next ten-city expansion](restaurant-china-next-cities.md) adds 22 restaurant pins, nine special venue profiles and 33 verified Azure gallery photographs through the local APIs.

The [next ten-city expansion](restaurant-china-next-cities.md) adds 22 restaurant pins, nine special venue profiles and 33 verified Azure gallery photographs through the local APIs.

The [additional large-city expansion](restaurant-china-large-cities.md) adds 13 pins, four special venue profiles and 52 gallery photos, bringing mainland China to 15 cities at that stage. The [Hainan addition](restaurant-hainan-guides.md) adds Sanya and Haikou, seven pins and 13 gallery photos, bringing mainland China to 17 cities. The earlier [six-city expansion](restaurant-china-expansion.md) adds 14 further pins and 38 gallery photos. The original three-city snapshot contains nine FoodDesk pins, nine `RestaurantContent` records, two `RestaurantSpecialVenue` records and ten Azure gallery photos were saved through the local management APIs. Local pin IDs are 7453–7461; IDs are not portable between databases. The reviewed [JSON import snapshot](restaurant-china-guides.json) contains API payloads, source evidence, geocoding results and verified public image hashes. Runtime menus, details, cards and specials come from PostgreSQL; subsequent API edits take precedence over this snapshot.

No production deployment or production database import was performed for China. New city registration and the country route require one explicitly approved deployment. Once that deployment is live, import the missing records through the APIs. Ordinary future menu/tile edits do not need deployment.

| City | Top restaurants | Just opened | Coming soon | Specials |
| --- | --- | --- | --- | --- |
| Chengdu | TIVANO, Mi Xun Teahouse | Grande A’moo — UFun, September 16 | No verified forthcoming restaurant found | TIVANO weekday lunch, from CNY 178 |
| Beijing | Mio | Five Guys — Chaoyang Joy City, August 3 | No verified forthcoming restaurant found | No current branch offer with verified prices/eligibility and schedule found |
| Shanghai | Calypso | JUJU, September 21 soft opening | Nuits — October target; Tribe — late Q4 target | Calypso cocktail gift, through October 11 |

All four sections are supported. Empty tabs hide; links to them fall back to a populated view. Top selections are editorial selections, not invented ratings. Nuits’s October 31 and Tribe’s December 31 pin dates are sorting estimates; cards show a month/season, not a confirmed day. Passed estimates never establish an opening.

## Evidence and remaining gaps

- **TIVANO:** [branch page](https://www.upperhouse.com/en/chengdu/restaurants-and-bars/tivano/) links its 2026 spring à la carte PDF and 2026 wine list, both downloaded and checked. Six priced food samples are displayed; service and VAT are included. [Weekday lunch offer](https://www.upperhouse.com/en/chengdu/special-offers/tivano-lunch-set/) starts at CNY 178, Monday–Friday 11:30–14:30, requires booking at least one day ahead and excludes weekends/public holidays. Named set choices are not published, so regular à la carte dishes are not assigned to it. The full [State Council 2026 holiday calendar](https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm) is stored in its API availability, with `holidayCalendarThrough: 2026-12-31`. The scheduler stops advertising this offer beyond that researched calendar until the API record is updated. October 10 remains excluded because the offer explicitly excludes weekends, even though it is an official make-up working Saturday.
- **Mi Xun:** [branch page](https://www.upperhouse.com/en/chengdu/restaurants-and-bars/mi-xun-teahouse/) links its farm-to-table tasting menu, CNY 388 inclusive of service/VAT. Named courses are displayed with unpublished individual prices. Two branch photos each were preserved for Mi Xun and TIVANO. Checked the operator’s restaurant, special-offer and menu sections; no separately verified, scheduled discount was inferred from the tasting menu or hot-pot promotion. The standalone `/chengdu/gallery/` path returned 404; the actual branch image sections were used instead.
- **Grande A’moo:** [Chengdu WEEK launch report](https://www.sohu.com/a/1077029550_121805474) confirms September 16 and UFun units 126–127. Checked Sichuan Online, branch-name/menu searches, Jiaozi Avenue/UFun address sources and a branch visit report. Pizza, steak and cheese-wheel pasta are verified without prices. No branch price sheet, ordering menu or dedicated official gallery was found; menus/photos from Shanghai and other branches were excluded. Launch gifts were not assumed to remain available. Restaurant photos in this third-party report were not imported without confirmed operator provenance.
- **Mio:** [official branch page and gallery](https://www.fourseasons.com/beijing/dining/restaurants/mio/) and its two linked online menus were checked. Six priced à la carte samples and the CNY 2,588 sharing menu for four to six are displayed. The sharing menu explicitly adds 10% service and 6% applicable taxes. Two branch gallery photos were uploaded and attached. Four Seasons searches surfaced old festive promotions and Maldives offers; these are not Beijing offers.
- **Five Guys:** [official Chaoyang Joy City branch page](https://restaurants.fiveguys.cn/zh_hans_cn/101-chaoyang-north-road), linked China menu, [Beijing Business Daily launch prices](https://finance.sina.com.cn/jjxw/2026-08-03/doc-inikyaqz6542906.shtml) and [Beijing government confirmation](https://www.beijing.gov.cn/fuwu/lqfw/gggs/202609/t20260924_4878933.html) checked. Four burger prices are explicitly labelled August launch prices; no October price revision is claimed. One brand food photo on this branch page was uploaded, labelled as brand food rather than its interior; another CDN image failed to download.
- **Beijing gaps:** checked Peninsula JING dining/menu/offer pages, its current indexed English/Chinese PDFs, a Peninsula bar PDF labelled Happy Hour, Shangri-La lobby menus, Kempinski Yansha/Rendez-vous, JEN Beersmith pages and the Beijinger’s recent food/drinks listings. The bar PDF has no verified current service window; Beersmith mentions happy hour without current named prices/schedule. Older 2018–2024 deals were excluded. Government announcements for Dongwai 39Mall/JW Marriott concern projects, not named restaurant opening dates. No forthcoming branch was invented to populate Coming soon.
- **Calypso:** [official branch page](https://www.shangri-la.com/shanghai/jinganshangrila/dining/restaurants/calypso/) links a 2026 spring menu, visually checked on pages 2–3, and a Sunset Social Club PDF, also visually checked. Priced food/drink samples are displayed. Regular menu prices include 10% service and prevailing taxes. [Current operator offer](https://www.shangri-la.com/shanghai/jinganshangrila/offer-detail/dining/the-sunset-social-club-a-mediterranean-ritual-of-slow-living/) runs June 26–October 11, daily from 15:00 until late; published lounge closing is midnight. A qualifying co-branded cocktail includes a gift while supplies last. It is a bonus gift offer, not a lower cocktail price. Snack/mocktail purchases are not assumed to qualify. Three operator photos were uploaded. Older 1515/Calypso happy-hour reporting and an accommodation promotion ending October 7 were excluded.
- **JUJU:** [September 22 local reporting](https://rachelgouk.com/the-shanghai-scoop-food-drink-news-september-2026/) and [current branch listing](https://rachelgouk.com/listings/juju-shanghai/) confirm September 21 soft opening at 1107 Yuyuan Road and named dishes. Brand/address/menu searches did not find a verified new-branch price sheet or official gallery. The September 21–24 discount has expired. Old Bund-branch prices and Cannery pictures are not reused. Reporting photos are not copied from Nomfluence, whose site requires consent.
- **Nuits / Tribe:** checked the September roundup, Plaza 66/Pavilion developer announcement, mall site, branch-specific searches and Tribe’s website/FAQ/facilities. No forthcoming Shanghai menus/prices or clearly identified Shanghai gallery was found. The Tribe website currently describes Bangkok at Emsphere; its food/photos are not presented as Shanghai. Nuits’s previous location and its menu are not reused. Both cards retain estimates and links; their menu coverage remains link-only after these checks.
- **Chengdu future-opening gap:** checked Swire/Upper House announcements, local opening reports, Sichuan/Chengdu reporting, mall/brand searches and broader upcoming-restaurant searches. Listings saying “opening soon” often refer to today’s service hours. Regent Chengdu project material does not establish a named restaurant opening. None was added without branch-level evidence.

Map locations use Esri address geocoding, retain matched addresses and scores, and are labelled approximate street positions. The Chengdu Bitieshi street query was rerun in Chinese after an English query matched the wrong bridge.

## Repeatable API import

Use an existing admin bearer token in `CHRONOPIN_ADMIN_TOKEN`; never put it in the manifest or command arguments.

```sh
npx tsx scripts/restaurants/importGuide.ts
npx tsx scripts/restaurants/importGuide.ts --apply
```

Both default to localhost. For an approved production publication, add `--url https://www.chronopin.com` after the city code has been deployed with consent. The default is a read-only dry run; `--apply` verifies every public photo hash/dimensions/decoding, creates missing pins/content/specials and attaches missing photos. It checks that the target API supports each city before writing, preserves existing API edits and archived content, refuses an archived pin source and paces remote writes. It never deploys code. Use revisioned content/special APIs to change existing records, rather than replaying research over editorial edits.

## Validation

44 focused tests passed, covering China city ordering/local clocks, reviewed API payloads, estimates, whole holiday breaks, make-up Saturdays, calendar coverage and expired offers. TypeScript and targeted ESLint passed. Local browser checks covered all populated sections, the country redirect, west-to-east city navigation, nine pin pages with menus, mobile Shanghai layout and zero browser errors. The landing hero now uses an established restaurant’s credited photo when upcoming venues have no verified photos, independently of the selected tab. Replaying the API import preserved all existing records and attached no duplicate photos. Empty Beijing/Chengdu Coming soon links fall back to eligible content; upcoming specials remain visible without a rating and show their next local start time.


## More local restaurants in the next ten cities

[Additional restaurant research](restaurant-china-more-restaurants.md) adds one established local restaurant in each of Kunming, Foshan, Dongguan, Jinan, Hefei, Xiamen, Ningbo, Dalian, Shenyang and Harbin. The [reviewed snapshot](restaurant-china-more-restaurants.json) contains 58 named dishes, 22 credited Azure photographs and one dated gift campaign. Saved and verified in the local database; production publication is still separate.


## Second additional restaurant round

A [second follow-up batch](restaurant-china-round-two.md) adds another ten branches across the same ten cities, with 59 named dishes (six with published CNY listing prices) and 18 credited images. The [research/import snapshot](restaurant-china-round-two.json) is managed through local database APIs; see its notes for source checks, image distinctions and remaining coverage gaps.


## Third additional restaurant round

A [third follow-up batch](restaurant-china-round-three.md) adds another ten branches across the same ten cities, with 60 named dishes (24 with published CNY listing prices) and 24 credited images. The [research/import snapshot](restaurant-china-round-three.json) is managed through the local database APIs. Its notes record current-page price checks, photo sources, branch exclusions and coverage gaps.


## Fourth additional restaurant round

A [fourth follow-up batch](restaurant-china-round-four.md) adds ten established branches across the same ten cities, with 60 named dishes and 38 credited Azure images. Current prices were not verified and are explicitly labelled. The [research/import snapshot](restaurant-china-round-four.json) is saved through the local database APIs; notes document source checks, inaccessible menus/galleries, excluded promotions and remaining coverage gaps.

Fifth additional round: [ten more researched branches, dishes, galleries and a Dalian reward](restaurant-china-round-five.md), with the [reviewed DB import snapshot](restaurant-china-round-five.json).

Sixth additional round: [ten more branches with 58 dish selections and 44 credited Azure photos](restaurant-china-round-six.md), with the [reviewed DB import snapshot](restaurant-china-round-six.json).
