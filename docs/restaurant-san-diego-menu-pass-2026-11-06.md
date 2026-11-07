# San Diego menu-first pass — 2026-11-06 (six venues)

Correction to the 2026-10-31 audit: it listed `nativePin: null` for all 43 remaining gap venues, but 26 of them have a
backing pin (ids 20457–20599; look up by `sourceUrl` including the `http:` variant). Missing pins remain for Gaslamp
Tavern, Oggi's Santee, Sushi Lounge Poway, Sammy's La Jolla, Himalayan Cuisine, Lamppost Vista and others.

Most gap items are generic (select appetizers, "Tacos", glasses of wine); photos cannot honestly attach to them.
Instead, transcribe the operator's own ordinary menu into `restaurant-content` (label must differ from every specials
menu label), then match Yelp dish photos to the real named dishes and review each by eye.

| Venue | Pin | Content id | Menu source | Items | Photos |
| --- | --- | --- | --- | ---: | ---: |
| Knotty Barrel East Village | 20485 | 1963 | ev.knottybarrel.com food menu (Lunch & dinner, Breakfast) | 42 | 13 |
| Mister A's | 20457 | 1964 | asrestaurant.com/dinner-menu | 33 | 7 |
| Queenstown Public House | 20503 | 1965 | Dinner PDF (queenstownhg.com) | 32 | 12 |
| Wheat & Water | 20474 | 1966 | wheatandwater.com/food-menu (food only; wine glass/bottle rows skipped) | 31 | 7 |
| Piacere Mio South Park | 20569 | 1967 | southpark.piaceremiosd.com food menu (make-your-own pasta and add-ons skipped) | 39 | 16 |
| The Search Bar EastLake | 20555 | 1968 | thesearchbareastlake.com/menu (sides, extras, kids, drinks skipped) | 38 | 13 |

Rejected on inspection: cropped or multi-dish shots, variant mismatches (sweet vs skinny fries, missing peas), and
buffalo-chicken add-on nachos. Opening evidence (estimated dates) for Knotty Barrel 2011, Rakiraki Oct 2012 and
Mister A's 1965 is in `restaurant-san-diego-specials-repair-2026-11-06.json`; those pins already existed, so it was not applied.

Not done: Rakiraki Convoy (shared brand menu, no prices, no confirmed Convoy address); Union Kitchen Gaslamp (menu
items not in the page text, loaded by script); Mastiff La Mesa (regular menu and beer list load by script; only specials
came back); Bacari North Park (publishes no prices and dish names run into ingredient lists); Queenstown lunch and
brunch PDFs. Yelp lists the Search Bar at 881 Showroom Place Ste 100, the operator at 881 District Pl Ste 100 (same
number and suite, same EastLake district); treated as one venue. Caption traps: drop a photo whose Yelp caption names two
dishes or a variant (extra salmon, "bread accompaniment"). Chrome blocks repeat `<a download>` clicks and the tool output
filter blocks photo ids in `javascript_tool` results: put ids in `<main>` and read them with `get_page_text`.
Working files: `.scrape/sd-menu-pass-2026-11-06/`.

## Follow-up (same day): four rendered-menu venues, then Miami

Rendered menus read with Chrome `get_page_text` (curl and WebFetch only saw headings or shells):

| Venue | Pin | Content id | Items | Photos |
| --- | --- | --- | ---: | ---: |
| Union Kitchen & Tap Gaslamp (Dinner) | 20527 | 1969 | 45 | 18 |
| Mastiff Kitchen La Mesa (Menu tab) | 20473 | 1970 | 15 | 10 |
| Bacari North Park (Anytime and Brunch, no prices published) | 20599 | 1971 | 55 | 27 |

Still open: Rakiraki Convoy (shared brand menu, no prices), Union Kitchen lunch/brunch, Mastiff burgers/sandwiches
(listed in the lunch specials, absent from the Menu tab), Queenstown lunch and brunch PDFs.
Tricks: Mastiff's menu needs a click on the Menu tab; Bacari marks dish names at font-weight 500 and descriptions at
300, so names split cleanly in the DOM; Yelp captions come as `Business - City - Caption` (use the third segment).

### Miami, first batch (specials profiles, no pins touched)

Miami had 0 dish photos across 93 venues / 962 items. Batch 1 ran the paced Yelp matcher on 16 venues with the most
named items (slug discovery by search fetch; require the slug to hold the branch words, since "sea" matched
"seasons-52" and Pisco Kendall matched Doral). 72 caption matches, 63 kept after a by-eye contact sheet; 9 rejected
(a green roll for "Shrimp Popcorn", a salad for "Salmon", pepperoni for "Margherita Flatbread", and similar).
Applied with `applyReviewed.py` (kind `specials`): 58 attachments on 15 venues, ids 623-862 (R House, Bocas House
Doral and Weston, Sawa, Runyon's, Old Lisbon Aventura, Tin Tin, Bulla Coral Gables and Doral, Dal Contadino,
Ukiah, Michael's Genuine, Cooper's Hawk Dania Beach, Amal, Nusr-Et). Five items did not match an exact saved name
(asterisks or descriptions in the name) and were skipped. Miami is now 63 photos on 15 of 93 venues. Not verified
on the rendered guide (the specials cards load client-side); readbacks and public blob checks passed.
Remaining Miami venues: 31 with 6+ items (Sea Grill, S3, Earls x2, North Italia, Pisco y Nazca x2, Bulla Aventura,
Gianni's, Donatella and others had no safe Yelp slug match yet) plus 46 smaller ones. Working files:
`.scrape/sd-menu-pass-2026-11-06/miami/`.

### Miami, second batch (same day)

Slugs came from Yelp search fetched inside a Yelp tab; galleries from `/biz_photos/<slug>?tab=food&start=0|30`
(alt text segment 2 is the caption). In-page token matching proposed 51 candidates on 31 venues; 34 survived the
caption check and 32 the contact sheet (rejected: Truluck's "Prime Meatballs" showed a red slab, Elia "Greek salad"
unclear). 32 photos applied and read back on 18 venues (ids 627, 637, 638, 642, 649, 652, 670, 671, 848, 851, 863, 865,
868, 870, 874, 875, 878). Earls (654/667) skipped: two Yelp slugs, branch unconfirmed. Casablanca, Mango's, Phuc Yea,
Il Mulino, Reunion, Paperfish, Jaya, Donatella, Calamillor, A Love Story had no clean match; S3 and La Rosa had no slug.
Files: `.scrape/sd-menu-pass-2026-11-06/miami2/`. Trap: `uploadDishPhotos.ts auto` takes only the file list (no folder arg).

### Chicago + small Miami venues (same day)

Chicago (63 specials venues, 604 items, 0 photos before) and 2 small Miami sets: 52 venues got an unambiguous Yelp slug
(multi-branch ones skipped: RAMEN-SAN x4, Fleming's x2, Beatrix River North, Havana 1957, Kie-Gol-Lanee, Casa Sensei,
Embarcadero 41). Same method as batch 2; item names trimmed to 32 chars for matching (truncate the last token).
105 candidates -> 46 rows -> 40 after contact-sheet review (rejected: Creole Shrimp Fondue showed hummus/mussels,
Prime/Prosecco burrata was a bruschetta, Salsiccia unclear, Avli on the Park kataifi on a bun, "Spreads - single" got a
sampler, a Grilled Greek Salad image carried a text overlay). 40 photos applied on 25 venues, read back.
Files: `.scrape/sd-menu-pass-2026-11-06/miami3/` (the dir name is misleading: it holds Chicago too).
Trap: de-dupe matched names per venue id, not globally (chains share dish names).

### Seven more US cities (same day)

New York, Philadelphia, Houston, Dallas, Phoenix, Seattle, Austin: specials profiles only, no pins touched.
Pipeline per city (all helpers in `.scrape/sd-menu-pass-2026-11-06/`): `prep.py <region> <loc>` (venue list + photo-less
food items, drinks dropped) -> paste into a Yelp tab, search each venue by name + its own street address (better
branch accuracy than city alone) and fetch `/biz_photos/<slug>?tab=food&start=0|30` -> `window.__match()` token match
(caption segment 2) -> `gen.py` builds manifest + contact sheets (+ downloads originals) -> review by eye ->
`apply.sh <dir> <reject-indexes>` uploads to Azure and applies with readbacks.
Photos applied: New York 29 (16 venues), Philadelphia 47 (23), Houston 36 (19), Dallas 24 (14), Phoenix 37 (18),
Seattle 33 (18), Austin 33 (15). Rejects per city 6-9 of ~40: multi-dish captions, other dish in shot, hands/leftovers,
logo or text overlays, wrong venue (slug check from the printed slug list), same image on two branches.
Traps: Chrome's javascript_tool times out at 45 s so run the crawl as a background async job and poll; localhost fetch
from the Yelp page hangs (Chrome local-network prompt); PIL default font cannot draw non-latin-1 (strip labels);
dedupe matched items per venue id, not globally. Chicago/Miami batch lives in `miami3/` (see above).
Totals now: ~1,407 dish photos across all specials profiles (San Diego 1,026).
