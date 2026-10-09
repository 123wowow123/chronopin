# Product card thumbnail crops

Product cards use a separate 960×600 JPEG rendition under `card/v1/<thumbName>`
in Azure Blob Storage. The original photo and full thumbnail remain intact for
pin details. No pin photos or generated renditions belong in Git.

Every new image saved through the scraping/media ingestion path now generates
this rendition in `src/server/image.ts`, through `saveThumb`. This includes
images found by scraping, images attached by a curator and video stills saved
through the same thumbnail helper. A failed card upload does not fail a pin save.

`src/server/cardThumb.ts` checks tall images for a substantial coloured region
concentrated in part of the image. It excludes the outer margins and trims tiny
colour outliers, then includes padding around the region. This keeps identifying
neck labels visible on mostly plain bottles. The selected region is contained
in the card rather than cropped a second time. Other portrait images are
contained whole; landscape photos use Sharp's attention crop.

This is a heuristic, not semantic recognition of products or text. A monochrome
label or colour spread throughout a portrait keeps the entire picture visible.
The user-facing card component falls back to the full thumbnail if a rendition
does not exist and contains portrait fallbacks so their important content stays
visible. The fallback also handles errors before hydration.

Existing thumbnails can be backfilled against the configured database/storage:

```sh
npm run thumbs:cards -- --pin-ids 7017,7018
npm run thumbs:cards -- --dry-run
npm run thumbs:cards
```

The script creates only missing renditions and verifies each public upload by
SHA-256. The October 9 product-page backfill records source thumbnail URLs,
public card URLs and checksums in
[`product-card-thumbs-2026-10-09.json`](okf/scraping/media/product-card-thumbs-2026-10-09.json).

The Apple Crisp and Triple Oak bottle labels were checked visually in the
generated card previews. Regression tests cover identifying labels at both the
top and bottom of a tall picture, uncoloured portraits, WebP and EXIF rotation.
