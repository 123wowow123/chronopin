// Gives existing game pins their Steam buy button (src/server/steamListing.ts),
// as the scrape does for new ones.
//
//   npm run merchants:steam                          what would change, every game pin without one
//   npm run merchants:steam -- --ids 5235,5236       these pins
//   npm run merchants:steam -- --apply               save the listings in this database
//   npm run merchants:steam -- --out steam.json      write [{pinId, merchants}] to post to another
//                                                    database's POST /api/pins/:id/merchants
//
// Titles are read the way the scrape does, then by the first words of the
// title (longest first), because a news title rarely quotes the game. A
// listing needs the game's exact name and a release year within one of the
// pin's, so read the dry run's pairs before applying.

import '../env';
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { inCategories } from '@/server/model/pinTag';
import * as db from '@/server/db';
import Merchant from '@/server/model/merchant';
import { GAME_CATEGORIES } from '@/server/scrape/scoreMarkets';
import { findSteamListing } from '@/server/steamListing';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    ids: { type: 'string' },
    out: { type: 'string' },
    pause: { type: 'string', default: '1000' },
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// "Guildrun autobattler roguelike releases on Steam" -> "Guildrun autobattler
// roguelike", "Guildrun autobattler", "Guildrun": the title's first one to
// four words, longest first. Not one that a subtitle follows ("Kingdom Come:
// Deliverance..." is not the game "Kingdom Come").
const prefixes = (title: string) => {
  const raw = title.split(/\s+/).filter(Boolean);
  return [4, 3, 2, 1]
    .filter((n) => n <= raw.length && !/[:\u2013\u2014-]$/.test(raw[n - 1]) && !/^[\u2013\u2014-]$/.test(raw[n] ?? ''))
    .map((n) => raw.slice(0, n).join(' ').replace(/[“”"‘’:,!?]/g, ' ').replace(/\s+/g, ' ').trim());
};

async function run() {
  const ids = flags.ids?.split(',').map(Number).filter(Number.isInteger);
  const rows = await db.query<{ id: number; title: string; year: number | null; links: string[] }>(
    `SELECT "Pin"."id", "Pin"."title", EXTRACT(YEAR FROM "Pin"."utcStartDateTime")::int AS "year",
            ARRAY(SELECT "r"."url" FROM "PinReference" AS "r" WHERE "r"."pinId" = "Pin"."id") || ARRAY["Pin"."sourceUrl"] AS "links"
     FROM "Pin"
     WHERE ${inCategories('$1')} AND "Pin"."utcDeletedDateTime" IS NULL
       AND NOT EXISTS (SELECT 1 FROM "Merchant" AS "m" WHERE "m"."pinId" = "Pin"."id" AND "m"."url" ILIKE '%steampowered.com%')
       ${ids?.length ? 'AND "Pin"."id" = ANY($2::int[])' : ''}
     ORDER BY "Pin"."id"`,
    ids?.length ? [GAME_CATEGORIES, ids] : [GAME_CATEGORIES],
  );
  console.log(`${flags.apply ? 'Updating' : 'Dry run over'} ${rows.length} game pins without a Steam link`);
  const posts: { pinId: number; merchants: { label: string; url: string; price?: number }[] }[] = [];

  for (const row of rows) {
    const listing = await findSteamListing({ pinTitle: row.title, year: row.year ?? undefined, links: row.links.filter(Boolean), moreTitles: prefixes(row.title) });
    if (!listing) continue;
    console.log(`${row.id} ${row.title}\n    ${listing.url}${listing.price ? ` $${listing.price}` : ''}`);
    posts.push({ pinId: row.id, merchants: [listing] });
    if (flags.apply) await Merchant.saveAll([new Merchant(listing)], row.id);
    await sleep(Number(flags.pause));
  }
  if (flags.out) writeFileSync(flags.out, JSON.stringify(posts, null, 2));
  console.log(`${flags.apply ? 'Saved' : 'Would save'} ${posts.length} Steam links`);
}

run()
  .catch((err) => {
    console.log('Steam listings err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
