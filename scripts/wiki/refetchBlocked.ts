// Reads again the links whose text was a bot check or error page instead of
// the article (or that failed to fetch), now that the reader retries in the
// headless browser as plain Chrome and waits out a JavaScript challenge
// (src/server/scrape/sourceText.ts). A link that now reads is stored as pending,
// so `npm run wiki:export` (or wiki:sync, with credit) writes its wiki; one that
// is still blocked is failed with the reason and left alone.
//
//   npm run wiki:refetch-blocked                    list the links it would read
//   npm run wiki:refetch-blocked -- --apply         read them
//   npm run wiki:refetch-blocked -- --apply --limit 30 --offset 60
//   npm run wiki:refetch-blocked -- --apply --id 4723 --id 4730
//
// One page at a time (each opens a browser), so a full run takes a while.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import Source from '@/server/model/source';
import { fetchSourceText, looksBlocked } from '@/server/scrape/sourceText';

const { values: flags } = parseArgs({
  options: { apply: { type: 'boolean', default: false }, limit: { type: 'string' }, offset: { type: 'string' }, id: { type: 'string', multiple: true } },
});

async function run() {
  const rows = await db.query<{ id: number; url: string; kind: string; status: string; text: string | null }>(
    `SELECT "id", "url", "kind", "status", "text" FROM "Source"
      WHERE "kind" IN ('web', 'tweet') AND "status" IN ('pending', 'failed') AND "wikiVersion" = 0
        AND ($1::integer[] IS NULL OR "id" = ANY($1::integer[]))
      ORDER BY "id"`,
    [flags.id ? flags.id.map(Number) : null],
  );
  // A pending link only needs another read when its text is a block page.
  const todo = rows.filter((r) => r.status === 'failed' || !r.text || looksBlocked(r.text)).slice(Number(flags.offset ?? 0), flags.limit ? Number(flags.offset ?? 0) + Number(flags.limit) : undefined);
  console.log(`${todo.length} blocked or failed link(s)${flags.apply ? '' : ' (dry run: add --apply)'}`);
  if (!flags.apply) return;

  let readable = 0;
  for (const row of todo) {
    try {
      const fetched = await fetchSourceText(row.url, row.kind as 'web' | 'tweet');
      await Source.setText(row.id, fetched);
      await Source.markPending(row.id);
      readable++;
      console.log(`source ${row.id}: read ${fetched.text.length} characters ${row.url.slice(0, 70)}`);
    } catch (err) {
      const message = (err as Error).message || String(err);
      await Source.markFailed(row.id, message);
      console.log(`source ${row.id}: still blocked - ${message.slice(0, 70)}`);
    }
  }
  console.log(`${readable} of ${todo.length} link(s) now readable`);
}

run()
  .catch((err) => {
    console.log('wiki:refetch-blocked failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
