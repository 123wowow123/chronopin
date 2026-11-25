---
name: restaurant-guide-research
description: >-
  Use this skill when adding or replenishing Chronopin restaurant city guides and restaurant pins: the four
  landing tabs, per-tab targets for China and Japan, opening-date rules, menu and special transcription,
  backing pins, photos, and west-to-east navigation order.
---

# Restaurant guide research

Docs: `docs/okf/api/restaurant-content.md`, `restaurant-specials.md`, `restaurant-seed.md`.

## Landing page sections
Every guide (including Japan city guides) supports **Specials, Coming soon, Just opened, Top restaurants**, in that order.
- Open the first populated tab by default, prioritizing Specials when offers exist.
- Hide tabs with no eligible content; links to empty tabs fall back to a populated view.
- Specials stays visible whenever verified active or upcoming offers exist, even outside service hours or without
  a published rating. Upcoming offers show the next local start time; active ones show "available now". Expired
  offers don't keep the tab visible.
- Targets (research goals, not display caps or reasons to relax eligibility): **35 distinct restaurants per tab for
  every China city; 30 for every Japan city.** Count each restaurant once per tab. Record shortages, sources
  checked and unresolved gaps in the guide notes.
- Make a thorough effort to populate every section before accepting incomplete coverage: search operator
  announcements, local reporting, branch-specific menus and verified promotions. Add sourced content whenever
  possible.
- Never invent opening dates, discounts, ratings or menu items to make a tab appear.
- Record the sources checked and unresolved coverage gaps in the guide notes.
- Japan and China guides: continue replenishing any section below its target and record each shortage, the
  sources checked and the specific unresolved research gaps.

## Food trucks tab (added 2026-11-20, San Diego first)
A fifth tab, **Food trucks** (`?view=trucks`, hash `#food-trucks`), after Top restaurants. Hidden while empty. A truck is a
`restaurant-content` record with `tile.kind: 'top'` and **`tile.foodTruck: true`**; the guide moves it out of Top restaurants
into this tab (Top counts exclude trucks). Its specials need nothing extra: a truck with a `RestaurantSpecialVenue` in the
region shows in Specials like any venue. Code: `restaurantGuidePage.ts` (`trucks` split), `restaurants.ts` counts,
`RestaurantGuide.tsx`; the tab only appears after the code is deployed (check Top stays unchanged after the first push).
- **Pin per truck:** `POST /api/admin/db/Pin` (`@FoodDesk`), tags `Restaurant`, city, neighborhood, `Food Truck`, cuisine, category
  `Food`. Address = the truck's published base/usual stop, geocoded (Nominatim); never a city-centre point. `sourceUrl` = the
  operator page, else its Instagram profile or a branch-specific review (that URL is the key for the pin, tile, menu and specials).
- **Start date:** the truck's own opening date. If none is published, owner instruction (2026-11-20) allows the **earliest
  documented operation**, always `dateConfidence: 'estimated'` with the reasoning saying so (Instagram feed: scroll to the end with
  `javascript_tool` un-awaited and poll, then open the last post; the grid order is newest first. Month-only evidence uses day 1/31
  as a placeholder, explained). A separate restaurant or second location is not the truck: say so in the pin.
- **Not a truck:** restaurants with a storefront (Birria El Rey), catering-only operators with no address (Taco Love), or ones with no
  fixed San Diego base (Devilicious). Hold them and record why.
- **Photos:** operator site/press first, then a published review's lead photo (credit it), last Google Maps contributor photos
  (via Wanderlog `freeImage` URLs; verify the truck's name/address is visible). Instagram image URLs are blocked in Chrome
  (`[BLOCKED: Cookie/query string data]`); a truck may legitimately have no image (`tile.image: null`). Upload with the pin-media-azure
  flow; historical photos say so in the caption.
- **Menus (tile `profile.menu`, `specials: []` required):** the operator's own site first. Ordering sites that load items by script
  (themenustar6/`mobile-webview6`, Toast) often expose a public `functions/restaurant.php` POST (`function=get_items&id=<category>&restaurant_id=..&code=..`);
  the price `<span class="pull-right">` comes **before** its `<h4>` name. Prices unpublished: leave `price` off. Dated prices from
  an article go in the item note ("as published May 16, 2024") with `coverage: 'sample'`. Chain-wide operator photos are allowed
  only with the chain caption (see Dish photos); skip items with a mismatching file name and items "not available" at the truck.
- **Reviews:** `provider/title/sourceUrl/quote(<=300, verbatim)/publishedDate/checkedAt`; short verbatim sentences about the exact dish;
  drop a quote whose fact (a price) the current menu contradicts (SD Magazine's "three bucks" gobernador vs the $7.00 ordering page).
- **Specials:** only a published, dated offer (Kiko's daily 2-5 pm happy hour, The Infatuation July 2026). Blog/aggregator claims quoting
  reviewers ("$1 fish tacos Tuesday") are not saved.
- **Gap-fill pass (2026-11-20): what worked and what did not.**
  - *Prices:* the operator's own ordering site beats any article. Shawarma Guys' `shawarma-guys.curated.menu` is a script app: open
    `/restaurant-locator/<id>` in Chrome, pick the truck's location, **Start Ordering** (browse only, never add to cart or check out), then
    `get_page_text` returns every item with its price and the deal rows ("Daily Bites: 3 for $20 Jr Pita"). Result: 61 of 79 items priced and a
    new Specials deal (venue 1551). Items that need modifiers (fries, hummus, salads) show no single price: leave `price` off.
  - *Toast and Yelp (2026-11-20, once the owner granted Chrome read access):* both work in Chrome now. Toast
    (`order.toasttab.com/online/<slug>`): `get_page_text` returns every item, price and the weekday-specials block; find the slug by
    clicking the Google result (the slug is truncated in snippets; `javascript_tool` output containing URLs is blocked), then read
    `tabs_context_mcp` for the final URL. Fetch/WebFetch still 403 on Toast and Yelp, so never delegate them to a fetch agent. The
    Toast page is the truck's own menu: use it for prices and the weekly specials (Kiko's: 119 items, six weekday specials, happy hour
    drink = soda or Tecate can). Specials without stated hours need a window: use the last published hours and say so in `conditions`;
    skip an ambiguous row (Kiko's Monday) rather than guess its price.
  - *Yelp dish photos:* `/biz_photos/<slug>?tab=food&start=N` pages (30 per page, up to ~450). Start the loop un-awaited in a Yelp tab, keep
    results on `window`, then write them into a `<pre>` and read with `get_page_text` (returning ids directly is often BLOCKED). The alt text
    is `"<Business> - <caption> - <tags>"`; keep rows that have a caption. Slugs: Mission Valley Kiko's is `kikos-place-san-diego-15`
    (7710 Hazard Center Dr), others resolve as `<name>-san-diego`. Download `s3-media0.fl.yelpcdn.com/bphoto/<id>/o.jpg` with a browser UA,
    build a labelled contact sheet (ASCII labels only: PIL fails on en dashes), reject wrong-venue packaging (a quesabirria tray from another
    shop), multi-dish shots and ambiguous aguachile/campechana, then upload (WebP, Azure `restaurant-dishes/<slug>/`). Credit "Yelp reviewer photo",
    `sourceUrl` = `https://www.yelp.com/biz_photos/<slug>?select=<id>`, caption says date not shown. Results: Kiko's 14, Mi Gusto Es 16, Zoe's Place 15,
    Taco Picasso 8 dish photos. A Yelp search-result snippet is a usable review quote only with `publishedDate: null` and the business URL.
  - *Yelp: check every listing slug and every photo page (owner instruction, 2026-11-21).* One venue can have several `biz_photos` listings (`<slug>`, `<slug>-2`, `<slug>-3`; Mi Gusto Es' `-san-diego-2` had 731 photos and the grilled-shrimp taco the first listing lacked). Before concluding an item has no photo: (1) find every listing
    (`/search?find_desc=<name>&find_loc=<city>`, then probe `<slug>-2`, `-3` and read each page's `h1` and address to confirm it is the same branch); (2) read the photo total ("N of 731" in the viewer) and scan all pages `start=0..N` (`matcher.browser.js` stops at `start=180`, about 210 photos: raise that loop limit);
    (3) for both the original and English item names. A photo link the owner hands over is a lead for that dish, not proof: open it, read the caption, and say plainly when it is a different dish (a "Fried shrimp taco" is not the a la plancha item).
  - *Multi-dish shots: crop to the one dish (owner instruction, 2026-11-21).* A Yelp or Maps photo that shows the item next to other dishes, a hand, feet or people is not rejected: crop it tight to the one dish (Pillow/`crop` in a scratch script, keep the original aspect where possible, never upscale or retouch),
    view the crop to confirm only that dish remains and it is identifiable (a foil-wrapped burrito you cannot see into stays rejected), upload the crop (WebP, Azure) and keep the original Yelp `?select=<id>` as `sourceUrl`. The caption says so: `"<item> at <venue> — Yelp reviewer photograph captioned "<uploader caption>" by the uploader, cropped to this dish; date not shown, presentation may vary."`
    First run (2026-11-21, local + prod): of 14 earlier-rejected multi-dish shots only 4 had an identifiable dish (Taco Picasso cactus taco = the green nopal strips, Kiko's onion shrimp = the top taco with shrimp and onions, Kiko's mariscada taco with the feet cropped out, Leo's chorizo taco = the crumbled red-brown meat beside the cabeza); the rest stayed rejected because the caption order did not say which taco was the item. Crop boxes were tightened until no neighbouring dish showed.
    Second look (owner asked to re-check, 2026-11-21, local + prod): view each candidate full size and identify the item by its filling, not the caption order. Zoe's Baja-style shrimp taco = the right taco with visible shrimp and green crema; Kiko's OG shrimp taco = curled battered shrimp (the OG fish taco has one long battered strip);
    Kiko's spicy smoked fish (marlin) taco = the red shredded fish with peppers beside two fried-fish tacos; El Chato chorizo taco = fine red-brown crumbles (the pollo taco is shredded). Still not croppable: El Chato buche (both photos smothered in salsa or overlapping). Leo's multi-taco shots only cover items that already have photos.
    Pick the right dish when the caption lists several (the caption order is not always left to right: match the garnish or filling you can see, and skip the photo if you cannot tell which one is the item).
    *San Diego remainder pass (2026-11-21, local + prod):* a keyword filter over every same-address Yelp listing (all pages) per truck, skipping photo ids already used, found 24 more (18 whole, 6 cropped): Shawarma Guys 3, Taco Picasso 3, Kiko's 13, Mi Gusto Es 5.
    Don't count an item as photographed by a near miss: a "Side of Falafel" with 8+ pieces is not the 3-pc side; the free cup of fish soup is not the menu Fish soup; an orange aguachile could be tamarindo, so it is not "rojo". Kiko's Toast menu and Taco Picasso's site have no item photos. Gaps are listed in `.scrape/food-trucks-2026-11-21-gaps.md`.
    *Crop procedure (owner instruction, 2026-11-21; follow every time, not only when asked to re-check):*
    1. Never reject a multi-dish shot from a contact-sheet thumbnail. Open each one full size (about 900 px) before deciding.
    2. Identify the item by what you can see inside it, using the menu description: protein shape (curled battered shrimp vs. one long battered fish strip), texture (fine crumbles = chorizo; shredded strands = pollo or birria; chunky cubes = asada or cabeza),
       sauce colour (red shredded = spicy or smoked; green crema = Baja style), and visible garnish (nopal strips, pineapple, grilled onions). Caption order is only a hint.
    3. Crop tight to that dish (coordinates on the original pixels), save, then view the crop. If any part of a neighbouring dish, a hand or a foot still shows, tighten the box and view it again.
    4. Skip it only if the dishes overlap or are smothered so the item cannot be separated, or two look alike with nothing to tell them apart. Record each skip with its reason (for example "El Chato buche: both photos covered in salsa").
    5. Upload the crop under the item's slug with `-cropped`, keep the original `?select=<id>` source, and add "cropped to this dish" to the caption.
  - *Combo and special items with no photo of their own use the main entree's photo (owner instruction, 2026-11-21).* A happy-hour, Taco Tuesday, daily-special or combo item ("2 fried fish tacos and a drink", "3 tacos and a drink") has no dish of its own to photograph. When no search for the item itself matches, attach the photo of its main entree (the fish taco, the burger, the pizza), taken from that restaurant's own menu item and never from another venue or a drink. Reuse the same blob URL and `sourceUrl`, and word the caption honestly: `"<main entree> at <venue>, shown for the <special> (the special's main item); presentation may vary."` Never show a drink or side as the special's photo, and leave the item bare only when the venue has no photo of the entree either. First seen: Kiko's Place Seafood (Mission Valley truck) Happy hour 2 fried fish tacos and a drink, $13.99, which shows the fried fish taco photo.

    *Non-truck venues, same rule (2026-11-21 pass over San Diego, Los Angeles and Austin, prod):* reuse a photo only when the bare item is the same dish as an imaged one with a discount, add-on, half portion or drink pairing (Frenchy's "Caviar Service (50% off)", McP's Irish Fries with Guinness Gravy & Cheese, JOEY "Sushi Cone & Spritz", Duke's "Add coconut shrimp", Oggi's "Half Oggi's Stix"). Never reuse across a different protein or dish (shrimp taco vs fish taco, hand roll vs shrimp plate, pasta choices, appetizer lists). Caption: original credit plus `Shown for the <menu> item "<name>", which is built on this dish; portion, pairing and presentation may vary.` Method: GET `/api/admin/restaurant-specials/<id>`, copy the pool item's `image` onto the bare item, PUT the whole profile with the current `revision`, read back. A name-match script over-flags, so review each candidate by hand. Truck venues carry no truck flag in specials profiles; find trucks by name.
  - *Match house-named items by their menu description, not only the name (owner pointed it out, 2026-11-21).* Names like "New York taco", "1983 taco", "Costa Azul", "La Sirenita" or "Chingon" rarely appear in a reviewer's caption; the description does. Build the search terms from the item's description ingredients too
    (Kiko's "New York taco" = "Angus beef, pico de gallo, cheese, avocado", and the reviewer captioned it "Angus beef taco"). Confirm what you see in the photo against the description (beef, pico, cheese and avocado all visible), say both in the caption ("New York taco (Angus beef, pico de gallo, cheese, avocado) ... captioned "Angus beef taco""), and skip the photo if the description doesn't settle which item it is.
    Yelp can also list one business under unrelated slug families (Kiko's: `kikos-place-seafood-san-diego` and `kikos-place-san-diego-15`). Find listings with Yelp search by name and address, not only by adding `-2`, `-3` to one slug. When the owner hands over a photo URL, use it as the `sourceUrl`.
  - *Items with no matching photo: translate the name to English and search again, for ALL menu items of every restaurant (trucks, iconic dishes, top restaurants, openings, specials venues, every city and language) (owner instruction, 2026-11-21, widened the same day).* When a menu item (Spanish, Chinese, Japanese,
    Korean...) has no photo after the Yelp/operator pass (English-named items too: search the plain English name plus venue, and common variants), translate it ("Camaron A La Plancha Tacos" = griddled/grilled shrimp tacos; "Pescado Empanizado" = breaded
    fish; "Costa Azul" = a house name, keep as is) and search with the English name plus the venue (Yelp `biz_photos` caption/tag search, Google Images and Maps
    photos for the venue, review sites, the operator's Instagram/Facebook captions). Run the Spanish name and the English name both. Accept a photo only if it shows
    that dish at that venue (visible sign, tray, or the contributor's caption naming the dish); caption honestly when it is a close variant (grilled vs. griddled
    shrimp) and never use a stock or other-venue photo. Record the items still without a photo in the research notes instead of guessing.
    First run (Mariscos Mi Gusto Es, 2026-11-21, local + prod content 1975): scanning `biz_photos?tab=food&start=0..240` alt text for the English names found 9 single-dish photos
    (Camaron/Pulpo Ajillo = garlic shrimp/octopus, Camaron Enchilado = spicy shrimp, Birria Dorado con Queso, Birria, Asada, Aguachile Verde, Pulpo y Camaron Tostadas, Torre de Mariscos);
    "Camaron A La Plancha Tacos" first stayed without a photo, then the owner pointed at a second Yelp listing: a business can have two `biz_photos` slugs (`mariscos-mi-gusto-es-san-diego` and `-san-diego-2`, 731 photos); scan every listing and all pages (the first pass only read 240 photos) and the grilled-shrimp photo ("Two grilled shrimp tacos") turned up there. "Fried shrimp taco" is the breaded Camaron Tacos, not the plancha dish. Write the uploader's English caption into the item caption.
    *All other trucks (2026-11-21, local + prod):* `matcher.browser.js` with each item listed under its original and its English name (`.scrape/truck-media-2026-11-21/P.json`, 12 trucks, ~8 min un-awaited) found 74 candidates; viewing contact sheets
    dropped 14 (a hand holding the plate, several dishes, a blurry or tiny shot) and 59 items got a photo (Shawarma Guys 3, Kiko's 3, Mariscos Jalisco 4, Leo's 10, El Chato 4, La Unica 6, Veracruz 8, T-Loc's 6, Cuantos 3, KG BBQ 12; Taco Picasso and Zoe's had no clean single-dish match).
    Traps: guessed Yelp slugs must be probed first (`t-locs-sonora-hot-dogs-austin` is a different business; the truck is `-austin-4`, found via `/search?find_desc=`); `javascript_tool` blocks output containing photo ids, so dump to `document.body` and read with `get_page_text`;
    *Second pass, every listing + every page (2026-11-21, local + prod):* the first pass read only ~210 photos per truck; scanning all listings with the same business name and address (up to 1,429 photos, 20 to 50 min for 13 trucks) found 39 more single-dish photos (Kiko's 14, Leo's 6, Veracruz 4, Cuantos 4, KG BBQ 3, Mi Gusto Es 3, T-Loc's 2, Shawarma Guys 1, Mariscos Jalisco 1, El Chato 1).
    Listings with a different address are a different branch (Shawarma Guys' `-2`/`-3` are 9690 Reagan Rd): do not use them. Yelp resolves `?select=<id>` under the base slug even for a photo that lives on the `-2` listing, so link `biz_photos/<base slug>?select=<id>`.
    an English alias that drops "a la carte" or size words can match the wrong item (the plate photo is not the 3 oz a la carte item), so keep only exact-dish matches.
  - *Still not usable:* Grubhub/Uber Eats/DoorDash/Postmates (third-party prices with a markup; Zoe's Place and Taco Picasso list no own prices),
    `sandiegofoodtrucks.com` (TLS error), `gotruckster.com` (405). Their prices stay "not published".
  - *Never re-run a bulk menu apply from a stale `menus.json`:* applying all five menus once overwrote Kiko's 119-item Toast menu with
    the old 9-item draft (restored from `kk-menu.json`). After building a menu, write it back into `menus.json` before any apply.
  - *Address check:* Kiko's Mission Valley truck is "Corner of Hazard Center Dr and Mission Center Rd" (Infatuation 2026); its pin keeps
    5494 Mission Center Rd (the 2018 post), while Yelp's listing shows 7710 Hazard Center Dr, Ste E513. Same corner; recheck before moving the pin.
  - *Re-run:* the menu builders live in the session scratchpad only; to repeat, rebuild items from `.scrape/food-trucks-2026-11-20/menus.json`
    (Shawarma Guys, Mi Gusto Es items and photo URLs) and PUT `profile.menu` with the content record's current `revision`; look records up by
    `profile.pinSourceUrl` (content ids differ between local and prod: Kiko's 1974 local / 1972 prod).
- Push local first, then production: preflight blobs, pilot **one** truck, check `aria-label="Food trucks N"` and that Top is unchanged, then the rest.
  Evidence and per-truck notes: `.scrape/food-trucks-2026-11-20/NOTES.md`. San Diego trucks done: Kiko's (prod pin 21115), Shawarma Guys
  South Park (21116), Taco Picasso (21117), Mariscos Mi Gusto Es (21118), Zoe's Place (21119). Held: Devilicious, The San Diego Taco Truck,
  Taco Love, Balboa Park Food Truck Fridays, Curbside Bites.
- **Los Angeles Food trucks done locally + prod (2026-11-20, 5 trucks, `.scrape/los-angeles-tabs-2026-11-20/`):**
  Mariscos Jalisco (3040 E Olympic Blvd; local 20985 / content 1987, prod 21125 / content 1981), Leo's Tacos Truck (1515 S La Brea Ave;
  local 20986 / 1988, prod 21132 / 1988), El Chato Taco Truck (5300 W Olympic Blvd; local 20987 / 1989, prod 21133 / 1989), Tacos y Birria
  La Unica (2840 E Olympic Blvd; local 20988 / 1990, prod 21134 / 1990), El Flamin' Taco Echo Park (2028 W Sunset Blvd; local 20989 / 1991,
  prod 21135 / 1991; `tile.image: null` because operator/LA Weekly images sit behind Cloudflare HTML).
  *Traps:* (1) `mariscosjalisco.net` currently returns a Wix `ConnectYourDomain Error` and Michelin Guide redirects to the Pomona storefront
  while crediting the 2001 Boyle Heights truck in prose — link `sourceUrl` to Time Out LA + `websiteUrl` to Instagram `@mariscosjalisco`.
  (2) `elchatotacotruck.com` (`cdn.ezsite.ai`) appears unofficial/AI-generated; use the operator's real `elchatola.com`. (3) For production
  audits after pushing, verify native `/pin/<id>/` card links inside `/restaurants/<region>?view=iconic|trucks`, authenticated `/api/admin/...`
  readbacks, and local `http://localhost:3000/pin/<id>`; rapid sequential anonymous `GET /pin/<id>` loops against production trigger Chronopin's
  `?cg=1` crawler guard (403).
- **Austin Food trucks done locally + prod (2026-11-20, 5 trucks -> `Top 03` unchanged, `Trucks 05`, `.scrape/round2-tabs-2026-11-20/`):**
  Veracruz All Natural — Radio Coffee (4208 Menchaca Rd; local `21001`/`2003`, prod `21148`/`2004`; `32/32` priced via Dripos `order.dripos.com`,
  `3` item photos, `2` reviews, `3` PinMedia; `CHRONOPIN SELECTION` because Austin's Michelin Bib Gourmand honors brick-and-mortar Veracruz Fonda
  & Bar at `1905 Aldrich St`), T-Loc's Sonora Hot Dogs (5000 Burnet Rd; local `21002`/`2004`, prod `21138`/`1994`; `29/29` priced via Square, `4`
  item photos, `1` review, `3` PinMedia), Cuantos Tacos (1108 E 12th St; local `21003`/`2005`, prod `21149`/`2005`; `28/28` priced, `3` item photos,
  `1` review, `3` PinMedia, `MICHELIN BIB GOURMAND`), KG BBQ (3108 Manor Rd; local `21004`/`2006`, prod `21150`/`2006`; `31/31` priced, `3` item
  photos, `1` review, `4` PinMedia, `MICHELIN BIB GOURMAND`), Distant Relatives (3901 Promontory Point Dr; local `21005`/`2007`, prod `21151`/`2007`;
  `17/17` priced, `0` item photos, `1` review, `3` PinMedia, `MICHELIN BIB GOURMAND`).
  *Held:* Micklethwait Craft Meats (closed its `1309 Rosewood Ave` trailer and moved brick-and-mortar to `4602 Tanney St` on Feb 1, 2025; replaced
  by T-Loc's).
  *Traps:* (1) `distantrelativesatx.com` redirects to misspelled `distatantrelativesatx.com`. (2) `/api/admin/restaurant-content` requires
  explicit `review.publishedDate: null` when unknown (omitting the key fails `Invalid dish review evidence` HTTP 400). (3) `/restaurants/<region>`
  without `?view=` defaults to Openings whenever opening venues outnumber Top venues (check `?view=top` + `?view=trucks` explicitly in audits).
  *Photo sweep of the 10 LA + Austin trucks (2026-11-21, local + prod):* the San Diego passes had already covered eight of them (see "All other trucks" and "Second pass"); El Flamin' Taco (Yelp `el-flamin-taco-los-angeles-14`, 2028 W Sunset; `-13` is Koreatown, `-12` Los Feliz) and Distant Relatives (`distant-relatives-austin-2`; `-austin` is an alias with the same 147 photos) had never been scanned. El Flamin' got 10 item photos (Asada Fries, Torta Cubana, Nachos, Mulitas, Regular Torta, Huarache Mixto, Huaraches, Tacos, Regular Burrito, Tostadas), a tile photo and 3 pin media (truck shots, Medium + PinMedium on local 20989 / prod 21135); Distant Relatives got 6 (Sliced Brisket, Pork Spare Ribs, both sandwiches, Burnt End Peas, Spicy Smoked Peanuts). Skipped: both El Flamin' quesadilla shots (tortilla type unclear), the two-plate gringo taco, Distant Relatives chicken (only a hand-held shot and a 427 px crop) and the burger shot (sliced brisket, not a patty). The matcher's `photoCaption` fails on this listing family because alt text has no business prefix (`<caption> - <tags> - Barbeque Near Me`): scan with a plain alt dump instead. Navigating the Yelp tab wipes `window` results, so dump full ids to `document.body` before leaving. Yelp review text is script-rendered: a `fetch` of `/biz/<slug>?q=<dish>` parsed with `DOMParser` returned no review nodes, so dish reviews need Chrome page reads (below).
  *Yelp dish reviews for the LA + Austin trucks (2026-11-21, 31 reviews, local + prod, `.scrape/truck-media-2026-11-21/apply_reviews.py`):* `navigate` to `https://www.yelp.com/biz/<slug>?q=<dish>`, wait 4 s, then `javascript_tool` on `main ul li` (keep items whose text has a year, strip from "Helpful") returns each reviewer, date and text in one `browser_batch` call (3 dishes per call). Save `provider: 'Yelp'`, title `<Truck> — Yelp review by <First L.>`, `sourceUrl` = the biz URL without `?q=`, the verbatim sentence about that exact item, `publishedDate` from the review. Verify the page title's street address first: `veracruz-all-natural-austin` is the 2505 Webberville Rd truck park listing, not the pin's 4208 Menchaca Rd, so Veracruz got no Yelp reviews; Mariscos Jalisco resolves to `-3`, Leo's `-11`, El Chato `-2` (all matched their pin addresses). Skip a quote that states a price the menu doesn't (Cuantos' "50c" costra, MJ's "$3 each") and combined-dish quotes that name several items. Item reviews now: El Flamin' 6, MJ 4, Leo's 4, El Chato 5, La Unica 4, T-Loc's 3, Cuantos 5, KG BBQ 5, Distant Relatives 7; Veracruz still 1.
- **Houston Food trucks done locally + prod (2026-11-21, 5 trucks -> `Top 03` unchanged, `Trucks 05`, `.scrape/round3-tabs-2026-11-21/`):**
  `Tacos Tierra Caliente` (`2003 W Alabama St`; local `21018`/`2020`, prod `21167`/`2010`; `11/11` priced via Square, `4` dish photos, `2` reviews, `4` PinMedia, `CHRONOPIN SELECTION`), `El Taconazo` (`4003 Fulton St`; local `21019`/`2021`, prod `21178`/`2021`; `7` core window items unpriced online, `4` dish photos, `1` review, `3` PinMedia, `CHRONOPIN SELECTION`), `Rosemeyer Bar-B-Q` (`2111 Riley Fuzzel Rd`, Spring; local `21020`/`2022`, prod `21179`/`2022`; `30/30` priced via Square, `3` dish photos, `1` review, `4` PinMedia, `MICHELIN BIB GOURMAND`), `Abu Omar Halal` (`7925 Westheimer Rd` truck, Toast `7927 Westheimer Rd`; local `21021`/`2023`, prod `21180`/`2023`; `65/65` priced via Toast, `7` dish photos, `1` review, `4` PinMedia, `CHRONOPIN SELECTION`), `Oh My Gogi! Food Truck` (`801 St Emanuel St`; local `21022`/`2024`, prod `21181`/`2024`; `14/14` Square `truckItems` priced, `7` dish photos, `1` review, `5` PinMedia, `CHRONOPIN SELECTION`).
  *Held:* `Clutch City Cluckers` (`5550 Val Verde St` no longer listed; moved brick-and-mortar to `5600 Richmond Ave`), `El Ultimo Taco Truck` (`7645 Long Point Rd` closed/inactive), `The Waffle Bus` (brick-and-mortar storefronts).
  *Traps:* `Oh My Gogi! Food Truck` (`801 St Emanuel St`) uses Square `truckItems` (`14` items) separately from the Galleria restaurant; `Abu Omar Halal`'s Westheimer truck sits at `7925 Westheimer Rd` while Toast lists `7927 Westheimer Rd`; Popmenu image URLs with `format=auto` can return AVIF when `Accept: image/avif` is sent—request `format=jpeg` explicitly before downloading/converting.
- **Honolulu Food trucks done locally + prod (2026-11-21, 5 trucks -> `Top 03` unchanged, `Trucks 05`, `.scrape/round4-tabs-2026-11-21/`):**
  `Giovanni's Shrimp Truck (Kahuku)` (`56-505 Kamehameha Hwy`; local `21035`/`2037`, prod `21184`/`2027`; `7/7` priced, `2` item photos, `2` reviews, `3` PinMedia), `Leonard's Malasadamobile (Waikele)` (`94-894 Lumiaina St`, Waipahu; local `21036`/`2038`, prod `21195`/`2038`; `8` sample items unpriced online, `2` item photos, `3` reviews, `5` PinMedia; dated to `2011` SFGate Waikele documentation, never 1952 Kapahulu store), `Da Bald Guy` (`56-565 Kamehameha Hwy`, Kahuku Sugar Mill; local `21037`/`2039`, prod `21196`/`2039`; `6` sample items unpriced online, `3` item photos, `2` reviews, `5` PinMedia), `Five Star Poke` (`206 Kapuni St`, Waikiki; local `21038`/`2040`, prod `21197`/`2040`; `5` sample items unpriced online, `2` item photos, `2` reviews, `3` PinMedia), `Jenny's Shrimp` (`66-532 Kamehameha Hwy`, Haleiwa; local `21039`/`2041`, prod `21198`/`2041`; `6` sample items unpriced online, `3` item photos, `3` reviews, `4` PinMedia), all `CHRONOPIN SELECTION`.
  *Held:* `Hono's Shrimp Truck`, `Mike's Huli Chicken`, `North Shore Tacos (Sharks Cove)` (site Cloudflare-gated).
  *Traps:* `jennysshrimptruck.zoyaf.com` publishes unofficial `"Price (Approx.)"` estimates—exclude it and use `@jenny_s_shrimp`; verify Google Maps/blog galleries on contact sheets (`NateEatsHawaii` Kahuku Giovanni's shot pictured adjacent `Corn Stars BBQ`, and its Waikele Malasadamobile entry showed the Kapahulu brick store instead of the red-and-white trailer).
- **Orlando Food trucks done locally + prod (2026-11-21, 5 trucks -> `Top 03` unchanged, `Trucks 05`, `.scrape/round5-tabs-2026-11-21/`):**
  `The Pastrami Project` (`825 N Magnolia Ave`; local `21052`/`2054`, prod `21203`/`2044`; `11/11` priced via `pastramiproject.square.site`, `5` item photos, `3` reviews, `4` PinMedia, `2014-07-01` estimated), `Ceylon Hut (Ceylon Roti Hut)` (`609 Irvington Ave`; local `21053`/`2055`, prod `21214`/`2055`; `4` sample items unpriced online, `5` item photos, `2` reviews, `4` PinMedia, `2022-07-01` exact), `Piacere Wood Fired Pizza` (`609 Irvington Ave`; local `21054`/`2056`, prod `21215`/`2056`; `11/11` priced via `piacerepizza.online` Square catalog, `5` item photos, `2` reviews, `4` PinMedia, `2025-06-01` estimated), `Barrio Español` (`2207 E Michigan St`; local `21055`/`2057`, prod `21216`/`2057`; `5` sample items unpriced online, `4` item photos, `2` reviews, `4` PinMedia, `2024-05-01` exact), `La Taquería 503` (`2207 E Michigan St`; local `21056`/`2058`, prod `21217`/`2058`; `4` sample items unpriced online [Toast link behind Cloudflare challenge], `5` item photos, `3` reviews, `4` PinMedia, `2024-05-01` exact), all `CHRONOPIN SELECTION`.
  *Traps:* `lataqueria503.com` footer prints `2207 East Michigan St. Orlando, FL 32807` whereas À La Cart SoDo is ZIP `32806`; Nominatim snapped `2207 E Michigan St` east to Conway and `825 N Magnolia Ave` to a road midpoint—use the US Census Geocoder for rooftop points (`geocode.json` `*_census`); leave translations to the translation agent.
- **San Francisco Food trucks done locally + prod (2026-11-21, 5 trucks -> `Top 09` & `Iconic 06` unchanged, `Trucks 05`, `.scrape/round6-tabs-2026-11-21/`):**
  `El Tonayense` (`1719 Harrison St`, Best Buy flagship; local `21069`/`2071`, prod `21231`/`2072`; `6` sample items unpriced [legacy `2011`/`2018` prices skipped], `1` item photo, `2` reviews, `3` PinMedia, `2006-01-01` estimated), `El Norteño Taco Truck` (`801 Bryant St`; local `21070`/`2072`, prod `21232`/`2073`; `11/11` priced via `orderelnortenotacotruck.com/order`, `1` item photo, `2` reviews, `3` PinMedia, `1996-01-01` estimated), `Firetrail Pizza` (`601 Mission Bay Blvd North`, SPARK Social SF; local `21071`/`2073`, prod `21220`/`2061`; `6` sample items unpriced, `2` item photos, `3` reviews, `4` PinMedia, `2016-06-01` estimated), `SPRO Coffee Lab (SPARK Social SF)` (`601 Mission Bay Blvd North`; local `21072`/`2074`, prod `21233`/`2074`; `12/12` priced via Square Mission Bay catalog, `3` item photos, `3` reviews, `4` PinMedia, `2017-01-01` estimated), `El Gallo Giro` (`998 Treat Ave`; local `21073`/`2075`, prod `21234`/`2075`; `5` sample items unpriced, `1` item photo, `3` reviews, `4` PinMedia, `2002-01-01` estimated), all `CHRONOPIN SELECTION`.
  *Held:* `Street Meet Taco Truck` (`428 11th St` vs `777 Mariposa St` conflicting addresses, `0` major editorial hits).
  *Traps:* `tonayense.com/menu` carries legacy `© 2011`/`2018` PDF pricing (`$3.00` tacos, `$8.50` burritos)—leave unpriced as `sample` rather than presenting legacy prices as current; `gallogiro.com` is an unrelated Southern California bakery chain—strictly exclude it in favor of Mission Local / Eater SF / Time Out SF; WOWSlider blog photos (`brian-coffee-spot.com`) carry white letterboxing margins and small bottom watermarks—crop cleanly before upload and do not attach Church St-specific review quotes (`filternotes.com`) to the Mission Bay trailer.
- **San Jose Food trucks done locally + prod (2026-11-22, 5 trucks -> `Top 03` unchanged, `Trucks 05`, `.scrape/round11-tabs-2026-11-22/`):**
  `El Bombero 408` (local `21149`/`2129`, prod `21312`/`2124` [pilot]; `18/18` priced, `6` items with photos, `2` reviews, `4` PinMedia), `Mariscos El Aguachiles 8` (local `21150`/`2130`, prod `21318`/`2130`; `5` sample items unpriced, `4` items with photos, `1` review, `3` PinMedia), `Tacos El Chore` (`1426 Hillsdale Ave`; local `21151`/`2131`, prod `21319`/`2131`; `16/16` priced via `fromtherestaurant.com/tacos-el-chore/menu/1426-Hillsdale-Ave/`, `4` items with photos, `1` review, `2` PinMedia), `Pana Food Truck` (local `21152`/`2132`, prod `21320`/`2132`; `7` sample items unpriced, `1` item with photo, `2` reviews, `4` PinMedia), `Orale Taco Truck` (`2240 Alum Rock Ave`; local `21153`/`2133`, prod `21321`/`2133`; `14/14` priced via `fromtherestaurant.com/orale-taco-truck/menu/2240-Alum-Rock-Ave/`, `0` item photos, `1` review, `0` PinMedia, `tile.image: null`).
  *Held / Excluded:* `Pre-Hispanic Mexican Cuisine`, `Mestizo`; in parallel DC truck screening, brick-and-mortar storefronts `Swizzler`, `Arepa Zone`, and `Fava Pot` were excluded from the mobile food-truck tab.
  *Traps:* `restaurantContentValidation.ts` requires `tile.imageCredit` to be a string (`""`) even when `tile.image` is `null` (`imageSourceUrl` omitted); `tacoselchoreca.com` points to `fromtherestaurant.com/tacos-el-chore/menu/1426-Hillsdale-Ave/` for current catalog prices.
- **New York Food trucks done locally + prod (2026-11-22, 5 trucks -> `Top 08` unchanged, `Iconic 05`, `Trucks 05`, `.scrape/round12-tabs-2026-11-22/`):**
  `Birria-Landia (Jackson Heights)` (`77-05 Roosevelt Ave`; local `21166`/`2140`, prod `21329`/`2135` [pilot]; `5/5` priced, `4` item photos, `3` reviews, `4` PinMedia), `Uncle Gussy's` (`345 Park Ave`; local `21167`/`2141`, prod `21351`/`2141`; `73/73` priced via `togoorder.com/web/6196#/`, `4` item photos, `3` reviews, `5` PinMedia), `Tacos El Bronco (Mobile 1 — Sunset Park)` (`860 5th Ave`; local `21168`/`2142`, prod `21352`/`2142`; `17/17` priced, `4` item photos, `3` reviews, `5` PinMedia), `King Souvlaki (Astoria 31st)` (`31-01 31st Ave`; local `21169`/`2143`, prod `21353`/`2143`; `14` sample items unpriced, `2` item photos, `3` reviews, `5` PinMedia), `DiSO's Italian Sandwich Society` (`245 Park Ave`; local `21170`/`2144`, prod `21357`/`2144`; `15` sample items unpriced, `3` item photos, `3` reviews, `4` PinMedia).
  *Excluded:* `The Halal Guys`, `NY Dosas`, `Wafels & Dinges`.
  *Traps:* `unclegussys.com` embeds live ToGoOrder store `6196` (`togoorder.com/web/6196#/`); `tacoselbronco.net` omits prices so transcribe the Jan 2026 Mobile 1 counter menu board photo; `/pin/<id>/<slug>` redirects require an HTTP `CookieJar` in Python audit scripts (`403 Cookies are required to view this page` otherwise); `GET /api/admin/restaurant-specials` rejects `?region=all` (`400 Unknown region`) and returns `{"venues": [...]}` with `row["profile"]["menu"]["menus"]` when `region` is omitted.
- **Miami Food trucks done locally + prod (2026-11-22, 5 trucks -> `Top 09` & `Iconic 06` unchanged, `Trucks 05`, `.scrape/round13-tabs-2026-11-22/`):**
  `El Bori Food Truck` (`261 NW 36th St`; local `21201`/`2151`, prod `21370`/`2146` [pilot]; `25/25` priced via `elborifoodtruckfl.com`, `4` item photos, `3` reviews, `5` PinMedia), `A.C.'s Icees` (`2400 S Bayshore Dr`; local `21202`/`2152`, prod `21376`/`2152`; `7` sample items unpriced [cash-only], `2` item photos, `3` reviews, `4` PinMedia), `Taco Miami Taqueria` (`13190 SW 8th St`; local `21203`/`2153`, prod `21377`/`2153`; `26/26` priced via `order.yourmenu.com/tacomiamitaqueria`, `6` item photos, `1` review [`FoodTrucksIn`], `3` PinMedia), `Mr. Pepito Miami` (`2731 NE 2nd Ave`; local `21204`/`2154`, prod `21378`/`2154`; `21/21` priced via `mrpepito.square.site/s/order`, `2` item photos, `2` reviews, `3` PinMedia), `El Toro Loco Doral Food Truck` (`7201 NW 36th St`; local `21205`/`2155`, prod `21379`/`2155`; `25/25` priced via `eltoroloco.com/pages/menu`, `5` item photos, `3` reviews, `3` PinMedia).
  *Excluded:* `Taste of R Cuisine / TRC Burger` (`95 NE 40th St` -> indoor Buena Vista brick-and-mortar `4316 NW 2nd Ave` ~June 2026), `Chi-Fa at Veza Sur` (rebranded `Casa La Rubia`), `King of Racks BBQ`, `Cowy Burger`, `Ted's Burgers`, `Ms. Cheezious`.
  *Traps:* Distinguish `Mr. Pepito Miami` (`2731 NE 2nd Ave`, `mrpepito.square.site/s/order`) from Wynwood's `Pepitos Miami` (`542 NW 30th St`) and Doral's `Pepito's Plaza` (`10701 NW 58th St`) when matching reviews; confirm `eltoroloco.com/pages/locations` still lists `Doral Food Truck` (`7201 NW 36th St`) separately from Doral Square brick-and-mortar; keep third-party `order.store` / `order.online` delivery links out of truck pricing (`trc-burger` / `fox-bros`); verify Unsplash theme images on WordPress restaurant sites (Home grown `afternoontea-*`) and corner Stamps/`WAGYU` badges/upside-down Commons photos on contact sheets before staging.
- **Phoenix Food trucks done locally + prod (2026-11-23, 5 trucks -> `Top 09` & `Iconic 06` unchanged, `Trucks 05`, `.scrape/round14-tabs-2026-11-23/`):**
  `La Frontera #1` (`209 N 16th St`; local `21218`/`2162`, prod `21398`/`2157` [pilot]; `23/23` priced via June 2025 two-column `la-frontera.pdf`, `3` item photos, `3` reviews, `3` PinMedia), `Taqueria La Hacienda #1` (`254 E Buckeye Rd`; local `21219`/`2163`, prod `21404`/`2163`; `21/21` priced via truck menu board & SinglePlatform, `0` extra item photos, `3` reviews, `1` PinMedium), `Tacos Chava` (`2804 W Van Buren St` / `#1: 145 N 28th Ave`; local `21220`/`2164`, prod `21405`/`2164`; `18/0` unpriced via `tacoschavaphx.com`, `2` item photos, `3` reviews, `5` PinMedia), `Tacos La Lomita (Van Buren Food Truck)` (`329-371 N 75th Ave`; local `21221`/`2165`, prod `21406`/`2165`; `18/0` unpriced via `tacoslalomitaaz.com/food-truck/`, `3` item photos, `3` reviews, `3` PinMedia), `La Frontera #2` (`3501 W Lincoln St`; local `21222`/`2166`, prod `21407`/`2166`; `22` items [`20` priced via `lafrontera2.shop/menu`], `2` item photos, `3` reviews, `4` PinMedia).
  *Excluded:* `Tacos El Pillo` (`3601 W McDowell Rd`, blank `tacoselpilloaz.com` & 0 StreetFoodFinder/PhxFoodTrucks listings), `Mariscos Ensenada #3` & `Unos Tacos y Birria` (sit-down storefronts), `Tacos La Lomita Tolleson` (`8449 W McDowell Rd` restaurant separated from Van Buren truck).
  *Traps:* `src/server/restaurantSpecialValidation.ts` accepts only `['published', 'sample', 'link']` for `menu.coverage` (not `'partial'` or `'unpriced'`) and mandates `https:` (not `http:`) on every dish `review.sourceUrl`; `tacoslalomitaaz.com/food-truck/` switches away from Tolleson's Clover URL (`ORDER_URL = ""` on the truck tab), so never apply Tolleson restaurant prices to the Van Buren truck; `lafrontera1` PDF splits `$3.00`/`$11.50` vs. `$4.00`/`$12.50` across physical x-columns (`pdftotext -bbox-layout` keeps Cabeza & Buche in column 1); `lafrontera2.shop` `photo-2.jpg` shows legacy `$2` signage whereas `photo-1.jpg` matches live `$3`/`$8`/`$11`/`$15` prices.
- **Dallas Food trucks (2026-11-23, Round 17 — 5 Klyde Warren Park trucks [`2012 Woodall Rodgers Fwy, Dallas, TX 75201`] -> `Top 09` & `Iconic 06` unchanged, `Trucks 05`, `0` truck leaks):** `Fletcher's Original Corny Dogs (Klyde Warren Park)` (local `21251`/`2195`, prod `21440`/`2192` [pilot], 52 KWP 2026 `.ics` dates; `11` items / `0` walk-up priced, `2` item photos, `3` reviews, `5` PinMedia, `2022-12-19` exact), `Freshnez` (local `21252`/`2196`, prod `21444`/`2196`, 110 KWP dates; `19/19` priced, `8` item photos, `3` reviews, `5` PinMedia), `Mint's Kitchen Thai` (local `21253`/`2197`, prod `21445`/`2197`, 68 KWP dates; `10/10` priced, `8` item photos, `1` review, `4` PinMedia), `Yummy Pizza` (local `21254`/`2198`, prod `21446`/`2198`, 57 KWP dates; `19/19` priced, `7` item photos, `2` reviews, `5` PinMedia), `Mama Lama` (local `21255`/`2199`, prod `21447`/`2199`, 60 KWP dates; `11/11` priced, `5` item photos, `3` reviews, `5` PinMedia).
  *Swapped/held/excluded:* Swapped `Easy Slider` for `Mama Lama` (brick-and-mortar/food-hall extensions + closed mobile Yelp listings + unpriced truck tab); held `Halal Fusionz` (site advertises storefronts only) and `Greek Lover`; excluded storefronts/halls/rotating Truck Yard lots.
  *Traps:* Parse per-truck Klyde Warren Park `.ics` calendars directly (all 5 had active Nov–Dec 2026 slots); flatten transparent RGBA PNGs (e.g. Square item cutouts like `dal_mints_thai_tea.png`) onto solid `#ffffff` JPEG before Azure upload.
  Remaining US/global cities not started.

## Iconic dishes tab (added 2026-11-20, San Diego first)
A sixth tab, **Iconic dishes** (`?view=iconic`, hash `#iconic-dishes`), between Top restaurants and Food trucks. Hidden while empty. A record is a
`restaurant-content` `tile.kind: 'top'` with **`tile.iconicDish: '<dish name>'`** (card shows "Known for <dish>"). Unlike trucks it also stays in
Top restaurants, so Top's count includes iconic records. Code: `restaurantGuidePage.ts` (`iconic` filter), `restaurants.ts` counts, `RestaurantGuide.tsx`.
- One pin per restaurant (`@FoodDesk`, tags `Restaurant`, city, neighborhood, `Iconic Dish`, cuisine, category `Food`), the exact branch's address and
  geocoded point. Start date = that branch's opening (year-only evidence: Jan 1 placeholder, `estimated`, explained). The brand's founding year is not the branch's.
- **Mark the dish on the menu:** set `iconic: true` on the menu item that is the iconic dish (pin menu and guide-card menu show an "Iconic" label; the card list puts it first in its section). The card photo carries an **"ICONIC"** badge (owner instruction 2026-11-20: keep the label, drop the word "dish"; set `tile.recognition: "ICONIC"`, never "ICONIC DISH"), and the "Known for <dish>" line names the dish. Menu-item labels also read just "Iconic".
- **Photos: restaurant photos first, then 1 to 2 iconic-dish photos at the end** (owner instruction, 2026-11-20; this is the latest of three revisions, so keep this order).
  The pin's native media and the card carousel list **several venue photos** (storefront or sign first, interior or signage next) and then the **1 to 2 most iconic images of the
  iconic dish** last. Weights (0 to 1, descending = display order): venue 1.0, 0.9, 0.8; dish 0.3, 0.2. The tile cover is the first venue photo. Every other dish photo lives only on its
  `profile.menu` item; the iconic item carries `iconic: true` and that dish image (a second goes in `images`). Code: `restaurantGuideDetails.ts` builds an iconic card's carousel from
  the pin media plus at most 2 iconic-flagged item images (cover removed); food trucks use the same rule, and no longer merges every menu photo; other cards are unchanged. Pick photos that show the exact dish (Hodad's
  Maps customer burger had no bacon: not used) and the exact venue with the sign or address visible. Caption honestly when a photo is a variant (Point Loma Seafoods' fish *plate* for the fish
  *sandwich*, same fish; Google's auto-title said "calamari", the strips are fillets). Now: Hodad's storefront, interior, single + double bacon cheeseburger; Rubio's shop, signage, fish tacos;
  Point Loma Seafoods sign, market counter, fish plate (the other session's fresh-catch tray was detached, its Medium row 36787 remains).
- **Getting photos from the Maps gallery (2026-11-20):** open the listing, click the cover to open the gallery, click a storefront/interior thumbnail, then read the full-size
  URL with `javascript_tool`: `decodeURIComponent(location.href).match(/!6s(https:\/\/lh3\.googleusercontent\.com\/[^=!]+)/)[1]` (do not retype it from the tab title:
  a mistyped character returns HTTP 400). Fetch it with `=w1600`, view it, and credit the contributor shown in the viewer header ("Photo: <name> via Google Maps,
  <month year> · <what it shows>"). Skip photos with people prominent (a child at the front of Point Loma Seafoods' lighthouse shot; take the sign-only shot) and videos.
  Venue photos found this way: Hodad's storefront/interior, Rubio's shop/signage, Point Loma Seafoods sign/counter. Upload with
  `uploadDishPhotos.ts restaurant-images/san-diego/iconic-dishes <file>`; attach with `.scrape/iconic-dishes-2026-11-20/addmedia.py <pinId> <uploaded.jsonl> <credit> <url>`
  (idempotent by `thumbName`; weights 1.0, 0.9, 0.8..., all within 0-1; the first venue photo carries weight 1, so demote an older food photo with `PATCH PinMedium?id=` weight 0.5).
  The card badge says `ICONIC` (not "ICONIC DISH").
- **Menu prices, photos and reviews pass (2026-11-20):**
  - *Rubio's has per-location prices:* the chain PDF has none, but `order.rubios.com/location` does. In Chrome: **Pick Up**, search the zip (92109), pick the branch ("Mission Bay, 4504 Mission Bay Drive"),
    **Start Order** (browse only, never add to cart), then `get_page_text` returns every item with price, calories and description (`/menu/mission-bay`). "Starting at" items: save the lowest price in
    `price` and `priceLabel: 'From $X'`. Result: 20 items priced + 3 added; menu `coverage: 'published'`, url = the branch's order page. The item photos sit on `olo-images-live.imgix.net` with a **signed query string**: stripping the `?...&s=` signature returns `sig_invalid` (a 403), which I first misread as hotlink
    protection, and `javascript_tool` refuses to return the full URL (`[BLOCKED: Cookie/query string data]`). What works (2026-11-20, 19 photos): on the order page collect `{name: img.src}` into
    `window.__got` (800x800 natives), overlay a black 2-up grid (`position:fixed`, two 640 px imgs), and `computer screenshot` with `save_to_disk: true` at **full scale** (a `scale` below 1 saves the small
    version too); then crop each cell with PIL (cells 0-492 and 495-987 px wide, 492 high in the 1288x948 capture), contact-sheet check, `uploadDishPhotos.ts auto`, and attach by item name with the operator
    credit "Photo: Rubio's Coastal Grill" and the order page as `sourceUrl` ("chain-wide menu photo, may vary"). Skip an item whose photo shows another protein (the Classic Taco photo is chicken: not used for the
    steak taco). The customer fish-taco photo stays on the iconic item and Rubio's official Original Fish Taco photo is its second (`images`), so the card shows two dish photos at the end. A second pass added the 3 taco plate, churro, Classic taco trio and Grilled gourmet taco: 24 of 25 items now have a photo; only the Classic steak taco has none. `rubios.com/menu/` and the homepage show no dish photos in Chrome (the menu page is empty; the homepage has promo tiles only; the chain PDF has no embedded photos): the dish photos live on `order.rubios.com`.
  - *Hodad's shakes:* the drink page (`/drink-menu`) maps three operator photos (chocolate, vanilla, strawberry) to their items with the same DOM walk as the food page; verify flavors on a contact sheet.
  - *Reviews:* only verbatim sentences found by searching the saved page text (`quote in text` must be True), with the article's own title, URL and date (`datePublished`; null when a place page shows none).
    Used: Food GPS (Hodad's double bacon cheeseburger, 2008-11-09), San Diego Reader "200 million fish tacos" (2018-02-02) and Cool San Diego Sights (2026-05-04) for Rubio's original fish taco,
    San Diego Reader place page for Point Loma Seafoods' fish sandwich. A review of the double burger is not attached to the single. Wikipedia, NBC/KPBS (facts, not opinions) and reader comments are not reviews.
  - *Gaps left:* Point Loma Seafoods item photos (only the fish plate), Hodad's photos for the other 18 items, reviews for non-iconic items, Yelp/Google review text (blocked).
- **Pushed to production 2026-11-20** (after the owner said the code was deployed; the tab only exists on prod once iconic records exist): Hodad's pin 21121 / content 1977, Rubio's original 21122 / 1978,
  Point Loma Seafoods 21123 / 1979 (local 20976/1978, 20975/1977, 20977/1979). Procedure that worked: refresh the prod token, confirm nothing exists by `sourceUrl` (pin + content), then
  `.scrape/iconic-dishes-2026-11-20/push_prod.py <key> <localPin> <localContent>` per restaurant: `POST /api/admin/db/Pin` (the saved pin JSON), copy each local `Medium` + `PinMedium` row with its weight
  (same Azure blobs), `POST /api/admin/restaurant-content` with the local profile. **Pilot one first** (Hodad's), check `aria-label="Iconic dishes N"`, the pin page and its media, then the rest. Readback after:
  items/photos/reviews/priced counts equal local, tile image equal, every image URL HTTP 200 (43/43), live guide shows Iconic dishes 3, Top 9, Food trucks 5. Translations were not run (left to the translation agent).
- **More menu pictures (2026-11-20, local + prod):** Hodad's: the *Downtown* site (`hodadsdowntown.com/food-menu`, same platform and DOM walk) has photos the Ocean Beach page lacks (large fries, Frings): attach with the chain caption
  ("Hodad's Downtown operator photo of the same menu item ... Ocean Beach may vary"); the catering site has none; 16 of 49 items now have a photo (the rest, such as the Blue Jay, singles/doubles, veggie/vegan, malts and sodas, have no operator photo).
  Point Loma Seafoods: its own site's photos are raw/smoked fish and an oyster platter (market shots, not menu dishes: not used on items); blog captions are the reliable item match: Hungry Ones (hungryones.com, Jan 2023,
  `<figcaption>`) gives the crab cake sandwich and crab cakes with fries; the Maps gallery photo titled "Fish tacos with refried beans" (Rose, Jun 2026) is the taco plate. 3 of 26 items have a photo. Download full-size
  originals from the blog (strip the `-768x1024` suffix) and credit the blog; do not use a Google Maps photo whose only label is Google's auto-title unless the dish is visually unambiguous. `attach_menu2.py` applies a plan to local and
  prod by current revision. Still open: Point Loma Seafoods squid/shrimp/clam/oyster/combo/cold sandwiches/soups.
- **Scan the whole operator page for lazy images and use Yelp's photo pages (2026-11-20, owner pointed both out):**
  - *Lazy images:* a first DOM walk found only 12 of Hodad's 27 food photos (Blue Jay, singles, doubles, chicken, veggie, vegan, UnBurger were missing). Scroll the full page in steps first, read `data-src || currentSrc || src`,
    walk up to the nearest ancestor whose text has the price, and dedupe. The drink page has more (Neapolitan shake, chocolate malt; the vanilla/strawberry malt rows reuse the shake photos: say so in the caption; soda photos are
    section-level, not per item: skip). Result: Hodad's 33 of 49 items now have a photo; the rest are small sizes/halves, sodas and coffee. Operator photos beat Downtown photos: replace the Downtown fries/Frings with Ocean Beach's own.
  - *Yelp works in Chrome:* `yelp.com/biz_photos/<slug>?tab=food&start=N` lists 30 thumbnails per page with the contributor's caption and Yelp's tags in each `img alt` (the `menu-item=` URL parameter does not filter the grid);
    `?select=<photoId>` opens one photo, whose page title is the caption and whose sidebar has "<contributor> on <date>" (regex `([^\n]{2,40}) on ([A-Z][a-z]{2} \d{1,2}, \d{4})`). The image is public at
    `https://s3-media0.fl.yelpcdn.com/bphoto/<photoId>/o.jpg` (plain download works; the id is the `select` value). Keep titles honest: Yelp's caption "Bay Shrimp" was a cup of bay shrimp (a cocktail, not a sandwich), "Fried oysters" is a plate
    for the oyster sandwich, "Manhattan Red Fish Stew" is the Manhattan chowder: say what the photo shows. Credit "Photo: <name> via Yelp" with the `select=` URL as `sourceUrl`.
  - *Point Loma Seafoods now 13 of 28:* squid, shrimp, bay shrimp cocktail, combo plate, both chowders, oyster, crab sandwich, crab cake sandwich, tacos, plus two added items (crab cocktail, oysters on the half-shell $17.63). The real
    fish sandwich photo (EcoVoyager And E., Jun 2024) is the iconic item's second image and pin media 0.2. Still no photo: clam, scallop, taquitos, tuna salad, cold shrimp, smoked fish sandwich, combo cold sandwich, jumbo shrimp/smoked fish/oyster cocktails, fries, rings.
    Scripts: `attach_hodads_all.py`, `attach_pls_yelp.py` (local + prod by revision).
- **Yelp full-caption scan (2026-11-20, owner: "use yelp to find the rest"):** in one Chrome tab on `yelp.com/biz_photos/<slug>`, loop `fetch('/biz_photos/<slug>?tab=food&start='+N)` for N = 0..1920 step 30 (4 at a time, 250 ms apart,
  no failures), parse each page with `DOMParser`, and keep `{photoId: img alt}` in `window.__y` (the food tab's 1,922 photos came back in ~2 minutes). Then regex the captions per menu item (clam, scallop, taquito, tuna salad, smoked,
  onion rings, fries, tenders ...), return only 4 hits per query with `id|caption[:42]` (output is capped near 1.7 KB and URLs with query strings are blocked), download `bphoto/<id>/o.jpg`, contact-sheet every candidate, and read the
  contributor/date per photo with the navigate + title/sidebar regex. Contributor and date are **not** in the fetched HTML, so each needs its own `?select=<id>` visit. Rejections that mattered: a taquito photo that hid the taquitos under lettuce
  (took the one captioned "comes with 3 and a side of beans and cole slaw"); a customer cheeseburger with no bacon. Result: Point Loma Seafoods 22 of 28 items (clam sandwich, scallop, fish taquitos, tuna salad, smoked fish sandwich,
  jumbo shrimp cocktail, onion rings, fries, chicken tenders; the breaded shrimp *sandwich* photo now leads the shrimp item, the plate second). Still none: cold shrimp sandwich, combo cold sandwich, smoked fish cocktail, oyster cocktail,
  small appetites, fountain drink. `attach_pls_yelp2.py` applies it to local + prod.
- **Native media API traps:** `POST /api/admin/db/Medium` and `/PinMedium` answer `{ rows: [...] }` (not `results`). `PinMedium.weight` must be **0 to 1**
  (`CK_PinMedium_weight`); weight 2 returns a 500 *after* the Medium row was inserted, leaving an orphan: find and delete orphans (`DELETE /api/admin/db/Medium?id=`)
  before retrying. Check by `thumbName` before creating so a rerun is idempotent. Never POST probe rows to see what happens.
- **Never claim inventor status** for a contested dish (California burrito, carne asada fries): say "best known for". Credit Baja for the fish taco.
- San Diego done locally (pins 20975-20977, content 1977-1979, not on prod): Rubio's original (fish taco), Hodad's (bacon cheeseburger),
  Point Loma Seafoods (fish sandwich). Held: Lolita's (carne asada fries; San Diego-city branch date unverified, original is in Chula Vista),
  Roberto's/Santana's (California burrito origin disputed, no verified branch date), Phil's BBQ. Evidence: `.scrape/iconic-dishes-2026-11-20/`.
- **Los Angeles Iconic dishes done locally + prod (2026-11-20, 7 restaurants -> `Top 10`, `Iconic 07`, `.scrape/los-angeles-tabs-2026-11-20/`):**
  Philippe the Original (French dip, `Beef Dip`; local `20978`/`1980`, prod `21124`/`1980`), Cole's French Dip (`Original French Dip`; local
  `20979`/`1981`, prod `21126`/`1982`), Langer's Delicatessen-Restaurant (`#19 Pastrami Sandwich`; local `20980`/`1982`, prod `21127`/`1983`),
  Pink's Hot Dogs (`Chili dog`; local `20981`/`1983`, prod `21128`/`1984`), Original Tommy's (`Double chili cheeseburger`; local `20982`/`1984`,
  prod `21129`/`1985`), The Apple Pan (`Hickoryburger`; local `20983`/`1985`, prod `21130`/`1986`), Roscoe's House of Chicken and Waffles
  Hollywood (`Chicken and waffles`, `1) Scoe’s`; local `20984`/`1986`, prod `21131`/`1987`).
  *Traps:* `coles.la` reopened Nov 18, 2026 (`colesfrenchdip.shop` fails TLS — source current items from LAist's Nov 19 reopening menu report);
  keep French dip attribution neutral between Philippe's and Cole's; on `roscoeschickenandwaffles.com/menu/` note exact Unicode apostrophe in
  `1) Scoe’s` and `3) Herb’s Special`.
- **Chicago (`6` -> `Top 09`, `Iconic 06`) & New York (`5` -> `Top 08`, `Iconic 05`) Iconic dishes done locally + prod (2026-11-20, `.scrape/round2-tabs-2026-11-20/`):**
  - *Chicago:* Lou Malnati's Pizzeria River North (439 N Wells St, `The Malnati Chicago Classic™ Deep Dish`; local `20990`/`1992`, prod `21136`/`1992`;
    `65` items / `39` priced via `order.loumalnatis.com`), Pequod's Pizza Lincoln Park (2207 N Clybourn Ave, `Small 10" Pan Pizza (Cheese)`; local
    `20991`/`1993`, prod `21139`/`1995`; `63/63` priced), Gino's East River North (162 E Superior St, `Gino's Supreme`; local `20992`/`1994`, prod
    `21140`/`1996`; `49/49` priced), Al's `#1 Italian Beef` Little Italy (1079 W Taylor St, `Regular Italian Beef Sandwich`; local `20993`/`1995`,
    prod `21141`/`1997`; `8` items, counter prices unpublished online), Portillo's River North (100 W Ontario St, `Italian Beef Sandwich`; local
    `20994`/`1996`, prod `21142`/`1998`; `40/40` priced via `order.portillos.com`), Superdawg Drive-In (6363 N Milwaukee Ave, `Superdawg™`; local
    `20995`/`1997`, prod `21143`/`1999`; `29/29` priced).
  - *New York:* Katz's Delicatessen (205 E Houston St, `Katz's Pastrami`; local `20996`/`1998`, prod `21137`/`1993`; `85/85` priced), Joe's Pizza
    Greenwich Village (7 Carmine St, `Cheese Pizza`; local `20997`/`1999`, prod `21144`/`2000`; `15/15` whole-pie/drink items priced via
    `slicelife.com`, individual slices unpublished online), Russ & Daughters (179 E Houston St, `Classic Bagel & Lox Sandwich`; local `20998`/`2000`,
    prod `21145`/`2001`; `136/136` priced), Junior's Restaurant & Bakery Downtown Brooklyn (386 Flatbush Ave Ext, `Our Famous No. 1 Original Cheesecake`;
    local `20999`/`2001`, prod `21146`/`2002`; `251/251` priced from Main/Bakery/Breakfast PDFs), Nathan's Famous Coney Island (1310 Surf Ave,
    `Original Nathan's Hot Dog`; local `21000`/`2002`, prod `21147`/`2003`; `15` items, counter prices unpublished online).
  * **Philadelphia** (`done 2026-11-21`; `Top restaurants 09`, `Iconic dishes 06`): `Pat's King of Steaks` (`1237 E Passyunk Ave`,
    `Philly cheesesteak`; local `21006`/`2008`, prod `21165`/`2008`; `23`/`23` priced, 1 dish photo, 2 reviews, 5 PinMedia), `Geno's Steaks` (`1219 S
    9th St`, `Philly cheesesteak`; local `21007`/`2009`, prod `21168`/`2011`; `26`/`26` priced, 1 dish photo, 1 review, 4 PinMedia), `John's Roast Pork`
    (`14 E Snyder Ave`, `Roast pork sandwich`; local `21008`/`2010`, prod `21169`/`2012`; `43` items / `42` priced, 1 dish photo, 2 reviews, 3
    PinMedia), `Tommy DiNic's` (`1136 Arch St`, RTM Stall B5, `Roast pork sandwich`; local `21009`/`2011`, prod `21170`/`2013`; `6` items unpriced online,
    1 dish photo, 1 review, 3 PinMedia), `Famous 4th Street Delicatessen` (`700 S 4th St`, `Pastrami and corned beef sandwiches`; local
    `21010`/`2012`, prod `21171`/`2014`; `259`/`256` priced, 4 dish photos, 1 review, 5 PinMedia), `Termini Brothers Bakery` (`1523 S 8th St`,
    `Cannoli`; local `21011`/`2013`, prod `21172`/`2015`; `124`/`110` priced, 2 dish photos, 1 review, 4 PinMedia).
  * **Boston** (`done 2026-11-21`; `Top restaurants 09`, `Iconic dishes 06`): `Union Oyster House` (`41 Union St`, `New England clam chowder`; local
    `21012`/`2014`, prod `21166`/`2009`; `162`/`118` priced, 2 dish photos, 1 review, 4 PinMedia), `Regina Pizzeria — Original North End` (`11 1/2
    Thacher St`, `Brick-oven pizza`; local `21013`/`2015`, prod `21173`/`2016`; `35`/`35` priced, 3 dish photos, 2 reviews, 5 PinMedia), `Neptune Oyster`
    (`63 Salem St`, `Maine lobster roll`; local `21014`/`2016`, prod `21174`/`2017`; `81`/`80` priced incl. unpriced e-tab Maine Lobster Roll, 1 dish
    photo, 1 review, 4 PinMedia), `Mike's Pastry` (`300 Hanover St`, `Cannoli`; local `21015`/`2017`, prod `21175`/`2018`; `85` gallery items unpriced
    online, 3 dish photos, 1 review, 5 PinMedia), `Parker's Restaurant` (`60 School St`, `Boston cream pie`; local `21016`/`2018`, prod `21176`/`2019`;
    `4` signatures unpriced due to `menus.omnihotels.com` TLS cert failure, 3 dish photos, 1 review, 5 PinMedia), `James Hook & Co.` (`440 Atlantic Ave`,
    `Lobster roll`; local `21017`/`2019`, prod `21177`/`2020`; `52`/`51` priced, 3 dish photos, 1 review, 5 PinMedia).
  * **San Francisco** (`done 2026-11-21`; `Top restaurants 09`, `Iconic dishes 06`, `.scrape/round4-tabs-2026-11-21/`): `Swan Oyster Depot` (`1517 Polk St`,
    `Dungeness crab & Sicilian sashimi`; local `21023`/`2025`, prod `21182`/`2025`; `8` sample items unpriced, 3 item photos, 3 reviews, 5 PinMedia),
    `Golden Boy Pizza` (`542 Green St`, `Clam & garlic focaccia square slice`; local `21024`/`2026`, prod `21185`/`2028`; `10/10` priced, 2 item photos,
    2 reviews, 4 PinMedia), `House of Prime Rib` (`1906 Van Ness Ave`, `Tableside carved 21-day aged prime rib`; local `21025`/`2027`, prod `21186`/`2029`;
    `8` sample items unpriced, 3 item photos, 2 reviews, 5 PinMedia), `Tadich Grill` (`240 California St`, `Seafood cioppino & mesquite sole`; local
    `21026`/`2028`, prod `21187`/`2030`; `10/9` priced from May 2026 PDF, 2 item photos, 3 reviews, 5 PinMedia), `Zuni Café` (`1658 Market St`,
    `Brick-oven roast chicken & bread salad`; local `21027`/`2029`, prod `21188`/`2031`; `8/1` priced [`$75` Chicken for Two], 3 item photos, 3 reviews,
    5 PinMedia), `Tartine Bakery` (`600 Guerrero St`, `Morning bun & country sourdough`; local `21028`/`2030`, prod `21189`/`2032`; `9/9` priced from PDF,
    3 item photos, 3 reviews, 5 PinMedia). *Held:* `La Taqueria` (`lataqueriasf.net/menu` empty; swapped to `Golden Boy Pizza`).
  * **Seattle** (`done 2026-11-21`; `Top restaurants 09`, `Iconic dishes 06`, `.scrape/round4-tabs-2026-11-21/`): `Dick's Drive-In (Wallingford)` (`111 NE
    45th St`, `Dick's Deluxe & hand-cut fries`; local `21029`/`2031`, prod `21183`/`2026`; `8/8` priced, 2 item photos, 2 reviews, 5 PinMedia), `Ivar's Acres
    of Clams` (`1001 Alaskan Way Pier 54`, `White clam chowder & steamed clams`; local `21030`/`2032`, prod `21190`/`2033`; `8/8` priced, 4 item photos,
    2 reviews, 5 PinMedia), `Pike Place Chowder` (`1530 Post Alley`, `New England clam chowder bread bowl`; local `21031`/`2033`, prod `21191`/`2034`; `8`
    sample items unpriced [Toast Cloudflare 403], 5 item photos, 3 reviews, 4 PinMedia), `Beecher's Handmade Cheese` (`1600 Pike Pl`, `"World's Best" Mac &
    Cheese`; local `21032`/`2034`, prod `21192`/`2035`; `7` sample items unpriced [Toast Cloudflare 403], 2 item photos, 2 reviews, 5 PinMedia), `Piroshky
    Piroshky` (`1908 Pike Pl`, `Smoked salmon pate piroshky`; local `21033`/`2035`, prod `21193`/`2036`; `9` sample items unpriced [JS-only Toast pickup],
    2 item photos, 2 reviews, 5 PinMedia), `Un Bien (Ballard)` (`7302 15th Ave NW`, `#1 Caribbean Roast pork sandwich`; local `21034`/`2036`, prod
    `21194`/`2037`; `9/8` priced, 3 item photos, 2 reviews, 4 PinMedia). *Held:* `Toshio's Teriyaki` (swapped to `Un Bien`).
  * **Miami** (`done 2026-11-21`; `Top restaurants 09`, `Iconic dishes 06`, `.scrape/round5-tabs-2026-11-21/`): `Joe's Stone Crab` (`11 Washington Ave, Miami Beach`,
    `Florida stone crab claws & mustard sauce`; local `21040`/`2042`, prod `21201`/`2042`; `11/12` priced from Fall 2026 PDF [standalone Key Lime Pie price
    omitted], 4 item photos, 3 reviews, 5 PinMedia, `1913-01-01` estimated), `Versailles Restaurant` (`3555 SW 8th St`, `Cuban sandwich, ropa vieja & La Ventanita
    cafecito`; local `21041`/`2043`, prod `21204`/`2045`; `10/10` priced, 4 item photos, 3 reviews, 5 PinMedia, `1971-01-01` estimated), `Sanguich de Miami` (`2057
    SW 8th St`, `El Cubano & Croqueta Preparada`; local `21042`/`2044`, prod `21205`/`2046`; `8` sample items unpriced online [Cloudflare 520/challenge on menu &
    order pages], 5 item photos, 3 reviews, 5 PinMedia, `2018-01-01` estimated Calle Ocho flagship vs 2015 pop-up), `El Rey de las Fritas` (`1821 SW 8th St`, `Frita
    Cubana & Frita Suprema`; local `21043`/`2045`, prod `21206`/`2047`; `8` sample items unpriced online, 5 item photos, 3 reviews, 4 PinMedia, `1979-01-01`
    estimated), `La Carreta (Calle Ocho)` (`3632 SW 8th St`, `Vaca frita, lechón asado & ventanita cafecito`; local `21044`/`2046`, prod `21207`/`2048`; `8`
    sample items unpriced online, 4 item photos, 2 reviews, 5 PinMedia, `1976-01-01` estimated), `Garcia's Seafood Grille & Fish Market` (`398 NW North River Dr`,
    `Fresh stone crabs & whole yellowtail snapper`; local `21045`/`2047`, prod `21208`/`2049`; `8/10` priced [Whole Yellowtail Snapper & Fresh Stone Crabs market
    price], 4 item photos, 3 reviews, 5 PinMedia, `1976-01-01` estimated dining room vs 1966 market).
  * **Nashville** (`done 2026-11-21`; `Top restaurants 09`, `Iconic dishes 06`, `.scrape/round5-tabs-2026-11-21/`): `Prince's Hot Chicken (South Nashville)` (`5814
    Nolensville Pike, Suite 110`, `Cayenne-crusted half chicken on white bread`; local `21046`/`2048`, prod `21202`/`2043`; `8/1` priced [`$5.00` Draft Beer], 5
    item photos, 2 reviews, 4 PinMedia, `2016-09-01` estimated), `Hattie B's Hot Chicken (Midtown)` (`112 19th Ave S`, `Bone-in hot chicken, tenders & pimento
    mac`; local `21047`/`2049`, prod `21209`/`2050`; `7` sample items unpriced [Toast Cloudflare challenge], 4 item photos, 3 reviews, 4 PinMedia, `2012-08-09`
    exact), `Arnold's Country Kitchen` (`605 8th Ave S`, `Carved roast beef tray & chess pie`; local `21048`/`2050`, prod `21210`/`2051`; `7` sample items
    unpriced on menu board PNG, 5 item photos, 3 reviews, 4 PinMedia, `1982-01-01` estimated), `Loveless Cafe` (`8400 Hwy 100`, `Scratchmade buttermilk biscuits &
    country ham`; local `21049`/`2051`, prod `21211`/`2052`; `9/9` priced, 5 item photos, 2 reviews, 5 PinMedia, `1951-01-01` estimated), `Monell's (Germantown)`
    (`1235 6th Ave N`, `Skillet fried chicken communal boarding-house spread`; local `21050`/`2052`, prod `21212`/`2053`; `6/6` priced, 4 item photos, 2 reviews, 4
    PinMedia, `1995-11-23` exact), `Bolton's Spicy Chicken & Fish` (`624 Main St`, `Dry-rubbed spicy leg quarter & hot catfish`; local `21051`/`2053`, prod
    `21213`/`2054`; `6` sample items unpriced on client-rendered site, 5 item photos, 2 reviews, 5 PinMedia, `1997-01-01` estimated).
  * **Austin** (`done 2026-11-21`; `Top restaurants 09`, `Iconic dishes 06`, `Food trucks 05`, `.scrape/round6-tabs-2026-11-21/`): `Franklin Barbecue` (`900 E 11th St`,
    `Post-oak smoked USDA Prime brisket`; local `21057`/`2059`, prod `21218`/`2059`; `12/12` priced, `2` item photos, `3` reviews, `5` PinMedia, `2011-03-01` estimated
    brick-and-mortar vs 2009 trailer), `Terry Black's Barbecue` (`1003 Barton Springs Rd`, `Giant wood-smoked Dino beef rib & brisket`; local `21058`/`2060`, prod
    `21221`/`2062`; `12/12` priced, `2` item photos, `3` reviews, `5` PinMedia, `2014-06-01` estimated), `Matt's El Rancho` (`2613 S Lamar Blvd`, `Bob Armstrong Dip &
    Asadero Tacos`; local `21059`/`2061`, prod `21222`/`2063`; `11/11` priced, `2` item photos, `3` reviews, `5` PinMedia, `1986-12-01` estimated S Lamar vs 1952 downtown),
    `Home Slice Pizza` (`1415 S Congress Ave`, `18-inch White Clam Pizza & Italian Assorted Sub`; local `21060`/`2062`, prod `21223`/`2064`; `11/11` priced from
    `MainMenu_091626.pdf`, `2` item photos, `3` reviews, `5` PinMedia, `2005-11-01` estimated), `Juan in a Million` (`2300 E Cesar Chavez St`, `Don Juan El Taco Grande`;
    local `21061`/`2063`, prod `21224`/`2065`; `12/12` priced, `1` item photo, `3` reviews, `4` PinMedia, `1980-07-01` estimated), `Kerbey Lane Cafe (Original)` (`3704
    Kerbey Ln`, `Kerbey Queso & made-from-scratch pancakes`; local `21062`/`2064`, prod `21225`/`2066`; `11/11` priced, `3` item photos, `2` reviews, `4` PinMedia,
    `1980-05-05` exact).
  * **Houston** (`done 2026-11-21`; `Top restaurants 09`, `Iconic dishes 06`, `Food trucks 05`, `.scrape/round6-tabs-2026-11-21/`): `The Original Ninfa's on Navigation`
    (`2704 Navigation Blvd`, `Tacos al Carbon (beef skirt steak fajitas) & Ninfarita`; local `21063`/`2065`, prod `21219`/`2060`; `11/11` priced from Oct 2026 PDF, `2`
    item photos, `3` reviews, `5` PinMedia, `1973-07-13` exact), `The Breakfast Klub` (`3711 Travis St`, `Wings & Waffle and Katfish & Grits`; local `21064`/`2066`, prod
    `21226`/`2067`; `11/11` priced from `tbk_menu.pdf`, `3` item photos, `3` reviews, `4` PinMedia, `2001-09-01` estimated), `Crawfish & Noodles` (`11360 Bellaire Blvd,
    Suite 990`, `Viet-Cajun boiled crawfish in garlic butter`; local `21065`/`2067`, prod `21227`/`2068`; `8` sample items unpriced, `4` item photos, `3` reviews, `4`
    PinMedia, `2008-01-01` estimated), `Goode Company Barbeque` (`5109 Kirby Dr`, `Mesquite brisket, Jalapeño Cheese Bread & Brazos Bottom Pecan Pie`; local
    `21066`/`2068`, prod `21228`/`2069`; `10/10` priced from Kirby ToastTab, `3` item photos, `3` reviews, `4` PinMedia, `1977-01-01` estimated), `Brennan's of Houston`
    (`3300 Smith St`, `Snapping Turtle Soup & tableside Bananas Foster`; local `21067`/`2069`, prod `21229`/`2070`; `12/12` priced [`Soups 1-1-1` $16 / `Chef's Package` $48],
    `4` item photos, `3` reviews, `5` PinMedia, `1967-01-01` estimated), `The Original Kolache Shoppe` (`5404 Telephone Rd`, `Scratch Czech kolaches, Sausage Klobásníky &
    Fajita Hand Pies`; local `21068`/`2070`, prod `21230`/`2071`; `11/11` priced, `3` item photos, `3` reviews, `5` PinMedia, `1956-01-01` estimated).
  *Traps:* Ordering sites (`order.loumalnatis.com`, `order.portillos.com`, `slicelife.com`, `order.dripos.com`, Square/Toast) supply verified prices
  where static brand sites omit them (`slicelife.com` for Joe's lists `$26`–`$40` whole pies, not counter slices); `restaurantContentValidation` (`parseSpecialVenue`)
  only permits `menu.coverage` in `['published', 'sample', 'link']` (using `'partial'` throws HTTP 400 `Invalid menu coverage`); `houseofprimerib.com` is an
  aftermarket parked domain while the live official site runs at `houseofprimerib.net`; `swanoysterdepot.net` disclaims `"This is not the official website"` (use
  Instagram `@swan.oyster.official`); `order.toasttab.com` and `northshoretacos.com` return Cloudflare 403 challenges (leave prices unset as `sample` rather than
  scraping third-party aggregators); `Al's #1 Italian Beef` (`1079 W Taylor St`, c. 1960), `Joe's` (`7 Carmine St`, 2005), `Russ & Daughters` (`179 E Houston St`,
  1920), `Termini Brothers` (`1523 S 8th St` 1938 flagship vs 1921 shop at `1514 S 8th St`), `Tommy DiNic's` (`1136 Arch St` RTM Stall B5 opened 1980), `Tadich
  Grill` (`240 California St` 1967 move vs 1849 founding), and `Ivar's Acres of Clams` (`Pier 54` 1946 flagship vs 1938 fish bar) keep earlier founding history in
  prose while `utcStartDateTime` uses the exact branch opening date (`estimated`). Keep cheesesteak invention neutral between Pat's and Geno's. Note `Neptune Oyster`'s
  e-tab PDF/page omits lobster roll and raw bar items, `James Hook & Co.` publishes lower dine-in pricing on `/dinein-menu` than marked-up Menufy, `Mike's Pastry`
  leaves `mikespastry.com/gallery/` unpriced online vs Goldbelly/Grubhub, and filter empty `<tr>` rows from HTML tables (e.g. `johnsroastpork.com/menu-2/`).
  In Round 5: `Sanguich de Miami` returns Cloudflare `520` / challenge pages on menu/order links (`2018` Calle Ocho flagship vs `2015` pop-up); `garciasmiami.com`
  hosts the riverfront dining menu (`1976` dining room vs `1966` fish market) whereas `garciabrosseafood.com` is the Shopify mail-order store; `Prince's Hot Chicken
  (South Nashville)` uses the Nolensville Pike `2016-09` opening and exterior photo rather than `Fifth + Broad` Assembly Food Hall assets; apostrophes become `-s-`
  in `/pin/<id>/<slug>` card links (match card links by `/pin/(\d+)/` regex rather than `tile.slug`); and `GET /api/admin/db/Pin` returns PostGIS `location`
  (`SRID=4326;POINT(lng lat)`) rather than top-level `latitude`/`longitude` keys. In Round 6: Austin Chronicle's `"First Look: Black's Barbecue"` (`3110 Guadalupe St`)
  covers Kent/Barrett Black's Lockhart spinoff rather than `Terry Black's Barbecue` (`1003 Barton Springs Rd`)—keep separate; `The Original Kolache Shoppe` (`5404
  Telephone Rd`, `originalkolache.com`, Kevin Dowd, `1956`) is completely separate from the newer `Kolache Shoppe` chain (`kolacheshoppe.com`); `Crawfish & Noodles`'s
  Wix `/hh-and-lunch-menu` subpage returns `"Application is no longer available"` and its `ORDER NOW` redirects to UberEats—keep regular items `sample` unpriced and
  exclude `tb-static.uber.com` images; `goodecompanybarbeque.com` sits behind a SiteGround JS challenge while its official Kirby ordering catalog lives on ToastTab
  (`order.toasttab.com/online/goode-company-barbeque-bbq1`); keep Mama Ninfa's fajita history balanced (popularized/introduced tacos al carbon broadly rather than
  claiming uncontested invention); and `GET /api/admin/restaurant-content` defaults to `limit=100` (max `limit=1000`, `400` above `1000`), so preflight/audit quote
  budgets must paginate `offset=0,1000,2000,...`. In Round 11 (2026-11-22, 6 Washington, D.C. iconic spots -> `Top 09` unchanged, `Iconic 06`, `.scrape/round11-tabs-2026-11-22/`):
  `Ben's Chili Bowl` (local `21143`/`2123`, prod `21311`/`2123` [pilot]; `19` sample unpriced, `2` items [`3` item photos], `3` reviews, `5` PinMedia), `Old Ebbitt Grill`
  (local `21144`/`2124`, prod `21313`/`2125`; `24/24` priced, `2` items [`3` item photos], `3` reviews, `5` PinMedia), `Martin's Tavern` (local `21145`/`2125`, prod `21314`/`2126`;
  `21` items [`17` priced], `3` item photos, `3` reviews, `4` PinMedia), `Filomena Ristorante` (local `21146`/`2126`, prod `21315`/`2127`; `19/19` priced, `2` item photos,
  `2` reviews, `5` PinMedia), `Le Diplomate` (local `21147`/`2127`, prod `21316`/`2128`; `20/20` priced, `3` item photos, `3` reviews, `5` PinMedia), and `Duke's Grocery`
  (local `21148`/`2128`, prod `21317`/`2129`; `18/18` priced, `5` items [`6` item photos], `3` reviews, `5` PinMedia). Round 11 traps: `filomena.com/dinner/*` HTML subpages
  expose current USD pricing when the main menu omits it; `dukesgrocery.com/menu` embeds the official Daily Menu Google Drive PDF (`1-1P-smMv05VuPNg0Ur5j9tx06S6sy4p-`);
  `6amcity.com` pages expose full editorial text inside `__NEXT_DATA__`; Wikimedia Commons downloads require a descriptive `User-Agent`; and transparent RGBA assets
  must be composited onto white `(255, 255, 255)` before staging RGB JPEGs.
  - **Honolulu (6 iconic dishes done locally + prod 2026-11-22 -> `Top 09`, `Iconic 06`, `Trucks 05`, `.scrape/round12-tabs-2026-11-22/`):**
    `Helena's Hawaiian Food` (local `21160`/`2134`, prod `21328`/`2134` [pilot]; `25/25` priced, `3` item photos, `3` reviews, `5` PinMedia),
    `Leonard's Bakery` (local `21161`/`2135`, prod `21345`/`2136`; `12/12` priced via Kapahulu ToastTab, `3` item photos, `3` reviews, `5` PinMedia),
    `Rainbow Drive-In` (local `21162`/`2136`, prod `21347`/`2137`; `18/18` priced, `4` item photos, `3` reviews, `5` PinMedia),
    `Ono Seafood` (local `21163`/`2137`, prod `21348`/`2138`; `10` sample items unpriced, `4` item photos, `3` reviews, `5` PinMedia),
    `Liliha Bakery (Original — Kuakini St.)` (local `21164`/`2138`, prod `21349`/`2139`; `19/19` priced, `4` item photos [`2` on Coco Puff], `3` reviews, `5` PinMedia),
    `Matsumoto Shave Ice` (local `21165`/`2139`, prod `21350`/`2140`; `14/14` priced, `3` item photos, `3` reviews, `5` PinMedia).
    Round 12 traps: `leonardshawaii.com` omits prices on its main site so use Kapahulu's ToastTab portal (`order.toasttab.com/online/leonardsbakery`);
    `lilihabakery.com` publishes a separate Original Liliha Kuakini PDF distinct from mall/Nimitz menus.
  - **Atlanta (6 iconic dishes done locally + prod 2026-11-22 -> `Top 09`, `Iconic 06`, `.scrape/round13-tabs-2026-11-22/`):**
    `The Varsity` (local `21195`/`2145`, prod `21369`/`2145` [pilot]; `35/35` priced, `3` item photos, `3` reviews, `5` PinMedia),
    `Mary Mac's Tea Room` (local `21196`/`2146`, prod `21371`/`2147`; `42/42` priced, `4` item photos, `3` reviews, `5` PinMedia),
    `The Busy Bee Cafe` (local `21197`/`2147`, prod `21372`/`2148`; `29/29` priced, `2` item photos, `3` reviews, `4` PinMedia),
    `The Silver Skillet` (local `21198`/`2148`, prod `21373`/`2149`; `31/31` priced, `4` item photos, `3` reviews, `3` PinMedia),
    `Fox Bros. Bar-B-Q` (local `21199`/`2149`, prod `21374`/`2150`; `35/35` priced, `5` item photos, `3` reviews, `3` PinMedia),
    `Home grown` (local `21200`/`2150`, prod `21375`/`2151`; `28/28` priced, `1` item photo, `3` reviews, `4` PinMedia).
    Round 13 traps: use `.agents/skills/admin-login-refresh/scripts/refresh_admin_login.sh` for automated token refresh (`.scrape/refresh-admin-token.sh` prompts interactively on stdin); exclude DoorDash `order.online` (`foxbros`) in favor of `foxbrosbbq.com/menus/dekalb-menu?location=fox-bros-bar-b-q-dekalb-ave`; strip WordPress `afternoontea-*` theme stock photos (`homegrownga.com`) and upside-down interiors (`varsity_wm_int.jpg`).
  - **Dallas (6 iconic dishes done locally + prod 2026-11-23 -> `Top 09`, `Iconic 06`, `.scrape/round14-tabs-2026-11-23/`):**
    `Pecan Lodge` (local `21212`/`2156`, prod `21397`/`2156` [pilot]; `23` items [`17` shop USD priced on `pecanlodge.com/shop/` + `6` unpriced dine-in PDF items], `3` item photos, `3` reviews, `5` PinMedia),
    `Sonny Bryan's Smokehouse (Original Inwood Rd)` (local `21213`/`2157`, prod `21399`/`2158`; `22/22` priced via May 2026 `Inwood-Printable-Menu.pdf`, `2` item photos, `3` reviews, `5` PinMedia),
    `Jimmy's Food Store` (local `21214`/`2158`, prod `21400`/`2159`; `21/21` priced, `5` item photos, `3` reviews, `5` PinMedia),
    `El Fenix (Downtown Original)` (local `21215`/`2159`, prod `21401`/`2160`; `25/25` priced via Toast-synced `elfenix.com`, `2` item photos, `3` reviews, `5` PinMedia),
    `Campisi's Restaurant (Mockingbird Ln "The Egyptian")` (local `21216`/`2160`, prod `21402`/`2161`; `22` items [`21` priced, Market crab claws unpriced], `3` item photos, `3` reviews, `5` PinMedia),
    `Mia's Tex-Mex` (local `21217`/`2161`, prod `21403`/`2162`; `20/20` priced, `1` item photo, `3` reviews, `3` PinMedia).
    Round 14 traps: pass `format=jpeg` on `popmenucloud.com` CDN image URLs (default `format=auto` returns AVIF/bytes that `PIL` rejects when downloading with browser `Accept`); omit `Cattleack Barbeque` (already in Dallas Top 3); distinguish branch relocation dates (`Campisi's` 1950 Mockingbird vs. 1946 Idle Hour, `El Fenix` 1965 1601 McKinney vs. 1918 founding, `Mia's` July 2020 4334 Lemmon vs. 1981 original).
  - San Jose (6 iconic dishes done locally + prod 2026-11-23, Round 17 -> `Top 09`, `Iconic 06`, `Trucks 05`):
    `Falafel's Drive-In` (local `21245`/`2189`, prod `21438`/`2190` [pilot]; `22/22` priced, `4` item photos, `3` reviews, `5` PinMedia),
    `La Victoria Taqueria (Original — E San Carlos St)` (local `21246`/`2190`, prod `21437`/`2189`; `20` items [`1` priced `$15.00` bottled sauce], `5` item photos, `3` reviews, `5` PinMedia),
    `Henry's World Famous Hi-Life` (local `21247`/`2191`, prod `21439`/`2191`; `22/0` unpriced online, `5` item photos, `3` reviews, `5` PinMedia),
    `Peters' Bakery` (local `21248`/`2192`, prod `21441`/`2193`; `21/21` priced, `3` item photos, `3` reviews, `5` PinMedia),
    `Greenlee's Bakery` (local `21249`/`2193`, prod `21442`/`2194`; `22/22` priced, `5` item photos, `3` reviews, `5` PinMedia),
    `Original Joe's San Jose` (local `21250`/`2194`, prod `21443`/`2195`; `24/24` priced, `6` item photos, `3` reviews, `5` PinMedia).
    Round 17 notes & traps: distinguish branch relocation dates (`Peters' Bakery` 1947 Alum Rock Ave vs. 1936 N 23rd St; `Henry's Hi-Life` c. 1963 St John St vs. 1960 Lincoln Ave); inspect contact sheets to catch masked crowds (`sj_peters_venue_4`) and ensure Popmenu dish photos match exact named menu items (`RIB STEAK 27OZ.` `$65.95` + `STEAK SANDWICH` `$35.95` on Original Joe's).
  Leave translations to the translation agent. Remaining cities not started.
- **Menu, price and photo pass (2026-11-20, local only; content 1977 Rubio's, 1978 Hodad's, 1979 Point Loma Seafoods):**
  - *Hodad's:* use the **branch's own site** (`hodadsoceanbeach.com/food-menu` and `/drink-menu`; the `hodadsburgers.com` landing page only links out).
    29 priced items + shakes/drinks, 11 operator menu photos. The page maps each photo to its item in the DOM: `img` inside the item block whose text has `$`
    (`javascript_tool`, `static.spotapps.co/spots/../full`). The site shows $17.00 (Favorites card) vs $17.50 (burger table) for the single bacon cheeseburger: use the
    table, say so in the item note. Tile photo = the single bacon cheeseburger.
  - *Point Loma Seafoods:* the menu is a PDF (`/wp-content/uploads/2026/04/PLSFWebMenu4.16.26.pdf`) that Chrome titles "1.PNG": `get_page_text` finds nothing. Open it in
    Chrome, `screenshot`, then `zoom` regions to read prices (26 items). Small print (soup sizes) is too small to assign to one soup: record it in the item note, leave
    `price` off. Sushi and sashimi are not transcribed. **When bare `curl` gets rejected (403/202 or missing Referer)** on a restaurant site, ordering platform, or CDN, scripts and `curl` calls should send standard browser headers (`User-Agent`, `Referer`, `Accept`, `Accept-Language`); when a site requires JavaScript execution or signed in-page state, read it and save assets in Chrome (`@browser` or local browser automation) — **always close every extra browser tab you opened when done**, leaving only the user's original tab open. Never attempt to solve or bypass an interactive CAPTCHA or anti-bot challenge gate—stop and report if gated by one. No verified photo yet (the IVN
    article photo shows a harbor building with no sign; not used).
  - *Rubio's:* `rubios.com/menu` renders empty; its **Download Menu** PDF (`/wp-content/uploads/2026/07/Rubios_Website_Menu_7.28.26.pdf`, plain curl works, `pdftotext -layout`)
    has no base prices (set per location in the ordering app), only Taco Tuesday prices ($2.50 original fish taco) and add-ons. Save the items with **no price** and
    `coverage: 'sample'`, with the Taco Tuesday figure in the note. Tile photo: Cool San Diego Sights' April 2026 shot of the original shop (credited, `imageSourceUrl` = the article).
  - *Traps:* (1) **zsh arrays are 1-based**: a bash-style `n=(x a b); ${n[$i]}` rename loop shifted every photo name by one and uploaded eleven mislabeled blobs;
    I deleted them (`az storage blob delete`) and re-uploaded. Build the rename list in Python and check each file's picture against its item (contact sheet) before
    `uploadDishPhotos.ts`. (2) Chrome cannot POST a file to a local server (`Failed to fetch`) and an 11 MB `fetch` in the PDF viewer freezes the renderer: screenshot instead.
    (3) `javascript_tool` output containing URLs with query strings is `[BLOCKED: Cookie/query string data]`: strip `?...` before returning.
  - Builder: `.scrape/iconic-dishes-2026-11-20/menus.py` (PUTs `profile.menu` with the record's current revision). Reviews not collected (no verbatim quotes checked yet).

## Navigation order
Both country and city menus sorted **west to east**: cities by city-centre longitude, countries by their
westernmost supported guide city. Preserve when adding guides.

## Cards and pins
Every card in every tab needs a backing `Pin`. Title and image link to the native `/pin/[id]/[slug]`, never an
external site. Seed or link Pin records for all venues and specials.

## Dates
`utcStartDateTime` is the **exact branch's opening date**, including established restaurants added for Top or
Specials. Never use a research/check date, menu publication date or promotion start. Research dates go in
content `checkedAt`; offer dates in Specials. If only year/month is supported mark the date estimated and explain.
Don't infer a branch date from the brand's founding or the host building. Queue missing opening evidence.
Pizzeria Bianco is a concrete trap: its operator dates the grocery-store origin to 1988, a strip-mall move to 1994, and the Heritage Square / 623 Adams Street move to 1997. The Heritage Square pin uses estimated 1997, with its placeholder month/day explained; do not restore the brand's 1988 year. Evidence: `.scrape/menu-research-all-2026-11-13/us/round21/bianco-date-correction.json`.

## Menus
Find and display real items, including happy hour and specials, on cards and pin details. Look past the first
link: branch pages, PDFs, menu images, ordering menus. Transcribe dishes/drinks with price, currency, conditions;
if unpriced show "Price not published". Never borrow another branch's menu or assume regular items join a special.
Show chain-shared and branch-local menus both, labelled. Link-only coverage only after a deep search fails,
documenting sources and the gap.

## Photos
Check official galleries, linked photo pages and restaurant sites. Store in Azure (see `pin-media-azure`), credit
photographer/operator, keep captions accurate, distinguish the venue's own photos from collaborations or other
branches, don't infer dish names from unlabelled photos.

### Cover image: the restaurant's own site first, always (owner instruction, 2026-11-20)
A card with the grey asterisk placeholder is a defect (Point Loma Seafoods, shown by the owner). Before any review, Yelp or press photo, **open the
restaurant's own website** (guide `websiteUrl`, the specials `pinSourceUrl`, a branch page or its ordering site) and take the cover from there;
only when the operator publishes no usable photo fall back to the order in the Photos section, and record why. Also fill `tile.image` for every
food truck, top, opening and specials card (`profile.photo` for specials venues); audit with the admin list endpoints for
`tile.image == null` / missing `profile.photo` after each batch, both local and production.
- Find the image: hero `<img>` / CSS background / slider on the home page, `og:image` (often a logo: reject it), the branch's location page
  (Yard House: `media.yardhouse.com/.../<city>-yard-house-599x430.jpg` storefront), the online-ordering site's slider (Mi Gusto Es:
  `themenustar6.com/upload/...` on its mobile-webview page). Pick one that shows the food or this branch, not a logo, a map or a banner.
- Browser headers & JS sites: when bare `curl` gets rejected (403/202 or hotlink/Referer check) on a restaurant site, ordering platform, or CDN, send standard browser headers (`User-Agent`, `Referer`, `Accept`, `Accept-Language`) from scripts or `curl`. When a site requires JavaScript execution or signed in-page state (like `pointlomaseafoods.com` or signed Imgix URLs), list URLs in Chrome (`@browser` / `javascript_tool`, remembering outputs with query strings may be blocked) and save through the page (`fetch` -> blob -> `<a download>` click; Chrome saves only the **first** automatic download per page load, so save one image per call/reload into `~/Downloads`, then copy it into `.scrape/`). Never attempt to solve or bypass an interactive CAPTCHA or anti-bot challenge gate. Sites that answer with browser headers (ordering platforms, media CDNs) can be downloaded directly with standard browser `User-Agent`/`Referer`/`Accept`/`Accept-Language` headers.
- Save: Azure upload (WebP, public-blob check), `tile.image` + `imageCredit: "Photo: <Restaurant>"` + `imageSourceUrl` = the site page, plus the same
  image on the backing pin (`Medium` + `PinMedium`); extra distinct operator photos go in `menu.photos` (generic alt, never dish names inferred).
  De-duplicate slider images (they repeat) and skip logos. Examples: Point Loma Seafoods (local content 1979, pin 20977), Mi Gusto Es (cover + 8
  gallery photos), Yard House Mission Valley (specials 1175), Shawarma Guys specials card (1551).
- Still without an operator photo: Zoe's Place (Instagram only, image URLs blocked); keep its Yelp/magazine photos and revisit.

## Dish photos
Owner instruction (November 8, 2026): aim for **at least one verified picture per menu item**.
Inspect the item’s official detail page beyond `<img>` tags: CSS `background-image`, inline styles,
lazy `data-*` attributes, responsive sources and embedded page data (`__NEXT_DATA__` / product JSON)
can hold the actual food photograph even when a plain text or image scan is empty. BJ’s
[Personal Deep-Dish Pizza & House Salad Combo](https://www.bjsrestaurants.com/menu-item/personal-deep-dish-pizza-house-salad-combo-2-2)
is an example: `product.image` and `product.altText` identify the Scene7 picture.
Use Yelp **and Google Images / Google Maps** to research remaining items; verify the selected photo’s
original source, caption, exact restaurant/branch, dish and portion before saving. A first gallery-page
scan or no exact alt-text match does not finish the search. Keep searching targeted dish galleries and
operator pages; record specific gaps only after these avenues have been checked.
An operator’s chain-wide photo of the exact menu item may illustrate a chain-shared menu when clearly
credited and captioned as a chain menu photo; do not present it as photographed at the saved branch.
For combo shots, name the pictured extras and explicitly say when they are not included in the saved
item’s offer. Keep verified branch-local photos distinct, and never substitute stock/other-branch photos.
For operator product sites, inspect the public sitemap for exact product-detail URLs before declaring a
missing image. BJ’s Dark Horse Cabernet Sauvignon and Chardonnay pages contain labelled product images even
when the main menu scrape omits them. Wine bottle photos may identify the offered wine with an explicit
caption that the happy-hour price is not for the whole bottle. Check the actual **Drink** gallery as well as
Food and targeted searches: BJ’s La Jolla’s 88-photo Drink gallery contained a named Brewhouse Margarita
missing from the initial Food pass. A search hit may come from review prose or an uploader name; visually
inspect it (a `Bud` hit showed draught beer, not a domestic bottle). For call drinks, verify the eligible
spirit/brand; a named signature cocktail alone does not establish call-drink eligibility.
Each item may carry `image: { src, caption, credit, sourceUrl }` (Azure
blob `src`; optional `width`/`height`), saved through the same restaurant-content / restaurant-specials APIs
(validated; all four fields are required). On the pin a photo shows as a thumbnail beside the dish; clicking it
opens the photo large with its caption and credit, and every restaurant pin with dish photos also gets a captioned
"Food photos" strip above the menu. Use verified official chain photos only under the explicit chain-menu exception above. Otherwise use a photo that really shows that dish at that restaurant (official
site, the venue's own social/press kit, Yelp/Tripadvisor/Google photos of that branch); never infer a dish from an
unlabelled photo or use another branch's or a stock image, and leave the item without one rather than guess. The
caption names the dish as the restaurant does. Upload with `npx tsx scripts/restaurants/uploadDishPhotos.ts restaurant-dishes/<slug> <files>` (WebP, public-blob check, also uploads the 240/640/1280 renditions the site serves it from, prints `src`/`width`/`height`); photos uploaded any other way need `npm run images:prepared -- --prod --prefix <folder>/<slug>` (see `pin-media-azure`). Yelp's branch photo gallery (`/biz_photos/<slug>?tab=food&start=N`, reader-captioned) is a usable source when the restaurant's own site has no dish photos; credit it as a Yelp reviewer photo and link the photo's `?select=` page. Record items left without a photo in the guide notes.

### Menu-photo playbook, in the order that worked (San Diego Iconic dishes, 2026-11-20)
Work down this list for every item without a photo; each step found photos the previous one missed (details and numbers under "Iconic dishes tab").
1. **Operator site, fully scrolled.** Scroll the whole page in steps before reading images (lazy `data-src`); a first scan found 12 of 27 Hodad's photos. Check the drinks page and the nested "favorites" duplicates. Map each photo to its item by the nearest ancestor containing the price.
2. **Sister sites of the same operator** (another location, catering) for items the branch page lacks; caption them as the other location's chain-wide photo.
3. **The operator's ordering site** (Olo `order.<chain>.com`, Pick Up, zip, Start Order, browse only). Prices are per branch and photos are named. Imgix URLs are signed: do not strip the query; lay the images out in the page and save full-scale screenshots, then crop.
4. **Yelp caption scan:** in-page `fetch` of every `?tab=food&start=N` page, regex the captions per item, download `bphoto/<id>/o.jpg`, then visit `?select=<id>` for contributor and date. Yelp's own captions can be wrong (a cup of shrimp titled as a sandwich): say what the photo shows.
5. **Blog photos with `<figcaption>` names** (download the full-size original, credit the blog), then **Google Maps contributor photos** only when the dish is visually unambiguous (Maps auto-titles are unreliable).
Every candidate goes on a contact sheet before upload; reject wrong protein, wrong portion, people in the foreground and photos that hide the dish. Credit "Photo: <name> via <source>" with the exact photo URL; caption variants honestly (plate for sandwich, "titled X by the contributor").
Tool traps: build file names in Python (zsh arrays are 1-based); browser tools cap output near 1.7 KB and block query strings (return `host + pathname`, 4 hits per query); spoof standard browser headers (`User-Agent`, `Referer`, `Accept`, `Accept-Language`) in `curl`/scripts whenever a site or CDN rejects bare `curl`, and use Chrome (`@browser` or local browser automation) when JS execution or signed in-page state is required (never attempt to bypass an interactive CAPTCHA or anti-bot challenge gate); `screenshot` with `save_to_disk` needs the default scale; check `PinMedium.weight` is 0 to 1.
After saving, apply the same edit to production by current revision, then read back equality, item/photo counts and every image URL.

### City-wide expanded photo research (owner instruction, November 8, 2026)

Apply the expanded strategy to **every saved San Diego menu item**, including ordinary menus and all
specials, rather than stopping after a restaurant gets its first picture. Maintain a resumable inventory
by exact branch source, menu label and item; count effective menus separately from duplicate stored rows.
For each uncovered item:

1. Inspect the branch’s official menu, ordering page, galleries and item-detail pages. Follow public
   sitemaps and linked product pages. Read CSS backgrounds, lazy attributes, responsive images and
   embedded product/menu JSON, not only `<img alt>` matches. Match names, variants and portions.
2. Search the verified branch’s Yelp **All, Food and Drink** categories and dish-specific searches,
   including later pages. Verify address/branch. A result may match review prose or uploader names;
   its caption and visual content still need inspection.
3. Search Google Images and Maps using restaurant + exact branch/address + dish, then shorter aliases
   and eligible named variants. Follow results to their original source and retain direct provenance.
4. Download and visually inspect each candidate. Clearly caption chain operator photos, historical
   images, bottle-versus-pour illustrations, and pictured combo extras. Reject unresolved identity,
   eligibility or portion mismatches. Never copy a reviewer’s branch photo to another branch.
5. Save verified photos in Azure and through the management APIs in local and production, preserving
   existing media, reviews, item fields, enabled state and specials `regionSlug`. Match local records
   by source; verify complete readbacks and native-pin/landing rendering.

Technical follow-ups from expanded menu research:
- Holbox’s retired `/menu.html` returns 404. Its homepage declares a public daily JSON feed in the menu container’s `data-src` (`/menu-builder/public/menu.json?restaurant=holbox`) and a separately dated `/menu-snapshot.json` fallback. Read the live feed’s own date and exact item descriptions; do not mistake the older fallback for today’s menu or relabel a saved selected historical menu as complete. Verified November 20, 2026 (`nov20-round93/` in the all-cities ledger).
- Inspect an operator gallery's **Load more** data before treating its first page as complete. Quatrefoil's
  embedded Instagram feed exposes labelled posts through the public `sbi_load_more_clicked` request;
  its observed frontend script supplies the feed ID, offset, page, shortcode attributes, post ID and locator
  nonce. Later pages supplied exact halibut, shrimp, blueberry tart and pavlova photographs absent from
  the first twenty posts. Retain each original post URL, caption and published date; reject earlier seasonal
  preparations with different sauces or sides. Casa Lucio's empty gallery similarly loads a public
  `vc_get_vc_grid_data` grid, but that grid contains celebrity/press photographs and does not establish
  named dish photos. Read the request shape from the site's own frontend; do not execute downloaded scripts.
- A platform's exact numeric branch ID does not override contradictory review text. In the November 13
  follow-up, Guiyuan's listing names Chengdu Road 62 while some attached reviews name 101–103, also
  independently listed as a banquet venue. Hold those excerpts for per-review street-address disambiguation.
  Mianchao's Dingcun listing also contains reviews naming Locomotive Market/Tongguling or Bawangling No. 6;
  reject those for the saved Dingcun Haitangwan No. 2 branch.
- BentoBox can put the named `<img alt>` inside an `.image-thumbnail` whose parent `style` carries the
  background URL. Pair those elements; a source-less hidden image does not mean there is no photo.
- Normalize decorative `*`, trailing `photo`, Unicode punctuation and whitespace when discovering
  candidates. Alias matches remain review leads; keep flavor, serving count and portion words significant.
- Operator-published pictures of the exact named packaged beverage can identify it when captioned as
  **product/bottle illustrations**. For a glass/pour entry, explicitly say the pictured bottle does not
  define the saved serving size or include the whole bottle. Do not treat generic rice/tea stock images,
  beer logos or a conflicting vintage/variant as a matching restaurant photograph.
- When an ordering menu returns 403 over HTTP, open its exact branch in the browser. Dismiss scheduling
  prompts to browse without placing an order. A labelled product image’s context menu can open the image
  in a new tab, exposing its source URL for download and review. Islands Mira Mesa’s ordering menu worked
  this way after direct requests failed. Record browser access separately from HTTP failures.
- Empty image alt text is common on SpotHopper menus. Read the nearest complete `.food-item-holder`
  with its exact heading, image and description together. Never broaden a source-less item to the whole
  section’s first image: it can associate a salad with pasta, beer with sangria, or several dishes with one
  unrelated photograph. Broad context matches are candidates only and need visual/variant rejection.
- An exposed WordPress media library can supply exact named pictures, but library names and nearby
  captions are not branch/serving proof. Inspect original title/alt/caption plus the actual photo and
  source page; preserve photo dates and reject generic filenames, logos, menus and unrelated branches.
- A local ordinary-menu profile may be absent even when production has it. Check exact source and
  create the missing local copy through `restaurant-content`, preserve the complete production profile,
  read it back, and resume the idempotent photo save. Never assume local numeric IDs match production.
- Do not split responsive source URLs blindly on every comma: image CDNs can use commas inside the URL.
  Prefer an observed original URL or parse source candidates without truncating transformation paths.
- A correctly named official card can still contain the wrong photograph. Check the food itself and
  exclude dietary/spice icons (`food_item_labels`), added proteins, sandwiches in place of plated dinners,
  and incompatible toppings. Wheat & Water's Alfredo card exposed a chili icon rather than a dish photo.
- Wix's `wix-viewer-model` may contain `codeEmbed.htmlEmbeds` with whole HTML menus and named
  image cards even when the outer document has only logos. Inspect those embedded strings as data;
  do not execute downloaded scripts. The model can contain snippets for **every branch/page**, so
  confirm the snippet's branch and actual menu offering before saving. Telefèric La Jolla also exposes
  operator `PHOTO` maps for shared menu dishes: use the explicit chain-photo caption and verify the
  exact dish on La Jolla's menu. Read card descriptions before rejecting unusual presentations: its
  crab croquetas are topped with tuna sashimi, so the red wrapping is consistent with the named dish.
- When search results miss a local review, try the publisher's own search and follow its article links.
  Verify the address and publication date before using historical photos or excerpts. Harumama Little
  Italy's February 6, 2018 Kirbie's Cravings review labels the pig/chicken bun fillings and Fat Duck ramen;
  its old prices and soft-opening promotion do not establish today's offer. A retired operator photo-menu
  URL may now render an Archives page even while search results retain the old menu: inspect the live body.
- If an operator's saved branch URL returns 404, follow the live site's location/menu navigation before
  declaring its photos unavailable. Sammy's old `Location-Details/client/...` pages now link through the
  navigation to `/sammys-chula-vista-menu/`, `/imperial-beach-menu/` and `/san-marcos-menu/`, whose
  `.sammys-mg-card` elements pair exact dish names, descriptions and images. Keep the saved profile's
  identity source intact while recording the new photo source. Verify branch and variant independently;
  a Carne Asada card using a `Carnitas-Tacos` file remains ambiguous.

Keep per-item source URLs, search terms, candidates/rejections and the **next unperformed research step**.
A bulk scan or empty caption match is only a candidate-discovery step. Distinguish pending manual
research from an avenue actually checked; do not call the whole city complete or a gap exhausted until
all applicable avenues have been worked. Reuse official chain photography only after verifying the
same named item is offered by each saved branch, with chain-photo attribution and accurate offer captions.
This instruction broadens photo research; it does not authorize invented reviews, prices or availability.

### Bulk Yelp matcher (San Diego run, 2026-10-30)
Yelp returns 403 to plain HTTP, so run it inside a Chrome tab on yelp.com (`javascript_tool`; calls over 45 s time out, so
start the loop un-awaited and poll `window.PROG`). Per venue: `/search?find_desc=<name>&find_loc=<region>` -> first `/biz/<slug>`
whose slug holds >=70% of the venue-name tokens (else skip: chains with a location suffix and renamed venues fail here);
fetch `/biz_photos/<slug>?tab=food&start=0..240` in parallel and read each photo's alt text; an item matches only when every
significant token of its name is in the caption's first segment; drop a photo claimed by two items. Local-network posts from the
page hang, so show the result in the DOM, read it with `get_page_text` or save it with an `<a download>` click, then download
`https://s3-media0.fl.yelpcdn.com/bphoto/<id>/o.jpg`, upload with `uploadDishPhotos.ts auto` (one folder per venue slug) and PUT
each venue. San Diego: 276 venues -> 142 with photos, 731 dish photos; 48 venues had no Yelp match. A 12-photo visual spot check
found ~10 right, 1 wrong (photo showed a different dish) and 1 ambiguous, so expect ~10% errors; remove an image by PUT without it.
Scripts live in `scripts/restaurants/yelpDishes/` (`matcher.browser.js` pasted into the Yelp tab, `download.py`, `apply.py`, then
`uploadDishPhotos.ts auto` per slug in between); their headers give the exact usage. Review captions before applying.

Retrying unmatched venues (2026-10-30): Yelp's own search misses names with a location suffix, so find the page with Google
(`fetch('/search?q=yelp <name> <city>')` from a google.com tab, regex `yelp.com/biz/<slug>`) or take the second search hit for a
chain. Yelp answers 403 (bot check) after a fast burst; the user clears it in the tab, then pace requests ~5 s apart (one venue ~1 min).
Drop matches whose caption names a different dish or leaves the subject ambiguous (check the caption, not just the tokens). Clearly identified multi-dish photos require the explicit portion/extra disclosures above. The admin token in
`.scrape/admin.token` expires after ~2 h: re-sign in with `ADMIN_PASSWORD` from `.env.local` (email in `feedback_admin_email_in_scripts`).
Never shorten a Yelp slug when listing candidates (a trimmed `-san-diego` gave 'page not found' and looked like 'no photos'); if a slug
returns 0 photos try inserting or appending `-san-diego`. The loose pass (caption words a subset of the item, or two-thirds of its
words) finds ~3x more photos but needs a by-eye review: drop different dishes and ambiguous combinations; use clearly identified combo photos only with the disclosures above.
The old alt-text pass found few operator/Instagram matches; that is not a reason to stop. Inspect rendered backgrounds and embedded product data, then verify individual post captions.

Round 26 shortcut (November 15): with the Chrome extension, `javascript_tool` `fetch('/biz_photos/<slug>?tab=food&start=N')` from a yelp.com tab works un-awaited per venue (parse `img` alt text with `DOMParser`; the `?q=` search parameter is ignored by fetched HTML), slugs come from `fetch('/search?find_desc=..&find_loc=..')`. Return one venue per call (tool output truncates). Curl of `bphoto/<id>/o.jpg` works with a browser User-Agent. Check `/api/admin/db/Pin?sourceUrl=` before planning a native-page check: some specials venues have no backing pin.

Native Chrome fallback (November 15 USA round): if CUA tab creation fails, use the documented native Chrome app interface and normal search/gallery controls. Verify the street address before opening photos; Yelp's first Pizzeria Bianco result was Biltmore, while the saved branch is Heritage Square at 623 E Adams Street. A named gallery photo's `?select=ID` URL supplies the original `https://s3-media0.fl.yelpcdn.com/bphoto/ID/o.jpg` download; retain its caption, contributor and date and visually inspect the file. `select_video` identifies a video, not a still. Keep added-topping variants separate. Do not disable Chrome's console-pasting security warning to run the old bulk helper; normal gallery browsing and operator pages remain alternatives. Record partial batches honestly: USA round 21 saved photos at two venues but did not finish Yelp batch index 3.

### Reviewed saves and ordinary menus (October 30 follow-up)

Use `scripts/restaurants/yelpDishes/applyReviewed.py` for new batches: its header describes the reviewed JSON
manifest and upload JSONL. It supports both `kind: "specials"` and `kind: "content"`, matches the exact branch
source, menu label and item name, preserves existing photos, checks the public Azure URL, uses the latest
revision and compares full profile readbacks. Run dry first, then `--apply`; keep manifests, source captions,
before snapshots and readbacks in `.scrape/`. A caption match alone is insufficient: visually inspect every
candidate before marking it reviewed. Reject wrong portions/variants, table-wide ambiguous shots and retail
products presented as plated dishes.

`restaurant-content` already calls `parseSpecialVenue` for `profile.menu`, so it validates and retains item
images. **Specials menus override ordinary menus with the same label.** Check for that second record before
concluding a content save failed to render; attach the same verified image to its matching item there as well.
Never copy images between branches. Verify on the native pin after hydration, including the Food photos strip,
item thumbnail, enlarged picture and source credit.

To map a venue to a backing pin, read `/api/admin/db/Pin?sourceUrl=<encoded exact source>`; if empty, search
`title.ilike` and check branch identity. Some saved specials profiles have no backing pin at all (Café Sevilla,
Islands Mira Mesa and Yard House Mission Valley in the October 30 follow-up). A saved photo does not establish
that it is visible on a pin or guide card. Record missing pins and opening-date evidence gaps explicitly.

Yelp photo search can find named dishes beyond the first gallery pages. Lionfish **does** have labelled
Bang Bang Shrimp photos: the old matcher split the alt on `" - "` and took segment 1, which was `San Diego`
inside the business name. `matcher.browser.js` now removes the full business name from the gallery's h1
before extracting the caption, and stops when the gallery heading is missing. Do not classify a venue as
having no named photos based on the old parser's empty results. Del Lusso's saved branch is indeed Carlsbad,
6021 Innovation Way Suite 120; its Carlsbad Yelp gallery is appropriate.

### Wider San Diego pass (October 31)

Review all uncovered profiles before widening again. Empty menus and generic entries such as "selected
appetizers" are menu-evidence gaps, not permission to invent dish names. Record the exact unphotographed
items, checked branch/gallery URLs, targeted searches and rejected candidates in the research report.

- Search within a verified gallery for the dish, not only its first page. In the October 31 pass, 45 targeted
  searches recovered many photos absent from the first gallery page (including all five BJ's guacamole dishes).
- Yelp can interpret branch suffixes as another city even with `find_loc` set: "Crown Point" produced Indiana
  results, and "Mission Hills" produced Los Angeles results. Use the brand in Find and its exact street address
  in Near, or follow the operator's branch-specific Yelp link. Chef JUN's official Bay Ho booking link resolves
  the correct branch, distinct from Point Loma. Verify the displayed street address before using its photos.
- A loading skeleton or an empty extraction is not evidence that there are no photos. Wait for the address and
  actual photo records. Check whether Food versus Drink is the appropriate gallery category.
- `matcher.browser.js` normalizes whitespace in the complete business-name prefix (Yelp uses `IL  Posto` in
  some image alts), and keeps "house" significant so a shrimp-and-crab salad cannot satisfy "House salad".
  Regression fixtures live in `matcher.test.ts`. Matches remain candidates requiring visual review.
- Reject signage, uncertain captions, unlabelled variants and explicit portion mismatches. A labelled Eureka
  result was a sidewalk sign; Oggi's showed three fish pieces for a two-piece item, and The Search Bar showed
  two tacos for a three-taco item. Check the photograph, not just its caption. State multiple pictured units in
  the caption when a menu item has no explicit unit count; never imply a photographed group is one priced unit.
- When the individual uploader is not established, use an accurate source credit such as "Photo via Yelp"
  with the direct selected-photo URL; do not invent photographer names or claim an operator upload is a review.
- Re-sign in if the admin token expires. After network failures, rerun the idempotent reviewed save and verify
  readbacks; an Azure preflight failure may happen before any pending record is written.

The pass reviewed 91 previously uncovered profiles and saved 53 photographs on 44 of them. Storage coverage
became 233/280 profiles; 47 specific gaps remain in `docs/restaurant-dish-photos-2026-10-31.json`. Only 22 of
the 44 updated profiles resolved a native pin by exact source URL. Report stored-profile coverage separately
from verified public-page coverage, and check aliases/titles before declaring a backing pin absent.

### Association and gallery follow-up (October 31)

- Check the gallery’s actual category tabs. Harland Bay Park and Karl Strauss Sorrento Mesa expose All and Videos, without a Food tab; their All galleries contain named beer photos. Sidecar’s Drink tab also contains labelled drafts. An unsupported Food filter produced misleading empty extractions.
- A labelled photograph can illustrate an unrestricted beer category (all drafts/pints/Karl beers) when the photograph clearly shows that category. Preserve the specific photographed beer in the caption; do not assert current rotating availability or use this approach for unspecified **select** appetizers/drinks.
- Count specials-profile images separately from ordinary-menu images, then join enabled ordinary content by normalized source when reporting distinct venues. Sycamore’s 17-item ordinary menu and Wolf Ticket photo resolve its venue gap without adding dishes to an unspecified select-drink discount.
- After exact-source checks, check title, source host, street address and numeric source identity where relevant. The 22 pending checks found no matching branch pins. Tajima Crown Point was then created as pin 20680 using the January 22, 2025 YS Food announcement’s explicit January 12, 2025 opening at 3782 Ingraham Street. Remaining 21 need specific opening/status evidence; do not substitute other Tajima/BJ’s branches or similarly named non-restaurants.
- Read back coordinates on a newly created pin. If the profile lacks `location`, `repairSpecialPins.ts` can omit them. Use the actual place coordinates from the map linked by the operator, preserve authors/dates, and expire the pin after an audited update. Keep the specials profile’s `location` synchronized too; its validator also requires `sourceUrl` and `checkedAt`, and guide-map bounds use that profile location.

Current follow-up evidence: `docs/restaurant-dish-photos-followup-2026-10-31.json`; 236/280 specials profiles with photos, 237/280 venues including ordinary menus, 43 remaining photo gaps. Storage counts still do not imply public native-pin coverage.

## Saving
Landing tile photo galleries use the branch's native pin image media, the venue `photo`, optional
`photos: RestaurantPhoto[]`, and verified menu-item photos. Add interior/exterior/patio shots to `photos`
on the same `/api/admin/restaurant-specials` profile (or `profile.menu.photos` on restaurant-content),
retaining the cover `photo`. Each gallery entry needs an Azure `src`, accurate `alt`, `credit`,
`sourceUrl`, `originalUrl`, and `checkedAt`; review every image and verify its public blob first.
Do not add dish names or availability claims based only on a venue gallery. The shared tile carousel
deduplicates photo URLs, shows up to ten photos, and preserves native pin links and per-photo credits.
New gallery UI code needs deployment before production can display the extra photos.
The carousel now lives in `components/pin/LandingMediaGallery.tsx`; restaurant tiles use a thin
`RestaurantPhotoGallery` alias. Products/cars, travel, activities, music, topic/company tiles,
picture grids and featured panels share its mouse/finger gestures and pin-style arrows beside dots.
Keep numeric counters removed. Native images retain their credits and videos load a player only
after a click; changing slides unmounts the active player.

Ongoing menu, visit-detail and landing-page tile edits go through the database management APIs. Use `/api/admin/restaurant-content` (content) and `/api/admin/restaurant-specials` (offers and menus). Bundled
JSON catalogs are snapshots; content updates don't need a deployment. Preserve source evidence and credits, then
verify the pin and landing page. Dining rubric/reviews: see `pin-enrichment-rubrics`.

### All-cities photo and review runs (November 12-13, 2026)

Owner priority (November 15, 2026): work **USA-based restaurants first** for menu photos and exact-dish reviews. Resume the US ledgers and Yelp queue before non-US queues; retain the latter for later continuation. Current US photo continuation: `.scrape/menu-research-all-2026-11-13/yelp-us/batches.json`, index 3 onward. US review research uses the per-item US ledgers and original sources; the priority does not relax exact branch/item, photo inspection, quote-budget, readback or production-audit requirements. Check `ToDo.md` for the latest checkpoint and queue position.

Inventory and results: `docs/restaurant-menu-inventory-2026-11-12.md`. Workflow that worked for Tokyo,
Sapporo, Nagoya, Osaka and Fukuoka (largest gaps first, one agent per group of venues, local save then push):

1. **Rank the gaps.** Count enabled items per region (content and specials, once per record and label); write the
   per-venue gap list to `.scrape/menu-photo-gaps-<region>.json`. `syncPhotosToProd.py` reads that file.
   Report stored rows separately from effective menus: group by `restaurantSourceKey`, let enabled specials
   override ordinary menus with the same label, then count item names once per label. Exact photo mirrors
   improve storage consistency but do not add effective photographed dishes when specials already win.
2. **Mirror first.** Copy verified specials photos onto the ordinary record (and the reverse) by exact menu
   label + item name; then look for new sources. HotPepper Gourmet food pages, owst booking-site menus,
   operator menu data (CSV/JSON), and Tabelog "by Restaurant" photos pair a name with a photo; use the
   480px versions. Hotel and fine-dining course pages give one group shot per course (reject).
3. **Local save:** `applyReviewed.py --local` (dry run, then `--apply`); `--base` still overrides. It refuses
   same-name duplicates; handle those deliberately. Upload goes to the production Azure container by design.
4. **Remove a bad photo:** `removePhotos.py <content|specials> <id> rules.json [--prod] [--apply]`
   (rules by item name, label or caption text; before/after kept in `.scrape/photo-removals/`).
5. **Push ready data after every round.** Owner instruction (November 15, 2026): all-cities menu photo/review
   rounds have standing authorization to sync verified, ready data to production without asking again.
   This covers data synchronization, not code deployment or translation runs. `syncPhotosToProd.py <region> [--apply]` matches each venue
   by exact `pinSourceUrl`, copies images only onto production items without one, requires public Chronopin
   Azure blobs, uses the latest revision and verifies readbacks (evidence in `.scrape/photo-sync/`).
   `syncReviewsToProd.py <region> [--apply]` does the same for item reviews (never replaces or duplicates a
   review with the same `sourceUrl`). Push one venue first (`--only`), check the live pin, then the rest.
6. Menu payload caps are 1,000,000 characters (`restaurantSpecialValidation.ts`, `restaurantContentValidation.ts`);
   BAR Shinkai's 1,392-photo menu needed that. Its pin renders ~2,000 lazy images in about 3.6 s.

For an owner-requested all-inventory production sync, snapshot both environments and plan by exact
branch source, record kind, menu label and item name. Preserve production-only fields and reviews.
Additive scripts do not carry corrected captions/photos or excerpt edits/deletions: apply those only
when production still matches the audited earlier value, then retain complete before/after readbacks.
Duplicate-name rows require matching counts and identical identifying non-media fields. When those fields differ, an original exact-branch food ID and its published price can disambiguate each row if source, menu label, name and price form a unique match. Re-fetch the original records, visually review each photo, preserve all prices/fields and save explicit per-row before/readbacks; never copy one photo to every same-name row. WEI JIA’s CNY 11/5 Liangpi records were resolved this way on November 14 (`.scrape/menu-research-all-2026-11-13/nov14/weijia/`). Preflight every
new public Azure URL, save one venue and check its native page, then resume the bulk saves. Audit the
entire production after-state for non-media changes, effective coverage and aggregate quote budgets;
snapshot-only or candidate counts are not a completed sync. November 13 evidence and resumable helper:
`.scrape/menu-inventory-prod-sync-2026-11-13/`.

Native-page checks must compare the **visible merged menu**, applying enabled specials precedence by normalized branch source and menu label. Ordinary-menu photos can be correctly saved yet hidden by an existing specials photo; verify those stored additions through full API readbacks. For a pilot, insert the saved pilot readback into the snapshot used to compute visible menus before checking the public page, so the check actually covers the new data rather than only the pre-save state. November 14 continuation example: `.scrape/menu-inventory-prod-sync-2026-11-14e/native-checks.py`.

Serialized Next.js page data can escape `&`, `<` and `>` as `\u0026`, `\u003c` and `\u003e`, with additional backslashes inside nested serialized strings. Decode those escapes when comparing exact saved excerpts with page data; an escaped ampersand is not a missing review. November 15 example: `.scrape/menu-inventory-prod-sync-2026-11-15q/native-checks.py`. This verifies server-rendered/serialized content; hydrated viewer interactions still need a browser check.

Traps seen: specials profiles keep items under `profile.menus`, content under `profile.menu.menus`; local and
production IDs differ (match by source); list endpoints default to 100 records (pass `limit=1000`); identical
images on different items (grades, cuts, cocktails) are rejected; Tabelog returns 403 under bursts; Gurunavi was
down for maintenance on 2026-11-12; `curl -k` is denied, use `--cacert` or read the page in Chrome;
a repeated "image only" or promo photo does not identify an item. Weak matches that were kept must say so in
the caption. Reviews for chain izakaya in Japan are essentially unavailable; the review pass worked for
English-language US cities (Dallas, Houston, Austin, San Jose) via The Infatuation, Michelin, local papers.

## Menu-item reviews
Research follow-up (November 8): ordinary-content `?region=` filters tile regions and omits menu-only profiles.
For coverage/replay, paginate all ordinary profiles, join the city’s exact branch sources, and keep enabled-only
semantics. Local IDs can differ; match sources before saving. Always round-trip top-level `regionSlug` for
specials, including gallery-only saves. Original named Wix menu images can be found in the page’s embedded
menu JSON; visually inspect them and reject logos, stock/product illustrations and explicit portion mismatches.
Full audit and remaining-item inventory: `docs/restaurant-menu-coverage-2026-11-08.md` and `.json`.

Landing cards retain every saved menu and item, with menu/category selection and an expandable six-item preview.
Do not truncate menus in `restaurantGuideDetails`: later dishes carry photos and reviews too. Merge enabled
ordinary/specials menus using native-pin label precedence; deleted ordinary menus must not return from
bundled snapshots. The landing dish viewer navigates all items in the selected menu, including unphotographed dishes.

Menu rows on landing tiles and native pin menus share `MenuItemReviews`: a star icon opens
sourced external excerpts and reader ratings/comments for that exact dish on that backing pin.
`RestaurantMenuItem.reviews` entries require `provider`, exact article `title`, HTTPS `sourceUrl`,
a short verbatim `quote` (maximum 300 characters), nullable `publishedDate`, and `checkedAt`.
Open the review, verify the exact branch and dish, and retain criticism as well as praise.
Never turn a venue-wide score into a dish score. Respect excerpt limits across all dishes citing
one article; dates shown on sources take precedence over date-like URL paths.
Save via restaurant-content / restaurant-specials, including duplicate menu records that override
ordinary menus; preserve prices, photos, menu check dates and unrelated reviews, and verify readbacks.
Each menu item accepts at most six external reviews. Preflight the combined existing and proposed review count before saving; preserve existing reviews and hold redundant new praise when capacity is reached, retaining substantive criticism and more specific assessments. Do not raise the cap to fit a research batch.
Replay the reviewed San Diego batch with `npx tsx scripts/restaurants/menuItemReviews.ts local|prod`
(dry run), then `--apply`, after refreshing admin logins. Evidence lives in
`scripts/restaurants/menuItemReviews.json`; keep bundled catalogs synchronized.
Reader reviews use `/api/pins/:id/reviews?item=<exact trimmed item name>` and migration 0247.
The empty item key is the whole-pin review; exclude dish ratings from restaurant summaries.
The dialog loads reader reviews only when opened, uses native focus containment, and installs
an Escape handler on window capture because the navbar's document capture handler otherwise
consumes native Escape dismissal (including when the navbar hydrates after the dialog opens).
Owner instruction (2026-11-07): infer menu-item scores from external review prose. Editorial
estimates in `src/lib/restaurantReviewRatings.ts` assess saved excerpts on a 1–5 scale. Add
estimates only for clear dish-specific praise or criticism; descriptive excerpts remain unscored.
Display inferred averages as `4.5/5` without an approximation symbol; source cards show a compact gold star badge at the top right
with the inference explained in its tooltip and accessible label, rather than a paragraph below the quote,
and never attribute the estimate to the source. Reader averages take precedence and remain separate.
Use a half-filled star for inferred ratings on menu badges and source cards; reader ratings
use a solid star. The fill distinguishes rating provenance, not its numeric value. Unscored excerpts show an outline
without visible text. Never use the review count or a restaurant-wide rating as a dish score.
Landing tiles and native pin menus hide the star when empty (and while counts are unknown);
clicking the menu text still lets readers add the first review. Tooltips/accessibility labels explain the state. Reader averages and counts
are batched across restaurants via `/api/pins/review-summaries?items=1&ids=...`, shared by all menu
rows, and updated when the review form loads after a save/delete. Full comments load on open.
Menu item text (a keyboard-accessible button), thumbnails, review stars, and the pin's Food photos strip use that same `MenuItemReviews`
viewer. Show the selected dish's image at the top of the popup, above its external and reader reviews, with its caption,
credit and source link. Previous/next switches both the photo and the reviews together; do not
reintroduce a separate photo-only lightbox for these menu images.

A dish can keep its cover in `image` and add up to ten credited photos in `images`. The popup
uses the pin's `PinMediaFrame` for touch swipes, mouse drags, trackpad, dots and hover arrows.
Photo swipes stay within that dish; the separate previous/next dish controls change reviews too.
`restaurantDishImages` joins and deduplicates cover/gallery URLs. Validate every gallery entry's
caption, credit and source URL; append verified Azure photos through the same content APIs.
Historical photos must say so in their captions; never copy their old promotional prices into
current menus. Provenance for the Por Favor batch is in `scripts/restaurants/menuItemPhotos.json`.

Readers may attach up to five photos (15 MB each) when posting/editing a dish review. The
review form previews files and can remove pending/existing attachments before saving. Multipart
`PUT /api/pins/:id/reviews?item=...` accepts repeated `photos` files, `stars`, `comment`, and JSON
`removePhotoIds`. Existing JSON-only rating saves remain supported. Migration 0248 adds
`PinPhoto.reviewId`; save the review and photo records in one DB transaction, using the existing
Azure reader-photo conversion and verified-email/daily-upload limits. Failed saves clean up new
blobs. Return visible attachments with their review (flag-hidden photos are owner-only). Review
delete soft-deletes its attachments too. Reader photos remain distinct from sourced dish photos.

Replay caution (November 14): `menuItemReviews.lane0.ts` now delegates to the main catalog. Its old JSON is historical evidence, not an apply input. Two reviewers can share a Yelp URL; URL-only replacement retains only the last reviewer. Do not restore a lost excerpt without rechecking its original review, reviewer identity and aggregate source quote budget. The main catalog contains the retained audited excerpts and converges locally.
Replay caution (November 20): a food-truck menu replay restored Shawarma Guys’ 45-word source aggregate after the live excerpts had been shortened. Repair the reusable input (`.scrape/food-trucks-2026-11-20/menus.json`) as well as the live profile; its three Reader excerpts now total 21 words. Keep old audit snapshots as evidence, and run the source-wide quote audit after menu/price replays, not only review additions. Evidence: `nov20-round95/` in the all-cities ledger.


For public Trip review records, empty `translateContent` does not mean unusable when `content` is already English. Verify the original language and use an accurate original-English provider label, retaining the raw original and empty publisher-translation field in provenance. Do not hand-translate missing foreign-language text or call original English a publisher translation.

Trip named-food records remain candidates even when the numeric branch and food IDs match. The November 15
continuation rejected 29 of 34 uncovered candidates after visual inspection (wrong dishes, preparation,
packaging, portions or beverage brands). Never let generated descriptions override the photograph. Fetch
fresh food records before saving. Different locale responses may use different CDN hosts for the same
image; compare downloaded bytes before treating that as a changed photograph, and inspect again if bytes
differ. Source-language `restaurantInfo` addresses can resolve garbled English addresses; retain both
responses and compare the street/building/floor to the saved branch. Review text mentioning a different
location still takes precedence over an exact listing ID. Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews{13,14}/`.

Normalize traditional/simplified Chinese when discovering review candidates, and retain two- and
three-character Chinese dish aliases. The earlier four-character cutoff missed genuine assessments:
the November 15 third round found 39 candidates instead of five in the same 40-branch pages after
normalization. Keep the original source text and publisher translation unchanged; normalization is
only for discovery, never permission to attach a substring match. Screen ingredients, filled/plain
variants, other shops named in a review, and tea culture versus a specific drink. If a generated
English item name conflicts with the original preparation (cashew sauce-fried chicken versus Kung
Pao, for example), hold it for menu identity repair instead of strengthening the review claim.
The local discovery helper uses OpenCC under ignored `.scrape/menu-research-all-2026-11-13/python-deps/`;
this is research tooling, not a product dependency. Evidence: `china/deep-reviews17/` under that queue.

Resume normalized review passes by exact branch source, not numeric slices of a ranking recomputed after each save. Saving reviews changes gap counts and moves branches between ranks. At the end of a ranked pass, compare every eligible branch source with the union of normalized-pass `venues.json` files and queue the missing sources explicitly. The November 15 eighteenth round found 76 missed branches this way; the nineteenth round completed that exact queue (`china/deep-reviews37/`), bringing the 20+ group to 469/469 normalized discovery scans. Its high-review queue is now empty. The twentieth round completed the 5–19 group at 141/141 (`china/deep-reviews38/`); its mid-review queue is now empty. Next: the 85 exact sources in `.scrape/menu-research-all-2026-11-13/china/normalized-low-review-remaining.json` (1–4 group, using inventory-snapshot review counts). Remove queued sources only after their normalized scan and decisions are recorded. An initial unnormalized scan does not satisfy this recheck; first-three-page discovery does not exhaust a venue or its independent-source research.

For normalized rechecks of earlier cached review pages, re-fetch the selected reviews before production
sync and verify each exact review ID and excerpt against fresh original/publisher text. Preserve both
the discovery cache and fresh responses. The November 15 fifth round verified all 26 selected
associations this way (`china/deep-reviews19/verify-fresh-reviews.py` and
`fresh-review-verification.json` under the queue); cached discovery alone is not the final source check.

Fresh review ordering can change: a selected account missing from pages 1–3 was found on page 4 in
the sixth round. Paginate to locate the exact ID before holding it, and retain per-branch results
so one missing review does not cancel checks of other branches. Also screen English short aliases
as whole words: stripping word boundaries matched `eel` inside `feeling`. These remain discovery
false positives, never grounds for a review save (`china/deep-reviews21/`).

When a review names an abbreviated dish, manually recover an alias only after the original text
and saved menu establish one exact preparation. The seventh November 15 round recovered criticism
of beef soup dumplings and deboned-fish congee missed by full-name discovery; retain negative
assessments alongside praise. A named aquarium animal is not a consumed dish: Ocean Blue's
stingray references describe the tank and require menu-identity research, not dish reviews.
Publisher English may also turn glutinous rice balls into “meatballs”; use the verified original
Chinese excerpt rather than repeating that ingredient error. Evidence: `china/deep-reviews22/`.

## Photo sources and traps from the November 18 rounds (50-60)

Owner decision (2026-11-18, updated 2026-11-20): **no source is barred** for menu photos ("get the right image whatever way possible"), drinks included; scripts and `curl` calls should spoof standard browser headers (`User-Agent`, `Referer`, `Accept`, `Accept-Language`) whenever a site, ordering platform, or CDN rejects bare `curl` or requires a referer, and use Chrome (`@browser` or local browser automation) when JavaScript execution or signed in-page state is needed. Still off-limits: attempting to solve or bypass interactive CAPTCHAs, anti-bot challenge gates, or age gates (hand them to the owner / report the block), and domains the Chrome tool refuses ("Navigation to this domain is not allowed", for example bullagastrobar.com, asahibeer.co.jp). Evidence and numbers: `docs/restaurant-menu-inventory-2026-11-12.md` rounds 50-60.

Always start from a **fresh production listing** (`/api/admin/restaurant-content?limit=1000&offset=N` and `/api/admin/restaurant-specials`), never a saved snapshot: lanes fill gaps quickly and local ids differ from production. Rank gaps by exact name and by brand; lines that never have a source photo (happy-hour/promo phrases, course lines, wine vintages, "all beers", generic soft drinks) are not worth chasing. Match **exact normalised names only**, view every image, then save through `applyReviewed.py` (pilot one record, apply, dry re-run must change nothing).

Source ladder, best first:
1. **Official PDF menus with photos** (Mia Bocca/Eastone gave 72 photos from one PDF). `python3 scripts/restaurants/pdfPhotos.py menu.pdf outdir pages 300` (PyMuPDF installed with `pip install --target .scrape/<dir>/pydeps pymupdf`, then `PYDEPS=`) extracts clean embedded photos named `p<page>_x<xref>.jpg`; `pdfimages` returns soft-mask cutouts and shadow layers instead, and rendered pages carry sticker overlays, so use the embedded images. Dish names are usually outlined, so view rendered pages (`pdftoppm -r 80`) and pair photo to caption by eye; match only names that agree exactly (flag a one-character slip in the saved name in the caption). Caption as a chain menu photo shared across locations.
2. **Chain online-ordering pages in Chrome**: Olo (`order.<chain>.com/menu/<slug>`, tile alt text = dish name; imgix URLs are signed, so fetch inside the page, plain `curl` gives `sig_invalid`) and `order.online/store/...` (`-retina-large.jpg` is 800x600; no challenge appeared). Confirm the street address on the page. Chrome allows **one automatic download per tab**: return photos as one Blob download per fresh tab, or return short links through `javascript_tool` in chunks of about 4 (output truncates near 800 characters and refuses text containing query strings).
3. **Uber Eats with an owner-supplied delivery address** (type it only into the address box; no sign-in, cart or order; decline optional cookies; never write the address into docs). Menu tiles have photos; the proxied `cn-geo1.uber.com/image-proc/...srcb64=<base64>` decodes to the original `tb-static.uber.com/...jpeg`, which plain `curl` downloads (in-page `fetch` is blocked). Some chains (Capital Grille) list text only.
4. **Wikimedia Commons product photos for named bottled drink lines** (owner-approved, product photo only): search `/w/api.php` generator=search namespace 6 from a commons.wikimedia.org tab, download `Special:FilePath/<title>?width=1000` with a descriptive User-Agent, credit author and licence, caption "product photo, not taken at this venue". Only accept a photo that shows the actual current product (a vintage can, an old bottle, a bar scene or a distillery wall are rejected); match lines whose name is exactly the brand (drop a leading 【芋】 tag and a trailing parenthesis; skip draft/生 lines for a can photo).
5. **Google Maps listing Menu tab** (Highlights grid tiles carry Google's dish label; owner-approved exception to robots): exact label equals item name, links come back in chunks as above. Yield is low (0-5 per venue, about 6 calls each).
6. Yelp reviewer photos and operator sites as in the earlier sections.

Dead ends measured: Tabelog photo lists carry no dish captions (only the restaurant name); Hot Pepper's `/food/` page and `/photo/` gallery show the same shop-supplied photos, so its drink and course gaps have no source photo; chain sites with text-only menus (Capital Grille, North Italia site, Duke's site) give nothing.

PDF menu triage (Nov 18): `scripts/restaurants/pdfTriage.py` downloads every PDF menu URL that still has gaps (217 found; 35 hold 3 or more embedded photos) and `scripts/restaurants/pdfPair.py` pairs gap names with the nearest photo (text layer, or tesseract OCR with `OCRLANG=jpn|eng|chi_sim|kor` when text is outlined; tesseract language data is installed). Limits met: record item names are often English labels of a Japanese PDF (no exact match possible); many menu photos are cutouts whose soft masks are separate (the base image shows a patterned or noisy border); dense layouts make nearest-photo pairing wrong about as often as right (Braseros: cheese quesadilla paired with a salad), so every pair must be viewed and only unambiguous exact-name pairs saved; and photos below about 400 px wide were skipped.

Hand pairing results (Nov 18): menus that print one photo per category with an explicit caption (Sumiyaki Unafuji: "the photo is the 上うな重") give clean unambiguous pairs; dense photo-beside-text menus (Braseros) gave 2 safe pairs out of about 20 candidates, because a photo can belong to the caption above, below or beside it. Pair only when the photo content itself is unmistakable (soup, birria tacos with a consommé cup) and the layout agrees. Cutout photos: composite the extracted base image with its soft mask onto white (`scripts/restaurants/pdfPhotos.py` now does this) and say "cutout flattened onto white" in the caption.

Round 7 landing-tab verification traps (Nov 22 — Las Vegas Iconic dishes 6, Phoenix Iconic dishes 6, Seattle Food trucks 5):
- **Domain & branch identity collisions:** In Phoenix, The Original Carolina's Mexican Food at `1202 E Mohave St` (`602-252-1503`) is `https://carolinasmex.com/` (online pickup `order.chownow.com/order/23265/locations/57353`); never link or source from the family-split offshoot `carolinasmexicanfood.com` (Peoria/Mesa/Cactus).
- **Geocoder midpoint collisions & site ZIP typos:** Nominatim collapses multiple South Las Vegas Blvd addresses (`2985 S Las Vegas Blvd` Peppermill and `3041 S Las Vegas Blvd` Tacos El Gordo) onto the same highway midpoint `(36.1436715, -115.1575011)`; verify against US Census geocoder when Nominatim returns identical coordinates for distinct Strip addresses. Correct operator-site ZIP typos before geocoding (`3041 S Las Vegas Blvd` is `89109`, not `89104`; `11728 Aurora Ave N` Seattle is `98133`, not `98113`).
- **Tinted hero images & RGBA cutouts:** Inspect every downloaded candidate on a contact sheet before upload—reject CSS/baked color-tinted website hero slides (e.g., Los Dos Molinos' purple-tinted `SouthPhoenix-copy.jpg` / `patio-1.jpg` / `tacos-1.jpg`) and outdated menu-board exteriors (Tacos El Gordo's 2014 `$2` board), and flatten transparent RGBA cutouts (`ls_d4_prawns.webp`, `ls_d5_khaosoi.webp`) onto pure white `(255, 255, 255)` before JPEG conversion so transparent corners never turn black.
- **SSR audit filtering & HTML entity unescaping:** In `push_prod.py`, unescape HTML entities (`html.unescape`) before checking restaurant names containing `&` or `'` in SSR HTML, and filter expected restaurant names by view (`view=top` renders `iconic` additions alongside top restaurants, whereas `foodTruck: true` entries render under `view=trucks`).

Round 8 landing-tab verification notes (Nov 22 — Montreal Iconic dishes 6, `currency: "CAD"`):
- **Branch move dates vs. founding dates in Montreal:** Always date the pin to the current branch's move-in year when the landmark relocated: Fairmount Bagel opened off Saint-Laurent in `1919` but moved into `74 Avenue Fairmount Ouest` in `1949` (`1949-01-01` estimated); Wilensky's Light Lunch opened at Fairmount & Saint-Urbain on `May 1, 1932` but moved two blocks east to `34 Avenue Fairmount Ouest` (corner Clark) in `1952` (`1952-01-01` estimated); Gibeau Orange Julep started in `1932` (first concrete sphere `1945`) and opened the current three-story fiberglass sphere at `7700 Boulevard Décarie` in `1966` (`1966-01-01` estimated).
- **Hidden menu sources on legacy & Shopify sites:** Wilensky's (`http://www.wilenskys.com/ENG_TABLE_Menu.htm`; shared-host TLS cert fails on `https://`) publishes its complete priced counter board as `ENG_img_Menu.jpg`; St-Viateur Bagel links its in-store PDF (`StViateurBagel_Shop_BagelMenu_2026-09.pdf`) from `/pages/locations` and serves transparent `RGBA` PNG bagel cutouts on Shopify (`products.json`) that must be composited onto pure white `(255, 255, 255)` before JPEG conversion.

Round 9 landing-tab verification notes (Nov 22 — Toronto Iconic dishes 6 + Vancouver Iconic dishes 6, `currency: "CAD"`):
- **Branch move dates vs. founding dates in Vancouver:** Date relocated Vancouver landmarks to the current branch's opening while recording original founding in prose: `Japadog (Robson Flagship)` at `530 Robson St` opened its brick-and-mortar store in `2010-06-01` (`estimated`; original Burrard & Smithe street cart launched Nov 11, 2005); `Vij's` moved into its `3106 Cambie St` perforated-mesh lantern building on `2015-12-22` (`exact`; founded Sept 1994 on W Broadway); `Tojo's Restaurant` moved to `1133 W Broadway` in `2007-01-01` (`estimated`; founded Oct 1988 at 777 W Broadway).
- **Hidden official menu subpages & PDFs:** On Squarespace (`vijs.ca/foodmenu`), the top-level menu landing page shows only section headings (`VEGETARIAN SNACKS`, `MEAT & SEAFOOD SHAREABLES`, `SEAFOOD & MEAT`, `VIJ's HAND CRAFTED`), which link to priced subpages (`/meatkhana-1`, `/meatsnacks-1`, `/vegkhana-1`, `/vegsnacks-1`, `/handcraftedbreads-1`, `/sidestosavour`, `/sweetendings-1`). On Wix (`mahasbrunch.com`), `/menu` returns 404 while the homepage links directly to official `_files/ugd/*.pdf` brunch and drink menus. On Sociavore (`paitoronto.com`), `/menu` returns 404 while the live Downtown menu is `/menu/pai-menu` (and `imagedelivery.net` dish thumbnails scale from `width=375` to `width=1440`).
- **Dish review schema & numeric prices:** `/api/admin/restaurant-content` requires numeric float `price` values on menu items (not `"$32.00"` strings) and requires `provider`, `title`, `sourceUrl` (`https://`), `publishedDate`, `quote`, and `checkedAt` on dish `reviews` (an `http://` review `sourceUrl` or missing `provider`/`title` returns `HTTP 400 Invalid dish review evidence`).

Round 10 landing-tab verification notes (Nov 22 — Tokyo Iconic dishes 6 + Osaka Iconic dishes 6, `currency: "JPY"`, `.scrape/round10-tabs-2026-11-22/`):
- **Branch relocations & same-name corporate splits in Tokyo and Osaka:**
  - `Nihonbashi Taimeiken` (founded 1931 by Shigeo Modegi) relocated across the block to `1-8-6 Nihonbashi-Muromachi, Chuo-ku, Tokyo 103-0022` and reopened on `2021-04-29` (`exact`) during the Nihonbashi 1-chome redevelopment (`taimeiken.co.jp` homepage notice `令和三年四月二十九日より営業再開`).
  - `Tonkatsu Maisen Aoyama Honten` (founded Dec 1965) moved into the converted pre-WWII Aoyama public bathhouse at `4-8-5 Jingumae, Shibuya-ku` in `1983-09-01` (`estimated`).
  - `Asakusa Imahan Kokusai-dori Honten` at `3-1-12 Nishi-Asakusa, Taito-ku` opened in `1928-01-01` (`estimated`, after the Great Kanto Earthquake; house founded 1895; renovated Oct 9, 2008) and is a completely separate company from `Ningyocho Imahan` and `Sukiyaki Imahan Honten` (`1-19-7 Asakusa`).
  - `Jiyuken (Namba Honten)` at `3-1-34 Namba, Chuo-ku, Osaka` (`1910-01-01` `estimated`, Meiji 43) explicitly disclaims on `jiyuken.co.jp` that `Senba Jiyuken` (`3-3 Senba Chuo`) is an unrelated company.
- **Large guide pagination on `?view=top` (`Top · 36` > 24 per page):** Cities with `> 24` Top restaurants (such as Tokyo and Osaka, which went from `Top · 30` to `Top · 36`, `Iconic · 06`) paginate `/restaurants/<city>?view=top` at 24 cards per SSR page, so newly added `ICONIC` cards appear on page 2 of `?view=top` while all 6 render on page 1 of `/restaurants/<city>?view=iconic`. In `push_prod.py`, verify the updated `Top · 36` and `Iconic · 06` badge counts on both `?view=top` and `?view=iconic`, and check the 6 new restaurant names and `/pin/<id>/<slug>` card links on `?view=iconic`.

Round 15 landing-tab verification notes (Nov 23 — San Antonio Iconic dishes 6 + Las Vegas Food trucks 5, `.scrape/round15-tabs-2026-11-23/`):
- **Final tab pill totals vs. database `opening` rows:** `?view=top` counts only `tile.kind: 'top'` entries (excluding both `kind: 'opening'` and `foodTruck: true`), yielding `San Antonio`: `Top · 09` (`base=3` + `iconic=6`, plus `Openings · 06` = `15` total) and `Iconic · 06`; `Las Vegas`: `Top · 09` (`base=3` + `iconic=6`, plus `Openings · 05`), `Iconic · 06`, and `Trucks · 05` (`19` total) with `0` truck leaks onto `?view=top`.
- **Visual & slug verification traps:** Reject sister-brand photos (`Viola's Ventanas` neon sign returned under Los Barrios editorial coverage), mixed-subject WP uploads (`raysdriveinn.net` car-show galleries — pull food plates via Photon or editorial features), and swapped third-party image filenames (`Everyday.Vegas` swapped `303 In the Cut` burrito, chicken fries, and Prickly Pear drink URLs). Always ASCII-normalize accents (`unicodedata.normalize("NFKD", ...)`) when matching Next.js `/pin/<id>/<slug>` redirects and avoid custom non-standard `User-Agent` strings (`ChronopinVerify/1.0`) that trigger edge WAF `403` on `/pin/*` routes.
- **Round 16 address, WordPress date & tab-strip checks:** Always verify older street numbers from press/guides against the operator's active locations page and live POS ordering link (`Black Rooster Taqueria` moved within Mills 50 from `1302` to `1323 N Mills Ave`). When editorial WordPress themes strip visible byline dates (e.g., *Scott Joseph's Orlando Restaurant Guide*), query `/wp-json/wp/v2/posts?slug=...` or article JSON-LD for exact `date` values rather than guessing. Finally, assert only `Top · XX`, `Iconic · XX`, and `Trucks · XX` in SSR tab-strip checks (`Openings` is not rendered with an `Openings · XX` counter badge in the tab strip).
- **Round 17 landing-tab verification notes (Nov 23 — San Jose Iconic 6 + Dallas Trucks 5, `.scrape/round17-tabs-2026-11-23/`):**
  - Keep `profile.pinSourceUrl`, `profile.menu.pinSourceUrl`, `profile.details.pinSourceUrl`, and `pin.sourceUrl` identical on each branch's canonical URL so `restaurantSourceKey` parity holds (`?limit=1000&offset=...` pagination on `/api/admin/restaurant-content`).
  - Match Popmenu dish photos only to exact menu items (`Original Joe's` `RIB STEAK 27OZ.` & `STEAK SANDWICH`), verify Klyde Warren Park trucks directly via per-truck `.ics` schedules, and flatten transparent RGBA PNGs onto solid `#ffffff` JPEG before Azure upload.
  - Pass a `curl` cookiejar (`-b` / `-c`) in audit scripts when checking `/pin/<id>/<slug>` redirects on production (`?cg=1` sets a `cg` cookie and redirects back; stateless `curl` returns `403`), and scope fatal >25-word quote checks to the round's `our_urls` while deduplicating `(sourceUrl, quote)` pairs across `restaurant-content` and mirrored `restaurant-specials` rows.
- **Menu-pricing gap-fill & verification notes (Nov 24, 2026 — `.scrape/pricing-gaps-2026-11-24/`):**
  - **Outlined official PDFs & Shift_JIS GIF menus (Japan & Miami):** `Tonkatsu Maisen Aoyama Honten` (`mai-sen.com/shop/shop-9960/` links `20260523103314-dinner_aoyama_en_251229_ol.pdf` and `20260523103542-2602maisen_lunch_aoyama_a4_ol.pdf`), `Kushikatsu Daruma Shinsekai So-Honten` (`kushikatu-daruma.com/location/shinsekai` links bilingual `HPメニュー.pdf`), and `La Carreta Calle Ocho` (`lacarreta.com/menu-classic` links `lacarreta-menu-compressed.pdf`) have zero text layer in `pdftotext`; render via `pdftoppm -r 120 -png` and read visually. `Tamahide` (`tamahide.co.jp/oshinagaki_hiru.html`, `cp932`) renders its 2025/2026 renewed menu as GIF images (`20251106-m-hiru02.gif`, `20260803-m-hiru03.gif`, `20261002_m_n_*.gif`, `20261101_m_n_kaiseki.gif`).
  - **Square Online public API (`*.square.site`):** Read `classicSiteID` (`siteData.site.properties.classicSiteID`) from `window.__BOOTSTRAP_STATE__` and the numeric `userId` (`132613145` etc.) from the HTML, then query `https://cdn5.editmysite.com/app/store/api/v28/editor/users/<userId>/sites/<classicSiteID>/categories` and `/products?categories[]=<catId>&per_page=100` (using the active `Online Menu` category ID avoids stale uncategorized POS duplicates, e.g., Firetrail Pizza's current `$15–$19` 10" / `$28.50–$31.50` 14" pizzas vs. old `$11–$14` POS entries).
  - **Calibre & Shopify:** `carouselbakery.bycalibre.ca/menu` renders Carousel Bakery's St. Lawrence Market CAD pickup menu directly in HTML; `ceylonhut.us/products.json` exposes Shopify variants (screen out Half/Full Tray catering items when matching truck plates).
  - **Branch & domain traps verified (Nov 24):** `roscoeschickenandwaffles.com/menu/food-LAX/` is LAX-only (never borrow for Hollywood `1514 N Gower St`, whose `/location/roscoes-hollywood/` links only to catering `/main-menu/`); `peppermilllasvegas.com/menus` links to `peppermillreno.com` (never borrow Reno prices for Las Vegas Strip); `johnsroastpork.com/menu-2/` still prints `$1575` (missing decimal beside `$15.75` chicken cheesesteaks — keep unpriced rather than guessing). Local `/pin/<id>` audit checks also trigger `?cg=1` and need their own `curl -b/-c` cookiejar.
  - **Wave 2 Chrome / first-party ordering findings (Nov 24 — `.scrape/pricing-gaps-2026-11-24/verified_prices_wave2.json`):**
    - **Omni Parker House (`mmonline.clevelandmenu.com` mirror):** `menus.omnihotels.com` serves invalid HTTPS certs (`ERR_CERT_COMMON_NAME_INVALID`), but its underlying ClevelandMenu frames load over clean HTTPS at `https://mmonline.clevelandmenu.com/ViewMenu/<menuId>/1840?embedded=true` (Breakfast `34665`, Lunch `34654` with Rolls `$5` & Baked Boston Scrod `$32`, Parker's Bar `56592` & The Last Hurrah `52098` with Boston Cream Pie `$15` slice).
    - **Osaka Tabelog IDs & dated signboard photos (`dtlmenu/photo/`):** Do not rely solely on Tabelog `/dtlmenu/` text (often stale 2022 entries); verify recent printed menu/signboard photos under `dtlmenu/photo/` (Mizuno `27001278` 2026-11-24 tri-fold; Dotonbori Imai `27001289` 2026-11-01 menu book; and for **Wanaka Sennichimae Honten**, use official ID **`27002320`**, NOT `27001292` which belongs to a closed Indian restaurant).
    - **Counter menu board photos vs. Google Maps structured delivery listings (`Japadog`, `Nathan's Coney Island`):** Google Maps structured menu widgets can carry ~10–30% delivery markup over in-store boards; always read prices from dated branch counter board photos (`Japadog` Sep 2026 pre-tax CAD board at 530 Robson St vs inactive Moduurn; `Nathan's` May–Jun 2026 & Jul 2025 counter boards at 1310 Surf Ave).
    - **Confirmed unavailable / third-party-only portals:** `Beecher's` ToastTab currently displays `"Currently not accepting online orders / Menu items unavailable"`; `Al's #1 Italian Beef` (`1079 W Taylor St`) has an unlinked Wix Order button and is excluded from Al's Toast ordering; `Tommy DiNic's` `tommy-dinics-rtm.square.site` is 404 (Goldbelly-only shipping); `Bolton's` (`624 Main St`) links only DoorDash/UberEats; `Kiko's Place Seafood` ToastTab confirms `"Corner of hazzard center dr. And mission center rd. , San Diego, CA 92108"` (`Sun–Sat 10:00AM–7:00PM`, phone `(619) 341-7397`), consistent with parcel `5494 Mission Center Rd`.
  - **Wave 3 dated 2025–2026 Google Maps counter-board findings (Nov 24 — `.scrape/pricing-gaps-2026-11-24/verified_prices_wave3.json`):**
    - **Screen misattributed & multi-branch Google Maps uploads:** On `Crawfish & Noodles` (`11360 Bellaire Blvd #990`), reject uploaded menu sheets from unrelated nearby restaurants (e.g., *Crawfish Cafe* & *Dubu Dubu* appearing in `Photos -> Menu`). On `Lotus of Siam (Sahara)` (`953 E Sahara Ave Ste A5`), verified post-May 2026 Commercial Center reopening (`Jun/Oct/Nov 2026` dinner photos) and skipped Flamingo/Red Rock menus and pre-renovation Oct 2020 `Sai Oua` / `Pad Prik King` sheets.
    - **Street-name aliases & in-store vs. shipped bottle pricing:** `Henry's World Famous Hi-Life` (`301 W St John St`, San Jose) now displays as `301 Sharks Wy` on Google Maps (`(408) 295-5414`); `La Victoria Taqueria` (`140 E San Carlos St`) sells Orange Sauce in-store for `$8.45 + tax` (`Nov 2025` counter sign) vs `$15.00` shipped online (`lavicsj.com/store`).
    - **City surcharge & inclusion disclosures:** Record local surcharges/gratuities in `menu.note` when printed (`House of Prime Rib` `+5%` SF ordinance surcharge and included Salad Bowl/Yorkshire Pudding vs `$58.85` a la carte; `Zuni Café` `20%` Fair Wage gratuity + `5%` SF mandates; `Gibeau Orange Julep` pre-tax `*Les prix sans taxes`). Remaining 7 Iconic venues (`El Rey de las Fritas`, `Arnold's`, `Bolton's`, `Tommy DiNic's`, `Al's #1`, `Beecher's`, `Mike's Pastry`) hit Wave 3 Batch 3 browser quota (`429`) and stay queued.
  - **Wave 4 Iconic completion + 11 Food Trucks (Nov 25 — `.scrape/pricing-gaps-2026-11-24/verified_prices_wave4.json`):**
    - **Closed final 7 concise Iconic Dishes gaps:** `El Rey de las Fritas` (`6/8`), `Arnold's` (`7/7`), `Bolton's` (`6/6`), `Tommy DiNic's` (`6/6`, tax-incl., Google Maps lists Reading Terminal Market as `51 N 12th St`), `Al's #1 Taylor St` (`7/8`, Sep 2026 letterboard; hot dog & polish listings include fries), `Beecher's` (`4/7`, Apr/Nov 2026 Pike Pl chalkboards), and `Mike's Pastry` (`30/85`, Cash-only Apr–Nov 2026 300 Hanover St photos across all 21 cannoli `$8–$10`, Glazed Donut `$5`, 4 cookies `$5`, 4 macaroons/biscotti `$20/lb`).
    - **Food truck relocations / closure & address notes found on Google Maps:** `Jenny's Shrimp` Haleiwa shows relocated address `66-252 Kamehameha Hwy` (vs stored `66-532`); `Leonard's Malasadamobile` Waikele shows `94-849 Lumiaina St` (vs stored `94-894`); `El Chato Taco Truck` `5300 W Olympic Blvd` lists ZIP `90036` (vs `90019`); `Five Star Poke` (`206 Kapuni St`) displays a `Temporarily closed` notice while keeping May/Jul 2026 board photos. `Fletcher's Original Corny Dogs` (`fletcherscornydogs.com`) is gated by `sgcaptcha` with no 2025–2026 KWP Google Maps board photo (held at `0/11`).
  - **Wave 5 final truck sweep + Roscoe's Hollywood (Nov 25 — `.scrape/pricing-gaps-2026-11-24/verified_prices_wave5.json`):**
    - **Roscoe's Hollywood (`1514 N Gower St`, `84/88`):** Latest Sep/Oct 2026 dining-room printed menus are marked `Rev. July 2026` (distinct from LAX `/menu/food-LAX/` and prior Jun 2026 `Rev. 4-17-26` sheets that still listed `Economy Special`, `Coleslaw`, and `Red Velvet Cookies`).
    - **Truck Clover & board discoveries:** `Tacos El Asadero` (`3513 Rainier Ave S`, `5/5`) links a first-party Clover POS pickup catalog (`taqueria-el-asadero-seattle.cloveronline.com/menu/all`); `A.C.'s Icees` (`2470 S Bayshore Dr`, `5/7`) shows its yellow `$5/$7/$10` board in `Mar 2026` review photos even though `Photos -> Menu` only had pre-2025 shots.
    - **Confirmed truck holds & address discrepancies:** `Zoe's Place` (`1976`) maps to `4637 Market St` commissary rather than `9990 Alesmith Ct` (`orderzoesplace.com` 403, no 2025–2026 photos); `Mariscos El Aguachiles 8` (`2130`) has no Maps listing at `199 Willow St` (which lists `Tacos los 3 Hermanos`; IG cites `3130 Alum Rock Ave SJ` storefront); `Pana Food Truck` (`panafoodtruck.com/store/`) Ecwid prices belong to `118 Cooper St, Santa Cruz` (exclude from `140 S Montgomery St`, Oct 2026 Papelón `$5.75` only); `Taco Picasso` (`1974`), `El Gallo Giro` (`2075`), `Tacos Chava` (`2164`), and `Tacos La Lomita Van Buren` (`2165`) have no prices posted on their 2025–2026 boards/sites.
  - **Wave 6 remaining solvable partials & hold verifications (Nov 25 — `.scrape/pricing-gaps-2026-11-24/verified_prices_wave6.json`):**
    - **First-party reopening & seasonal PDFs:** `Cole's French Dip` (`1982`, `9/9`) links its post-Nov 18, 2026 reopening menu PDF (`0ab073806_Coles-menu.pdf`) directly from `coles.la` (`Pastrami French Dip $26`, `Cole's Caesar Salad $24`; skip pre-Nov 18 Jul 2025 Maps uploads); `Un Bien Ballard` (`2037`, `9/9`) prices `Fire-Roasted Corn -Seasonal-` at `$7.50` on `unbienseattle.com` (vs `$6.50` on Apr & Jul 2026 Ballard chalkboards).
    - **Stall / counter board vs. online portal deltas & modifier-derived items:** `Carousel Bakery` (`2099`, `12/12 CAD`) Oct & Nov 2026 Stall 42 boards list `World Famous Peameal Bacon on a Bun` at `CA$9.50` (vs `CA$8.40` on `carouselbakery.bycalibre.ca/menu`) with `+ Egg $1.50` / `+ Cheddar $1.50` modifiers printed beneath it; `Joe's Pizza 7 Carmine St` (`2000`) Jun/Jul 2026 wall slice board lists slices (`Cheese $4.00`, `Sicilian $4.50`, `Fresh Mozzarella/Pepperoni/Sausage $5.00`, `White/Caprese $5.50`, `Supreme $6.00`, toppings `+$1/slice`) alongside higher in-store whole pies (`$32–$44`) than Slice pickup (`$28–$36`).
    - **Size-variant UI hiding (`Shawarma Guys`, `1973`, `79/79`):** South Park `shawarma-guys.curated.menu` leaves half/full salads & loaded fries and small/large sides unpriced on the top-level list until a size modal opens, whereas the Jul 2026 `3012 Grape St` truck board prints every size tier directly (also distinguishing `Sides -> Falafel 6 pcs $9.00` from `$10.00` A la Carte Protein).
    - **Confirmed holds & inactive domains:** `BLVD Eats` (`2177`) `blvdeats.com` now redirects to a GoDaddy parked page with zero 2025–2026 Maps photos and an unpriced Nov 2021 truck board (appears inactive/closed); `John's Roast Pork` (`2012`) `2025–2026` physical counter/outdoor boards tape over/omit all prices (`$1575` typo remains online); `Neptune Oyster` (`2017`) Jun 2026 printed dinner sheet explicitly lists `MAINE LOBSTER ROLL` as `MKT` (`add Caviar +15`); `Peppermill` (`2080`) May 2026 Strip Fireside Lounge cocktail card omits `Scorpion` pricing (`peppermillreno.com` links excluded).
