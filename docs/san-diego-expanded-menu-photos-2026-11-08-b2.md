# San Diego menu photos — expanded follow-up batch 2

November 8, 2026. Continuing the owner’s San Diego-first photo research, this pass saved **38 additional first-photo menu rows across 16 profiles / 15 restaurants**, locally and in production. Coverage increased from **1,495 to 1,533 of 4,882 saved menu rows**; **3,349 rows remain without photos**. Counts include duplicate menus/dishes and do not imply complete public-page coverage. The [machine-readable report](san-diego-expanded-menu-photos-2026-11-08-b2.json) contains changes, sources, rejected candidates and the remaining inventory.

## Additions

| Restaurant | Newly photographed menu rows |
| --- | ---: |
| Piacere Mio South Park | 7 |
| Wheat & Water | 7 |
| The Rabbit Hole | 6 |
| Knotty Barrel East Village | 4 |
| Fort Oak | 3 |
| Alchemy – Choose Thy Poison | 2 |
| Waterbar, Jimmy’s Famous American Tavern, Dini’s By The Sea, Frenchy’s Hideout, Werewolf, Monarch Ocean Pub, Fast Times, Coral Del Mar, Sushi Roka | 1 each |

Most operator discoveries came from empty-alt lazy images paired with the exact item-card heading and description, rather than image alt matching. Sources include [Rabbit Hole’s menu](https://rabbitholesd.com/san-diego-normal-heights-the-rabbit-hole-food-menu), [Piacere Mio South Park’s menu](https://southpark.piaceremiosd.com/san-diego-piacere-mio-food-menu), [Wheat & Water’s menu](https://www.wheatandwater.com/la-jolla-la-jolla-wheat-and-water-food-menu), [Knotty Barrel’s happy hour](https://ev.knottybarrel.com/san-diego-east-village-downtown-san-diego-knotty-barrel-east-village-happy-hour), and the original source URLs retained with every image in the provenance catalog. The Alchemy images are explicitly labelled Zarandeado and Braseado; Coral’s pictured lunch protein is shrimp and was assigned only to the shrimp variant. Fast Times’ pepperoni flatbread is captioned as that choice. Pictured drinks and whole bottles are distinguished from individually priced food and pours.

Fort Oak’s exact-branch Yelp Drink gallery and targeted `fries`, `tostada`, `wings`, and `shrimp` searches were checked. Three visually verified additions:

- [Gin and tonic](https://www.yelp.com/biz_photos/fort-oak-san-diego-2?select=hhgfMXnCXGdYhNg7ux7ePQ), Lance F., August 19, 2025.
- [Kennebec Fries w/ Togarashi Ranch](https://www.yelp.com/biz_photos/fort-oak-san-diego-2?select=cBfFgEMEGzcYzyiftW33Pw), An L., December 20, 2025.
- [Crispy fried chicken wings](https://www.yelp.com/biz_photos/fort-oak-san-diego-2?select=Lvu6SDEwcaIYjKt1XAriqQ), Ryan M., July 28, 2026.

Dates remain in captions. Old prices in photo captions were not imported into current menus. Fort Oak’s tostada search returned other named dishes and unlabelled food; these were not used for al pastor tostada. The shrimp search still needs candidate review. External dish reviews were preserved; this pass added photos only.

## Research and rejections

Followed **596 linked menu/gallery/ordering URLs** and checked **38 public operator WordPress media libraries containing 9,954 media records**. Many files have generic names, branch ambiguity, logos or no exact named match; library scanning is candidate discovery, not evidence that no suitable photo exists. Google/image searches rejected unrelated Amaya/TWO fries, other venues’ fries, and other-branch restaurant results. One Jimmy’s labelled operator-library photograph was usable.

Visual review rejected wrong photographs even where the nearby text seemed suitable: a cheese pizza with meat/olives, raw fish labelled gyoza, sangria beside a beer label, tacos beside sliders, logos, a sauce/food placeholder, and shared section pictures beside several unrelated dishes. The Sycamore image that appeared near six cocktail names was a single generic cocktail image and was not assigned to any. Wheat & Water’s chicken-wing photograph did not establish either explicit eight- or twelve-piece quantity. Dini’s tostada close-up did not establish the saved three-piece serving and was withheld. Grouped menu sections must not lend their first photograph to every named dish.

Remaining gaps continue to require exact-item official product/menu/ordering research, verified Yelp All/Food/Drink galleries and Google Images/Maps with original-source verification. No pending gap is declared exhausted solely from these scans.

## Verification and replay

Every saved image was visually reviewed, uploaded to Azure and checked via public download before saving. Complete API profiles, revisions, enabled states and specials region fields were checked on readback in both environments. Final audit asserts unchanged item identities, prices, notes, categories and reviews. Existing images were preserved.

Wheat & Water’s ordinary profile was missing locally. Its complete production profile was created through the local restaurant-content API and read back; local ID 1967 differs from production ID 1966. The resumed save matched by exact source. Source matching also mapped Piacere Mio’s different local ID. No production deployment, migration or translations were run.

**Eleven exact-source production native pins include the new image URLs in their HTML.** Fast Times, Monarch Ocean Pub, Werewolf and Sushi Roka have no matching pin after exact-source and title checks; their photos are stored in management profiles, but native public visibility is not claimed. Missing pins still require exact-branch opening evidence before creation.

Sources, downloaded images, review sheets, before/after inventories, full readbacks and resumable scripts: `.scrape/san-diego-expanded-2026-11-08-b2/`. Durable provenance: `scripts/restaurants/menuItemPhotos.json`. Existing bundled specials receive the five matching reviewed photo fields. The restaurant research skill now includes exact-card association, operator-library caveats and source-based recovery for missing local profiles.

Validation: all 27 targeted menu/photo and management-content validation tests passed; the skill validator and whitespace checks passed.
