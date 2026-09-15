// Stores a still for every YouTube medium that has no thumb yet (new ones get
// it when their pin is saved), so the map's popup has a picture for them.
//
//   npm run media:video-thumbs
//
// Then `npm run backup:data` to keep the thumb names in the seed data.

import '../env';
import * as db from '@/server/db';
import { mediumID } from '@/lib/appConfig';
import Medium from '@/server/model/medium';

async function run() {
  const rows = await db.query(`SELECT "id", "originalUrl" FROM "Medium" WHERE "type" = $1 AND "thumbName" IS NULL ORDER BY "id"`, [
    String(mediumID.youtube),
  ]);
  console.log(`Adding stills to ${rows.length} videos`);
  let failed = 0;
  for (const row of rows) {
    try {
      const medium = await new Medium(row).addVideoThumb();
      await db.query(`UPDATE "Medium" SET "thumbName" = $2, "thumbWidth" = $3, "thumbHeight" = $4 WHERE "id" = $1`, [
        medium.id,
        medium.thumbName,
        medium.thumbWidth,
        medium.thumbHeight,
      ]);
    } catch (err) {
      failed++;
      console.log(`Medium ${row.id} (${row.originalUrl}):`, (err as Error).message);
    }
  }
  console.log(`Added ${rows.length - failed}, failed ${failed}`);
}

run()
  .catch((err) => {
    console.log('Video thumbs err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
