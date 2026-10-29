# San Diego Specials repair — October 29, 2026

The live guide initially showed two restaurants despite having 279 enabled regional offer profiles. The guide requires a matching native Pin before displaying a card; those profiles had no exact source match. LOLA 55 also had a separate canonical pin and duplicate offer profile. Service hours and ratings were not the main cause of the shortage.

## Content repair

- Researched and published 150 missing branch pins, with opening evidence, date precision, source references and credited Azure photos. Approximate years/seasons are explicitly estimated timeline anchors; menu-check dates are never used as openings.
- Preserved published menus, prices, service windows and offer conditions. Existing canonical pin authors were retained; new pins belong to FoodDesk.
- Merged LOLA 55’s scheduled happy hour into its canonical pin (6443), retained its ordinary food/drink menus, and disabled the duplicate profile.
- Disabled Barrio Star’s obsolete offer after checking its reported October 2025 closure.
- Replaced three external photos with verified public Azure blobs and added operator gallery/site photos for Beaumont’s and Uptown Tavern. No pin image files were added to Git.
- Refreshed Sidecar’s explicitly dated operator calendar for October 29–November 4, preserving its prices and bounded validity.
- Corrected Tommy Bahama’s mall label to Fashion Valley while preserving the branch address. Its opening date remains queued.

These are database content changes through authenticated management APIs, applied locally and in production. No deployment, VM build, restart or resize was performed.

## Remaining coverage

The initial live audit found an unintended code cap of **100 upcoming restaurants**. The owner clarified that no restaurant count limit is intended. The truncation has been removed from `src/lib/restaurantOffers.ts`, so sorting and deduplication retain every eligible restaurant and the guide paginates the full result. This code correction has not been deployed; the earlier production counts below describe the version before this correction.

The companion JSON records 127 profiles awaiting branch-opening or identity evidence, including the URLs checked and specific conflicts where found. Operator pages, linked history pages and independent opening reports were searched. Ownership purchases, previews, host-building openings and predecessor addresses were not accepted as proof of a branch’s first service.

Taste of the Himalayas Hillcrest remains unavailable in scheduling until its holiday exclusions have a sourced branch calendar. Pacifica Del Mar needs a December 1 recheck following its announced December 2026 closure; no exact closing day was invented. Sidecar needs a fresh calendar reading after November 4.

## Verification and replay

The final local and production audits passed at 14:18 UTC on October 29: 150 pins, 150 opening citations and 150 saved photos in each environment; 100 upcoming guide cards. After removing the unintended cap locally, the guide returned 149 eligible upcoming restaurants across 25-card pages, including a populated page at offset 100, with no duplicates and native pin links for every card. All 46 offer scheduling, regional offer and specials map tests passed, as did ESLint and TypeScript. The audit checks native pin dates/confidence and citations, author preservation, saved media links/dimensions/credits, unchanged menus and schedules, canonical LOLA linkage, the disabled closed venue, and paginated guide cards. Browser checks verified the first 25 cards’ title/image destinations, opened a native pin and confirmed its menus render. ESLint and TypeScript checks passed.

Reviewed branch evidence and outstanding research are in `restaurant-san-diego-specials-repair-2026-10-29.json`. The repair script defaults to read-only and refuses ambiguous/archived pin matches, changed offer revisions and invalid photo imports. With an admin token already set in `CHRONOPIN_ADMIN_TOKEN`, preview using:

```sh
npx tsx scripts/restaurants/repairSpecialPins.ts --url https://www.chronopin.com
```

Add `--apply` only to publish the reviewed entries. Existing matching pins are retained. Content edits and identity/archive corrections above are separately documented in the JSON rather than silently replayed by the pin-creation script.
