import type { NextRequest } from 'next/server';
import { intParam, json, noContent, route } from '@/server/http';
import Pin from '@/server/model/pin';
import { buildHorizonChart, cachedHorizons } from '@/server/timeHorizon';
import { modelPinIndex } from '@/server/modelChart';

// METR's task-completion time horizons against release date, read from METR's
// YAML. 204 when the pin names no measured model.
export const GET = route(async (_request: NextRequest, ctx: RouteContext<'/api/pins/[id]/time-horizon'>) => {
  const id = intParam((await ctx.params).id);
  const { pin } = await Pin.queryById(id);
  if (!pin) return new Response(null, { status: 404 });
  const [points, pins] = await Promise.all([cachedHorizons(), modelPinIndex()]);
  if (!points) return new Response(null, { status: 502 });
  const chart = buildHorizonChart(points, pin.title, pins, id);
  if (!chart) return noContent();
  return json(chart, 200, { 'Cache-Control': 'public, max-age=3600' });
});
