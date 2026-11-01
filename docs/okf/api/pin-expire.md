---
type: API Endpoint
title: Expire a pin's cache
description: Drop the cached page, event info and other cached reads of given pins through the admin API, needed after writes that bypass the pin API.
resource: "../../../src/app/api/admin/pins/expire/route.ts"
tags: [api, admin, cache]
---
# Expire a pin's cache

`POST /api/admin/pins/expire` (admin only) drops the cached page, event info and other cached reads of the given
pins at once, so the next view renders from the database. The route is `src/app/api/admin/pins/expire/route.ts`.

Body: `{ "ids": [20640] }`, 1-200 positive integers. Answers `{ "expired": [...] }`.

Why: pin pages are cached for hours (`pinById` in `src/server/services/pages.ts`). Saving through the pin API
(`PUT /api/pins/:id` and its sub-routes) expires the pin itself; **anything written another way does not**: direct SQL,
`/api/admin/db`, a script that wrote a side table, or a page that kept showing an old reading. Call this after those,
on the host that was written (local and production are separate caches).

In `next dev` a hard reload (cmd+shift+R) also bypasses the dev cache, but this route is the reliable way, and the only
one that reaches production.

Auth: admin bearer token. Jobs sign one with `adminToken` in `src/server/jobs/pinApi.ts`; use `expirePins(ids)` there.
