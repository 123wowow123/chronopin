import type { NextRequest } from 'next/server';
import { intParam, json, noContent, route } from '@/server/http';
import { trendFor } from '@/server/predictionMarkets';
import { pinById } from '@/server/services/pages';
import log from '@/server/util/log';
import { pinMarketRefs } from '@/lib/predictionMarkets';

// The past week of the leading outcome in the first market a pin cites, for
// the small graph that stands in for its picture in a list. The live value
// comes over the page's live stream; this is only the history behind it.
// 204 when the pin cites no market or it has no history, 502 when the
// exchange cannot be reached.
export const GET = route(async (_request: NextRequest, ctx: RouteContext<'/api/pins/[id]/trend'>) => {
  const pin = await pinById(intParam((await ctx.params).id));
  if (!pin) {
    return new Response(null, { status: 404 });
  }
  const [ref] = pinMarketRefs(pin);
  if (!ref) {
    return noContent();
  }
  try {
    const trend = await trendFor(ref);
    return trend ? json(trend, 200, { 'Cache-Control': 'public, max-age=600' }) : noContent();
  } catch (err) {
    log.error('pin trend', (err as Error)?.message);
    return new Response(null, { status: 502 });
  }
});
