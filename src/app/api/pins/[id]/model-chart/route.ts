import type { NextRequest } from 'next/server';
import { intParam, json, noContent, route } from '@/server/http';
import Pin from '@/server/model/pin';
import { buildPinModelChart, modelPinIndex, cachedModelUniverse } from '@/server/modelChart';

// Scores and prices are read from their sources; unknown model variants keep
// the comparison field with an unpublished-performance notice.
export const GET = route(async (_request: NextRequest, ctx: RouteContext<'/api/pins/[id]/model-chart'>) => {
  const id = intParam((await ctx.params).id);
  const { pin } = await Pin.queryById(id);
  if (!pin) return new Response(null, { status: 404 });

  const [universe, pins] = await Promise.all([cachedModelUniverse(), modelPinIndex()]);
  if (!universe) return new Response(null, { status: 502 });

  const chart = buildPinModelChart(universe, pins, { id, title: pin.title, utcStartDateTime: pin.utcStartDateTime });
  if (!chart) return noContent();
  const maxAge = chart.pinned ? 3600 : 600;
  return json(chart, 200, { 'Cache-Control': `public, max-age=${maxAge}` });
});
