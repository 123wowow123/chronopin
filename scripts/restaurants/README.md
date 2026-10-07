# Restaurant guides

City routes, navigation, nearest-city selection and sitemap entries share
`src/lib/restaurants.ts`. Catalog entries live in
`src/server/data/regionalRestaurants.json`; their public thumbnails live in
`public/restaurant-images/<city>/`.

The European collection covers London, Paris, Amsterdam, Berlin, Madrid,
Barcelona, Lisbon, Rome, Copenhagen and Vienna, with three established editorial
picks per city and sourced opening announcements. Every entry includes its
venue/report URL, image provenance, verification date and neighborhood.
An estimated month-end date is a sorting placeholder, never an exact opening
claim. Established picks use the verification date, not an invented opening date.
Opening photos from a sibling venue, illustrations and renderings are labeled.
Unverified map coordinates are left empty rather than using the city center.

The guide resolves cards to database pins by source URL. Deploy the matching
public images before seeding a production database. To seed just these cities:

```sh
npm run restaurants:seed -- --regions=london,paris,amsterdam,berlin,madrid,barcelona,lisbon,rome,copenhagen,vienna
```

The seed is idempotent and preserves existing pins. It uses FoodDesk by default;
pass `--user-id=<existing curator id>` to choose another owner. With no
`--regions`, it processes the full regional catalog.

After pulling production pins into a local database, restore any missing
restaurant thumbnails to Azurite with `npm run thumbs:pull -- --restaurants`.
This copies original and small thumbnails, skips public image paths and full
URLs, and preserves images already stored locally.
