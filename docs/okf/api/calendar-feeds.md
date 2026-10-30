---
type: API Endpoint
title: Calendar feeds (.ics)
description: Public iCalendar feeds for a tag, company, person or thread, to subscribe to in Google Calendar.
resource: "../../../src/app/api/calendar/[kind]/[slug]/route.ts"
tags: [api, calendar, ics]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-29T00:00:00Z }
---

# Calendar feeds

`GET /api/calendar/{kind}/{key}.ics`, public, no sign-in:

| kind | key | example |
| --- | --- | --- |
| `tag` | tag slug (as `/tag/<slug>`) | `/api/calendar/tag/anime.ics` |
| `company` | company slug | `/api/calendar/company/nintendo.ics` |
| `person` | person slug | `/api/calendar/person/susan-collins.ics` |
| `thread` | id of any pin in the thread | `/api/calendar/thread/861.ics` |

Subscribe: Google Calendar > Other calendars > From URL (or `webcal://` in Apple/Outlook).
Unknown subject or kind: 404.

- Pins from 30 days back onward, at most 500, soonest first; the shown-pin confidence floor applies as on the topic pages.
- One stable UID per pin (`pin-<id>@chronopin.com`), so a moved date updates in place on the subscriber's next poll.
- All-day pins are `VALUE=DATE` with an exclusive end; timed pins are UTC instants.
- `STATUS:CONFIRMED` for confirmed/scheduled dates, `TENTATIVE` for anything else; description carries the confidence word and pin link.
- Cached an hour server-side (`cacheLife('hours')`, tagged timeline/people) and `max-age=3600` to clients.
- Builder: `src/lib/ics.ts` (tested); feed resolver `src/server/services/calendar.ts`.
