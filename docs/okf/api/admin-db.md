---
type: API Endpoint
title: Admin table API
description: Read, create, change and delete the rows of any table as an admin - listings, chats, companies, tags, settings, job runs, everything - with every write audited. How job results reach prod without a curator login.
resource: "../../../src/server/adminDb.ts"
tags: [api, admin]
generated: { by: claude-code/claude-opus-5-5, at: 2026-09-30T16:00:00Z }
---

Every route answers 401 or 403 unless the caller is an admin (a token from
`POST /auth/local`, sent as `Authorization: Bearer <token>`). Table and column
names are checked against the database's own catalog, so a name it does not
know is a 400; values are always query parameters. Every write, and the rows
before and after it, goes into `AdminAudit` ([0099](../../../scripts/db/schema/0099_admin_audit.sql))
in the same transaction.

# GET /api/admin/db

`{ tables: [{ name, access, columns, primaryKey, notes }] }`. `access` is
`write` or `read`; `notes` says what a table refuses here and what to use
instead. Each column has `name`, `type`, `udt`, `nullable`, `hasDefault` and
`generated`.

What is kept out:

* **Not listed:** `Session` (login sessions) and PostGIS's `spatial_ref_sys`.
* **Read only:** `schemaMigrations`, `PinBaseCache` (kept by triggers) and
  `AdminAudit` itself.
* **Hidden columns**, neither sent nor written: `User.password`, `User.salt`,
  `PushSubscription.auth` and `.p256dh`.
* **Pins are saved and removed as the pin routes do:** a POSTed pin goes
  through the same save as `POST /api/pins` (see below), and a pin is removed
  with `DELETE /api/pins/:id` (a soft delete). Its columns can be patched here.

# GET /api/admin/db/:table

`{ rows, total, limit, offset }`. Every other query parameter is a filter,
and filters are ANDed:

| Parameter | Meaning |
| --- | --- |
| `col=v` | equals |
| `col.ne=v`, `col.gt=v`, `col.gte=v`, `col.lt=v`, `col.lte=v` | compares |
| `col.like=%v%`, `col.ilike=%v%` | matches text (case-insensitive with `ilike`) |
| `col.in=a,b,c` | one of |
| `col.null=true` / `false` | is or is not null |
| `order=-utcCreatedDateTime,id` | sort; a minus is descending; default the primary key |
| `limit`, `offset` | page; `limit` defaults to 50, at most 1000 |

JSON and place columns take only `.null`. A place comes back as EWKT
(`SRID=4326;POINT(lng lat)`), which the same column takes on a write.

```
GET /api/admin/db/Listing?pinId=4980&order=-id
GET /api/admin/db/Message?conversationId=12&order=utcCreatedDateTime&limit=200
GET /api/admin/db/AdminAudit?table=Company&order=-id
```

# POST /api/admin/db/:table

A row, or an array of up to 1000, as `{ column: value }`; 201 `{ rows }`.
Columns left out take their defaults. With `?upsert=1` a row whose primary
key already exists has the columns it sent replaced (the audit records it as
an update).

**Pins, as any user.** `POST /api/admin/db/Pin` takes a pin, or up to 50,
each a `POST /api/pins` body plus who posts it: `userId`, or `userName`
(`"@GameDesk"` or `"gamedesk"`), else the admin. Each is saved as that user
posted it - threaded, deduplicated, tagged, scored and fed live - and audited
under the admin. A pin that fails does not stop the rest: 201, or 207 when
some failed, with `{ results: [{ index, id, userId } | { index, error }] }`.
`POST /api/admin/pins` does the same with `{ userId | userName, pins: [...] }`,
where a pin's own author beats the request's.

```
POST /api/admin/db/Pin
[{ "userName": "@GameDesk", "title": "…", "sourceUrl": "…", "utcStartDateTime": "…" },
 { "userId": 51, "title": "…", "sourceUrl": "…", "utcStartDateTime": "…" }]
```

```
POST /api/admin/db/PinSentiment?upsert=1
[{ "pinId": 4980, "sentiment": 0.1, "textHash": "75f2…", "productHash": "75f2…" }]
```

# PATCH and DELETE /api/admin/db/:table

Many rows at once: the filters pick them (at least one filter, and at most
1000 rows), PATCH's body is the columns to set. Both answer `{ rows }` - the
rows as they are now, or as they were before the delete.

```
PATCH /api/admin/db/Listing?status=draft&userId=40      { "status": "archived" }
DELETE /api/admin/db/PinTag?pinId=4980&tagId=77
```

# GET, PATCH and DELETE /api/admin/db/:table/:key

One row by its primary key: `12`, or for a two-column key `12,34` in the
key's column order (the catalog's `primaryKey`). GET answers the row, PATCH
(or PUT) the row as changed, DELETE 204; each answers 404 when there is no
such row.

# After a write

A write to `Pin`, or to any table with a `pinId` column, expires each touched
pin's page and sends the pin's `update` (or `remove`, when the write hid it)
to the live feed and the search index, as an edit through the pin routes does
([adminDbEffects.ts](../../../src/server/services/adminDbEffects.ts)). Any
write expires the timeline. The pin routes also record the Updates pane,
re-score sentiment and notify company followers; a raw patch does none of
that, so a pin's text is better edited with `PUT /api/pins/:id`, which an
admin may do on any pin.

# Job results on prod

[scripts/jobs/post-run-to-prod.sh](../../../scripts/jobs/post-run-to-prod.sh)
replays a local [daily job](../scraping/daily-jobs.md) run on prod with the
admin login alone: new pins through `POST /api/admin/pins` as the same
curator (found by handle), edits and event info through the pin routes, and sentiment scores
through `POST /api/admin/db/PinSentiment?upsert=1`, each only where prod's
pin is the one the run worked on.

# Whole-database backup

`npm run backup:tables` ([scripts/data/tables.ts](../../../scripts/data/tables.ts))
writes every table - these included - to `scripts/backup/tables/` as one
gzipped JSON Lines file each with a manifest; `--restore` loads them into a
migrated, non-production database. The folder is gitignored: it holds
password hashes and private messages.
