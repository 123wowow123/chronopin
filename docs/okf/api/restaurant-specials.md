# Restaurant specials management

Specials live in PostgreSQL's `RestaurantSpecialVenue` table. Each row contains a
venue profile: its offers, menus, schedules, prices, rating evidence, location,
and photo provenance. Regional guides, maps, and existing pin specials panels read
these records on each request. Changes appear on the next request or page refresh.

## Initial setup

The new API and database reader require one initial application release. Against
the target database, apply migrations and import the existing catalog before
serving that release:

```sh
npm run create:db
npm run restaurants:specials:seed -- --dry-run
npm run restaurants:specials:seed
```

The import preserves existing rows, including edited and disabled venues. JSON
catalogs are import fixtures, not the runtime source of specials. Subsequent
content edits use the API and require no deployment. Database backups must include
`RestaurantSpecialVenue` and `AdminAudit`; the existing `backup:tables` command
discovers both tables automatically.

## Manage from this session

Set `CHRONOPIN_ADMIN_TOKEN` in the process environment to an existing admin bearer
token. The CLI uses the application's admin authentication. Keep the token out of
command arguments and committed files. Use HTTPS for a remote server; localhost
can use HTTP. The default server is `http://localhost:3000`.

```sh
npm run restaurants:specials -- list --region new-york --url https://your-server.example
npm run restaurants:specials -- get --id 123 --url https://your-server.example
npm run restaurants:specials -- create --file /tmp/new-venue.json --url https://your-server.example
npm run restaurants:specials -- update --id 123 --file /tmp/venue-edit.json --url https://your-server.example
npm run restaurants:specials -- disable --id 123 --revision 2 --url https://your-server.example
npm run restaurants:specials -- enable --id 123 --revision 3 --url https://your-server.example
```

Save a GET response as the update file, edit its fields, and retain the current
`revision`. After each write use the revision returned by the API. An update
replaces the complete profile; omitted optional fields are removed.

## API

All endpoints require an admin session cookie or `Authorization: Bearer <token>`.
Responses are JSON with `Cache-Control: private, no-store`.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/api/admin/restaurant-specials?region=new-york` | `{ venues: [...] }`, including disabled records; omit region to list all |
| POST | `/api/admin/restaurant-specials` | Create a venue; return its record with HTTP 201 |
| GET | `/api/admin/restaurant-specials/123` | Read one venue |
| PUT | `/api/admin/restaurant-specials/123` | Replace region, profile, and enabled status using current revision |
| PATCH | `/api/admin/restaurant-specials/123` | Set enabled status with `{ "enabled": false, "revision": 2 }` |
| DELETE | `/api/admin/restaurant-specials/123` | Archive with `{ "revision": 2 }`; can later be re-enabled |

Create accepts `{ regionSlug, profile, enabled }`; enabled defaults to true. PUT
also requires `revision`. A region must be a known guide slug (`new-york`,
`los-angeles`, `san-diego`, etc.), or null for an existing pin's menu enrichment.
Regional profiles require `neighborhood`, `address`, and `websiteUrl` in addition
to the menu profile fields. `pinSourceUrl` is the unique source identity.

Profiles follow the existing restaurant menu catalog structure. Dates use
`YYYY-MM-DD`, service times use `HH:mm`, and weekdays use 0 for Sunday through 6
for Saturday. Preserve source URLs, verification dates, conditions, review
evidence, and photo credits when editing. Validation rejects malformed dates,
service windows, links, ratings, coordinates, and missing referenced menus.

Missing records return 404; duplicate sources and stale revisions return 409;
invalid inputs return 400. Every API write records its before/after state and
admin identity in `AdminAudit`. DELETE archives the row and retains its source
identity. The generic admin table API exposes this table as read-only so edits
always use the validation and revision checks above.
