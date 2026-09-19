import { ImageResponse } from 'next/og';
import { siteName } from '@/lib/appConfig';
import { plainText } from '@/lib/format';
import { pinById } from '@/server/services/pages';

const SIZE = { width: 1200, height: 630 };

// A share card for a pin with no image of its own: title, date, place and
// company, so links to it still preview well on social sites.
export async function GET(_request: Request, ctx: RouteContext<'/og/pin/[id]'>) {
  const pin = await pinById(Number((await ctx.params).id));
  if (!pin) {
    return new Response('Not found', { status: 404 });
  }
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(pin.utcStartDateTime));

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#111', color: '#ededed', padding: 64 }}>
        <div style={{ display: 'flex', gap: 16, fontSize: 30, color: '#999966' }}>
          <span>{date}</span>
          {pin.categories?.length ? <span style={{ color: '#888' }}>· {pin.categories.join(' · ')}</span> : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>{pin.title}</div>
          {pin.description ? <div style={{ fontSize: 32, color: '#bbb' }}>{plainText(pin.description, 140)}</div> : null}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30, color: '#bbb' }}>
          <span>{[pin.company, pin.address].filter(Boolean).join(' · ')}</span>
          <span style={{ color: '#4a92d1' }}>{siteName}</span>
        </div>
      </div>
    ),
    { ...SIZE, headers: { 'Cache-Control': 'public, max-age=86400' } },
  );
}
