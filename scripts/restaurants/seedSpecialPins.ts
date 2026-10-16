import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { RESTAURANT_REGIONS } from '@/lib/restaurants';
import { listSpecialVenues } from '@/server/model/restaurantSpecialVenue';
import Pin from '@/server/model/pin';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function seedSpecialPins(options: { dryRun?: boolean; regionSlug?: string } = {}) {
  const { dryRun = false, regionSlug } = options;
  const venues = await listSpecialVenues(regionSlug, false);
  const existingPins = await Pin.findBySourceUrls(venues.map((v) => v.profile.pinSourceUrl));
  const missing = venues.filter((v) => !existingPins.has(v.profile.pinSourceUrl));

  console.log(`Found ${venues.length} venues, ${existingPins.size} with pins, ${missing.length} missing pins.`);
  if (dryRun) {
    console.log(`[dry-run] Would create ${missing.length} pins.`);
    return { created: missing.length, dryRun: true };
  }

  const [foodDesk] = await db.query<{ id: number }>('SELECT "id" FROM "User" WHERE "userName" = $1', ['FoodDesk']);
  const userId = foodDesk?.id ?? 372;

  let createdCount = 0;
  // Process in batches of 50 to keep transactions reasonable
  const BATCH_SIZE = 50;
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    await db.transaction(async (query) => {
      for (const venue of batch) {
        const p = venue.profile;
        const region = RESTAURANT_REGIONS.find((r) => r.slug === venue.regionSlug);
        const regionName = region?.name ?? venue.regionSlug ?? '';

        // 1. Company
        const [company] = await query<{ id: number }>(
          `INSERT INTO "Company" ("name") VALUES ($1) ON CONFLICT ("name") DO UPDATE SET "name" = "Company"."name" RETURNING "id"`,
          [p.name]
        );

        // 2. Pin
        const title = `${p.name} — ${regionName} restaurant guide`;
        const specialsDesc = p.specials?.map((s) => [s.title, s.description].filter(Boolean).join(': ')).filter(Boolean).join(' · ') ?? '';
        const description = specialsDesc || `${p.name} in ${p.neighborhood ?? ''}, ${regionName}.`;
        const summary = `<p>${escapeHtml(p.name)} in ${escapeHtml(p.neighborhood ?? '')}.<cite data-ref="${escapeHtml(p.websiteUrl || p.pinSourceUrl)}"></cite></p>`
          + (p.photo?.credit ? `<p>${escapeHtml(p.photo.credit)}.</p>` : '');

        const [pin] = await query<{ id: number }>(
          `INSERT INTO "Pin" ("title", "description", "sourceUrl", "longFormSummary", "address", "location", "companyId", "productName", "dateConfidence", "dateConfidenceReasoning", "utcStartDateTime", "allDay", "userId")
           VALUES ($1, $2, $3, $4, $5, CASE WHEN $6::float8 IS NULL OR $7::float8 IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography END, $8, $9, $10, $11, $12, true, $13) RETURNING "id"`,
          [
            title,
            description,
            p.pinSourceUrl,
            summary,
            p.address,
            p.location?.latitude ?? null,
            p.location?.longitude ?? null,
            company.id,
            p.name,
            'confirmed',
            'Verified restaurant guide profile.',
            `${p.checkedAt || '2026-10-07'}T00:00:00Z`,
            userId,
          ]
        );

        // 3. PinTag
        const tags = [p.neighborhood, regionName, 'Restaurant', 'Food'].filter(Boolean);
        await query(
          `INSERT INTO "PinTag" ("pinId", "name", "kind", "source") SELECT $1, name, CASE WHEN name = 'Food' THEN 'category' ELSE 'topic' END, 'user' FROM unnest($2::citext[]) AS name`,
          [pin.id, [...new Set(tags)]]
        );

        // 4. PinReference
        await query(
          `INSERT INTO "PinReference" ("pinId", "url", "title", "confidence", "reasoning") VALUES ($1, $2, $3, 90, $4)`,
          [pin.id, p.websiteUrl || p.pinSourceUrl, `${p.name} official website`, 'Verified restaurant guide profile.']
        );

        // 5. PinRating
        if (p.review?.score && p.review?.provider) {
          await query(
            `INSERT INTO "PinRating" ("pinId", "score", "scoreMax", "source", "url") VALUES ($1, $2, 5, $3, $4)`,
            [pin.id, p.review.score, p.review.provider, p.review.sourceUrl]
          );
        }

        // 6. Medium & PinMedium
        if (p.photo?.src) {
          const [medium] = await query<{ id: number }>(
            `INSERT INTO "Medium" ("type", "thumbName", "thumbWidth", "thumbHeight", "originalUrl", "originalWidth", "originalHeight", "authorName", "authorUrl")
             VALUES ('1', $1, 1200, 800, $1, 1200, 800, $2, $3) RETURNING "id"`,
            [p.photo.src, p.photo.credit, p.photo.sourceUrl || p.websiteUrl]
          );
          await query(`INSERT INTO "PinMedium" ("pinId", "mediumId") VALUES ($1, $2)`, [pin.id, medium.id]);
        }

        createdCount++;
      }
    });
    console.log(`Processed ${Math.min(i + BATCH_SIZE, missing.length)} / ${missing.length} pins...`);
  }

  console.log(`Successfully created ${createdCount} restaurant pins.`);
  return { created: createdCount, dryRun: false };
}

// CLI runner
if (process.argv[1]?.endsWith('seedSpecialPins.ts')) {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
      region: { type: 'string' },
    },
  });

  try {
    await seedSpecialPins({ dryRun: values['dry-run'], regionSlug: values.region });
  } finally {
    await db.closeConnection();
  }
}
