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
Every guide (including Japan city guides) supports **Coming soon, Just opened, Top restaurants, Specials**.
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
Try to find a photo for every menu item. Each item may carry `image: { src, caption, credit, sourceUrl }` (Azure
blob `src`; optional `width`/`height`), saved through the same restaurant-content / restaurant-specials APIs
(validated; all four fields are required). On the pin a photo shows as a thumbnail beside the dish; clicking it
opens the photo large with its caption and credit, and every restaurant pin with dish photos also gets a captioned
"Food photos" strip above the menu. Only use a photo that really shows that dish at that restaurant (official
site, the venue's own social/press kit, Yelp/Tripadvisor/Google photos of that branch); never infer a dish from an
unlabelled photo or use another branch's or a stock image, and leave the item without one rather than guess. The
caption names the dish as the restaurant does. Upload with `npx tsx scripts/restaurants/uploadDishPhotos.ts restaurant-dishes/<slug> <files>` (WebP, public-blob check, prints `src`/`width`/`height`). Yelp's branch photo gallery (`/biz_photos/<slug>?tab=food&start=N`, reader-captioned) is a usable source when the restaurant's own site has no dish photos; credit it as a Yelp reviewer photo and link the photo's `?select=` page. Record items left without a photo in the guide notes.

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
Drop matches whose caption is a different or multi-dish photo (check the caption, not just the tokens). The admin token in
`.scrape/admin.token` expires after ~2 h: re-sign in with `ADMIN_PASSWORD` from `.env.local` (email in `feedback_admin_email_in_scripts`).
Never shorten a Yelp slug when listing candidates (a trimmed `-san-diego` gave 'page not found' and looked like 'no photos'); if a slug
returns 0 photos try inserting or appending `-san-diego`. The loose pass (caption words a subset of the item, or two-thirds of its
words) finds ~3x more photos but needs a by-eye review: drop captions naming several dishes, combos, or a different dish.
Restaurant sites and Instagram rarely name dishes in alt text, so they gave ~no matches; not worth the per-photo credit work.

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

## Saving
Ongoing menu, visit-detail and landing-page tile edits go through the database management APIs. Use `/api/admin/restaurant-content` (content) and `/api/admin/restaurant-specials` (offers and menus). Bundled
JSON catalogs are snapshots; content updates don't need a deployment. Preserve source evidence and credits, then
verify the pin and landing page. Dining rubric/reviews: see `pin-enrichment-rubrics`.
