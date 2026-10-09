# Restaurant guides

City routes, navigation, nearest-city selection and sitemap entries share
`src/lib/restaurants.ts`. Catalog entries live in
`src/server/data/regionalRestaurants.json`; their public thumbnails live in
Azure Blob Storage. Pin image files must not be committed to Git.

The European collection covers London, Paris, Amsterdam, Berlin, Madrid,
Barcelona, Lisbon, Rome, Copenhagen and Vienna, with three established editorial
picks per city and sourced opening announcements. Every entry includes its
venue/report URL, image provenance, verification date and neighborhood.
Additional guides cover Dublin and Stockholm, each with an announced October
2026 opening and two established editorial picks. Onóra's opening is a month
estimate; Bouillon's announced date is October 23. Preview images are labeled,
including Söderhallarna's food hall rather than Bouillon's own dining room.
An estimated month-end date is a sorting placeholder, never an exact opening
claim. Established picks use the verification date, not an invented opening date.
Opening photos from a sibling venue, illustrations and renderings are labeled.
Unverified map coordinates are left empty rather than using the city center.

The guide resolves cards to database pins by source URL. Upload and verify the matching
Azure blobs before seeding a production database. To seed just these cities:

```sh
npm run restaurants:seed -- --regions=london,paris,amsterdam,berlin,madrid,barcelona,lisbon,rome,copenhagen,vienna
```

To add the Dublin and Stockholm batches:

```sh
npm run restaurants:seed -- --regions=dublin,stockholm
```

The seed is idempotent and preserves existing pins. It uses FoodDesk by default;
pass `--user-id=<existing curator id>` to choose another owner. With no
`--regions`, it processes the full regional catalog.

The Canadian collection contains three established restaurant picks per city
across Victoria, Vancouver, Calgary, Edmonton, Saskatoon, Winnipeg, Hamilton,
Toronto, Ottawa, Montréal, Québec City and Halifax. Menu links and contact
details were checked October 8, 2026. See [Canadian guide coverage](../../docs/restaurant-canada-guides.md).
After uploading the images to Azure and deploying the matching catalog, populate production with:

```sh
npm run restaurants:seed -- --regions=victoria,vancouver,calgary,edmonton,saskatoon,winnipeg,hamilton,toronto,ottawa,montreal,quebec-city,halifax
```

After pulling production pins into a local database, restore any missing
restaurant thumbnails to Azurite with `npm run thumbs:pull -- --restaurants`.
This copies original and small thumbnails, skips public image paths and full
URLs, and preserves images already stored locally.

To migrate temporary restaurant images to Azure, run
`npx tsx scripts/restaurants/uploadPinPhotos.ts --update-prod`. It verifies public
blob downloads against SHA-256, updates catalog and production media references,
expires affected pin caches, checks public pins, and removes the local image files.
The production migration uses the existing Azure CLI login and `.scrape/admin.token`.
Temporary files under `public/restaurant-images/` are ignored by Git.

The Australian collection covers Perth (Wildflower), Adelaide (Press* Food & Wine,
Africola), Melbourne (Attica, Flower Drum), Sydney (Bennelong, Saint Peter) and
Brisbane (OTTO, Montrachet, Bistro Suzette), checked October 9, 2026 against each
operator's own site. Quay, Gerard's Bistro and Orana are closed and were excluded.
Africola has no photo (its site publishes none). Bennelong, OTTO, Montrachet and
Press* have approximate map points because no street number resolves. Seed with:

```sh
npm run restaurants:seed -- --regions=perth,adelaide,melbourne,sydney,brisbane
```

Every restaurant entry must list its menu items on the pin detail, not just link to
the menu. Read the published menu (page or PDF) and transcribe the dishes with their
prices into `src/server/data/restaurantMenus.json` (`coverage: "published"`), with
hours and phone in `restaurantDetails.json`. Leave `coverage: "link"` only when the
menu is genuinely unpublished, and say so in the note. Never invent a dish or price.
