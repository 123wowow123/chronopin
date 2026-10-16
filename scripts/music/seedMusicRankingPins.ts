import '../env';
import * as db from '@/server/db';
import { SEED_MUSIC_RANKINGS, type MusicRankingEntry } from '@/lib/music';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function seedMusicRankingPins(options: { dryRun?: boolean } = {}) {
  const { dryRun = false } = options;

  console.log(`Starting music ranking pin seeding for ${SEED_MUSIC_RANKINGS.length} entries...`);

  const [musicDesk] = await db.query<{ id: number }>('SELECT "id" FROM "User" WHERE "userName" = $1', ['@MusicDesk']);
  const userId = musicDesk?.id ?? 317;

  const results: Record<string, number> = {};

  for (const entry of SEED_MUSIC_RANKINGS) {
    const existingPin = await db.query<{ id: number }>(
      'SELECT "id" FROM "Pin" WHERE "sourceUrl" = $1 AND "title" ILIKE $2 LIMIT 1',
      [entry.sourceUrl, `%${entry.title}%`],
    );

    if (existingPin.length > 0) {
      results[entry.id] = existingPin[0].id;
      console.log(`Found existing pin ${existingPin[0].id} for ${entry.artist} - ${entry.title}`);
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] Would seed pin for: ${entry.artist} - "${entry.title}" (${entry.country} ${entry.year})`);
      continue;
    }

    await db.transaction(async (query) => {
      // 1. Company for Artist
      const [company] = await query<{ id: number }>(
        `INSERT INTO "Company" ("name") VALUES ($1) ON CONFLICT ("name") DO UPDATE SET "name" = "Company"."name" RETURNING "id"`,
        [entry.artist],
      );

      // 2. Pin Title & Descriptions
      const pinTitle = `${entry.artist} — "${entry.title}" (${entry.chartName} #${entry.rank} ${entry.year})`;
      const pinDesc = `${entry.artist} achieved the #${entry.rank} music ranking of ${entry.year} on ${entry.country}'s ${entry.chartName}. ${entry.summary}`;
      const longSummary = `<p>${escapeHtml(entry.artist)} reached #${entry.rank} on ${escapeHtml(entry.chartName)} in ${escapeHtml(entry.country)} for ${entry.year}.<cite data-ref="${escapeHtml(entry.sourceUrl)}"></cite></p>` +
        `<p>${escapeHtml(entry.summary)}</p>` +
        (entry.streamsOrUnits ? `<p><strong>Performance:</strong> ${escapeHtml(entry.streamsOrUnits)}</p>` : '');

      const [pin] = await query<{ id: number }>(
        `INSERT INTO "Pin" (
          "title", "description", "sourceUrl", "longFormSummary", "address", "companyId",
          "productName", "dateConfidence", "dateConfidenceReasoning", "utcStartDateTime", "allDay", "userId"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11
        ) RETURNING "id"`,
        [
          pinTitle,
          pinDesc,
          entry.sourceUrl,
          longSummary,
          `${entry.country}`,
          company.id,
          entry.title,
          'confirmed',
          `Verified official ${entry.chartName} ranking.`,
          `${entry.releaseDate || `${entry.year}-06-01`}T00:00:00Z`,
          userId,
        ],
      );

      // 3. PinTag
      const tags = [
        'Music',
        'Music Ranking',
        entry.continent,
        entry.country,
        String(entry.year),
        entry.chartName,
        entry.artist,
        ...entry.genres,
      ];
      await query(
        `INSERT INTO "PinTag" ("pinId", "name", "kind", "source")
         SELECT $1, name, CASE WHEN name = 'Music' THEN 'category' ELSE 'topic' END, 'user'
         FROM unnest($2::citext[]) AS name
         ON CONFLICT DO NOTHING`,
        [pin.id, [...new Set(tags)]],
      );

      // 4. PinReference
      await query(
        `INSERT INTO "PinReference" ("pinId", "url", "title", "confidence", "reasoning")
         VALUES ($1, $2, $3, 95, $4)`,
        [
          pin.id,
          entry.sourceUrl,
          `${entry.chartName} Official Chart`,
          `Verified official year-end music ranking for ${entry.year}.`,
        ],
      );

      // 5. Medium & PinMedium
      if (entry.artworkUrl) {
        const [medium] = await query<{ id: number }>(
          `INSERT INTO "Medium" ("type", "thumbName", "thumbWidth", "thumbHeight", "originalUrl", "originalWidth", "originalHeight", "authorName", "authorUrl")
           VALUES ('1', $1, 800, 800, $1, 800, 800, $2, $3) RETURNING "id"`,
          [entry.artworkUrl, entry.artist, entry.sourceUrl],
        );
        await query(`INSERT INTO "PinMedium" ("pinId", "mediumId") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
          pin.id,
          medium.id,
        ]);
      }

      results[entry.id] = pin.id;
      console.log(`Created pin ${pin.id} for: ${pinTitle}`);
    });
  }

  console.log(`Finished seeding music ranking pins. Total mapped: ${Object.keys(results).length}`);
  return results;
}

if (process.argv[1]?.endsWith('seedMusicRankingPins.ts')) {
  seedMusicRankingPins()
    .then(() => db.closeConnection())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

