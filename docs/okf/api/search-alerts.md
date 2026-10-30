---
type: API Endpoint
title: Search alerts API
description: A reader keeps a search and is told in the bell and the Monday digest when a new pin matches it.
resource: "../../../src/app/api/search-alerts/route.ts"
tags: [api, search, notifications, digest]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-30T00:00:00Z }
---

# Search alerts

Not the shared *named searches* (`/api/saved-searches`, `SavedSearch`, see
saved-searches.md): a search alert is private to one reader and sends
notifications.

## What the reader sees

- **Save search** button under the search page's controls (signed in, a query
  typed, not the watch-list view). A popover names it (optional) and picks the
  bell and the Monday email. A saved search reads **Saved** and reopens the
  popover with Delete.
- **Bell:** a `search` notification, grouped per search and day like a company's
  batch ("3 new pins match “Name”"), listed under *Watching*; it links to the
  pin, or for a batch to the `pin:` search of its pins.
- **/profile/notifications → Saved searches:** bell and email switches per
  search, delete, `n of 20`.
- **Weekly digest:** a "New matches for your saved searches" block with the
  past week's matches (up to 5 titles per search). A reader with matches but
  nothing starting in the next 7 days still gets the email.

## Calls

| Call | Does |
|---|---|
| `GET /api/search-alerts` | the reader's searches `{ searches }`; `?q=` returns just the one for that query |
| `POST /api/search-alerts` `{ query, label?, notifyBell?, notifyDigest? }` | saves, or updates the reader's search for the same query (case and spacing ignored); 409 past 20 |
| `PATCH /api/search-alerts/:id` `{ label?, notifyBell?, notifyDigest? }` | changes the name or switches |
| `DELETE /api/search-alerts/:id` | removes it |

All need sign-in.

## How matching works

`services/searchAlerts.ts` (timer in `instrumentation.node.ts`, every 5 min)
takes the 60 searches unchecked longest and runs each over the pins **created
since its watermark** (`searchPinIdsCreatedSince` in `services/search.ts`,
newest 100). The watermark is claimed with a compare on the old value, so one
server records a run. Matches go to `SearchAlertMatch` (primary key = once per
search and pin); new ones become `Notification` rows (`type 'search'`,
`searchAlertId`, actor = the pin's author, so blocks apply; nobody is told of
their own pin). Pins edited into a match later are not caught: only creation
counts. The query is stored as typed, so relative terms stay relative; the
sweep reads it in UTC and as the reader (`userId`).

## Storage

`SearchAlert`, `SearchAlertMatch`, `Notification.searchAlertId` (0237). Model
`src/server/model/searchAlert.ts`, shared shapes `src/lib/searchAlerts.ts`.
UI strings: `searchAlerts.*`, `notifications.search*`/`whySearch`, in every locale.
