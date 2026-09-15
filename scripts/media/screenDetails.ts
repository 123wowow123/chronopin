// Gives existing film, TV series and anime pins what a scrape now adds: a
// promotional video from YouTube (when the pin has no video yet) and
// review-site ratings (refreshed when it has some). See src/server/scrape/screen.ts.
//
//   npm run media:screen                  list what would be added
//   npm run media:screen -- --apply       add it
//   npm run media:screen -- --ids 769,389 --apply
//   npm run media:screen -- --apply --skip-trailer 783   ratings only for 783
//
// Read the dry run first: a trailer is picked by title, and a title cannot
// always tell a 1999 anime from a later live-action show of the same name.
//
// Then `npm run backup:data` to keep it in the seed data.

import '../env';
import { parseArgs } from 'node:util';
import { mediumID } from '@/lib/appConfig';
import * as db from '@/server/db';
import Medium from '@/server/model/medium';
import Pin from '@/server/model/pin';
import { findScreenDetails, SCREEN_CATEGORIES, youtubeStill } from '@/server/scrape/screen';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    ids: { type: 'string' },
    // Pins whose searched-for trailer turned out to be the wrong video.
    'skip-trailer': { type: 'string' },
    // Between pins, to go easy on YouTube, AniList, Jikan and Wikidata.
    pause: { type: 'string', default: '1500' },
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const ids = flags.ids?.split(',').map(Number).filter(Number.isInteger);
  const skipTrailer = new Set(flags['skip-trailer']?.split(',').map(Number));
  const rows = await db.query<{ id: number }>(
    `SELECT "id" FROM "Pin"
     WHERE "category" = ANY($1::citext[]) AND "utcDeletedDateTime" IS NULL ${ids?.length ? 'AND "id" = ANY($2::int[])' : ''}
     ORDER BY "id"`,
    ids?.length ? [SCREEN_CATEGORIES, ids] : [SCREEN_CATEGORIES],
  );
  console.log(`${flags.apply ? 'Updating' : 'Dry run over'} ${rows.length} pins`);
  const totals = { trailers: 0, ratings: 0, unmatched: 0 };

  for (const [index, { id }] of rows.entries()) {
    if (index) await sleep(Number(flags.pause));
    const { pin } = await Pin.queryById(id);
    if (!pin) continue;
    const hasVideo = pin.media.some((m) => Number(m.type) === mediumID.youtube);
    const details = await findScreenDetails(
      { pinTitle: pin.title, category: pin.category, year: new Date(pin.utcStartDateTime).getUTCFullYear(), skipTrailer: hasVideo || skipTrailer.has(id) },
      60000,
    );

    const ratingText = details.ratings.map((r) => `${r.source} ${r.score}/${r.scoreMax}`).join(', ') || 'no ratings';
    const trailerText = hasVideo ? 'has a video' : details.trailer ? `"${details.trailer.videoTitle}" (${details.trailer.authorName})` : 'no trailer';
    console.log(`${id} ${pin.title}\n    as "${details.workTitle ?? '-'}": ${ratingText}; ${trailerText}`);
    if (!details.workTitle && !details.trailer) totals.unmatched++;

    if (!flags.apply) {
      totals.ratings += details.ratings.length;
      totals.trailers += details.trailer ? 1 : 0;
      continue;
    }
    try {
      if (details.ratings.length) {
        await Pin.setRatings(id, details.ratings);
        totals.ratings += details.ratings.length;
      }
      if (details.trailer) {
        const video = await new Medium(details.trailer, pin).saveWithThumb();
        // A picture as well, from the same still, for when the embed cannot play.
        const still = youtubeStill(details.trailer.originalUrl!);
        if (still && video.thumbName && !pin.media.some((m) => Number(m.type) === mediumID.image)) {
          await new Medium({ ...still, thumbName: video.thumbName, thumbWidth: video.thumbWidth, thumbHeight: video.thumbHeight }, pin).save();
        }
        totals.trailers++;
      }
    } catch (err) {
      console.log(`    failed: ${(err as Error).message}`);
    }
  }
  console.log(`${flags.apply ? 'Added' : 'Would add'} ${totals.trailers} trailers and ${totals.ratings} ratings; ${totals.unmatched} pins matched nothing`);
}

run()
  .catch((err) => {
    console.log('Screen details err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
