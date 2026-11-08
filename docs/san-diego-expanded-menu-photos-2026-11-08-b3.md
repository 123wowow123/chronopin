# San Diego menu photos and reviews — expanded follow-up batch 3

November 8, 2026. Saved **8 additional first-photo menu rows across 5 restaurants**, plus **4 sourced dish-review associations**, in production and locally. Photo coverage increased from **1,533 to 1,541 of 4,882 stored menu rows**; review coverage increased from **72 to 76 rows**. **3,341 rows still need verified photos.** Counts include duplicate stored menu rows; this is a continuing research pass, not full-city coverage.

The [machine-readable report](san-diego-expanded-menu-photos-2026-11-08-b3.json) records every addition, source, rejection and remaining item.

| Restaurant | New photo rows | New review associations |
| --- | ---: | ---: |
| Harumama Noodles + Buns — Little Italy | 4 | 4 |
| Wheat & Water | 1 | 0 |
| Duke’s La Jolla | 1 | 0 |
| Oggi’s — Encinitas | 1 | 0 |
| Common Stock | 1 | 0 |

Harumama’s pig bun, chicken character bun, Fat Duck ramen and pork bao photos come from [Kirbie’s Cravings’ February 6, 2018 review](https://kirbiecravings.com/harumama-noodles-and-buns/), verified against its 1901 Columbia Street address. The single-bun photos show the opened filling; the chicken character bun contains sweet custard. Photos explicitly retain their historical date, and the ramen caption identifies the pictured egg. Four short verbatim excerpts retain praise and criticism, with the publication date and a historical soft-opening label. Together they quote 24 words from the article. Old menu prices and the soft-opening promotion were not imported.

Wheat & Water’s [official menu](https://wheatandwater.com/food-menu?menu_id=1406514) supplies the Margherita photograph. The other three additions reuse already stored, visually rechecked Azure images: [Duke’s coconut shrimp](https://www.yelp.com/biz_photos/dukes-la-jolla-la-jolla?select=0FjvdsaqE1iVG_yEjhKxWA), [Oggi’s cheese-only Stix](https://www.oggis.com/location/oggis-sports-brewhouse-pizza-encinitas/), and [Common Stock’s steak frites](https://www.yelp.com/biz_photos/common-stock-san-diego?select=twE6sWOUBi6XEAKBQrYRgw). Common Stock’s [operator page](https://eatcommonstock.com/) confirms the Monday steak-frites feature. Oggi’s image retains its official chain-photo attribution. Existing images were reused without duplicate uploads.

## Source checks and rejected matches

This pass revisited official item-card associations and checked fourteen branch-specific food-blog articles, the publisher’s own search, Harumama’s public operator media library, and its linked ordering pages. The live retired Carlsbad photo-menu URL now renders an Archives page despite an older indexed menu; it was not used as current photo evidence. Harumama and LOLA 55 ordering URLs returned HTTP 403; those remain browser-research leads, not exhausted gaps. Publisher search found reviews that ordinary search missed, but many older dishes do not match the saved current menus.

Visual checks rejected the Rabbit Hole “Fried Fish” card photo because its flat tostada-like presentation did not verify the saved fried fish taco; Queenstown’s Habanero Chicken photo was a sandwich rather than the saved dinner; McP’s gravy fries did not verify the added cheese. Other withheld operator matches included meat/olive toppings on a cheese-pizza label, raw fish under a gyoza label, shrimp plate lunch offered as chicken/salmon variants, and a chili/spice icon returned for Alfredo. Explicit wing counts and three-piece tostada servings remain unverified. A matching heading alone does not establish that its photograph is correct.

## Verification and remaining work

Five newly uploaded files and three existing blobs passed public image-download checks before saving. Full profiles, revisions, enabled state, specials region fields, images and reviews passed API readback checks in both environments. Local Wheat & Water matched by source to ID 1967; production is ID 1966. Final inventory comparison verified unchanged identities, prices, descriptions, categories and existing reviews/images. Only the reviewed image and review fields changed.

Three exact-source native production pins contain their new photos in public HTML: Wheat & Water (20474), Duke’s (20505) and Harumama (20528). Harumama’s four review excerpts also appear in its public HTML. Common Stock and Oggi’s Encinitas have no matching native pin after exact-source and title checks. Their photos are saved in management profiles; native public visibility is not claimed.

Resumable evidence, source pages, review sheets, before/after inventories, uploads and full readbacks: `.scrape/san-diego-expanded-2026-11-08-b3/`. Durable replay catalogs: `scripts/restaurants/menuItemPhotos.json` and `scripts/restaurants/menuItemReviews.json`. None of these eight entries matched an existing bundled snapshot row, so bundled menus were not changed. The restaurant research skill now documents official-photo mislabeling, spice-icon rejection, publisher-native search and retired photo-menu URLs.

All 27 targeted menu/photo and management validation tests passed; the skill validator and whitespace checks passed. No deployment or translations were run. Remaining items still need exact-item official research, branch-specific Yelp All/Food/Drink galleries and Google Images/Maps original-source verification; no full coverage or exhaustive absence is claimed.
