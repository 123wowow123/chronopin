import { connection } from 'next/server';
import { route } from '@/server/http';
import Digest from '@/server/model/digest';

type Ctx = RouteContext<'/api/digest/[id]/open'>;

// The opening pixel at the foot of the weekly email. Counts a load (mail apps
// that prefetch images count too, so it overstates opens a little) and answers
// a 1x1 transparent GIF whatever the id.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export const GET = route(async (_request: Request, ctx: Ctx) => {
  await connection();
  const id = Number((await ctx.params).id);
  if (Number.isInteger(id) && id > 0) await Digest.recordOpen(id).catch(() => undefined);
  return new Response(PIXEL, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, max-age=0' } });
});
