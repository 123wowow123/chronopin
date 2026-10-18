import '../env';
import fs from 'fs';
import path from 'path';
import * as db from '@/server/db';
import { type MusicRankingEntry } from '@/lib/music';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function run() {
  const catalogPath = path.resolve(process.cwd(), 'src/lib/musicCatalog.json');
  const catalog: MusicRankingEntry[] = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  console.log(`Processing seeding for ${catalog.length} music entries...`);

  const [musicDesk] = await db.query<{ id: number }>('SELECT "id" FROM "User" WHERE "userName" = $1', ['@MusicDesk']);
  const userId = musicDesk?.id ?? 317;

  const pinIds: Record<string, number> = {};

  for (const entry of catalog) {
    const existingPin = await db.query<{ id: number }>(
      'SELECT "id" FROM "Pin" WHERE ("sourceUrl" = $1 OR "title" ILIKE $2) AND "productName" = $3 LIMIT 1',
      [entry.sourceUrl, `%${entry.title}%`, entry.title],
    );

    if (existingPin.length > 0) {
      pinIds[entry.id] = existingPin[0].id;
      continue;
    }

    // Try fallback check by title and company/artist
    const fallbackPin = await db.query<{ id: number }>(
      'SELECT "id" FROM "Pin" WHERE "title" ILIKE $1 LIMIT 1',
      [`%${entry.artist}%${entry.title}%`],
    );

    if (fallbackPin.length > 0) {
      pinIds[entry.id] = fallbackPin[0].id;
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

      // 5. Artwork Medium
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

      // 6. Video Medium (YouTube iframe)
      if (entry.youtubeId) {
        const videoUrl = entry.youtubeUrl || `https://www.youtube.com/watch?v=${entry.youtubeId}`;
        const iframeHtml = `<iframe width="480" height="270" src="https://www.youtube.com/embed/${entry.youtubeId}?feature=oembed&enablejsapi=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="${escapeHtml(entry.title)} by ${escapeHtml(entry.artist)}"></iframe>`;

        const [videoMedium] = await query<{ id: number }>(
          `INSERT INTO "Medium" ("type", "thumbName", "thumbWidth", "thumbHeight", "originalUrl", "authorName", "authorUrl", "html")
           VALUES ('3', $1, 800, 450, $2, $3, $4, $5) RETURNING "id"`,
          [entry.artworkUrl, videoUrl, entry.artist, entry.sourceUrl, iframeHtml],
        );
        await query(`INSERT INTO "PinMedium" ("pinId", "mediumId", "weight") VALUES ($1, $2, 1) ON CONFLICT DO NOTHING`, [
          pin.id,
          videoMedium.id,
        ]);
      }

      pinIds[entry.id] = pin.id;
      console.log(`Created pin #${pin.id} for: ${pinTitle}`);
    });
  }

  console.log(`Total mapped pins: ${Object.keys(pinIds).length}`);

  const outMapPath = path.resolve(process.cwd(), 'scripts/music/musicPinIds.json');
  fs.writeFileSync(outMapPath, JSON.stringify(pinIds, null, 2));
  console.log(`Saved pin mapping to ${outMapPath}`);
}

run()
  .then(() => db.closeConnection())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

