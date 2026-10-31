# Restaurant dish-photo follow-up — October 30, 2026

This pass saved **18 distinct reviewed photos in 22 menu-item attachments across seven restaurants**, removed five unsuitable attachments, and implemented offer-menu thumbnails. The broader coverage task remains open. No deployment or translation run was performed; translations are left to the separate translation agent.

## Production changes

| Restaurant | API record | New attachments | Verification |
| --- | --- | ---: | --- |
| The Smoke House, Burbank | Specials 79 | 2 | Public Azure downloads and complete API readback; no backing pin found |
| North Italia, Cerritos | Specials 162 | 2 | Public Azure downloads and complete API readback; no backing pin found |
| Telefèric Barcelona, La Jolla | Content 12 + Specials 172 | 3 + 3 | Three shared photographs; both saves read back; strip and thumbnails on [pin 6438](https://www.chronopin.com/pin/6438/teleferic-barcelona-opens-its-first-san-diego-restaurant-at-utc) |
| Ciccia Osteria | Content 16 | 3 | Ordinary-only path; strip, thumbnails, enlarged image and credit on [pin 6442](https://www.chronopin.com/pin/6442/ciccia-osteria-san-diego-restaurant-guide) |
| Del Lusso, Carlsbad | Specials 1163 | 3 | Exact saved branch address verified; public Azure downloads and API readback; no backing pin found |
| Lionfish, Pendry San Diego | Specials 37 | 2 | Strip, thumbnails, enlarged photo and credit on [pin 20504](https://www.chronopin.com/pin/20504/lionfish-at-pendry-san-diego-san-diego-restaurant-guide) |
| Harumama, Little Italy | Specials 974 | 4 | Three photos: seaweed salad appears in both lunch and happy-hour menus. Strip and ramen thumbnails on [pin 20528](https://www.chronopin.com/pin/20528/harumama-noodles-buns-little-italy-san-diego-restaurant-guide) |

All candidates were inspected visually before upload. Captions, credits, source photo pages, public Azure URLs, dimensions, removals and each researched venue's remaining items are in [the evidence JSON](restaurant-dish-photos-2026-10-30.json). Temporary downloads, inventory snapshots, review sheets and API readbacks are in ignored `.scrape/dish-audit-2026-10-30/`. No photos were added to Git. Existing prices, menus, dates, specials, enabled flags and unrelated content were preserved.

## Existing-photo audit

Reviewed 42 existing attachments: all nine Culinary Dropout photos; three Tajima edamame photos; the flagged STK and Fogo photos; and 28 photos at Café Sevilla, Islands Mira Mesa and Yard House Mission Valley. This is a targeted sample, not a catalogue-wide audit.

Removed and verified through fresh management-API readbacks:

- STK San Diego: Mushroom Arancini — photo shows a burger and fries.
- Tajima Mercury: Edamame — photo also prominently shows wings. Convoy and College Heights edamame photos retained.
- Fogo San Diego: Lobster Mac & Cheese — table-wide shot does not clearly isolate the named dish.
- Café Sevilla: Lamb Sliders (2) — photo shows one square sandwich, not the two named sliders.
- Islands Mira Mesa: Tiki Tenders & Fries — photo shows tenders with carrots and celery, without fries.

Culinary Dropout's [Yelp branch](https://www.yelp.com/biz/culinary-dropout-san-diego-2) is at 12875 El Camino Real, matching the saved Del Mar profile. Its nine photos were retained. The Yelp addresses also match Café Sevilla (353 Fifth Avenue), Islands Mira Mesa (10669 Westview Parkway), and Yard House Mission Valley (1640 Camino Del Rio North, Suite 157).

## Research findings and software

Lionfish and Harumama do have named food photographs. The matcher previously took segment 1 after splitting an image alt on ` - `; that segment was `San Diego` or `Little Italy` within the business name. It now strips the complete business name obtained from the gallery heading before reading the caption, and stops if the gallery heading is absent. Manual searches recovered the accepted images. Generic photos and photos of a different dish were excluded.

Del Lusso's [Carlsbad Yelp branch](https://www.yelp.com/biz/del-lusso-carlsbad) matches the stored address, 6021 Innovation Way, Suite 120. Its Margherita, L'Americano and Spaghetti Bolognese photos were saved. A Telefèric jamón candidate was rejected because it depicts a retail ham leg, not the plated menu item.

`restaurant-content` already validates menu images through `parseSpecialVenue` and retains their complete shape. A regression check verifies acceptance of a credited image and rejection of incomplete attribution. Same-label specials menus override ordinary menus, which initially concealed the Telefèric content save; the matching images were therefore also saved on Specials 172. Ciccia has no corresponding specials profile, so its live pin confirms the ordinary-content path independently.

`RestaurantOfferMenu.tsx` now uses the existing `MenuDishPhoto` thumbnail and lightbox. The earlier eager-loading lightbox fix remains in the code. Neither feature was deployed in this session.

New `scripts/restaurants/yelpDishes/applyReviewed.py` supports both management APIs. It requires a reviewed manifest and source caption, matches the exact branch source/menu label/item name, refuses to replace an existing photo, checks public Azure availability, uses fresh revisions and compares complete readbacks. It defaults to dry run and supports idempotent reruns. Its evidence file accumulates successful writes across runs. The manifest and upload JSONL contain no credentials.

Validation: 19 tests passed across the restaurant validators, content service and content/specials runtime suites; TypeScript and targeted ESLint passed. Python compilation and browser-matcher syntax checks passed. The completed manifest rerun in dry mode found no further additions. A final snapshot comparison verified all 22 expected new attachments and preservation of every non-image profile field across all 13 changed records.

## Coverage and remaining work

Production snapshot after this pass:

- 1,547 specials profiles total, 192 with photos, 977 item attachments.
- San Diego: 189/280 specials profiles with photos, 970 attachments; **91 still without photos**.
- Los Angeles pilot: 2/2 researched profiles yielded four accepted photos. Both lack backing pins, so this measures stored-profile matches, not visible guide coverage. The sample is too small for a citywide hit-rate estimate. Another 55 Los Angeles profiles remain unresearched in this pass.
- 1,267 specials profiles are outside San Diego; the older ~2,700 estimate was incorrect.
- 1,961 content records contain 3,185 menus. Two content records now have six dish-photo attachments. Other content records remain without dish photos; some contain only tiles/details or link-only menus.

Exact-source and title-filtered admin reads found no backing pins for The Smoke House, North Italia Cerritos, Del Lusso, Café Sevilla, Islands Mira Mesa or Yard House Mission Valley. Their menu-photo saves are verified, but native pin-page or guide-card display is not. Do not create pins using a research date: obtain branch-specific opening evidence first. This explains why the three later San Diego batch examples could not be found for browser verification.

Knotty Barrel East Village's [exact branch](https://www.yelp.com/biz/knotty-barrel-san-diego-2), 844 Market Street, has generic “Happy Hour Smash Burger” photographs, but its photo search returns zero “Oklahoma” results. No image was attached to the single/double Oklahoma variants without evidence identifying the variant. Its drink-heavy and generic “selected apps” items remain unresolved. Brigantine La Mesa sliders, house salad, nachos and drinks remain unresolved, along with the remaining San Diego venues and item lists in the evidence JSON.

Continue with visually reviewed batches, beginning with names affected by the repaired parser. Inspect every candidate rather than treating token matches as confirmation. Broader city/content-record expansion and the full existing-photo audit remain incomplete. Deployment requires a separate explicit deploy request.
