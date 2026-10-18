import '../env';
import * as db from '@/server/db';
import { SEED_MUSIC_RANKINGS } from '@/lib/music';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function updateMusicPinVideos() {
  console.log(`Updating ${SEED_MUSIC_RANKINGS.length} music pins with full-length video media...`);

  let added = 0;
  for (const entry of SEED_MUSIC_RANKINGS) {
    if (!entry.youtubeId) continue;

    // Find backing pin
    const rows = await db.query<{ id: number }>(
      'SELECT "id" FROM "Pin" WHERE "sourceUrl" = $1 AND "title" ILIKE $2 LIMIT 1',
      [entry.sourceUrl, `%${entry.title}%`],
    );
    const pinId = rows[0]?.id;
    if (!pinId) continue;

    // Check if video medium already exists for this pin
    const existingVideo = await db.query<{ id: number }>(
      `SELECT m."id" FROM "PinMedium" pm
       JOIN "Medium" m ON m."id" = pm."mediumId"
       WHERE pm."pinId" = $1 AND m."type" = '3'`,
      [pinId],
    );

    if (existingVideo.length > 0) {
      continue;
    }

    const videoUrl = entry.youtubeUrl || `https://www.youtube.com/watch?v=${entry.youtubeId}`;
    const iframeHtml = `<iframe width="480" height="270" src="https://www.youtube.com/embed/${entry.youtubeId}?feature=oembed&enablejsapi=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="${escapeHtml(entry.title)} by ${escapeHtml(entry.artist)}"></iframe>`;

    await db.transaction(async (query) => {
      const [medium] = await query<{ id: number }>(
        `INSERT INTO "Medium" ("type", "thumbName", "thumbWidth", "thumbHeight", "originalUrl", "authorName", "authorUrl", "html")
         VALUES ('3', $1, 800, 450, $2, $3, $4, $5) RETURNING "id"`,
        [entry.artworkUrl, videoUrl, entry.artist, entry.sourceUrl, iframeHtml],
      );

      await query(
        `INSERT INTO "PinMedium" ("pinId", "mediumId", "weight") VALUES ($1, $2, 1) ON CONFLICT DO NOTHING`,
        [pinId, medium.id],
      );
      added++;
      console.log(`[Pin #${pinId}] Added full-length video medium for ${entry.artist} - ${entry.title}`);
    });
  }

  console.log(`Finished updating music pin videos. Added ${added} video media records.`);
}

updateMusicPinVideos()
  .then(() => db.closeConnection())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
