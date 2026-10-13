import type { NextRequest } from 'next/server';
import { intParam, json, noContent, route } from '@/server/http';
import Pin from '@/server/model/pin';
import { buildModelChart, buildUnscoredChart, modelPinIndex, cachedModelUniverse, unscoredFor } from '@/server/modelChart';
import { modelKey } from '@/lib/modelChart';
import { modelRelease } from '@/lib/modelSeries';

// Cost against quality for the AI models, with the pin's own model marked
// (src/lib/modelChart.ts). 204 for a pin none of the chart's models resolves
// to, and for one the sources are down for - the page asks for any AI Models
// pin and shows nothing then. The scores move with the arena's publishing,
// which is days apart; an hour on the edge is plenty.
//
// The pin's model is whichever chart model is matched to this pin by its
// title (the same matching that makes a dot link to its pin), so every model
// on the chart shows the chart on its own pin, whatever the vendor; the title
// parser (modelSeries) is only the fallback for a later update to a model
// whose release has its own pin. A pin that is about several models (a family
// launch) marks the best-scoring of them.
export const GET = route(async (_request: NextRequest, ctx: RouteContext<'/api/pins/[id]/model-chart'>) => {
  const id = intParam((await ctx.params).id);
  const { pin } = await Pin.queryById(id);
  if (!pin) return new Response(null, { status: 404 });

  const [universe, pins] = await Promise.all([cachedModelUniverse(), modelPinIndex()]);
  if (!universe) return new Response(null, { status: 502 });

  const mine = buildModelChart(universe, null, pins, id, pin.title)
    .points.filter((p) => p.pinId === id)
    .sort((a, b) => b.elo - a.elo)[0];
  const release = mine ? null : modelRelease(pin.title);
  const key = mine?.key ?? (release ? modelKey(release.model) : null);
  const chart = key ? buildModelChart(universe, key, pins, id, pin.title) : null;
  if (chart?.pinned) return json(chart, 200, { 'Cache-Control': 'public, max-age=3600' });

  // Priced but not scored by the arena yet: the price line, until it is. A
  // shorter cache, so the dot arrives soon after the arena publishes.
  const unscored = unscoredFor(universe, pin.title);
  if (!unscored) return noContent();
  return json(buildUnscoredChart(universe, unscored, pins, id, pin.title), 200, { 'Cache-Control': 'public, max-age=600' });
});
