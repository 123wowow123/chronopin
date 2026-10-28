import { json } from '@/server/http';
import type { OnThisDay } from '@/lib/onThisDay';
import dates from '@/server/data/onThisDay.json';

// Every date's historical event at once ({ '01-01': { year, text, url }, ... }),
// for a timeline that tags each of its dates. Rebuilt by `npm run on-this-day:build`.
export async function GET() {
  return json(dates as Record<string, OnThisDay>, 200, { 'Cache-Control': 'public, max-age=3600' });
}
