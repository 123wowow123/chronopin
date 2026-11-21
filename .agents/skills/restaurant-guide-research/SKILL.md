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
  Taco Love, Balboa Park Food Truck Fridays, Curbside Bites. Other cities not started.

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
  the pin media plus the iconic-flagged item images (cover removed), and no longer merges every menu photo; other cards are unchanged. Pick photos that show the exact dish (Hodad's
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
- **Native media API traps:** `POST /api/admin/db/Medium` and `/PinMedium` answer `{ rows: [...] }` (not `results`). `PinMedium.weight` must be **0 to 1**
  (`CK_PinMedium_weight`); weight 2 returns a 500 *after* the Medium row was inserted, leaving an orphan: find and delete orphans (`DELETE /api/admin/db/Medium?id=`)
  before retrying. Check by `thumbName` before creating so a rerun is idempotent. Never POST probe rows to see what happens.
- **Never claim inventor status** for a contested dish (California burrito, carne asada fries): say "best known for". Credit Baja for the fish taco.
- San Diego done locally (pins 20975-20977, content 1977-1979, not on prod): Rubio's original (fish taco), Hodad's (bacon cheeseburger),
  Point Loma Seafoods (fish sandwich). Held: Lolita's (carne asada fries; San Diego-city branch date unverified, original is in Chula Vista),
  Roberto's/Santana's (California burrito origin disputed, no verified branch date), Phil's BBQ. Evidence: `.scrape/iconic-dishes-2026-11-20/`.
  Other cities not started.
- **Menu, price and photo pass (2026-11-20, local only; content 1977 Rubio's, 1978 Hodad's, 1979 Point Loma Seafoods):**
  - *Hodad's:* use the **branch's own site** (`hodadsoceanbeach.com/food-menu` and `/drink-menu`; the `hodadsburgers.com` landing page only links out).
    29 priced items + shakes/drinks, 11 operator menu photos. The page maps each photo to its item in the DOM: `img` inside the item block whose text has `$`
    (`javascript_tool`, `static.spotapps.co/spots/../full`). The site shows $17.00 (Favorites card) vs $17.50 (burger table) for the single bacon cheeseburger: use the
    table, say so in the item note. Tile photo = the single bacon cheeseburger.
  - *Point Loma Seafoods:* the menu is a PDF (`/wp-content/uploads/2026/04/PLSFWebMenu4.16.26.pdf`) that Chrome titles "1.PNG": `get_page_text` finds nothing. Open it in
    Chrome, `screenshot`, then `zoom` regions to read prices (26 items). Small print (soup sizes) is too small to assign to one soup: record it in the item note, leave
    `price` off. Sushi and sashimi are not transcribed. **Plain curl gets a 202 bot challenge from this site** (menu and photos): do not spoof headers or a referer to get
    around it (the permission classifier denies that); read it in Chrome, and use a photo only from a source that downloads normally. No verified photo yet (the IVN
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
- Bot walls: plain `curl` gets HTTP 202 with a 170-byte challenge (pointlomaseafoods.com) even for the images. List URLs in Chrome with
  `javascript_tool` (URLs with query strings come back BLOCKED), then save through the page: `fetch` -> blob -> `<a download>` click. Chrome saves only
  the **first** automatic download per page load, so save one image per call/reload into `~/Downloads`, then copy it into `.scrape/`.
  Sites that answer curl 200 (ordering platforms, media CDNs) can be downloaded directly with a browser User-Agent.
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
caption names the dish as the restaurant does. Upload with `npx tsx scripts/restaurants/uploadDishPhotos.ts restaurant-dishes/<slug> <files>` (WebP, public-blob check, prints `src`/`width`/`height`). Yelp's branch photo gallery (`/biz_photos/<slug>?tab=food&start=N`, reader-captioned) is a usable source when the restaurant's own site has no dish photos; credit it as a Yelp reviewer photo and link the photo's `?select=` page. Record items left without a photo in the guide notes.

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

Owner decision (2026-11-18): **no source is barred** for menu photos ("get the right image whatever way possible"), drinks included. Still off-limits: bypassing CAPTCHAs, Cloudflare challenges or age gates (hand them to the owner), browser-spoofed requests (a spoofed-UA `curl` is blocked by the permission classifier), and domains the Chrome tool refuses ("Navigation to this domain is not allowed", for example bullagastrobar.com, asahibeer.co.jp). Evidence and numbers: `docs/restaurant-menu-inventory-2026-11-12.md` rounds 50-60.

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
