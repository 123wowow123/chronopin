import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import { pinSourceView, refreshPin } from '@/server/services/sourceWiki';

type Ctx = RouteContext<'/api/pins/[id]/sources'>;

// Up to a wiki per link and a summary, each a Claude call; a two-hour
// transcript is several.
export const maxDuration = 300;

// The links behind a pin's long-form summary: each one's status, any error,
// and its wiki pages (0026_source_wiki.sql). Admin only.
// GET /api/pins/:id/sources
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  const view = await pinSourceView(intParam((await ctx.params).id));
  if (!view) {
    throw new HttpError(404, 'Not Found');
  }
  return json(view);
});

// Runs the pin's wiki pipeline now, and answers with the view as GET does.
// Admin only. With no body it does what a save does: new links get wikis,
// and the summary is rebuilt if its links changed.
// POST /api/pins/:id/sources {rebuild?: boolean, retryFailed?: boolean, refetch?: true | [sourceId]}
//   rebuild      rebuild the summary even when its links have not changed
//   retryFailed  retry failed links that are out of tries too
//   refetch      read these links (true: all of them) again, rewriting
//                wikis whose text changed
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  const pinId = intParam((await ctx.params).id);
  const { rebuild, retryFailed, refetch } = await readJson<Record<string, unknown>>(request);
  const refetchOk = refetch === undefined || typeof refetch === 'boolean' || (Array.isArray(refetch) && refetch.every(Number.isInteger));
  if (!refetchOk || (rebuild !== undefined && typeof rebuild !== 'boolean') || (retryFailed !== undefined && typeof retryFailed !== 'boolean')) {
    throw new HttpError(400, 'rebuild and retryFailed are booleans; refetch is a boolean or a list of source ids');
  }
  if (!(await pinSourceView(pinId))) {
    throw new HttpError(404, 'Not Found');
  }
  const { ingested, rebuilt } = await refreshPin(pinId, { rebuild, retryFailed, refetch: refetch as boolean | number[] | undefined });
  return json({ ingested, rebuilt, ...(await pinSourceView(pinId)) });
});
