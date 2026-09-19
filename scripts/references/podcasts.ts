// Cross-checks pins against podcast episodes on Apple Podcasts, the check a
// new pin gets on save (src/server/services/podcastReferences.ts), and adds
// the episodes that back a pin up as references.
//
//   npm run references:podcasts -- --id 461 --dry-run   one pin, change nothing
//   npm run references:podcasts -- --since 2026-09-01   pins posted since a day
//
// Read a dry run first: without Anthropic credit, episodes are judged by
// keywords and dates only.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { crossCheckPodcasts } from '@/server/services/podcastReferences';

const { values: flags } = parseArgs({
  options: { id: { type: 'string' }, since: { type: 'string' }, 'dry-run': { type: 'boolean' } },
});

async function run() {
  if (!flags.id && !flags.since) {
    throw new Error('Pass --id <pin> or --since <YYYY-MM-DD>');
  }
  const ids = flags.id
    ? [Number(flags.id)]
    : (
        await db.query<{ id: number }>(
          `SELECT "id" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL AND "utcCreatedDateTime" >= $1::date ORDER BY "id"`,
          [flags.since],
        )
      ).map((row) => row.id);
  const dryRun = !!flags['dry-run'];
  let added = 0;
  for (const id of ids) {
    const checks = await crossCheckPodcasts(id, { dryRun });
    console.log(`pin ${id}: ${checks.length} episode(s) read`);
    for (const c of checks) {
      const verdict = c.confidence != null ? `${c.confidence}${c.added ? ' added' : dryRun && c.confidence >= 70 ? ' would add' : ''}` : 'no';
      console.log(`  [${verdict}] ${c.episode.show}: ${c.episode.title} (${c.episode.releaseDate?.slice(0, 10)}) ${c.transcript ?? 'notes only'}, ${c.judgedBy}`);
      console.log(`      ${c.episode.url}`);
      if (c.reasoning) console.log(`      ${c.reasoning}`);
      if (c.note) console.log(`      ${c.note}`);
    }
    added += checks.filter((c) => c.added).length;
  }
  console.log(`Checked ${ids.length} pin(s), added ${added} reference(s)${dryRun ? ' (dry run)' : ''}.`);
}

run()
  .catch((err) => {
    console.log('references:podcasts failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
