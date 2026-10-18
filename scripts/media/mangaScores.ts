// Gives manga and comics pins the scores a scrape would now add: AniList's and
// MyAnimeList's, found by the manga's exact title (src/server/scrape/screen.ts
// findMangaScores). Only a pin about a series gets one; a pin about a volume
// or an award that names no series matches nothing and is left alone.
//
//   npm run media:manga-scores                  list what would be added
//   npm run media:manga-scores -- --apply       add it
//   npm run media:manga-scores -- --ids 5442,5441 --apply
//   npm run media:manga-scores -- --out scores.json   [{pinId, ratings}] for another database
//
// Read the dry run first, as for media:screen. Then `npm run backup:data`.

import '../env';
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { inCategories } from '@/server/model/pinTag';
import Pin from '@/server/model/pin';
import { findMangaScores } from '@/server/scrape/screen';

const { values: flags } = parseArgs({
  options: { apply: { type: 'boolean', default: false }, ids: { type: 'string' }, out: { type: 'string' }, pause: { type: 'string', default: '1500' } },
});
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const ids = flags.ids?.split(',').map(Number).filter(Number.isInteger);
  const rows = await db.query<{ id: number; title: string; year: number }>(
    `SELECT "id", "title", EXTRACT(YEAR FROM "utcStartDateTime")::int AS "year" FROM "Pin"
     WHERE ${inCategories('$1')} AND "utcDeletedDateTime" IS NULL ${ids?.length ? 'AND "id" = ANY($2::int[])' : ''}
     ORDER BY "id"`,
    ids?.length ? [['Manga', 'Comics'], ids] : [['Manga', 'Comics']],
  );
  console.log(`${flags.apply ? 'Updating' : 'Dry run over'} ${rows.length} pins`);
  const out: { pinId: number; ratings: unknown[] }[] = [];
  for (const [index, { id, title, year }] of rows.entries()) {
    if (index) await sleep(Number(flags.pause));
    const ratings = await findMangaScores({ pinTitle: title, year }, 60000);
    console.log(`${id} ${title}\n    ${ratings.map((r) => `${r.source} ${r.score}/${r.scoreMax}`).join(', ') || 'no scores'}`);
    if (!ratings.length) continue;
    out.push({ pinId: id, ratings });
    if (flags.apply) await Pin.setRatings(id, ratings);
  }
  if (flags.out) writeFileSync(flags.out, JSON.stringify(out, null, 2));
  console.log(`${out.length} of ${rows.length} pins scored${flags.apply ? ' and stored' : ''}`);
}

run()
  .catch((err) => {
    console.log('Manga scores err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
