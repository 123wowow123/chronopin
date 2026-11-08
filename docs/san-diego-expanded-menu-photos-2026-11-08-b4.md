# San Diego menu photos — expanded follow-up batch 4

November 8, 2026. Added **32 first-photo menu rows across five restaurant profiles**, in production and locally. Coverage increased from **1,541 to 1,573 of 4,882 saved menu rows**. **3,309 rows remain without verified photos.** Counts include duplicate stored menus and dishes; this continuing pass does not complete San Diego coverage. Existing review coverage remains 76 rows; this pass adds photos only.

The [machine-readable report](san-diego-expanded-menu-photos-2026-11-08-b4.json) retains each addition, source, rejection and the remaining item inventory.

| Restaurant | New first-photo rows |
| --- | ---: |
| Sammy’s Woodfired Pizza — Chula Vista | 12 |
| Sammy’s Woodfired Pizza — Imperial Beach | 12 |
| Sammy’s Woodfired Pizza — San Marcos | 4 |
| Oggi’s — Encinitas | 3 |
| Islands — Eastlake | 1 |

## Sources and matching

Sammy’s former `Location-Details/client/...` URL returned 404. Its current navigation leads to [Chula Vista’s menu](https://sammyspizza.com/sammys-chula-vista-menu/), [Imperial Beach’s menu](https://sammyspizza.com/imperial-beach-menu/) and [San Marcos’s menu](https://sammyspizza.com/san-marcos-menu/). Each exact dish card pairs a name, description and photo. The branch names and offered variants were verified before associating shared operator photography; saved profile identity sources were preserved. Photos are explicitly labeled as official chain-menu photographs rather than photographed at the saved branch.

Additions include lebni, meatballs and marinara, Brussels sprouts, pork dumplings, spring rolls, four-cheese pizza, chicken tenders, sweet-chili wings, chicken taquitos, the Mediterranean dip sampler, truffle fries, mini duck tacos, Margherita and mozzarella pizza. The last two images are AVIF files: they were decoded into PNG for visual review before the normal WebP Azure upload, without changing their content.

[Oggi’s Encinitas menu](https://www.oggis.com/location/oggis-sports-brewhouse-pizza-encinitas/) associates CSS-background photos with the Ultimate Cheddar Burger, chicken tortilla soup and popcorn chicken. Its saved lunch cheeseburger is the named cheddar burger. Captions distinguish pictured fries from the popcorn-chicken happy-hour offer; the burger caption preserves the saved lunch side. [Islands’ official food menu](https://www.islandsrestaurants.com/menu) supplies Eastlake’s cheddar-fries photo, with background food described as separate.

## Rejections and unfinished leads

Sammy’s Carne Asada Tacos card uses a `Carnitas-Tacos` image filename; that pork/beef ambiguity was not resolved by appearance, so it was withheld. Oggi’s beer and hard-seltzer cards used bottle-cap illustrations rather than photographs. Fogo’s seafood, side-dish and Market Table pages had named descriptions but no per-item photos; category backgrounds were not lent to every dish. Searches and additional operator checks covered Queenstown, Candor, Waverly, Farmer & The Seahorse, Romanella, Ciao, Bacari and Pacific Catch, without a newly verified exact-item image in this pass. These checks do not exhaust their possible official, Yelp or Google sources.

LOLA 55 ordering-page browser research was interrupted by active Chrome use before its menu could be inspected. No browser-access success or photo match is claimed for that attempt. Continue its exact-branch browser research and remaining branch-specific Yelp All/Food/Drink and Google Images/Maps original-source verification in a later pass.

## Verification

Nineteen distinct photos were visually reviewed, uploaded to Azure and checked by public download. Complete profile readbacks in production and locally verify the 32 additions, revisions, enabled state and specials region fields. The before/after item audit verifies preserved identities, prices, notes, categories, existing images and reviews. Replay metadata is synchronized in `scripts/restaurants/menuItemPhotos.json`; none of these entries matched an existing bundled snapshot row, so bundled menus were unchanged.

Source pages, screenshots of image contact sheets, downloaded files, uploads, manifests, inventories and full API readbacks remain in the ignored `.scrape/san-diego-expanded-2026-11-08-b4/` workspace. The restaurant research skill now describes recovering photos through current branch-menu navigation after old operator URLs return 404, with a reminder to resolve variant conflicts.

Sammy’s Imperial Beach native production pin [20554](https://www.chronopin.com/pin/20554/sammy-s-woodfired-pizza-imperial-beach-san-diego-restaurant-guide) contains all 12 new image URLs in its public HTML. Exact-source and title checks found no matching native pin for Sammy’s Chula Vista, Sammy’s San Marcos, Oggi’s Encinitas or Islands Eastlake; the other 20 photo rows are saved in management profiles, with native public visibility not claimed. Missing backing pins still require verified exact-branch opening evidence before creation.

All 27 targeted menu/photo and management validation tests passed, together with the skill validator and whitespace checks. No deployment or translations were run.
