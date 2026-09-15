import type { NextRequest } from 'next/server';
import { json, route } from '@/server/http';
import DateTime from '@/server/model/dateTime';

// Date markers starting in [start, end).
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const dateTimes = await DateTime.queryByStartEndDate(new Date(params.get('start') ?? ''), new Date(params.get('end') ?? ''));
  return json({ dateTimes, queryCount: dateTimes.length });
});
