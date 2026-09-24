// Gives existing film, TV series and anime pins what a scrape now adds: a
// promotional video from YouTube (when the pin has no video yet), review-site
// ratings (refreshed when it has some) and, for an episodic work, how many
// episodes it has (only when the pin has no count yet - a pin about one season
// is counted by its own page, not by the catalogue's entry for the show), and
// "Watch on" links to the streaming services carrying it (added, never
// replacing a link the pin already has for that service).
// See src/server/scrape/screen.ts.
//
//   npm run media:screen                  list what would be added
//   npm run media:screen -- --apply       add it
//   npm run media:screen -- --ids 769,389 --apply
//   npm run media:screen -- --apply --skip-trailer 783   ratings only for 783
//   npm run media:screen -- --apply --skip-trailer all   no trailer lookups at all
//
// Read the dry run first: a trailer is picked by title, and a title cannot
// always tell a 1999 anime from a later live-action show of the same name.
//
// Then `npm run backup:data` to keep it in the seed data.

import '../env';
import { parseArgs } from 'node:util';
import { mediumID } from '@/lib/appConfig';
import { firstCategoryOf } from '@/lib/categories';
import { inCategories } from '@/server/model/pinTag';
import * as db from '@/server/db';
import Medium from '@/server/model/medium';
import Merchant from '@/server/model/merchant';
import Pin from '@/server/model/pin';
import PinTag from '@/server/model/pinTag';
import { findScreenDetails, malIdOf, SCREEN_CATEGORIES, youtubeStill } from '@/server/scrape/screen';
import { streamingService } from '@/lib/streaming';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    ids: { type: 'string' },
    // Pins whose searched-for trailer turned out to be the wrong video, or
    // "all" for a run that is only after ratings and episode counts.
    'skip-trailer': { type: 'string' },
    // Between pins, to go easy on YouTube, AniList, Jikan and Wikidata.
    pause: { type: 'string', default: '1500' },
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const ids = flags.ids?.split(',').map(Number).filter(Number.isInteger);
  const noTrailers = flags['skip-trailer']?.trim() === 'all';
  const skipTrailer = new Set(noTrailers ? [] : flags['skip-trailer']?.split(',').map(Number));
  const rows = await db.query<{ id: number; episodeCount: number | null }>(
    `SELECT "id", "episodeCount" FROM "Pin"
     WHERE ${inCategories('$1')} AND "utcDeletedDateTime" IS NULL ${ids?.length ? 'AND "id" = ANY($2::int[])' : ''}
     ORDER BY "id"`,
    ids?.length ? [SCREEN_CATEGORIES, ids] : [SCREEN_CATEGORIES],
  );
  console.log(`${flags.apply ? 'Updating' : 'Dry run over'} ${rows.length} pins`);
  const totals = { trailers: 0, ratings: 0, episodes: 0, tags: 0, streaming: 0, unmatched: 0 };

  for (const [index, { id, episodeCount }] of rows.entries()) {
    if (index) await sleep(Number(flags.pause));
    const { pin } = await Pin.queryById(id);
    if (!pin) continue;
    const hasVideo = pin.media.some((m) => Number(m.type) === mediumID.youtube);
    const details = await findScreenDetails(
      {
        pinTitle: pin.title,
        category: firstCategoryOf(pin.categories, SCREEN_CATEGORIES),
        year: new Date(pin.utcStartDateTime).getUTCFullYear(),
        skipTrailer: hasVideo || noTrailers || skipTrailer.has(id),
        // Most anime pins cite their MyAnimeList entry, which names the work
        // outright where a "... Premieres" title matches nothing.
        malId: malIdOf([pin.sourceUrl, ...(pin.references ?? []).map((r) => r.url)]),
        // The studio or licensor, so its own channel wins the trailer search.
        company: pin.company,
      },
      60000,
    );

    const ratingText = details.ratings.map((r) => `${r.source} ${r.score}/${r.scoreMax}`).join(', ') || 'no ratings';
    const trailerText = hasVideo ? 'has a video' : noTrailers ? 'trailers skipped' : details.trailer ? `"${details.trailer.videoTitle}" (${details.trailer.authorName})` : 'no trailer';
    // A pin that already has a count keeps it: its own page counted the run it
    // is about, which a catalogue entry for the whole show would overwrite.
    const newEpisodes = episodeCount ? undefined : details.episodes;
    const episodeText = episodeCount ? `has ${episodeCount} episodes` : newEpisodes ? `${newEpisodes.episodeCount} episodes (${newEpisodes.episodeStatus})` : 'no episode count';
    // What the work was adapted from, when the pin is not already tagged with it.
    const adaptedFrom = details.adaptedFrom && !pin.tags?.some((t: { name: string }) => t.name.toLowerCase() === details.adaptedFrom!.toLowerCase()) ? details.adaptedFrom : undefined;
    const tagText = adaptedFrom ? `from ${adaptedFrom}` : 'no adaptation tag';
    // Services the pin has no link for yet.
    const have = new Set(pin.merchants.map((m) => streamingService(m.url)?.label).filter(Boolean));
    const streaming = details.streaming.filter((m) => !have.has(m.label));
    const streamingText = streaming.length ? `watch on ${streaming.map((m) => m.label).join(', ')}` : 'no new streaming links';
    console.log(`${id} ${pin.title}\n    as "${details.workTitle ?? '-'}": ${ratingText}; ${trailerText}; ${episodeText}; ${tagText}; ${streamingText}`);
    for (const m of streaming) console.log(`      ${m.label}: ${m.url}`);
    if (!details.workTitle && !details.trailer) totals.unmatched++;

    if (!flags.apply) {
      totals.ratings += details.ratings.length;
      totals.trailers += details.trailer ? 1 : 0;
      totals.episodes += newEpisodes ? 1 : 0;
      totals.tags += adaptedFrom ? 1 : 0;
      totals.streaming += streaming.length;
      continue;
    }
    try {
      if (details.ratings.length) {
        await Pin.setRatings(id, details.ratings);
        totals.ratings += details.ratings.length;
      }
      if (newEpisodes) {
        await Pin.setEpisodes(id, newEpisodes);
        totals.episodes++;
      }
      if (streaming.length) {
        await Merchant.saveAll(streaming.map((m) => new Merchant(m)), id);
        totals.streaming += streaming.length;
      }
      if (adaptedFrom) {
        await PinTag.addUserTags(id, [adaptedFrom]);
        totals.tags++;
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
  console.log(
    `${flags.apply ? 'Added' : 'Would add'} ${totals.trailers} trailers, ${totals.ratings} ratings, ${totals.episodes} episode counts`
      + `, ${totals.tags} adaptation tags and ${totals.streaming} streaming links; ${totals.unmatched} pins matched nothing`,
  );
}

run()
  .catch((err) => {
    console.log('Screen details err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
