// The wiki under each person's page (0151). Saving a profile compiles its
// wiki; this catches up the ones that have none, re-compiles after a change to
// the compiler, writes the link wikis behind the references, and exports.
//
//   npm run people:wiki                     compile wikis for people with none
//   npm run people:wiki -- --all            re-compile every wiki
//   npm run people:wiki -- --id 12          one person
//   npm run people:wiki -- --sources        also write a link wiki for each cited link that
//                                                has none (one fetch + one Claude call each; the
//                                                no-credit route is `npm run wiki:export`/`wiki:apply`)
//   npm run people:wiki -- --sources --limit 20
//   npm run people:wiki -- --out ./okf-people    write the wikis as an OKF bundle
//   npm run people:wiki -- --dry-run
//
// Then `npm run backup:data` (the wikis are compiled, not seeded).

import '../env';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import PersonWiki from '@/server/model/personWiki';
import { ingestSource } from '@/server/services/sourceWiki';

const { values: flags } = parseArgs({
  options: {
    all: { type: 'boolean', default: false },
    id: { type: 'string' },
    sources: { type: 'boolean', default: false },
    limit: { type: 'string' },
    out: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});

async function compileWikis() {
  const rows = await db.query<{ id: number; name: string }>(
    `SELECT "p"."id", "p"."name" FROM "Person" AS "p"
     WHERE ($1::int IS NULL OR "p"."id" = $1) AND ($2 OR $1 IS NOT NULL OR NOT EXISTS (SELECT 1 FROM "PersonWiki" "w" WHERE "w"."personId" = "p"."id"))
     ORDER BY "p"."id"`,
    [flags.id ? Number(flags.id) : null, flags.all],
  );
  console.log(`${rows.length} wiki(s) to compile`);
  if (flags['dry-run']) return;
  let n = 0;
  for (const row of rows) {
    await PersonWiki.rebuild(row.id);
    n += 1;
    if (n % 100 === 0) console.log(`${n} compiled`);
  }
  console.log(`${n} compiled`);
}

async function linkWikis() {
  const pending = await PersonWiki.pendingSources(flags.limit ? Number(flags.limit) : 100_000);
  console.log(`${pending.length} cited link(s) without a link wiki`);
  if (flags['dry-run']) return;
  const totals: Record<string, number> = {};
  for (const source of pending) {
    const result = await ingestSource(source.id);
    totals[result] = (totals[result] ?? 0) + 1;
    console.log(`${result}\t${source.url}`);
    if (result === 'skipped') {
      console.log('The Claude API is unavailable (no key or credit): stopping. See `npm run wiki:export` for the by-hand route.');
      break;
    }
  }
  console.log(JSON.stringify(totals));
  // The titles the wikis found are carried into the compiled pages.
  await PersonWiki.rebuildAll();
}

async function exportBundle(dir: string) {
  const files = await PersonWiki.bundle(flags.id ? [Number(flags.id)] : undefined);
  for (const [path, text] of files) {
    const target = join(dir, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
  }
  console.log(`${files.size} file(s) written to ${dir}`);
}

(async () => {
  await compileWikis();
  if (flags.sources) await linkWikis();
  if (flags.out) await exportBundle(flags.out);
})()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
