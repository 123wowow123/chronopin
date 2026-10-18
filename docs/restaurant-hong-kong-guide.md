# Hong Kong restaurant guide

Checked October 10, 2026. Local preview: `/restaurants/hong-kong`. Navigation places Hong Kong (114.1694° E) between China’s westernmost guide city, Chengdu, and Australia’s westernmost city, Perth. The guide uses `Asia/Hong_Kong`.

Five FoodDesk pins (local IDs 7462–7466), five `RestaurantContent` records, one `RestaurantSpecialVenue` with three offers, and 25 credited Azure gallery photos were saved through the local management APIs. The [reviewed import snapshot](restaurant-hong-kong-guide.json) contains source URLs, published HKD menu items, conditions, approximate geocoding and public photo hashes. Runtime cards, menus, details and offers are stored in PostgreSQL and managed through APIs; later edits take precedence over the snapshot.

No production deployment or production DB import was performed. Initial city registration requires an explicitly approved code deployment. Once live, the reviewed content can be imported through APIs. Subsequent menu, card and promotion edits need no deployment.

| Section | Coverage |
| --- | --- |
| Top restaurants | Salisterra; Ho Lee Fook — editorial selections, no invented ratings |
| Just opened | The Canton Library, September 8; Bar 41, October 1 |
| Coming soon | The Baker & The Bottleman’s Causeway Bay relocation, mid-to-late November target |
| Specials | Bar 41: buy-one-get-one selected drinks; 20% off selected platters/beer combos; 50% off the second afternoon-tea guest, all October 1–31 |

## Sources checked and gaps

- **Salisterra:** [official branch page](https://www.upperhouse.com/en/hongkong/restaurants-and-bars/salisterra/) and linked September 28 à la carte PDF, October 5 lunch/dinner PDFs, brunch, tea, vegetarian and drink menus. Seven priced food samples; 10% service charge. All six branch-gallery images are attached. Unlabelled gallery dishes are not assigned invented names. Other Upper House venues’ pictures are excluded. Regular set menus are not labelled discounts; expired National Day offers are excluded.
- **Ho Lee Fook:** [official branch page](https://www.holeefook.com.hk/) and [menu page](https://www.holeefook.com.hk/menu), including October 2026 dinner/pre-order links, July desserts and June drinks. Seven priced dinner items are displayed. Four distinct official interior/food images are attached; older food photographs are identified as archive images, not promises of current dishes. The recurring Good Fortune Club is not represented as a verified discount. Applicable additional charges should be confirmed with the venue.
- **The Canton Library:** [official page](https://thecantonlibrary.com.hk/), its [dinner](https://thecantonlibrary.com.hk/menus/a-la-carte/), [dim sum](https://thecantonlibrary.com.hk/menus/dim-sum-menu/) and [bar](https://thecantonlibrary.com.hk/menus/bar-menu/) menus provide actual HKD items and prices. [HK Hub’s September roundup](https://thehkhub.com/new-restaurant-in-hong-kong-september-2026/) names September 8; [The Loop’s September 23 report](https://theloop.hk/author/theloophk/) confirms operation after opening. Six official venue/food/drink photographs are attached; Getty cityscape and Vista images are excluded. No verified current branch discount was found; taxes/service are not inferred.
- **Bar 41:** [operator branch page](https://www.ninahotelgroup.com/en/nina-hotel-tsuen-wan-west/dining/bar-41/) and all linked à la carte, lunch, tea and happy-hour PDFs; [SCMP October 1 report](https://www.scmp.com/lifestyle/food-drink/article/3369313/14-new-hong-kong-restaurants-and-bars-october-all-you-can-eat-wagyu-froyo) and [Little Steps](https://www.littlestepsasia.com/hong-kong/dine/kid-friendly-restaurants/new-restaurants-hong-kong/) establish October 1. Regular dishes, qualifying happy-hour drinks, platter base prices, tea base price and named included set items are displayed separately. Tea costs HKD 244/person, minimum two; second guest gets 50% off and 10% service is based on the original price. Platter prices are explicitly before the 20% discount. Offers are bounded to October 31 and have daily local windows; regular dishes are not assumed eligible. Nine distinct photographs come from the restaurant page, including its photo carousel. The linked hotel gallery was checked; RÚ, Café Circles, guest rooms and unrelated hotel photographs are excluded. Duplicate responsive images are omitted.
- **The Baker & The Bottleman:** [operator PR agency relocation announcement](https://theforksandspoons.com.hk/homepage/the-baker-the-bottleman-prepares-to-relocate-to-leighton-road-causeway-bay-this-mid-end-november/), [Foodie](https://www.afoodieworld.com/blog/2026/08/25/the-baker-the-bottleman-cwb-2026/), operator menu/bakery/restaurant/shop links and branch-specific searches. The new location targets mid-to-late November 2026. Its exact opening day, street number, unit, dishes, prices and new-branch gallery remain unannounced. The pin’s November 30 date is a month-end sorting estimate; the card shows November, not a confirmed day. Map position is approximate Leighton Road. Existing Wan Chai menu/prices/photos and the expired MARROW pop-up are excluded. Link-only menu coverage records this remaining gap.

Broader September/October restaurant roundups, operator promotions and forthcoming opening announcements were checked to populate all four sections. Heaven & Earth’s conflicting opening/reservation dates were excluded. No opening day, rating, price or eligible discounted dish was invented to populate a tab.

## API import

Set an existing admin bearer token in `CHRONOPIN_ADMIN_TOKEN`, then review the dry run:

```sh
npx tsx scripts/restaurants/importGuide.ts --file docs/restaurant-hong-kong-guide.json
npx tsx scripts/restaurants/importGuide.ts --file docs/restaurant-hong-kong-guide.json --apply
```

Both default to localhost. For an explicitly approved production import, add `--url https://www.chronopin.com` after approved deployment of city registration. The importer checks city support before writes, preserves existing API edits, verifies public Azure photo hashes/dimensions/decoding before attaching live references, creates missing records and attaches missing media idempotently. It does not deploy code. Photo binaries remain in ignored temporary storage; Git contains only metadata.

## Validation

24 focused tests passed, including guide ordering, API payload validation, estimated versus confirmed dates, photo provenance, upcoming local start times and October expiry. TypeScript and targeted ESLint passed; `git diff --check` passed. Browser checks passed for all four sections, five pin pages with menus and decoded public photos, country navigation and mobile rendering, with no browser errors. Outside service hours the Specials tab remains visible and shows the venue’s next offer with its local start time; only the next offer per venue is shown in that upcoming list. Replaying the local importer preserved existing content and attached no duplicate photo links.
