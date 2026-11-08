# San Diego menu photos and reviews — November 8, 2026

Owner priority: San Diego first. This is an applied research pass, with a complete remaining-item inventory; it is **not full coverage** and does not establish that unfilled items lack public evidence.

## Saved and verified

All additions were saved through the authenticated restaurant-content / restaurant-specials APIs on production and locally, with revision checks, Azure public-download checks, and complete profile readbacks. Eighteen production profiles changed. Four existing production menu-only profiles were absent locally and were copied through the local content API after exact-source checks; local IDs differ and were mapped by source.

| Enabled saved menu rows (includes duplicate dishes/menus) | Before | After |
| --- | ---: | ---: |
| Total item rows | 4,882 | 4,882 |
| Rows with at least one sourced photo | 1,191 | 1,305 |
| Rows with at least one external review | 26 | 72 |
| Photo associations, including galleries | 1,193 | 1,309 |
| External-review associations | 28 | 89 |

This adds first photos to **114 menu rows**, 116 photo associations including two additional Lola galleries, and 61 stored external-review associations. The replay catalog grows from 25 to 74 distinct source/item/review associations; duplicates across menus and ordinary/specials records explain the larger stored count. Counts describe stored content, not all verified public pages.

Photo additions cover Sovereign; Soichi; Addison; Lucien; Ciccia Osteria; LOLA 55; Dini's By The Sea; The Promiscuous Fork; Public House La Jolla; The Pub in Bay Park; Knotty Barrel East Village; and The Search Bar & Restaurant EastLake. Reviews also cover Fort Oak, C Level, Tom Ham’s Lighthouse, Bacari North Park, and Piacere Mio South Park. Existing covers and unrelated reviews were preserved.

Prices, currencies, notes, item names, categories, opening dates and menu verification dates were preserved. The final audit asserts identical menu-row identities and identical non-photo/non-review item fields. Historical photos retain publication dates and do not import historical prices. Tasting-menu pictures are labelled as selected courses rather than the complete meal. Sovereign uses one shared verified photo URL for its six Rockfish options, with the unspecified pictured size clearly stated.

## Evidence

- Soichi’s [operator menu](https://www.soichisushi.com/copy-of-menu?location=Adams+Avenue) has named photos for food and selected drinks. Original Wix media URLs were present in embedded menu JSON and used instead of blurred thumbnails. Every selected photo was visually inspected. Duplicate item names in the same menu were populated consistently.
- Sovereign’s [operator site](https://sovereignsandiego.com/) supplies 29 named menu-photo associations. Branch identity is 1460 J Street. Independent dish observations come from [a firsthand Reddit account](https://www.reddit.com/r/FoodSanDiego/comments/1vzk8wq/sovereign_modern_thai/); relative dates remain null.
- Ciccia photos/reviews use [San Diego Reader’s pasta review](https://www.sandiegoreader.com/news/2019/nov/26/feast-fine-casual-pasta-shapes-ciccia-osteria/), its [opening-period firsthand review](https://www.sandiegoreader.com/news/2019/jun/27/tin-fork-ciccia-osteria-italian-barrio-logan/), and [San Diego Magazine](https://sandiegomagazine.com/food-drink/ciccia-osteria-menu-perfect-order/). The current Fettuccine entry explicitly has Bolognese sauce, matching the reviewed variant.
- LOLA 55’s East Village address was checked against 1290 F Street. Sources include [The Boy Who Ate San Diego](https://theboywhoatesd.com/2024/02/15/lola-55/), [Coronado Times](https://coronadotimes.com/news/2023/03/03/bridgeworthy-lola-55-one-of-the-best-tacos-in-san-diego-just-might-be-vegan/), [The Joy of Food](https://thejoyoffood.life/lola-55/), and [San Diego Reader](https://www.sandiegoreader.com/news/2021/jul/01/tin-fork-lola-55-respectful-oaxacan-tortilla/). Positive and critical excerpts were retained. The enabled specials copy of the ordinary menu received matching additions; the disabled duplicate profile was not revived.
- Soichi reviews additionally use [Condé Nast Traveler](https://www.cntraveler.com/restaurants/san-diego/soichi-sushi) and [The Infatuation](https://www.theinfatuation.com/san-diego/reviews/soichi-sushi). Descriptive observations remain unscored by the existing editorial-estimate system.
- Addison’s [firsthand review](https://www.theinfatuation.com/san-diego/reviews/addison) supplies a labelled tasting-course photo and balanced evaluation; its [Champagne Lounge page](https://www.addisondelmar.com/the-champagne-lounge/) supplies an operator Tartelette Menu photograph. Lucien uses [The Infatuation’s review](https://www.theinfatuation.com/san-diego/reviews/lucien-girard-ave) and its credited canapés photo.
- Other new excerpts are individually attributed in `scripts/restaurants/menuItemReviews.json`, including [Bacari’s firsthand diner discussion](https://www.reddit.com/r/FoodSanDiego/comments/1u21zrk/recommendations_for_dishes_at_bacari/) and [Axios review](https://www.axios.com/local/san-diego/2026/03/19/san-diego-north-park-bacari-new-restaurant-review-mediterranean-small-plates), plus [Piacere Mio’s salad review](https://www.postcardsandpassports.com/review-of-piacere-mio-italian-restaurant-san-diego/).

Short verbatim excerpts respect the aggregate per-article excerpt limit. Restaurant-wide stars, AI summaries, operator replies, and search snippets were not converted into dish reviews or dish scores.

## Rejections and remaining work

The pass scanned **413 distinct operator/menu URLs**, then followed targeted editorial/diner sources. The machine-readable companion lists every remaining item and the exact stored menu source, along with page fetch results and rejected photo candidates. A scan without an exact named image is a lead for manual follow-up, not evidence of absence.

- The Pub in Bay Park: Cheese and Bread / Bread and Butter images were logos; the Ploughman’s image showed a sausage roll. Rejected all three despite their operator labels.
- Sushi Roka: its Pork Gyoza-labelled image appeared to show raw fish salad. Rejected.
- The Search Bar: Surf & Turf pictured fewer shrimp and different sides from its explicit seven-shrimp menu; the wing photograph did not establish the listed eight-piece serving. Rejected both.
- Soichi: excluded generic rice, tea and packaged-beverage illustrations/product shots without an established exact-branch serving image. Product-only labels do not prove a restaurant photograph.
- LOLA 55: a photo labelled only “birria taco” did not establish the currently listed Quesa Birria variant. No substitution was made. An old squash-blossom photo did not establish the current mushroom-filled version; the retained Squa-shroom photo follows an explicit mushroom-and-squash-blossom description.
- Lionfish: a search result exposed a diner’s Bang Bang Shrimp comment, but opening the linked page did not reproduce that text. It was not saved as a verified review. A full Peking duck review would not establish the bao-bun variant.
- Romesco: reviewed short-rib entrées did not establish its currently saved short-rib slider. Prado’s older firsthand review covered dishes absent from the current saved happy-hour menu. Those reviews were not borrowed for different items.
- Generic offers such as “select wines” and “selected appetizers,” bottle/pour variants, current rotating offerings and remaining ordinary-menu dishes still need precise evidence. Remaining gaps are not described as exhausted research.

## Verification and workflow corrections

The live production San Diego Top page was opened in Chrome. Newly saved photos and credits were visible on landing cards; the Steak viewer showed its historical photo/credit and existing MICHELIN excerpt, and Mesquite Chicken showed the newly added critical excerpt with its source and publication date. Soichi’s native pin 6441 showed the expanded Food photos strip; opening Full Omakase displayed its operator photo, caption, source credit and new Condé Nast Traveler excerpt together. The research tab was closed afterwards.

Full readbacks caught an omitted specials `regionSlug` during the Lola gallery save. San Diego was immediately restored in both environments, all profile content was preserved, and the helper was corrected to preserve the region field. The final regional list contains the enabled Lola profile.

`restaurant-content?region=san-diego` filters **tile** region and misses menu-only profiles. Research audits and the review replay now paginate all ordinary records, then join exact branch sources. Do not assume IDs agree between local and production.

Targeted restaurant validation, menu, runtime-content and review-rating tests passed (25 tests); TypeScript, ESLint and diff whitespace checks passed. Both production and local review replay dry runs converge to zero changes after applying the catalog.

Research provenance is in `scripts/restaurants/menuItemPhotos.json` and `menuItemReviews.json`; existing bundled menu/specials snapshots have the researched fields synchronized. Detailed before/readback evidence, downloaded photos and contact sheets remain in ignored `.scrape/restaurant-coverage-2026-11-08/` and `.scrape/menu-item-reviews/`. No pin photos were added to Git.

Content was saved without a deployment. The earlier code change that exposes every saved menu/item on landing cards still needs the owner-requested deployment before production can expose all later items. No production build, restart, migration, deployment or pin translations were run; translations remain with the translation agent.
