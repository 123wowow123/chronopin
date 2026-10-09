// Turn the bundled restaurant catalogs into database rows. Used by the admin API
// (POST /api/admin/restaurant-seed) and the restaurants:seed CLI. Inserts only what is
// missing: existing pins keep every edit, apart from a catalog photo attached to a pin
// that has no media yet. Photos must already be in Azure Blob Storage.
import sharp from 'sharp';
import catalog from '@/server/data/regionalRestaurants.json';
import specialCatalog from '@/server/data/restaurantSpecials.json';
import menuCatalog from '@/server/data/restaurantMenus.json';
import { RESTAURANT_REGIONS } from '@/lib/restaurants';
import * as db from '../db';
import { HttpError } from '../util/httpError';
import { parseSpecialVenue, specialVenueSourceKey } from '../restaurantSpecialValidation';

export type RestaurantSeedResult = {
  dryRun: boolean;
  pinsAdded: { id: number; title: string }[];
  pinsWouldAdd: string[];
  mediaAttached: { id: number; title: string }[];
  venuesAdded: number;
  venuesValidated: number;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

// Width and height of each catalog photo, read from the public blob.
async function dimensions(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new HttpError(502, `Image download failed (${response.status}): ${url}`);
  const { width, height } = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
  if (!width || !height) throw new HttpError(502, `Image has no size: ${url}`);
  return { width, height };
}

export async function seedRestaurants(options: { regions?: string[]; userId?: number; specials?: boolean; dryRun?: boolean }): Promise<RestaurantSeedResult> {
  const { regions, dryRun = false } = options;
  const unknown = regions?.filter((slug) => !RESTAURANT_REGIONS.some((region) => region.slug === slug));
  if (unknown?.length) throw new HttpError(400, `Unknown restaurant region: ${unknown.join(', ')}`);
  const restaurants = regions ? catalog.filter((restaurant) => regions.includes(restaurant.regionSlug)) : catalog;
  const [user] = options.userId
    ? await db.query<{ id: number }>('SELECT "id" FROM "User" WHERE "id" = $1', [options.userId])
    : await db.query<{ id: number }>('SELECT "id" FROM "User" WHERE "userName" = $1', ['FoodDesk']);
  if (!user) throw new HttpError(400, 'A restaurant curator is required: pass userId for an existing user, or create FoodDesk.');

  const existing = new Map((await db.query<{ id: number; sourceUrl: string; title: string; media: number }>(
    `SELECT "p"."id", "p"."sourceUrl", "p"."title", (SELECT count(*)::int FROM "PinMedium" WHERE "pinId" = "p"."id") AS "media"
     FROM "Pin" AS "p" WHERE "p"."sourceUrl" = ANY($1::text[])`, [restaurants.map((restaurant) => restaurant.sourceUrl)],
  )).map((row) => [row.sourceUrl, row]));
  const missing = restaurants.filter((restaurant) => !existing.has(restaurant.sourceUrl));
  const needMedia = restaurants.filter((restaurant) => restaurant.image && existing.get(restaurant.sourceUrl)?.media === 0);
  const titleOf = (restaurant: (typeof restaurants)[number]) => {
    const region = RESTAURANT_REGIONS.find((item) => item.slug === restaurant.regionSlug)!;
    return restaurant.kind === 'top' ? `${restaurant.name} — ${region.name} restaurant guide`
      : `${restaurant.name} ${restaurant.dateConfidence === 'confirmed' || ('openingConfirmed' in restaurant && restaurant.openingConfirmed) ? 'Opens' : 'Plans an Opening'} in ${restaurant.neighborhood}`;
  };

  const specialInputs = options.specials === false ? [] : [
    ...specialCatalog.filter((venue) => !regions || regions.includes(venue.regionSlug)).map(({ regionSlug, ...profile }) => parseSpecialVenue({ regionSlug, profile })),
    ...(regions ? [] : menuCatalog.filter((profile) => profile.specials.length).map((profile) => parseSpecialVenue({ profile }))),
  ];
  if (dryRun) {
    return { dryRun, pinsAdded: [], pinsWouldAdd: missing.map(titleOf), mediaAttached: needMedia.map((restaurant) => ({ id: existing.get(restaurant.sourceUrl)!.id, title: titleOf(restaurant) })), venuesAdded: 0, venuesValidated: specialInputs.length };
  }

  // Measure photos before opening the transaction so no connection waits on the network.
  const sizes = new Map<string, { width: number; height: number }>();
  for (const restaurant of [...missing, ...needMedia]) if (restaurant.image && !sizes.has(restaurant.image)) sizes.set(restaurant.image, await dimensions(restaurant.image));
  const attach = async (query: db.QueryFn, pinId: number, image: string) => {
    const size = sizes.get(image)!;
    // The saved asset remains viewable when a source is a post/page or its CDN URL expires.
    const [medium] = await query<{ id: number }>(`INSERT INTO "Medium" ("type", "thumbName", "thumbWidth", "thumbHeight", "originalUrl", "originalWidth", "originalHeight") VALUES ('1', $1, $2, $3, $1, $2, $3) RETURNING "id"`, [image, size.width, size.height]);
    await query(`INSERT INTO "PinMedium" ("pinId", "mediumId") VALUES ($1, $2)`, [pinId, medium.id]);
  };

  return db.transaction(async (query) => {
    await query('SELECT pg_advisory_xact_lock(731906)');
    // Local databases may restore snapshots whose sequence trails the preview pins.
    if (process.env.NODE_ENV === 'development') {
      await query(`SELECT setval(pg_get_serial_sequence('"Pin"', 'id'), GREATEST((SELECT MAX("id") FROM "Pin"), 6444, (SELECT "last_value" FROM "Pin_id_seq")))`);
    }
    const pinsAdded: RestaurantSeedResult['pinsAdded'] = [];
    for (const restaurant of missing) {
      const region = RESTAURANT_REGIONS.find((item) => item.slug === restaurant.regionSlug)!;
      const title = titleOf(restaurant);
      // The page already renders the description, date, address and price; the narrative adds sourced context.
      const detailSummary = 'detailSummary' in restaurant ? restaurant.detailSummary : '';
      const summary = (detailSummary ? `<p>${escapeHtml(detailSummary)}<cite data-ref="${escapeHtml(restaurant.reportUrl)}"></cite></p>` : '')
        + (restaurant.recognition ? `<p>${escapeHtml(restaurant.recognition)}.<cite data-ref="${escapeHtml(restaurant.sourceUrl)}"></cite></p>` : '')
        + (restaurant.imageCredit ? `<p>${escapeHtml(restaurant.imageCredit)}${restaurant.imageNote ? ` · ${escapeHtml(restaurant.imageNote)}` : ''}.</p>` : '');
      const [company] = await query<{ id: number }>(`INSERT INTO "Company" ("name") VALUES ($1) ON CONFLICT ("name") DO UPDATE SET "name" = "Company"."name" RETURNING "id"`, [restaurant.name]);
      const [pin] = await query<{ id: number }>(
        `INSERT INTO "Pin" ("title", "description", "sourceUrl", "longFormSummary", "address", "location", "companyId", "productName", "dateConfidence", "dateConfidenceReasoning", "utcStartDateTime", "allDay", "userId")
         VALUES ($1, $2, $3, $4, $5, CASE WHEN $6::float8 IS NULL OR $7::float8 IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography END, $8, $9, $10, $11, $12, true, $13) RETURNING "id"`,
        [title, restaurant.description, restaurant.sourceUrl, summary, restaurant.address, restaurant.latitude ?? null, restaurant.longitude ?? null, company.id, restaurant.name, restaurant.dateConfidence, restaurant.dateConfidenceReasoning, `${restaurant.day}T00:00:00Z`, user.id],
      );
      const tags = [restaurant.neighborhood, restaurant.cuisine, restaurant.kind === 'top' ? 'Top Restaurants' : 'Restaurant Opening', 'Restaurant', region.name, 'Food'];
      await query(`INSERT INTO "PinTag" ("pinId", "name", "kind", "source") SELECT $1, name, CASE WHEN name = 'Food' THEN 'category' ELSE 'topic' END, 'user' FROM unnest($2::citext[]) AS name`, [pin.id, [...new Set(tags)]]);
      await query(`INSERT INTO "PinReference" ("pinId", "url", "title", "confidence", "reasoning") VALUES ($1, $2, $3, 90, $4)`, [pin.id, restaurant.reportUrl, restaurant.kind === 'top' ? `${restaurant.name} official website` : `${restaurant.name} opening reporting`, restaurant.dateConfidenceReasoning]);
      if (restaurant.image) await attach(query, pin.id, restaurant.image);
      pinsAdded.push({ id: pin.id, title });
    }
    const mediaAttached: RestaurantSeedResult['mediaAttached'] = [];
    for (const restaurant of needMedia) {
      const { id } = existing.get(restaurant.sourceUrl)!;
      await attach(query, id, restaurant.image!);
      mediaAttached.push({ id, title: titleOf(restaurant) });
    }
    let venuesAdded = 0;
    for (const input of specialInputs) {
      const rows = await query(`INSERT INTO "RestaurantSpecialVenue" ("sourceKey", "regionSlug", "profile", "enabled", "userId")
        VALUES ($1, $2, $3::jsonb, $4, $5) ON CONFLICT ("sourceKey") DO NOTHING RETURNING "id"`, [specialVenueSourceKey(input), input.regionSlug, JSON.stringify(input.profile), input.enabled, user.id]);
      venuesAdded += rows.length;
    }
    return { dryRun, pinsAdded, pinsWouldAdd: [], mediaAttached, venuesAdded, venuesValidated: specialInputs.length };
  });
}
