import type { NextRequest } from 'next/server';
import { OKF_VERSION } from '@/lib/okf';
import { requireRole } from '@/server/auth';
import { HttpError, intParam, json, route } from '@/server/http';
import { loadOkfBundle } from '@/server/okf';

type Ctx = RouteContext<'/api/pins/[id]/okf'>;

// A pin and the wikis of the links it cites as an Open Knowledge Format
// bundle (src/lib/okf.ts). Admin only.
// GET /api/pins/:id/okf              {okf_version, files: {path: markdown}}
// GET /api/pins/:id/okf?path=log.md  that one file, as text/markdown
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  const pinId = intParam((await ctx.params).id);
  const files = await loadOkfBundle([pinId]);
  if (![...files.keys()].some((path) => path.startsWith('pins/') && path !== 'pins/index.md')) {
    throw new HttpError(404, 'Not Found');
  }
  const path = request.nextUrl.searchParams.get('path');
  if (path) {
    const file = files.get(path.replace(/^\//, ''));
    if (file === undefined) {
      throw new HttpError(404, 'Not Found');
    }
    return new Response(file, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
  }
  return json({ okf_version: OKF_VERSION, files: Object.fromEntries(files) });
});
