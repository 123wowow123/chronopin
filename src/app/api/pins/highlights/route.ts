import type { NextRequest } from 'next/server';
import { json, route } from '@/server/http';
import { newPins, TRENDING_DAYS, trendingPins } from '@/server/services/pages';
import { requestLocale } from '@/lib/i18n/request';

// The timeline's trending and new pins panels, for the nav drawer, which has
// no room for the side column they sit in on wide screens and opens on any
// page. Both come from the same caches the home page reads.
// GET /api/pins/highlights?lang=en
export const GET = route(async (request: NextRequest) => {
  const locale = requestLocale(request);
  const [trending, added] = await Promise.all([trendingPins(locale), newPins(locale)]);
  return json({ trending: { pins: trending, days: TRENDING_DAYS }, newPins: added });
});
