import type { NextRequest } from 'next/server';
import { intParam, json, noContent, route } from '@/server/http';
import { pinSiteShape } from '@/server/services/pages';

type Ctx = RouteContext<'/api/pins/[id]/site-shape'>;

// The pin's mapped outlines as the page map draws them (simplified when huge), or
// 204 when none is traced. The pin page loads this after it renders, not inline:
// a wildfire or national district map is megabytes.
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const shape = await pinSiteShape(intParam((await ctx.params).id));
  return shape ? json(shape, 200, { 'Cache-Control': 'public, max-age=3600' }) : noContent();
});
