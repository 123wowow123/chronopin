import type { NextRequest } from 'next/server';
import { intParam, json, noContent, route } from '@/server/http';
import Pin from '@/server/model/pin';
import { buildModelChart, modelPinIndex, cachedModelUniverse } from '@/server/modelChart';
import { modelKey } from '@/lib/modelChart';
import { modelRelease } from '@/lib/modelSeries';

// Cost against quality for the AI models, with the pin's own model marked
// (src/lib/modelChart.ts). 204 for a pin that is not about a known model line
// - the page only asks for those - and for one the sources are down for.
// The scores move with the arena's publishing, which is days apart; an hour
// on the edge is plenty.
export const GET = route(async (_request: NextRequest, ctx: RouteContext<'/api/pins/[id]/model-chart'>) => {
  const id = intParam((await ctx.params).id);
  const { pin } = await Pin.queryById(id);
  if (!pin) return new Response(null, { status: 404 });
  const release = modelRelease(pin.title);
  if (!release) return noContent();

  const [universe, pins] = await Promise.all([cachedModelUniverse(), modelPinIndex()]);
  if (!universe) return new Response(null, { status: 502 });
  return json(buildModelChart(universe, modelKey(release.model), pins, id), 200, { 'Cache-Control': 'public, max-age=3600' });
});
