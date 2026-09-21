// Records the verdicts from a by-hand wiki run (scripts/wiki/export.ts) on the
// links whose stored text turned out to hold no article at all.
//
// recoverDead.ts can only judge a link by its shape - too short, or wording a
// bot wall uses. That catches a Cloudflare page, but not a 3,000-character
// navigation shell: SpaceX's launch pages, ClinicalTrials.gov's glossary and
// a newsroom 404 all read as plenty of text. Whoever writes the wiki is the
// first to actually read the page, so that is where those are caught, and
// they come back as {"unusable": "<reason>"} instead of a wiki.
//
// This turns each of those into a failed link with the reason on it, with its
// tries spent, so wiki:export stops offering it and the pin's summary is
// built from the links that do say something.
//
//   npm run wiki:mark-unusable -- --dir scratchpad/wiki-jobs
//   npm run wiki:mark-unusable -- --dir scratchpad/wiki-jobs --dry-run

import '../env';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import Source, { MAX_ATTEMPTS } from '@/server/model/source';

const { values: flags } = parseArgs({
  options: { dir: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } },
});

async function run() {
  if (!flags.dir) throw new Error('--dir DIR is required');
  const folder = path.join(path.resolve(flags.dir), 'results', 'wikis');
  if (!existsSync(folder)) throw new Error(`no results in ${folder}`);

  const found: { id: number; reason: string }[] = [];
  for (const file of readdirSync(folder).filter((f) => f.endsWith('.json'))) {
    let data: { unusable?: string };
    try {
      data = JSON.parse(readFileSync(path.join(folder, file), 'utf8'));
    } catch {
      console.log(`${file}: not valid JSON - skipped`);
      continue;
    }
    if (typeof data.unusable === 'string' && data.unusable.trim()) {
      found.push({ id: Number(path.basename(file, '.json')), reason: data.unusable.trim() });
    }
  }

  console.log(`${found.length} link(s) read as holding no article${flags['dry-run'] ? ' (dry run)' : ''}`);
  for (const { id, reason } of found) {
    // A results directory is a snapshot of one round's judgements, and a link
    // judged empty in an earlier round may since have been re-read from the
    // archive and written up. Running an older directory must not undo that:
    // a source that now has a wiki is settled, and this verdict is stale.
    const source = await Source.getById(id);
    if (!source) {
      console.log(`  source ${id}: no longer exists - skipped`);
      continue;
    }
    if (source.wikiVersion > 0) {
      console.log(`  source ${id}: has a wiki (version ${source.wikiVersion}) since this was judged - verdict is out of date, skipped`);
      continue;
    }
    console.log(`  source ${id}: ${reason.slice(0, 110)}`);
    if (flags['dry-run']) continue;
    await Source.markFailed(id, `Blocked: the page holds no article - ${reason}`);
    // Read by hand and found to hold nothing, so this is settled, not one
    // failure among three.
    await db.query(`UPDATE "Source" SET "attempts" = $2 WHERE "id" = $1`, [id, MAX_ATTEMPTS]);
  }
  await db.closeConnection();
}

run().catch(async (err) => {
  console.error(err);
  await db.closeConnection();
  process.exitCode = 1;
});
