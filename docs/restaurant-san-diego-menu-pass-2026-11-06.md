# San Diego menu-first pass — 2026-11-06 (first three venues)

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

Rejected on inspection: cropped or multi-dish shots, variant mismatches (sweet vs skinny fries, missing peas), and
buffalo-chicken add-on nachos. Opening evidence (estimated dates) for Knotty Barrel 2011, Rakiraki Oct 2012 and
Mister A's 1965 is in `restaurant-san-diego-specials-repair-2026-11-06.json`; those pins already existed, so it was not applied.

Not done: Rakiraki Convoy (published menu is a shared brand menu with no prices and no confirmed Convoy address),
Queenstown lunch and brunch PDFs, Wheat & Water, Piacere Mio, Union Kitchen Gaslamp, Mastiff La Mesa, Bacari North Park,
Search Bar EastLake. Working files: `.scrape/sd-menu-pass-2026-11-06/`.
