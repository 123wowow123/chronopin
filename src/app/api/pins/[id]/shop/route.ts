import type { NextRequest } from 'next/server';
import * as db from '@/server/db';
import * as ebay from '@/server/ebay';
import { intParam, json, noContent, route } from '@/server/http';
import log from '@/server/util/log';

// Listings found live for a product pin's buy buttons (src/lib/shopping.ts):
// the cheapest exact eBay listing of its product, when it has no stored eBay
// listing of its own. 204 when there is nothing to add, which is every pin
// without a product and every page view without eBay keys.
export const GET = route(async (_request: NextRequest, ctx: RouteContext<'/api/pins/[id]/shop'>) => {
  const id = intParam((await ctx.params).id);
  if (!ebay.hasKeys()) return noContent();
  const [pin] = await db.query<{ productName: string | null; hasEbay: boolean }>(
    `SELECT "productName",
       EXISTS (SELECT 1 FROM "Merchant" WHERE "pinId" = "Pin"."id" AND "url" ~* '^https?://([^/]+\\.)?ebay\\.com/') AS "hasEbay"
     FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
    [id],
  );
  if (!pin) return new Response(null, { status: 404 });
  if (!pin.productName || pin.hasEbay) return noContent();

  try {
    const match = await ebay.exactListing(pin.productName);
    if (!match) return noContent();
    return json({ matches: [match] }, 200, { 'Cache-Control': 'private, max-age=300' });
  } catch (err) {
    log.error('shopMatches', (err as Error)?.message);
    return noContent();
  }
});
