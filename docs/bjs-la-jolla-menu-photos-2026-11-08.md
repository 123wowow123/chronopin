# BJ’s La Jolla menu photos — November 8, 2026

Saved four visually reviewed photos through the restaurant-specials API to the exact La Jolla profile (1032) in local and production. Full profile, enabled state and San Diego region readbacks match; native pin 20562 contains the new public Azure photos in both environments. The local rendered Food photos strip and menu show the additions.

Coverage: **5 of 9 saved menu entries**, including **all 3 food entries**. Existing guacamole photo retained. New entries:

- Personal deep dish pizza: [official product page](https://www.bjsrestaurants.com/menu-item/personal-deep-dish-pizza-house-salad-combo-2-2), embedded `__NEXT_DATA__` product image, Scene7 `PizzaSaladMiniPizookie_2183`. Caption identifies chain photography and excludes the pictured salad/Pizookie from the saved $7 pizza offer.
- Select appetizers: [Sway T.’s June 5, 2025 La Jolla Yelp photograph](https://www.yelp.com/biz_photos/bjs-restaurant-and-brewhouse-la-jolla-4?select=kJAUygODYE_QkXtA1VCHqQ&tab=food), captioned “Avocado Egg Rolls Spinach And Artichoke Dip”. Two eligible selections pictured; caption does not imply both plates for one offer price.
- Signature beers: Brewhouse Blonde, labelled on the [official La Jolla page](https://www.bjsrestaurants.com/locations/ca/la-jolla), Scene7 `beertab-brewhouse-blonde`.
- Seasonal and guest draft beers: Committed Double IPA, explicitly labelled seasonal in that page’s embedded card data, Scene7 `2025-committed-no-text`. Caption preserves the specific beer, chain promotional provenance and rotating-availability caveat.

Remaining: Domestic bottles; Dark Horse wines (Cabernet Sauvignon, Chardonnay); Brewhouse margarita; Call drinks. These drink entries still need verified offer/variant photos. Google Images search `BJs La Jolla brewhouse margarita` returned Handcrafted Margarita, flight, spicy mango and strawberry variants and other-branch Tripadvisor photos; none was established as the saved Brewhouse Margarita offer. Unlabelled cocktails, other-branch photos and retail bottle imagery were not assigned to these entries. The one-photo-per-item target is not yet complete.

Research and before/after readbacks: `.scrape/bjs-la-jolla-2026-11-08/`; durable credited metadata: `scripts/restaurants/menuItemPhotos.json`. Images are in Azure, never Git. Updated the restaurant-guide-research skill to require official background/lazy/embedded-data inspection plus Yelp and Google research. No code deployment or translations were run.

## Additional drink research

Coverage is now **7 of 9 entries** locally and in production. Added Jenn R.’s [June 9, 2024 Brewhouse Margarita photo](https://www.yelp.com/biz_photos/bjs-restaurant-and-brewhouse-la-jolla-4?select=ZDk4I5Q2fozJAwpm_Lmqug&tab=drink), explicitly named by its caption. The date is retained as historical; no old promotional price was copied. The official sitemap also exposed [Dark Horse Cabernet Sauvignon](https://www.bjsrestaurants.com/menu-item/dark-horse-cabernet-sauvignon) and [Dark Horse Chardonnay](https://www.bjsrestaurants.com/menu-item/dark-horse-chardonnay). Both embedded product images were downloaded and visually inspected, uploaded to Azure, and saved to the wine entry (cover and second gallery image). Captions explicitly identify bottle illustrations and state that the $5 offer is not a whole bottle.

Checked all 88 captions across the exact branch’s three Drink gallery pages. Targeted all-photo searches: `Tito` and `call` each returned zero; `Bud` returned four candidates, whose names included other beers and an unrelated dog/food photo. The uncaptioned candidate `j07FZLFBXX0wKZOsZ1rjvw` was downloaded and rejected after visual inspection: it shows draught beer in a tall glass, not a domestic bottle. Google Images search `BJs La Jolla domestic bottles call drinks` returned branch menus, other branches, general galleries and an unrelated BJ’s Wholesale liquor result, without a verified item match. Official Happy Hour background photographs `happyhourfullbar-5414` / `5639` were also inspected and rejected for these entries: their cocktails are unlabelled and no eligible domestic bottle is identifiable.

Remaining specific gaps: **Domestic bottles** and **Call drinks**. The existing named vodka-and-juice, mule, espresso martini and Old Fashioned photos do not establish the required spirit brand or eligibility under the call-drink offer.

Evidence: `more-drinks-reviewed.json`, `local-more-drinks-readback.json`, `prod-more-drinks-readback.json` and both `*-pin-drinks-after.html` files under the ignored research directory. Complete profile/region/enabled readbacks were checked; all three new Azure image URLs also appear on both native pin pages.
