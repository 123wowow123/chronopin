# Restaurant seed API

Loads the restaurant catalogs bundled in the deployed build (`regionalRestaurants.json`,
`restaurantSpecials.json`, `restaurantMenus.json`) into the database of the server you call.
Use it instead of `npm run restaurants:seed`, which only reaches the database in your local `.env`.
Deploy first: the catalog it reads is the one compiled into the running server. Upload the
photos to Azure before seeding (see `scripts/restaurants/mergeCityGuides.ts`).

| Method | Endpoint | Behavior |
| --- | --- | --- |
| POST | `/api/admin/restaurant-seed` | Admin only. Inserts what is missing and returns what changed |

Body (all optional): `{ "regions": ["nashville", "orlando"], "specials": true, "dryRun": false, "userId": 372 }`.
`regions` limits the run to those guide slugs (omit for every region; unknown slugs return 400).
`specials: false` skips the `RestaurantSpecialVenue` import. `dryRun` validates and lists what
would be added without writing. `userId` owns new pins (default: the `FoodDesk` user).

Response: `{ dryRun, pinsAdded: [{id, title}], pinsWouldAdd, mediaAttached: [{id, title}], venuesAdded, venuesValidated }`.

Idempotent and non-destructive: pins are matched by `sourceUrl`; existing pins are never edited,
except that a pin with **no media** gets the catalog photo attached (`mediaAttached`). Special venues
are `ON CONFLICT DO NOTHING`, so edited or disabled rows survive. The timeline cache is expired when
anything is written.

```sh
curl -s -X POST https://www.chronopin.com/api/admin/restaurant-seed \
  -H "Authorization: Bearer $(cat .scrape/admin.token)" -H 'Content-Type: application/json' \
  -d '{"regions":["sacramento","palm-springs","honolulu","nashville","orlando","las-vegas","washington-dc","atlanta","fort-lauderdale"],"dryRun":true}'
```
Run it with `dryRun: true` first, then without.
