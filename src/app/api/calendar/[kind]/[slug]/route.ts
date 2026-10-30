import { CALENDAR_KINDS, calendarFeed, type CalendarKind } from '@/server/services/calendar';

// /api/calendar/tag/anime.ics, /company/nintendo.ics, /person/susan-collins.ics
// and /thread/<any pin id in the thread>.ics: a public feed to subscribe to in
// Google Calendar ("Other calendars" > "From URL") or any calendar app.
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; slug: string }> }) {
  const { kind, slug } = await params;
  if (!(CALENDAR_KINDS as readonly string[]).includes(kind) || !slug.endsWith('.ics')) return new Response('Not found', { status: 404 });
  let key = slug.slice(0, -'.ics'.length);
  try {
    key = decodeURIComponent(key);
  } catch {}
  const body = await calendarFeed(kind as CalendarKind, key);
  if (body == null) return new Response('Not found', { status: 404 });
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${kind}-${key.replace(/[^\w-]+/g, '') || 'calendar'}.ics"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
