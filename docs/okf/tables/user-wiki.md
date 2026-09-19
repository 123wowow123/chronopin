---
type: Postgres Table
title: UserWiki
description: A signed-in user's preference wiki, built from what they open, watch, like and comment on, which weighs their timeline's pick on crowded days.
resource: ../../../scripts/db/schema/0028_user_wiki.sql
tags: [table, schema, users, timeline]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T05:00:00Z }
---

# Schema

| Column | Type | Description |
| --- | --- | --- |
| `userId` | integer | Primary key, FK to User, cascade delete |
| `profile` | jsonb | `{ clicked, categories, companies, signals }`: the pins they opened (newest first, up to 500) and each category's and company's share of their signal weight |
| `page` | text | The same as an OKF concept (`type: Profile`), written by `chronopin-user-wiki/1` |
| `utcBuiltDateTime` | timestamptz | Last rebuild |

0028 also indexes `PinView ("viewer", "day")`, because every rebuild reads one user's opens.

# How it is built

`src/lib/userWiki.ts` `buildPreference` weighs each signal: an open counts 1, a like or comment 2, and a watch 3. Every signal counts half as much each 60 days. Shares under 2% are dropped. No model is involved, so this works without Anthropic credit.

The rebuild runs in `after()` from the routes that record a signal: a new signed-in view (`POST /api/pins/:id/view`), watch and unwatch, like and unlike, and a new comment. `npm run user-wiki:build` is the backfill (`--user N`). With `--out DIR`, it also writes the pages as an OKF bundle (`users/<id>-<name>.md`, `users/index.md`, `log.md`). That bundle holds users' pin history, so keep it private.

# On the timeline

`sampleBag` (src/lib/bagSample.ts) takes a `boost` that multiplies each pin's weight. The home page passes the viewer's profile to the timeline when the admin setting `personalBag` is on (Admin > Pins, on by default). Each card then weighs `1 + 2 × opened + 2 × (category share + company share)`, and a card counts as opened when the user opened any pin in its duplicate stack. The server and the hydrating client use the same profile, so the pick is identical on both sides. Signed-out viewers and users with no wiki yet get the shared pick.

# API

`GET /api/users/:id/wiki` (the user or an admin) returns `{ okf_version, profile, files }`. Add `?path=page` for the concept as markdown. `POST` rebuilds it now.
