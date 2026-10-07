// Add the checked restaurant catalog to the configured database without
// replacing existing pins. IDs are assigned here and resolved by source URL
// when the guide renders. Run after deploying the matching public images.
import '../env';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import catalog from '@/server/data/regionalRestaurants.json';
import { RESTAURANT_REGIONS } from '@/lib/restaurants';
import * as db from '@/server/db';

const { values } = parseArgs({ options: { 'user-id': { type: 'string' } } });
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

try {
  const [user] = values['user-id']
    ? await db.query<{ id: number }>('SELECT "id" FROM "User" WHERE "id" = $1', [Number(values['user-id'])])
    : await db.query<{ id: number }>('SELECT "id" FROM "User" WHERE "userName" = $1', ['FoodDesk']);
  if (!user) throw new Error('A restaurant curator is required. Pass --user-id for an existing user, or create FoodDesk.');
  const images = await Promise.all(catalog.map((restaurant) => restaurant.image ? sharp(`public${restaurant.image}`).metadata() : null));
  const inserted = await db.transaction(async (query) => {
    await query('SELECT pg_advisory_xact_lock(731906)');
    // San Diego's local preview pins already use 6427–6444, although they
    // are absent from older local database snapshots.
    if (process.env.NODE_ENV === 'development') {
      await query(`SELECT setval(pg_get_serial_sequence('"Pin"', 'id'), GREATEST((SELECT MAX("id") FROM "Pin"), 6444, (SELECT "last_value" FROM "Pin_id_seq")))`);
    }
    let count = 0;
    for (const [index, restaurant] of catalog.entries()) {
      const existing = await query('SELECT "id" FROM "Pin" WHERE "sourceUrl" = $1', [restaurant.sourceUrl]);
      if (existing.length) continue;
      const region = RESTAURANT_REGIONS.find((item) => item.slug === restaurant.regionSlug)!;
      const title = restaurant.kind === 'top' ? `${restaurant.name} — ${region.name} restaurant guide`
        : `${restaurant.name} ${restaurant.dateConfidence === 'confirmed' || restaurant.openingConfirmed ? 'Opens' : 'Plans an Opening'} in ${restaurant.neighborhood}`;
      // Narrative adds source-backed context; the page already renders the
      // description, opening date, address, price range and verification dates.
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
      const image = images[index];
      if (image) {
        // The saved asset remains viewable when a source is a post/page or its CDN URL expires.
        const [medium] = await query<{ id: number }>(`INSERT INTO "Medium" ("type", "thumbName", "thumbWidth", "thumbHeight", "originalUrl", "originalWidth", "originalHeight") VALUES ('1', $1, $2, $3, $1, $2, $3) RETURNING "id"`, [restaurant.image, image.width, image.height]);
        await query(`INSERT INTO "PinMedium" ("pinId", "mediumId") VALUES ($1, $2)`, [pin.id, medium.id]);
      }
      console.log(`${pin.id}: ${title}`);
      count++;
    }
    return count;
  });
  console.log(`Added ${inserted} restaurant pins; existing records were preserved.`);
} finally {
  await db.closeConnection();
}
