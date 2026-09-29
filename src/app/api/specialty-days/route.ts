import type { NextRequest } from 'next/server';
import { json } from '@/server/http';
import { requestLocale } from '@/lib/i18n/request';
import { allSpecialtyDays } from '@/server/specialtyDays';

// Every date's specialty days at once ({ '01-01': [{ name, label }], ...,
// '12-31': [...] }), named in the page's language (?lang=), for a timeline
// that tags each of its dates: one ~25KB gzipped response instead of a
// request per date. Rebuilt by `npm run specialty-days:build`.
export async function GET(request: NextRequest) {
  return json(allSpecialtyDays(requestLocale(request, { cookie: false })), 200, { 'Cache-Control': 'public, max-age=3600' });
}
