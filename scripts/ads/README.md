# Standalone product ads

`products.json` records five distinct products found on Amazon US's electronics
bestseller list on October 6, 2026. Ranks are a research snapshot, not live ranks
or claims displayed in ads. All five passed the site's brand, stock, 4.3-star,
and 100-review checks at import. Fire TV Stick HD was excluded for its 4.1-star
rating; other streaming listings did not return a readable buy-box price.

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
