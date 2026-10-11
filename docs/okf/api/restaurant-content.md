# Restaurant menus and landing-page tiles

Ordinary menus, contact/hours details and restaurant guide tiles live in `RestaurantContent`, keyed by the original branch-specific pin source URL. Pin details and restaurant landing pages read these records from PostgreSQL. Updating content through the management API does not require a build, Git push, restart or deployment. Images live in Azure Blob Storage; records retain public blob URLs, original source URLs and credits.

This feature requires an initial approved application deployment and migration `0148_restaurant_content.sql`. That migration imports the existing menu/detail/guide catalogs once, in the same transaction as the schema migration. It preserves branch identity, recognition, approximate-date evidence, photos, prices and source links. The JSON catalogs remain research/import snapshots, not runtime content authorities. Re-running migrations does not overwrite API edits.

Production verification after the user reported deployment: running commit `f9b187f0585f839eaaff24e3cff023f2a25147ee`, the management API returned HTTP 200 and PostgreSQL contained 372 content records. MUME's live Taipei guide tile uses its Azure gallery photo and database menu. Its seven credited gallery photos were subsequently attached to production pin 7443 through the admin restaurant seed API, following a dry run limited to that existing pin; no pins or special venues were added and no additional deployment was performed.

## Management API

All operations require an admin bearer token or admin session. Responses use `Cache-Control: private, no-store`.

| Method | Path | Operation |
| --- | --- | --- |
| GET | `/api/admin/restaurant-content` | List records, including archived records; optional `region`, `sourceUrl`, `limit` (1–1000, default 100), `offset` |
| POST | `/api/admin/restaurant-content` | Create `{ profile, enabled? }`; duplicate branch sources return 409 |
| GET | `/api/admin/restaurant-content/:id` | Get the complete current record and revision |
| PUT | `/api/admin/restaurant-content/:id` | Replace `{ revision, profile, enabled? }`; retain sections you want to keep |
| PATCH | `/api/admin/restaurant-content/:id` | Set `{ revision, enabled }` |
| DELETE | `/api/admin/restaurant-content/:id` | Archive using `{ revision }`; restore with PATCH |

List responses are `{ content: [...] }`. Single-record responses contain `id`, `profile`, `enabled`, `revision` and timestamps. Each edit increments the revision; a stale revision returns 409 without modifying the record. Writes and their before/after values are audited atomically in `AdminAudit`. Generic admin table writes are blocked for this table so validation and cache invalidation cannot be bypassed.

`profile` contains `pinSourceUrl` and at least one of these sections:

- `menu`: a branch-specific `RestaurantMenuProfile` with `pinSourceUrl`, `name`, `checkedAt`, `menus` and `specials`. Menus retain labels, original URLs, currency, conditions, optional document/pages and actual items with prices or “Price not published.” Prices must be nonnegative; currencies use three uppercase letters.
- `details`: branch-specific name, website, phone, opening hours, reservation link, checked date and evidence links.
- `tile`: `regionSlug`, `kind` (`top` or `opening`), `slug`, `name`, `neighborhood`, `cuisine`, `description`, `address`, `websiteUrl`, `checkedAt`, `recognition`, `priceRange`, `image` and `imageCredit`. An image also requires `imageSourceUrl`; optional `imageNote` records its caption or limitations. Photos must use a public Chronopin Azure Blob URL and are checked for successful decoding before saving. Set `image: null` to clear a tile photo. No fabricated recognition, opening dates or menu items.

An opening tile may retain `openingConfirmed` plus its original evidence `day`; this only confirms the opening while the pin's live date still matches. The pin itself remains the source of its date, coordinates, title and opening-date confidence. Use the pin management API to change those. The content record's source cannot be moved to another branch.

Create the restaurant pin first, then POST its content using that pin's source URL. Top tiles resolve actual pin IDs rather than storing environment-specific IDs. Disabled content does not fall back to bundled menus or curated top tiles. Country/city navigation stays west to east; Coming soon, Just opened, Top restaurants and Specials retain their eligibility and empty-tab fallback behavior.

## Editing an existing menu or tile

1. GET `/api/admin/restaurant-content?sourceUrl=https%3A%2F%2Fmume.tw%2Freservation` to find MUME's record.
2. GET the record by ID and retain its current `revision` and `profile`.
3. Edit `profile.menu.menus` or `profile.tile` using verified sources.
4. PUT the complete `{ revision, profile, enabled }` to the same ID. The next pin and guide requests read the new content; refresh an already open page to see it.

For gallery photos, upload and verify public Azure blobs, set the representative `tile.image`, and attach additional photo records through the existing `/api/admin/db/Medium` and `/api/admin/db/PinMedium` APIs. Preserve `authorName`/`authorUrl` credits. This updates media stored in the database without changing a catalog file.

## Offer menus

Scheduled specials and their associated menus remain managed through `/api/admin/restaurant-specials` (see [restaurant-specials.md](restaurant-specials.md)). Pin pages combine ordinary menus with those stored offer menus; the offer API wins when both have the same menu label. Edit offer prices and conditions through the offer API, rather than assigning regular items to a promotion. Both management APIs immediately expire restaurant guide caches and the affected pin pages. Expired offers, holiday exclusions and upcoming local start times are unchanged.

## Local validation

Migration imported 372 existing content records. API/browser verification changed MUME's ordinary menu price and tile text, observed both updates on the local guide and pin page without rebuilding, rejected a stale save, archived the tile and confirmed it disappeared, and rejected unauthenticated requests. Original sourced MUME content was restored afterward. All 182 local top selections resolve their existing pin links. Re-running migration applies no pending files and preserves edits.

61 tests across the affected restaurant suites passed, as did TypeScript and targeted ESLint. Tests cover migrated-profile validation, source identity, photo provenance, stale revisions, audit writes, disabled/missing records, database menu/guide reads and immediate cache expiration. Restaurant content uses a dedicated cache tag with immediate expiry; this avoids mixing content edits with the general timeline's stale-while-revalidate behavior.

New country guide research can be imported through `scripts/restaurants/importGuide.ts` (read-only dry run by default; `--apply` creates missing records and preserves API edits). See [China guide notes](../../restaurant-china-guides.md) for payloads, sources and publication prerequisites. A holiday-restricted offer can set `availability.holidayCalendarThrough` to the last verified calendar day; the scheduler hides availability after that date until its API calendar is refreshed. This is calendar coverage, not an invented promotion expiry.
