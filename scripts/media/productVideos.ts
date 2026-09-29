// Gives pins with no video the official one, from the same keyless YouTube
// search a scrape runs (findProductVideo in src/server/scrape/screen.ts):
// search results page, verified channel, most of the pin's distinctive title
// words, checked through oEmbed so a video that cannot be embedded is skipped.
// Nothing here calls Claude.
//
//   npm run media:videos                          list what it would add (dry run)
//   npm run media:videos -- --apply
//   npm run media:videos -- --category Gaming
//   npm run media:videos -- --apply --limit 20 --offset 40
//   npm run media:videos -- --apply --pin 123 --pin 456
//   npm run media:videos -- --apply --delay 6     seconds between pins (default 4)
//
// A film, series or anime is left alone: its trailer is a different search
// (`npm run media:screen`), which matches the work's own title rather than the
// pin's. A pin nothing passes the filter for is left as it is - that is the
// common case, and better than hanging a stranger's video on it. Then
// `npm run backup:data`.

import '../env';
import { parseArgs } from 'node:util';
import { mediumID } from '@/lib/appConfig';
import { videosNeeded } from '@/lib/mediaTarget';
import * as db from '@/server/db';
import Medium from '@/server/model/medium';
import Pin from '@/server/model/pin';
import { findProductVideo, isScreenCategory } from '@/server/scrape/screen';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    category: { type: 'string' },
    limit: { type: 'string' },
    offset: { type: 'string' },
    delay: { type: 'string' },
    pin: { type: 'string', multiple: true },
  },
});
const DELAY_MS = Number(flags.delay ?? 4) * 1000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const rows = await db.query<{ id: number; videos: number }>(
    `SELECT p."id",
            (SELECT count(*) FROM "PinMedium" pm
               JOIN "Medium" m ON m."id" = pm."mediumId"
              WHERE pm."pinId" = p."id" AND pm."utcDeletedDateTime" IS NULL AND m."type" = $1)::int AS "videos"
       FROM "Pin" p
      WHERE p."utcDeletedDateTime" IS NULL
        AND ($2::integer[] IS NULL OR p."id" = ANY($2::integer[]))
        AND ($3::text IS NULL OR EXISTS (
              SELECT 1 FROM "PinTag" t
               WHERE t."pinId" = p."id" AND t."kind" = 'category' AND t."name" = $3))
      ORDER BY p."id"`,
    [String(mediumID.youtube), flags.pin ? flags.pin.map(Number) : null, flags.category ?? null],
  );
  const todo = rows
    .filter((r) => videosNeeded(r.videos) > 0)
    .slice(Number(flags.offset ?? 0), flags.limit ? Number(flags.offset ?? 0) + Number(flags.limit) : undefined);
  console.log(
    `${todo.length} pin(s) with no video${flags.category ? ` in ${flags.category}` : ''}${flags.apply ? '' : ' (dry run: add --apply)'}`,
  );

  let found = 0;
  let added = 0;
  let screen = 0;
  for (const row of todo) {
    const { pin } = await Pin.queryById(row.id);
    if (!pin) continue;
    // media:screen's search, not this one.
    if (isScreenCategory(pin.categories)) {
      screen++;
      continue;
    }
    const video = await findProductVideo({ title: pin.title, company: pin.company, year: pin.utcStartDateTime?.getUTCFullYear() });
    if (!video) {
      console.log(`pin ${row.id}: nothing passed for "${pin.title.slice(0, 60)}"`);
      await sleep(DELAY_MS);
      continue;
    }
    found++;
    console.log(`pin ${row.id}: ${video.videoTitle ?? video.originalUrl} [${video.authorName}]`);
    if (flags.apply) {
      try {
        // The still is stored as the medium's thumb, so the map's popup and
        // the cards have a picture for it (Medium#addVideoThumb).
        const medium = new Medium({ ...video, videoTitle: undefined }, pin);
        await medium.addThumb();
        await medium.save();
        added++;
      } catch (err) {
        console.log(`   not stored: ${(err as Error).message.slice(0, 100)}`);
      }
    }
    await sleep(DELAY_MS);
  }
  console.log(
    `${found} video(s) found, ${added} added${screen ? `, ${screen} film/series/anime pin(s) left to media:screen` : ''}`,
  );
}

run()
  .catch((err) => {
    console.log('media:videos failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
