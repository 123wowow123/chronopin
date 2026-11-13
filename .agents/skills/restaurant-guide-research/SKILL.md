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

Technical follow-ups from the expanded San Diego pass:
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
5. **Push to production** only when the owner asks: `syncPhotosToProd.py <region> [--apply]` matches each venue
   by exact `pinSourceUrl`, copies images only onto production items without one, requires public Chronopin
   Azure blobs, uses the latest revision and verifies readbacks (evidence in `.scrape/photo-sync/`).
   `syncReviewsToProd.py <region> [--apply]` does the same for item reviews (never replaces or duplicates a
   review with the same `sourceUrl`). Push one venue first (`--only`), check the live pin, then the rest.
6. Menu payload caps are 1,000,000 characters (`restaurantSpecialValidation.ts`, `restaurantContentValidation.ts`);
   BAR Shinkai's 1,392-photo menu needed that. Its pin renders ~2,000 lazy images in about 3.6 s.

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
