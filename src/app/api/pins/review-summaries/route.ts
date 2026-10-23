import type { NextRequest } from 'next/server';
import { json, route } from '@/server/http';
import PinReview from '@/server/model/pinReview';

// Reader-review averages for the cards on a landing page: `?ids=1,2,3` (up to
// 200) answers { [pinId]: { average, count } } for the pins that have any.
// GET /api/pins/review-summaries
export const GET = route(async (request: NextRequest) => {
  const ids = (request.nextUrl.searchParams.get('ids') ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 200);
  return json(await PinReview.summaries(ids), 200, { 'Cache-Control': 'public, max-age=60' });
});
