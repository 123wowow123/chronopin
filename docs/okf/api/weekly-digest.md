---
type: API Endpoint
title: Weekly digest email
description: The Monday "my timeline" email to opted-in users, its admin switch, tracking links and the /admin/digest dashboard.
resource: "../../../src/server/services/weeklyDigest.ts"
tags: [api, email, notifications, admin]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-29T00:00:00Z }
---

# Weekly digest email

Every Monday from 13:00 UTC (caught up for 24 h), everyone with a confirmed
email who has not opted out gets the pins starting in the next 7 days that they **watch**, that a
**company they follow** made, or that a **person they follow** posted. Each pin
is listed once (watched, then company, then person), capped at 8 per part and 20
in all. Nobody is emailed when nothing is coming up (the week is recorded as
`skipped`). English only.

* **Opt-out (everyone by default, 2026-10-29).** A user with no `DigestSubscription` row (0232) is subscribed; a row with `enabled=false` is not. The toggle is on
  `/profile/notifications`, saved with `PUT /api/users/:id/preferences
  { weeklyDigest: boolean }`. Every email links to `/auth/digest-unsubscribe?token=`
  (signed, no expiry, GET and one-click POST) and sends `List-Unsubscribe`.
* **Switch.** `AppSetting weeklyDigest` `{ enabled }`, **off by default**.
  `GET/PUT /api/admin/weekly-digest`; `POST` emails the calling admin their own
  digest now (not counted).
* **Timer.** `startWeeklyDigest` (instrumentation), a tick every 5 min. The unique
  `DigestSend (userId, weekStart)` row is the claim, so one email per person per
  week across servers; a failed send is not retried.
* **Tracking.** `/api/digest/:sendId/open` (pixel, overstates opens) and
  `/api/digest/:sendId/click?to=/path` (counted, then redirected; only plain site
  paths are followed).
* **Dashboard.** `/admin/digest`: switch, subscribers, by-week sent / skipped / failed /
  opened / clicked, most-clicked pages, recent emails.
* **Resend limits.** Free tier is 100 emails/day, 3,000/month; sends are spaced 600 ms.
