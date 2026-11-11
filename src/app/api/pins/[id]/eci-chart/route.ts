import type { NextRequest } from 'next/server';
import { intParam, json, noContent, route } from '@/server/http';
import Pin from '@/server/model/pin';
import { buildEciChart, cachedEciScores } from '@/server/eciChart';
import { modelPinIndex } from '@/server/modelChart';

// Epoch AI's Capabilities Index against release date, read from Epoch's CSV.
// 204 when the pin names no scored model.
export const GET = route(async (_request: NextRequest, ctx: RouteContext<'/api/pins/[id]/eci-chart'>) => {
  const id = intParam((await ctx.params).id);
  const { pin } = await Pin.queryById(id);
  if (!pin) return new Response(null, { status: 404 });
  const [points, pins] = await Promise.all([cachedEciScores(), modelPinIndex()]);
  if (!points) return new Response(null, { status: 502 });
  const chart = buildEciChart(points, pin.title, pins, id);
  if (!chart) return noContent();
  return json(chart, 200, { 'Cache-Control': 'public, max-age=3600' });
});
