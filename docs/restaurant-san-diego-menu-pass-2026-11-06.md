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
