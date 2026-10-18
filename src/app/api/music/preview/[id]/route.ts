import type { NextRequest } from 'next/server';

type Ctx = RouteContext<'/api/music/preview/[id]'>;

// Deezer's 30-second preview links are signed and expire within hours, so the
// catalog stores the Deezer track id and this route redirects to a fresh link.
export async function GET(_request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!/^\d{1,12}$/.test(id)) return new Response('Not Found', { status: 404 });
  try {
    const res = await fetch(`https://api.deezer.com/track/${id}`, { signal: AbortSignal.timeout(8000) });
    const track = (await res.json()) as { preview?: string };
    if (!res.ok || !track.preview?.startsWith('https://')) return new Response('Not Found', { status: 404 });
    return new Response(null, {
      status: 302,
      headers: { Location: track.preview, 'Cache-Control': 'private, max-age=600' },
    });
  } catch {
    return new Response('Bad Gateway', { status: 502 });
  }
}
