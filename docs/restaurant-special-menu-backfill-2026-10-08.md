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
