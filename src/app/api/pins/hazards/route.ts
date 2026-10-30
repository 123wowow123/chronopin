import type { NextRequest } from 'next/server';
import { HttpError, json, route } from '@/server/http';
import { hazardShapes } from '@/server/services/hazardShapes';

// The hazard layer of the map: Disaster pins' storm tracks and flood/wildfire
// extents that start in the window. GET /api/pins/hazards?from=ISO&to=ISO
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const at = (name: string) => {
    const value = params.get(name);
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) throw new HttpError(400, `${name} is not a date: '${value}'`);
    return date;
  };
  return json({ shapes: await hazardShapes(at('from'), at('to')) }, 200, { 'Cache-Control': 'public, max-age=300' });
});
