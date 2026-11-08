# San Diego expanded menu-photo research — November 8, 2026

Applied the BJ’s follow-up strategy across the saved San Diego menu inventory: **184 additional menu rows now have a first sourced image**, saved and read back locally and in production across **18 profiles / 17 restaurants**. The full remaining-item inventory is in [the JSON report](san-diego-expanded-menu-photos-2026-11-08.json). This is a completed source-scan and reviewed save batch; **full city coverage is still unfinished**.

| Enabled saved menu rows, including duplicate menus/dishes | Before this pass | After |
| --- | ---: | ---: |
| Total rows | 4,882 | 4,882 |
| Rows with photos | 1,311 | 1,495 |
| Rows still missing photos | 3,571 | 3,387 |
| Rows with external reviews | 72 | 72 |

The pass checked 448 distinct stored/linked source URLs, including blocked requests and ordering pages. It paired CSS background images with hidden named image tags, inspected embedded menu/product JSON, followed official menu links and used targeted Yelp/Google browser research. A scan nonmatch is **not** an exhausted search. The companion inventory retains each missing row, its branch/menu source, page-access outcomes and pending item-specific official/Yelp/Google follow-up. Do not claim every missing row has already received manual gallery research.

## Additions and sources

- **Soichi:** 103 menu rows, primarily exact named sake/shochu/wine and packaged beverages from the [official menu](https://www.soichisushi.com/copy-of-menu?location=Adams+Avenue), [sake menu](https://www.soichisushi.com/copy-of-menu?location=Adams+Avenue&menu=sake) and [wine menu](https://www.soichisushi.com/copy-of-menu?location=Adams+Avenue&menu=wine). Original Wix images were downloaded and visually inspected. Bottle/product illustrations are explicitly labelled; they do not imply that a glass price includes a whole bottle or that pictured glasses establish the pour size. The Sapporo draught photograph was assigned only to draught, not bottle.
- **Knotty Barrel East Village:** 32 rows across ordinary menus and specials, including 28 lunch/dinner/breakfast rows and four happy-hour items. Sources: [operator food menu](https://ev.knottybarrel.com/san-diego-east-village-downtown-san-diego-knotty-barrel-east-village-food-menu) and [happy hour](https://ev.knottybarrel.com/san-diego-east-village-downtown-san-diego-knotty-barrel-east-village-happy-hour). Named background photos were missed by the old image-tag-only pass. Captions distinguish accompanying drinks and individually priced shot examples.
- **Lazy Dog Mission Valley:** eight entries from the [official ordering menu](https://orders.lazydogrestaurants.com/menu/category/105326/happy-hour-late-night): six food dishes, Blue Hawaiian for the explicitly named cocktail selection, and Pomegranate Red Sangria for the saved sangria selection. Chain photography is labelled as such.
- **BJ’s Mission Valley, Carlsbad, Chula Vista and Escondido:** five entries per branch use shared official chain imagery for personal pizza, signature beer, seasonal beer, Dark Horse wine and Avocado Egg Rolls as an explicitly eligible appetizer. La Jolla reviewer photos were not copied to other branches. Sources include the [personal pizza combo](https://www.bjsrestaurants.com/menu-item/personal-deep-dish-pizza-house-salad-combo-2-2), [Avocado Egg Rolls](https://www.bjsrestaurants.com/menu-item/avocado-egg-rolls) and [Dark Horse Cabernet Sauvignon](https://www.bjsrestaurants.com/menu-item/dark-horse-cabernet-sauvignon). Captions retain combo-extra and bottle/pour distinctions.
- **Islands Mira Mesa, Mission Valley, Carmel Mountain and Chula Vista:** official [bar-menu](https://www.islandsrestaurants.com/menu/bar/) photography explicitly names Mai Tai and Deep Blue Sea. Two saved Double Stack entries use the [Lunch Break](https://www.islandsrestaurants.com/menu/lunch-break/) photograph. Two missing Spinach Artichoke Dip entries use the [Mira Mesa ordering-menu](https://order.islandsrestaurants.com/menu/mira-mesa) product image, reviewed in the browser after direct HTTP requests returned 403. Chain product imagery is distinguished from branch photography. Eleven rows added in total.
- **The Local Pacific Beach:** Local’s Lumpia from its [operator menu](https://www.thelocalpb.com/menus/).
- **Bay Park Fish Company:** Chile-Garlic Edamame and Shrimp Tempura Roll from the [operator food menu](https://bayparkfishcompany.com/san-diego-bay-park-fish-company-bay-park-fish-company-food-menu).
- **Savoie Otay Ranch:** Caesar Salad and Short Rib Sliders from the [operator menu](https://savoieeatery.com/chula-vista-otay-ranch-savoie-italian-eatery-food-menu).
- **Oggi’s Vista and Encinitas:** four rows from the exact-branch operator pages, including Bang Bang Shrimp, The Sampler, Ultimate Cheddar Burger and an unrestricted Stix entry. One-topping and half-portion variants were withheld when the photograph did not establish that variant.
- **The Hop Stop:** its [operator-menu](https://thehopstopsd.com/poway-the-hop-stop-food-menu) taco image, captioned as two examples with the offer priced per taco and beer separate.

## Rejections and unresolved research

Visual review rejected the Pub in Bay Park’s logos and sausage-roll image mislabelled Ploughman’s, Sushi Roka’s raw-fish platter mislabelled gyoza, the Hop Stop’s meat/olive pizza labelled cheese pizza, generic rice/tea illustrations, and Lazy Dog’s Ankle Buster Blonde logo. Search Bar’s explicit serving/sides mismatches remain rejected. Oggi’s cheese-only Stix photograph does not establish a requested one-topping or half-portion variant.

Google Images search `Islands Mira Mesa Nachitos` surfaced the exact branch ordering menu. The corresponding Yelp photo search returned a page error, not a verified absence of photos. Direct requests to several Islands ordering URLs returned 403; the browser rendered Mira Mesa’s named product images successfully. The dip photo’s original Olo CDN URL was obtained through the image’s context-menu “Open Image in New Tab” action. No ordering-page failure was relabelled as no-image evidence.

**3,387 stored menu rows remain without a photo.** Remaining entries need further dish-specific official detail/sitemap/ordering research, exact-branch Yelp All/Food/Drink galleries and Google Images/Maps searches, followed by visual validation. No new reviews were invented or inferred during this photo pass.

## Verification

Full management-API readbacks in both environments matched complete expected profiles, revisions, enabled state and specials region. The final audit asserts unchanged row identities and identical non-photo item fields, including prices, notes and reviews. Existing photos were preserved. Uploaded Azure bytes/public image downloads were checked before references were saved.

Nine matching production native pins include every expected new image URL in their page HTML. Knotty Barrel’s local native pin 20485 was opened after hydration: its expanded Food photos strip rendered the additions, and the Potato Chip Nachos viewer displayed its image, caption and linked operator credit.

Eight other changed restaurant profiles have no matching backing pin after exact-source and title/branch checks: Savoie, Hop Stop, BJ’s Chula Vista, four Islands branches, and Oggi’s Encinitas. Their management content is saved, but public native-pin coverage is not claimed. Do not create pins using invented opening dates to conceal this gap.

Durable provenance: `scripts/restaurants/menuItemPhotos.json`; existing bundled Soichi menu rows have matching photo fields synchronized. Downloaded images, visual review sheets, source HTML, manifests, full before/after snapshots and readbacks remain in ignored `.scrape/san-diego-expanded-2026-11-08/`. No pin photos were added to Git. Content updates needed no deployment; translations remain with the separate translation agent.

Validation: 27 tests across menu/photo handling and restaurant content/specials validation passed; the skill validator and diff whitespace check also passed.
