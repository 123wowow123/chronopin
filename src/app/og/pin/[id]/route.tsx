import { pinById } from '@/server/services/pages';
import { pinCardJpeg } from '@/server/services/pinCard';

// A share card for every pin: a dimmed collage of its pictures behind its
// title, countdown and a map panel (services/pinCard.tsx).
export async function GET(_request: Request, ctx: RouteContext<'/og/pin/[id]'>) {
  const pin = await pinById(Number((await ctx.params).id));
  if (!pin) {
    return new Response('Not found', { status: 404 });
  }
  const jpeg = await pinCardJpeg(pin);
  return new Response(new Uint8Array(jpeg), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(jpeg.length),
      // The countdown is hour-granular, so an hour at the edge is as fresh as it gets.
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
