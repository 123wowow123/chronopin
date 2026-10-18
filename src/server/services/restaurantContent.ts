import sharp from 'sharp';
import { revalidateTag } from 'next/cache';
import * as db from '@/server/db';
import { TAGS, invalidatePin } from './cache';
import { HttpError } from '@/server/util/httpError';
import type { RestaurantContentProfile } from '@/server/restaurantContentValidation';
import { contentForSource } from '@/server/model/restaurantContent';
import { specialVenueForSource } from '@/server/model/restaurantSpecialVenue';
import { restaurantSourceKey } from '@/lib/restaurantMenus';

export async function verifyRestaurantTilePhoto(profile: RestaurantContentProfile) {
  if (!profile.tile?.image) return;
  try {
    const response = await fetch(profile.tile.image, { signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!response.ok) throw new Error('Not public');
    const { width, height } = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    if (!width || !height) throw new Error('Not an image');
  } catch { throw new HttpError(400, 'Tile photo must be a publicly accessible, decodable Azure image'); }
}
export async function invalidateRestaurantContent(sourceUrl: string) {
  const host = new URL(sourceUrl).hostname.replace(/^www\./, '');
  const pins = await db.query<{ id: number; sourceUrl: string }>('SELECT "id", "sourceUrl" FROM "Pin" WHERE "sourceUrl" ILIKE $1 AND "utcDeletedDateTime" IS NULL', [`%${host}%`]);
  for (const pin of pins) if (restaurantSourceKey(pin.sourceUrl) === restaurantSourceKey(sourceUrl)) invalidatePin(pin.id);
  revalidateTag(TAGS.restaurantContent, { expire: 0 });
}
// Ordinary menus and offer menus have separate management APIs. Combine them
// on pin pages; offer menus win when both records share a label.
export async function restaurantMenuProfileFor(sourceUrl: string | null | undefined) {
  const [content, special] = await Promise.all([contentForSource(sourceUrl), specialVenueForSource(sourceUrl)]);
  const ordinary = content?.profile.menu;
  if (!special) return ordinary ? { ...ordinary, specials: [] } : undefined;
  if (!ordinary) return special.profile;
  const menus = new Map(ordinary.menus.map((menu) => [menu.label, menu]));
  for (const menu of special.profile.menus) menus.set(menu.label, menu);
  return { ...ordinary, ...special.profile, menus: [...menus.values()] };
}
