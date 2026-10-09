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
