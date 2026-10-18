# Specials menu backfill — October 8, 2026

Saved and read back **120 restaurant profiles and 2,422 menu items across 19 city guides** through the production restaurant-specials management API. The public San Diego guide API was also checked: Brigantine Del Mar now returns 42 priced items, including a $5 fish taco and $8 cocktails.

The existing deployed cards can display these database items immediately. The accompanying interface change adds food/drink section buttons, a six-item preview, expansion for longer sections, and a published-menu link. That interface change requires deployment.

## Sources and preservation

Brigantine Del Mar's food and drink prices come from its [location-specific published ordering menu](https://order.toasttab.com/online/brigantine-del-mar-3263-camino-del-mar). The other 119 profiles use branch-specific, restaurant-published OpenTable specials menus captured earlier on October 8. The [venue/source manifest](restaurant-special-menu-backfill-2026-10-08.csv) records each updated menu and its source.

Only previously empty specials menus were enriched. Numeric prices must be published explicitly; combined regular/specials menus require identified happy-hour prices. Published reductions are displayed as reductions, rather than displaying the regular price as a special price. Unpriced items and unavailable Brigantine items were omitted. Imported selections are marked as samples; the published-menu link supplies the full menu.

Existing reviews, photos, coordinates and service windows were preserved. Published seating restrictions and surcharges were retained, including removal on request where the menu says so. Each venue was fetched immediately before its revision-checked update. All saved menu contents were read back from the management API.

This batch does not fill every restaurant's menu. Offers with unpublished prices, missing source captures, conflicting schedules or ambiguous menus retain their source links and can be enriched later through the management API. No dishes or prices were invented to fill gaps.

## Coverage

| City | Restaurants updated | Menu items |
| --- | ---: | ---: |
| new-york | 1 | 52 |
| los-angeles | 4 | 127 |
| san-diego | 3 | 72 |
| san-francisco | 7 | 88 |
| seattle | 15 | 265 |
| san-jose | 4 | 137 |
| phoenix | 20 | 368 |
| san-antonio | 2 | 54 |
| austin | 5 | 82 |
| fort-worth | 3 | 31 |
| dallas | 7 | 124 |
| houston | 11 | 240 |
| chicago | 9 | 117 |
| columbus | 3 | 50 |
| jacksonville | 2 | 39 |
| charlotte | 2 | 69 |
| miami | 9 | 179 |
| philadelphia | 9 | 157 |
| boston | 4 | 171 |

## Validation

- 120 payloads passed the existing management API schema before publishing.
- 30 focused tests passed for menu import, special-venue validation, runtime database integration and offer scheduling.
- Type checking and focused ESLint passed.
- Browser checks passed on desktop and a 390px mobile viewport: published prices, six-item preview, expansion to 21 food items, switching to cocktails, no horizontal overflow and no page errors.

The import helper is in scripts/restaurants/specialMenuImport.ts; it converts an already verified, branch-specific menu into factual item names/prices and restrictions. Source selection and service-window verification remain necessary before saving its output through the API.

## San Diego follow-up — October 10, 2026

Pushed 25 San Diego venue menus to production through the management API (revision-checked PUTs, read back by dry run first): 21 menus already transcribed in `restaurantSpecials.json` that the database lacked, plus fresh research for Lionfish (16 priced items, schedule corrected to Mon–Fri 5–6 pm), Casa Gabriela (21 priced items from the happy-hour flyer), NINE-TEN (half-price bottles only) and Chez Loma (16 happy-hour items from its own Toast menu, plus the $39 Early Bird Prix Fixe from chezloma.net).

Left link-only after a deep search (no branch-published items reachable): Brigantine Portside Pier, Point Loma, Coronado, La Mesa, Poway (location pages publish only the schedule; ChowNow and OpenTable menus have no happy-hour category; Coronado's only items are from a 2022 article and were dropped); Born & Raised (operator publishes a regular food PDF and cocktail flipbook, no happy-hour menu; third-party listing items unconfirmed); The Plot (lunch tasting menu courses are "seasonal" and not itemized; its Wed–Sun 3–5 pm happy hour has no published items).

Chez Loma's site text says happy hour is 5–6 pm while its calendar and OpenTable say 4:30–6 pm; the stored schedule keeps 4:30–6 pm and the menu note records the conflict. Casa Gabriela's flyer says daily while its site says Tue–Sun; the site schedule is kept.

### Same gap in New York and Los Angeles — October 10, 2026

A full diff of production against `restaurantSpecials.json` found 72 more venues (New York 35, Los Angeles 37) whose repo menus never reached the database. All 72 were saved through the management API with their repo items and `menuLabel` links; no failures. Before this push 628 of 927 production venues had no menu items and **no items in the repo either** (San Diego 6, New York 12, Los Angeles 11, San Francisco 25, Seattle 37, San Jose 19, Phoenix 31, San Antonio 18, Austin 44, Fort Worth 24, Dallas 44, Houston 43, Chicago 47, Columbus 35, Jacksonville 14, Charlotte 7, Miami 77, Philadelphia 43, Boston 18). Those need fresh branch-specific research.

### Miami deep pass — October 10, 2026

77 Miami venues with no items in the database or the repo were researched branch by branch (operator pages and PDFs, ordering menus, OpenTable offers/menus). 45 were saved through the management API with verified items; 32 stay link-only or on hold. Held back: Seasons 52 ×3 and The Capital Grille (operator sites bot-blocked), Sea Watch (closed for renovation), goodtime hotel restaurant (menu header "August–September"), Morton's Coral Gables (no prices, Spice link inferred), Sumak (undated listing), Sofia and CLAUDIE (offer not confirmed current), Giselle (items not marked as discounted), Cooper's Hawk Dania Beach (chain-level menu), Fleming's Fort Lauderdale (offer may be stale), Batch Miami (price tiers only). Separate offers found but not attached to cards: Edge "Executive Lunch", Zuma $38 business lunch, Havana 1957 Ocean Drive $28 lunch, CHIMBA Wine Down Tuesday, Batch "Hooky Hour". Stored-schedule conflicts left unchanged (recorded in the menu notes): Dal Contadino (Mon–Sat 5–7, Sun 4–6, seasonal), A Fish Called Avalon (3–7 vs 5–7), Phuc Yea, Nusr-Et ($39 daily 12–5:30), Casablanca ($40 vs $35), Pinch Kitchen, Funky Buddha, Reunion.

### Chicago and Seattle deep pass — October 10, 2026

84 venues researched branch by branch; 65 saved through the management API with verified items (Chicago 41, Seattle 24 of the researched set, including set-menu choices shown as "Included in $X"). Held back: Duke's Bellevue (happy-hour page shared across all locations), Franklin Room (bar snacks not labelled as happy-hour prices), Prime & Provisions (PDF labelled JULY26), Bottle & Bull (menu image dated June 2025), Baron's Sino (dim sum is weekend-only per OpenTable), Camp West (offer dated Oct 18–31 only), Ruth's Chris Seattle (course choices unpublished), JOEY Bellevue (menu will not load). Seastar's oyster price was dropped (source typo). Stored-schedule conflicts left unchanged and recorded in menu notes: Butcher and the Bear, Eight Bar, Kindling, Pompette, Prosecco, Gaijin, Brasero, Mamma Melina, Hart and the Hunter, John Howie, Osteria La Spiga, Earls Bellevue, IL Bistro. Link-only (no published items): Adalina Prime, Andros Taverna, Mano a Mano, Shine, Osteria Langhe, Ada's, Metropolitan Grill, Barking Frog, Capital Grille Seattle, La Mar Bellevue, both JOEY Seattle branches, FlintCreek, Kindling's $39 lunch.

### Philadelphia, Dallas, Austin, Houston and Phoenix deep pass — October 10, 2026

Researched about 205 venues branch by branch and saved those with verified items through the management API (revision-checked PUTs, no failures): Philadelphia, Dallas and Austin in the first batch, Houston and Phoenix in the second. Menus published once for all of a brand's locations are stored under a "(all <brand> locations)" label (Cooper's Hawk, Federal Grill, Delucca, Haywire, Daily Gather) and never presented as branch-specific. Held back for staleness or unclear pricing: Colleen's Kitchen (Winter 2025–26 PDF), Wu Chow (March 2025), Zanti (Oct 2025 PDF), Ka Sushi (Dec 2022 footer), Truluck's Downtown and Arboretum (unclear whether prices are discounted), Parkside (computed half prices), Suerte (Lucky Hour price unprinted), HG Sply Co. (regular prices only), Sloane's Corner (partial read), Willie G's and Ninfa's (read via summaries), Fleming's Domain (not branch-resolved), Cage Huntingdon Valley (location "coming soon"), Cooper's Hawk Gilbert (stored URL points to Annapolis, MD). Blocked: Hudson House ×2 (expired TLS certificate, not bypassed). Separate offers found but not attached: Miss Saigon Wednesday, Il Brutto Wine Downs, Caroline Blush Hour, Maison Chinoise Dim Sum Happy Hour, MoMo weekly specials, B&B Butchers Fall Fixe, Cocody happy hour, Jasmine Rice weekday lunch.
