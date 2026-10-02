import { userAgent, type NextRequest } from 'next/server';
import { isAdSlot, SLOT_COUNT } from '@/lib/ads';
import { getUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import Ad from '@/server/model/ad';

// The ads for one ad block (src/components/ads/AdBlock.tsx), fetched once the
// block nears the screen so that a served ad is one that was seen: ?slot= (a
// slot of src/lib/ads.ts), &n= at most the slot's count (SLOT_COUNT), &pin= the pin whose
// page it is on, &not= keys already shown on the page. Weighed by the
// signed-in viewer's preference wiki and age; the store follows where the
// viewer is. Crawlers get none, and are not counted.
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const slot = params.get('slot');
  if (!isAdSlot(slot)) throw new HttpError(400, 'Unknown slot.');
  const headers = { 'Cache-Control': 'private, no-store' };
  if (userAgent(request).isBot) return json({ store: 'US', ads: [] }, 200, headers);
  const n = Math.min(SLOT_COUNT[slot], Math.max(1, Number(params.get('n')) || SLOT_COUNT[slot]));
  const pin = Number(params.get('pin'));
  const avoid = new Set((params.get('not') ?? '').split(',').filter((key) => /^(ad|m|p):\d+$/.test(key)).slice(0, 100));
  const user = await getUser(request);
  const served = await Ad.serve({
    slot,
    n,
    pinId: Number.isInteger(pin) && pin > 0 ? pin : null,
    avoid,
    userId: user ? Number(user.id) : null,
    request,
  });
  return json(served, 200, headers);
});
