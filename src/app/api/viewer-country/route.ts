import type { NextRequest } from 'next/server';
import { regionFromAcceptLanguage } from '@/lib/ads';
import { clientIp, json, route } from '@/server/http';
import { countryOf } from '@/server/ipLocation';

// The viewer's ISO country code ({ country: "GB" | null }): the address's
// country, else the region their browser's language names. Pin pages are
// cached, so the buy buttons ask for it after load (src/components/pin/ShopButtons.tsx).

export const GET = route(async (request: NextRequest) => {
  const ip = clientIp(request);
  const found = ip
    ? await Promise.race([countryOf(ip).catch(() => null), new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500).unref?.())])
    : null;
  const country = found ?? regionFromAcceptLanguage(request.headers.get('accept-language'));
  return json({ country }, 200, { 'Cache-Control': 'private, no-store' });
});
