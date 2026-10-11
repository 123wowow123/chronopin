# Chinese snack and beverage selections — October 11, 2026

The owner requested both Amazon ads and timeline product pins. Two curated
guide pins are dated to their research/publication day, not a launch date.
No comprehensive current national sales ranking was verified; titles use
“favorites” rather than “most popular” or numbered bestseller claims.

## Verified ads

| Product | Amazon ASIN | Rating | Reviews | Checked USD pack price |
| --- | --- | --- | --- | --- |
| White Rabbit milk + matcha candy bundle | B013N84N62 | 4.3 | 659 | 12.49 |
| Weilong spicy konjac, 20 × 18 g | B0BWF7ZPBN | 4.3 | 131 | 9.99 |
| Want Want sugar-glazed rice crackers, five packs | B019JIEMWA | 4.6 | 2390 | 17.70 |
| ChaCha sunflower seeds, 18 × 250 g | B0057PTVIU | 4.4 | 1106 | 82.99 |
| Huang Fei Hong spicy peanuts, eight packs | B00JSVQT8E | 4.6 | 435 | 24.19 |
| Haw flakes, four packs | B00J4XHN86 | 4.5 | 269 | 8.69 |
| Oriental Leaf jasmine tea, 15 × 16.9 fl oz | B0D3KV5THM | 4.5 | 133 | 46.49 |
| CHI FOREST Lychee Fizzy, 24 × 11.16 oz | B0BVZNV72D | 4.7 | 443 | 28.98 |

Pack prices exclude shipping and tax and can change. Readback and public
image checks passed. All are in stock with a readable brand, price and image.
Research evidence, listing JSON and API receipts are in ignored
`.scrape/chinese-products-2026-10-11/`.

## Beverage guide coverage beyond ad eligibility

Wanglaoji B0F286F1X4 (24 cans, $68.98, 10 reviews), Jia Duo Bao B00DUQ2HLG
(24 cans, $54.99, 7 reviews), Wahaha B0DLQXH5MQ (24 bottles, $36.99,
1 review), and Coconut Palm B08K2HJSW6 (three 1 L cartons, $39.99,
6 reviews, 3.3 stars) are guide entries, not ads. Product identity is from
the listing title and packaging; some Amazon brand fields name a distributor
or Generic. No medical claims were carried into either guide.

## Sources and photos checked

- [Shinho official Huang Fei Hong catalog](https://www.shinhoglobal.com/brandgroup/huangfeihong/shinhoprodprint-20): verified spicy-peanut product and official 110 g photo. Pin caption explains the linked US listing is an eight-count pack.
- [Weilong factsheet](https://www.weilongshipin.com/en/Factsheet.html) and [product gallery](https://www.weilongshipin.com/en/chanpinzhongxin.html): company and product-family evidence; selected Amazon item is konjac, not wheat-gluten latiao.
- [Want Want manufacturer rice-crisps page](https://wantwant.en.taiwantrade.com/product/rice-crisps-394442.html): product-family evidence. Main official digital/gallery page timed out through browsing. Want Want is Taiwan-origin, widely sold in China.
- [ChaCha official sunflower-seed catalog](https://chachafood.com/info.php?class_id=101): search indexed product category; open returned 502. Amazon listing supplies verified pack details.
- [Nongfu Spring official catalog](https://www.nongfuspring.com/goods/detail-all.html?id=1): identifies jasmine tea; direct page uses dynamically loaded product images. Singapore official linked product page returned a shell without a usable gallery image. Verified Amazon packshot used with listing credit.
- [CHI FOREST official flavors](https://www.chiforest.com/flavors): Lychee Fizzy verified. Official page image extraction yielded logos, not a verified flavor packshot; Amazon Lychee Fizzy listing photo used with listing credit.
- [White Rabbit recognition reporting](https://www.citynewsservice.cn/articles/cns/shanghai-living/try-this/try-this-white-rabbit-milk-tea-shop-draws-global-visitors-to-nanjing-rd-amyyr08m): background only; no sales rank inferred.
- Every product's linked Amazon listing was read directly. Search labels were insufficient: White Rabbit initially returned unrelated Smarties, Wahaha returned BOOST, and herbal-drink searches returned unrelated supplements or tea pods. Those were excluded.

Local photos are ignored; the pin API uploads thumbnails to Azure Blob
Storage. Public thumbnails and pin content must be verified after publishing.

## Published and verified

- [Chinese Snack Favorites](https://www.chronopin.com/pin/7656/chinese-snack-favorites-white-rabbit-weilong-want-want-and-more): pin 7656, six products, nine references, one official product photo and six attached eligible ads.
- [Chinese Beverage Favorites](https://www.chronopin.com/pin/7657/chinese-beverage-favorites-oriental-leaf-chi-forest-wanglaoji-and-more): pin 7657, six products, eight references, two listing photos and two attached eligible ads.

Both public pages, content readback, attached ad counts and all public Azure
thumbnails passed verification. Standalone live ad inventory now has 36 rows.
No deployment was performed.

## Taste profiles

The owner subsequently requested taste profiles. Both live guides now include
per-product profiles using the site's seven axes (aroma, bitterness,
sweetness, astringency, umami, pungent and coolness), scored 0–5 in half steps.
There are 13 profiles covering 12 guide entries: White Rabbit's original milk
and matcha variants are scored separately. Scores are explicitly editorial
estimates, with linked descriptions or firsthand tasting evidence; lower
confidence and product-family estimates are identified. Salt, sourness and
texture remain prose notes rather than being misrepresented as astringency
or umami. Coolness means mint-like sensation, not refrigeration or TCM claims.

Structured profiles and source/basis records are preserved in
`docs/chinese-product-taste-2026-10-11.json`. The live guide content was updated
through PUT `/api/pins/:id?lightweight=1`; references and media were preserved,
and profiles were verified in API readback and public page HTML.

`PinTaste` and `/api/pins/:id/taste` store one profile per pin. These pins each
cover six different products, so their individual profiles are published in
pin details rather than assigning one misleading aggregate radar to the whole
guide. For a single-product food or beverage pin, use the native taste API
with source `session` and sourced basis, preserving any existing hand profile.

## Beverage thread and native radar widgets

The owner requested a separate threaded pin and native radar for every product
in beverage guide 7657. The guide now serves as the thread index; its former
multi-product taste tables were replaced with links to six product pins:

| Product | Pin |
| --- | --- |
| Nongfu Spring Oriental Leaf Jasmine Green Tea | 7658 |
| CHI FOREST Lychee Fizzy Sparkling Water | 7659 |
| Wanglaoji / Walovi Canned Herbal Tea | 7660 |
| Jia Duo Bao Canned Herbal Tea | 7661 |
| Wahaha A&D Milk Drink | 7662 |
| Coconut Palm Coconut Milk Drink | 7663 |

Each was created with `parentId: 7657`, an individual product name, verified
listing pack details, a credited product photo, source evidence and a
publication-date explanation. Walovi branding in the Wanglaoji listing image
is explicitly identified; regional formulations may differ. No launch date
or national sales rank is inferred.

Each native profile was saved through PUT `/api/pins/:id/taste` with source
`session`, all seven axes and the original sourced basis. The two eligible
ads were also attached to their respective individual product pins; the four
low-review products remain excluded from ads. No hand profile was overwritten.

All six public pages render the native `TasteRadar` SVG with the taste summary
in its accessible label. Native taste API responses, parent IDs, the thread API,
parent index links and all public Azure photos passed verification. Profiles
are recorded in `scripts/products/taste.json`; the structured research JSON
now identifies the individual beverage pin and retains `guidePinId: 7657`.
The snack guide uses the same individual-pin structure, documented below.

## Snack thread and native radar widgets

The owner requested the same individual-pin structure for snack guide 7656.
It now serves as a thread index, replacing its former taste tables with links
to seven child pins, each with its own native taste profile:

| Product | Pin |
| --- | --- |
| White Rabbit Original Milk Candy | 7664 |
| White Rabbit Matcha Milk Candy | 7665 |
| Weilong Fragrant Spicy Konjac Strips | 7666 |
| Want Want Sugar-Glazed Rice Crackers | 7667 |
| ChaCha Roasted and Salted Sunflower Seeds | 7668 |
| Huang Fei Hong Spicy Peanuts | 7669 |
| Haw Flakes Hawthorn Sweets | 7670 |

White Rabbit's two flavors are separate because their taste profiles differ.
Their primary source and photo are the respective World Market and Auntie K
Candy product pages, inspected before publishing. The linked eligible Amazon
ad is the previously verified milk-and-matcha bundle; the pin text identifies
its $12.49 checked price as a bundle price, and the individual flavor pins do
not claim that price for one flavor. The other five pins use their inspected
Amazon listing images and verified pack details. Existing official galleries
and gallery gaps are recorded above; the White Rabbit retailer galleries
provide flavor-specific product photographs, uploaded through the pin API
to Azure Blob Storage.

All seven were created with `parentId: 7656`, @SnackDesk authorship, sourced
product details, photo credits and an explicit research/publication-date basis.
Native profiles were saved via PUT `/api/pins/:id/taste` with source `session`.
Each has one relevant eligible ad. The parent retains the overview and links
to every product pin; its old per-product taste tables are replaced by this
index. Individual profiles are preserved in the taste import snapshot and
structured research JSON, with `guidePinId: 7656` retained.

All seven public pages, native radar SVGs, taste API responses, parent IDs,
thread API membership, index links and public Azure photos passed verification.
No deployment was needed or performed.

## Reusable strategy

Follow [Snack and beverage product guides](product-guide-strategy.md) for future collections: a parent guide, individual product/flavor children in its thread, and a sourced native taste radar on every child. This owner-confirmed strategy is also linked from the scraping vertical recipes, index and feedback log.

## Guide table navigation

Owner correction: product links belong in the guide table rather than a
duplicate list at the bottom. Snack guide 7656 now links its product-name
cells directly to pins 7664–7670; the White Rabbit bundle row contains
separate Original milk and Matcha links. The duplicate bottom list was
removed, while pack prices, source citations, photos and references were
preserved. API readback and the live table links passed verification.
The reusable guide strategy records this navigation pattern.

Follow-up correction: beverage guide 7657 now uses the same pattern. Its six
product-name cells link directly to pins 7658–7663, and the separate bottom
list is removed. Public table links, preserved reference content and photos
passed verification through the runtime API; no deployment was needed.

## Product launch dates

Owner correction: individual product pins should use a real launch date when
available, otherwise attempt a sourced estimate. This supersedes the initial
research-date convention above; the two guide pins retain their curation date.
Research and source URLs are preserved in
[structured launch evidence](chinese-product-launch-dates-2026-10-11.json).

| Pin | Sourced history | Timeline confidence |
| --- | --- | --- |
| 7658 Oriental Leaf jasmine | Late May 2011 Chinese line launch, including jasmine | Estimated; May 31 placement |
| 7660 Wanglaoji / WALOVI | April 8, 2024 US English brand identity introduction | Confirmed for that introduction, not original canned product |
| 7661 Jia Duo Bao | 2012 rebranding | Estimated; December 31 placement |
| 7662 Wahaha AD milk | 1996 product-family launch | Estimated; December 31 placement |
| 7663 Coconut Palm | June 1988 Beijing consumer introduction | Estimated; June 30 placement |
| 7664 White Rabbit milk | 1959 White Rabbit brand launch | Estimated; December 31 placement |
| 7666 Weilong konjac | 2014 Konjac Shuang line launch | Estimated; December 31 placement |
| 7667 Want Want Shelly Senbei | 1983 product launch in Taiwan | Estimated; December 31 placement |
| 7668 ChaCha seeds | Late 1999 sunflower-seed line launch | Estimated; December 31 placement |
| 7669 Huang Fei Hong peanuts | 2007 spicy-peanut launch | Estimated; December 31 placement |

Year/month boundaries are timeline placements, not invented exact launch days.
Each pin explains product-family, market and current-pack limitations and cites
its historical source. Sina and the People's Daily archive require GB18030
decoding to read their Chinese evidence accurately; their web parser returned
garbled text. The latter distinguishes June 1988 consumer introduction from
June 3 technical certification. White Rabbit's 1943 predecessor and ChaCha's
2001 company formation likewise do not date these products.

No defensible flavor-specific launch estimate was found for CHI FOREST lychee
(7659), White Rabbit matcha (7665), or the unidentified haw-flakes product
(7670). Manufacturer/retailer pages and historical searches were checked;
the CHI FOREST lychee testing report is availability evidence, not a launch
announcement. Those pins now have unknown date confidence and an explicit
launch-research gap; their retained October 11 research placeholders are
clearly distinguished from launch dates. Do not borrow the original milk
flavor's history to date matcha or invent a date for traditional haw flakes.

All thirteen API readbacks and public pages were checked after updating.
Historical dates, confidence, references and launch notes were verified;
photos, parent IDs, existing reference URLs and native taste profiles were
preserved, and every public page still renders its native radar. These were
runtime API edits; no deployment was performed.

## Customer ratings in threads

Owner requested product ratings in thread rows, like TV shows. The existing
thread UI already renders `RatingSummary` for all pins; these product children
had no native `PinRating` records. Added one verified customer-review source
for each of the thirteen products via the audited database API. Eleven use
their exact Amazon listings; White Rabbit original milk and matcha use their
separate Auntie K Candy product review widgets, not the mixed-flavor Amazon
bundle. Both widget aggregates were fetched and checked against their review
counts: milk 4.50/5 (46), matcha 4.55/5 (11).

Fresh Amazon reads verified every remaining product's score and review count.
Wanglaoji/WALOVI has 10 reviews, Jia Duo Bao 7, Wahaha 1, and Coconut Palm 6;
these small samples are explicitly noted on their pins. Ratings are retailer
customer assessments of the listing, not measured flavor scores or editorial
recommendations. The taste radar remains a separate editorial estimate.

Sources, exact scores, counts, scope and the October 11 check date are in
[structured rating evidence](chinese-product-ratings-2026-10-11.json).
Each pin includes a customer-rating paragraph and source citation. API
readbacks preserve launch dates, photos, parent IDs and taste profiles.
Both parent guides were saved to refresh their public thread pages; native
ratings were verified in the thread APIs and live rating badges. No app code
change or deployment was required. The reusable strategy now requires rating
research and native rating storage for future product threads.

## Coconut Palm tasting reviews beneath the radar

Owner correction on pin 7663: a taste radar should include the native review
section below it. Added two verified consumer tasting accounts to `PinTaste.reviews`:
Trang's April 29, 2023 Weee community ambassador post (links both 1 L cartons
and cans), and fractal324's Reddit tasting of the canned product. The latter
is explicitly identified as canned-version/product-family evidence, not a
tasting of the selected 1 L carton pack; its exact publication date was not
verified and remains null. The Weee quote covers coconut aroma, slight
sweetness and refreshment; the Reddit excerpt describes a thinner milky drink
with mild coconut flavor. These subjective reports do not establish measured
sensory scores or formulation identity across packs.

Joybuy's exact 1 L listing returned a 403 interruption page, so its indexed
review summary was not used as a firsthand excerpt. Existing seven-axis
scores and ABV fields were preserved. Updated the native taste snapshot and
structured research evidence; API readback and both live review links below
the native radar passed verification. No deployment was needed.

## Tasting reviews on all seven snack children

Applied the owner's same requirement to snack pins 7664–7670. Each native
taste profile now contains a verified tasting review, rendered with its source
link and short excerpt directly beneath the radar. Research evidence, dates,
scope and excerpts are preserved in
[snack tasting reviews](chinese-snack-tasting-reviews-2026-10-11.json).

Sources: Brand Eating's original White Rabbit milk-candy review; Hylton
Warburton's matcha-specific HelloAsia customer review; MiddleClass's red
fragrant-spicy Weilong tasting; Boo's plain sugar-frosted Shelly Senbei review;
Seed Guy's natural roasted salted ChaCha review; Heckin’ Hot's Huang Fei Hong
spicy peanut review; and MacKenzie Chung Fegan's Bon Appétit haw-flakes essay.
Matcha's customer-review publication date was not established and remains
null. MiddleClass's affiliate disclosure is labeled; the haw-flakes essay is
explicitly category evidence, not a tasting of the selected four-pack, and
its affiliate disclosure is recorded. Historical single-pack reviews do not
verify the current multipack's formulation or freshness.

Curated Cook's Shelly Senbei page was searched but returned 403 to direct
fetch; an accessible firsthand review of the same plain sugar-frosted product
was used instead. Seed Guy's page was inaccessible to the web parser but
successfully fetched directly, with article text and publication metadata
saved in ignored research files. No invented review dates or taste quotes.

Preserved all seven taste scores, ABV fields, launch dates, photos, parent IDs,
customer ratings and pin references. Synchronized the native taste snapshot
and structured evidence. Taste API readbacks and all seven rendered public
review sections beneath the native radars passed verification. Runtime API
updates only; no deployment was performed.

## Wanglaoji / Walovi tasting reviews

Follow-up on beverage pin 7660: the previous seven-snack update did not cover
this beverage. Added two verified firsthand tasting links beneath its native
radar: 爱吃的小猪's November 15, 2022 Yami community account and
ChimaFanIndiana's Reddit canned-Wanglaoji account. Quotes describe tea/herbal
notes, some sweetness and an iced-tea comparison. Reddit's exact publication
date was not established and is left null. Both are visibly labeled
product-family reviews; they do not establish the taste of this exact US
WALOVI 24-can listing or equivalence between market formulations.

The original Yamibuy hostname returned 405; the canonical Yami page was
accessible with the complete original and translated post. Walmart's US
WALOVI customer-review page was also checked but returned a robot challenge,
so indexed snippets were not used as verified review excerpts. Existing
seven-axis scores, ABV fields, launch date, photo, customer ratings and pin
references were preserved. Updated the native taste snapshot and structured
evidence; API readback and both rendered review links beneath the radar were
verified. No deployment was performed.
