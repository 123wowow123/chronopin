import type { NextRequest } from 'next/server';
import { json, route } from '@/server/http';
import { forecastsBySlugs } from '@/server/model/industryForecast';

// The forecast panels for these slugs (?slugs=a,b), with their live lines
// read from the publisher. A pin's page and a search's side panel each learn
// their slugs from the tags they carry, then ask here.
export const GET = route(async (request: NextRequest) => {
  const slugs = (request.nextUrl.searchParams.get('slugs') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]{1,80}$/.test(s))
    .slice(0, 100);
  return json(await forecastsBySlugs(slugs), 200, { 'Cache-Control': 'public, max-age=300' });
});
