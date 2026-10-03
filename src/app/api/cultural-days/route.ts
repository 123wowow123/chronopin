import type { NextRequest } from 'next/server';
import { HttpError, json, route } from '@/server/http';
import { requestLocale } from '@/lib/i18n/request';
import { culturalDaysInYear, FIRST_YEAR, LAST_YEAR } from '@/server/culturalDays';

// One year's cultural holidays ({ '2026-09-25': [{ id, name, label, day,
// traditions }] }), named in the page's language (?lang=), for a timeline that
// tags each of its dates. A year at a time because the lunar, Islamic and
// Hebrew holidays move; the catalog is src/lib/culturalDays.ts.
export const GET = route(async (request: NextRequest) => {
  const year = Number(request.nextUrl.searchParams.get('year'));
  if (!Number.isInteger(year) || year < FIRST_YEAR || year > LAST_YEAR) throw new HttpError(400, `year must be ${FIRST_YEAR}-${LAST_YEAR}.`);
  return json(culturalDaysInYear(year, requestLocale(request, { cookie: false })), 200, { 'Cache-Control': 'public, max-age=3600' });
});
