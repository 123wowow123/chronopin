# Standalone product ads

`products.json` records five distinct products found on Amazon US's electronics
bestseller list on October 6, 2026. Ranks are a research snapshot, not live ranks
or claims displayed in ads. All five passed the site's brand, stock, 4.3-star,
and 100-review checks at import. Fire TV Stick HD was excluded for its 4.1-star
rating; other streaming listings did not return a readable buy-box price.

The catalog also includes the owner-selected MAGNA-TILES Metropolis 110-Piece
set (B07WDDB59W), added October 7, 2026 under Toys / Building Toys. It passed
the same listing checks; it has no electronics bestseller rank.

The owner-selected ANUA PDRN moisturizing cream (B0DWFLY18Y) and Shark
FlexStyle HD430 (B0B89P16MC) were added October 8, 2026 under Beauty.
Shark has a product-specific 4.2-star minimum; all other product ads retain
the 4.3-star minimum. Its brand, stock, photo, and 100-review checks still apply.

The owner also selected medicube Deep Vita C toner pads (B0BPLYHDPG) under
Beauty / Skincare and the Hanes EcoSmart fleece hoodie (B071GCRXN9) under
Clothing / Hoodies on October 8, 2026. Both passed the standard listing checks.

On October 11, 2026, eight snack products were researched through Amazon US
searches and their individual listings: Goldfish Cheddar snack packs, OREO
snack packs, Frito-Lay Classic Mix, SkinnyPop Original, Wonderful Pistachios
Roasted & Salted, KIND Dark Chocolate Nuts & Sea Salt bars, Haribo Goldbears,
and Cheez-It Original. Each passed the standard in-stock, brand, photo,
4.3-star and 100-review checks. Their categories include Food / Snacks and
the appropriate snack type. Product and search sources and the research date
are recorded per entry; these have no bestseller-rank claims.

All eight were saved directly to the live `ProductAd` table through the audited
admin table API and verified by reading the rows back. Content additions to
an installed product-ad runtime need no deployment; the inventory cache
refreshes within ten minutes. `products.json` remains the research/import
snapshot, and scheduled listing checks refresh the live facts.

The October 11 international expansion added another 18 products directly to
the live catalog: nine snacks (Pocky, Meiji Hello Panda, Lotus Biscoff, Kinder
Bueno, Loacker Quadratini, Tim Tam, Walker's Shortbread, Takis Fuego and Tao Kae
Noi seaweed) and nine beverages (Sanpellegrino Blood Orange, Perrier, Sangaria
Ramune Grape, Calpico Original, Ito En Oi Ocha, Inca Kola, Guaraná Antarctica,
Jumex Mango Nectar and Twinings English Breakfast tea bags). Every listing
passed the standard brand, stock, price, photo, 4.3-star and 100-review checks;
the saved rows were read back. Sources and checked dates are per product.
These are familiar international brands, with no live bestseller-rank or
country-of-manufacture claims. Twinings is clearly sold as tea bags.

The first Perrier candidate (B09NX4GKH3) lacked a readable brand, so the
verified branded B0017TK7PQ listing was used. Jarritos soda searches did not
yield a verified suitable soda listing: the candidate that cleared the review
bar was slushie syrup and was excluded. Nongshim candidates that appeared in
shrimp-cracker searches were noodle cups and were excluded. Search-result
brand labels alone are not enough to establish the product being advertised.

Apply the schema and populate the configured database:

```sh
npm run create:db
npm run ads:products -- stock
npm run ads:products -- list
```

`stock` re-reads Amazon and upserts by ASIN, so it can safely be repeated.
Only listings that pass the quality checks are saved. Photos, prices, ratings,
and titles come from the listing itself. The existing ad slots add the site's
affiliate tag, deduplicate products, and record impressions and clicks.
Titles currently fall back to English for other locales.

The scheduled `pin_ads_check` tool also refreshes standalone products. To run
the check by hand, use `npm run ads:products -- check --all`. Unavailable or
poorly reviewed listings are marked broken and stop serving; unreadable pages
preserve the previous facts. The serving inventory refreshes within ten minutes.

To add another product:

```sh
npm run ads:products -- add https://www.amazon.com/dp/ASINHERE00 Electronics
```

Use an actual product URL returned by Amazon and categories that suit it.
Deploy the code and run the migration and stock command against the target
database to make the same ads available there.

The October 11 Chinese-food selection added eight verified ads: White Rabbit
milk-and-matcha candy bundle, Weilong spicy konjac strips, Want Want
sugar-glazed rice crackers, ChaCha roasted and salted sunflower seeds
(18-bag case), Huang Fei Hong spicy peanuts, haw flakes, Nongfu Spring
Oriental Leaf jasmine tea and CHI FOREST Lychee Fizzy. Each cleared the
standard listing checks; live rows and image availability were verified.
These are curated favorites, with no national sales-rank claim. Want Want
is a Taiwan-origin brand widely sold in China. Misleading search results
for unrelated Smarties, BOOST, herbal-tea pods and coconut water were rejected.
Wanglaoji, Jia Duo Bao, Wahaha and Coconut Palm were researched for the
beverage guide but excluded from ads because their checked listings had
fewer than 100 reviews (Coconut Palm also rated below 4.3).
