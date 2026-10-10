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
