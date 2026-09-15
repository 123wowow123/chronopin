import { json } from '@/server/http';
import specialtyDays from '@/server/data/specialtyDays.json';

// Every date's specialty days at once ({ '01-01': [...], ..., '12-31': [...] }),
// for a timeline that tags each of its dates: one ~25KB gzipped response
// instead of a request per date. Rebuilt by `npm run specialty-days:build`.
export async function GET() {
  return json(specialtyDays, 200, { 'Cache-Control': 'public, max-age=3600' });
}
