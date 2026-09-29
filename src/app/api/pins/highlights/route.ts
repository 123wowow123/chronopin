import type { NextRequest } from 'next/server';
import { json, route } from '@/server/http';
import { TRENDING_DAYS, trendingPins } from '@/server/services/pages';
import { loadNewPins } from '@/server/services/newPins';
import { timelineMinConfidence } from '@/server/services/timeline';
import { requestLocale } from '@/lib/i18n/request';

// The timeline's trending and new pins panels, for the nav drawer, which has
// no room for the side column they sit in on wide screens and opens on any
// page. Trending comes from the cache the home page reads; the new pins are
// read fresh, since a page asks after its live stream dropped and wants what
// it missed. minConfidence is the timeline's bar, so the drawer can drop a
// live pin the server would not have listed.
// GET /api/pins/highlights?lang=en
export const GET = route(async (request: NextRequest) => {
  const locale = requestLocale(request);
  const [trending, added, minConfidence] = await Promise.all([trendingPins(locale), loadNewPins(locale), timelineMinConfidence()]);
  return json({ trending: { pins: trending, days: TRENDING_DAYS }, newPins: added, minConfidence });
});
