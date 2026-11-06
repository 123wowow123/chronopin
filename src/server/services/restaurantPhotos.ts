import * as db from '@/server/db';
import { blobUrl, mediumID } from '@/lib/appConfig';
import { restaurantCardPhotos, type RestaurantCardPhoto } from '@/lib/restaurantPhotos';

// One query per guide, never one request for every card or photo.
export async function restaurantPinPhotos(ids: number[]): Promise<Record<number, RestaurantCardPhoto[]>> {
  if (!ids.length) return {};
  const rows = await db.query<{ pinId: number; thumbName: string; originalUrl: string; authorName: string | null; authorUrl: string | null; title: string }>(`
    SELECT pm."pinId", m."thumbName", m."originalUrl", m."authorName", m."authorUrl", p."title"
    FROM "PinMedium" pm JOIN "Medium" m ON m."id" = pm."mediumId"
    JOIN "Pin" p ON p."id" = pm."pinId"
    WHERE pm."pinId" = ANY($1::int[]) AND m."type" = $2
      AND pm."utcDeletedDateTime" IS NULL AND p."utcDeletedDateTime" IS NULL
    ORDER BY pm."pinId", pm."weight" DESC, m."id"`, [[...new Set(ids)], mediumID.image]);
  const photos: Record<number, RestaurantCardPhoto[]> = {};
  for (const row of rows) {
    const src = blobUrl(row.thumbName);
    if (!src) continue;
    (photos[row.pinId] ??= []).push({ src, alt: `${row.title} · restaurant photo`, credit: row.authorName ?? '', sourceUrl: row.authorUrl ?? undefined, originalUrl: row.originalUrl });
  }
  return Object.fromEntries(Object.entries(photos).map(([id, pictures]) => [id, restaurantCardPhotos(pictures)]));
}
