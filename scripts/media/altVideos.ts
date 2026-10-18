// Gives pins that have a video a second one from another source (Dailymotion,
// and Vimeo with VIMEO_ACCESS_TOKEN): findAlternateVideo in
// src/server/scrape/altVideo.ts, the same search a scrape runs. Nothing here
// calls Claude.
//
//   npm run media:alt-videos                          list what it would add (dry run)
//   npm run media:alt-videos -- --apply
//   npm run media:alt-videos -- --category Gaming
//   npm run media:alt-videos -- --apply --limit 50 --offset 100
//   npm run media:alt-videos -- --apply --pin 123 --pin 456
//   npm run media:alt-videos -- --from-id 4829 --limit 500   resume after a pin id
//   npm run media:alt-videos -- --apply --delay 1     seconds between pins (default 0.4)
//
// Pins that already carry a Dailymotion or Vimeo video are skipped, and a pin
// nothing passes the filter for is left as it is (the common case). Then
// `npm run backup:data`.

import '../env';
import { parseArgs } from 'node:util';
import { mediumID } from '@/lib/appConfig';
import * as db from '@/server/db';
import Medium from '@/server/model/medium';
import Pin from '@/server/model/pin';
import { findAlternateVideo } from '@/server/scrape/altVideo';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    category: { type: 'string' },
    limit: { type: 'string' },
    offset: { type: 'string' },
    'from-id': { type: 'string' },
    delay: { type: 'string' },
    pin: { type: 'string', multiple: true },
  },
});
const DELAY_MS = Number(flags.delay ?? 0.4) * 1000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const rows = await db.query<{ id: number }>(
    `SELECT p."id"
       FROM "Pin" p
      WHERE p."utcDeletedDateTime" IS NULL
        AND ($1::integer[] IS NULL OR p."id" = ANY($1::integer[]))
        AND p."id" >= ${Number(flags['from-id'] ?? 0)}
        AND ($2::text IS NULL OR EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = p."id" AND t."kind" = 'category' AND t."name" = $2))
        AND EXISTS (
              SELECT 1 FROM "PinMedium" pm JOIN "Medium" m ON m."id" = pm."mediumId"
               WHERE pm."pinId" = p."id" AND pm."utcDeletedDateTime" IS NULL AND m."type" = $3 AND m."originalUrl" LIKE '%youtube.com%')
        AND NOT EXISTS (
              SELECT 1 FROM "PinMedium" pm JOIN "Medium" m ON m."id" = pm."mediumId"
               WHERE pm."pinId" = p."id" AND pm."utcDeletedDateTime" IS NULL AND m."type" = $3
                 AND (m."originalUrl" LIKE '%dailymotion.com%' OR m."originalUrl" LIKE '%vimeo.com%'))
      ORDER BY p."id"`,
    [flags.pin ? flags.pin.map(Number) : null, flags.category ?? null, String(mediumID.youtube)],
  );
  const from = Number(flags.offset ?? 0);
  const todo = rows.slice(from, flags.limit ? from + Number(flags.limit) : undefined);
  console.log(`${todo.length} pin(s) with a video and no second source${flags.category ? ` in ${flags.category}` : ''}${flags.apply ? '' : ' (dry run: add --apply)'}`);

  let found = 0;
  let added = 0;
  for (const row of todo) {
    const { pin } = await Pin.queryById(row.id);
    if (!pin) continue;
    const video = await findAlternateVideo({ title: pin.title, company: pin.company, year: pin.utcStartDateTime?.getUTCFullYear() });
    if (!video) {
      await sleep(DELAY_MS);
      continue;
    }
    found++;
    console.log(`pin ${row.id} "${pin.title.slice(0, 50)}": ${video.originalUrl} [${video.authorName}]`);
    if (flags.apply) {
      try {
        const medium = new Medium(video, pin);
        await medium.addThumb();
        await medium.save();
        added++;
      } catch (err) {
        console.log(`   not stored: ${(err as Error).message.slice(0, 100)}`);
      }
    }
    await sleep(DELAY_MS);
  }
  console.log(`${found} video(s) found, ${added} added`);
}

run()
  .catch((err) => {
    console.log('media:alt-videos failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
