// Saves Claude jobs done by hand (see scripts/wiki/export.ts and
// docs/okf/playbooks/without-api-credit.md): every file under
// DIR/results/{wikis,summaries,contradictions}.
//
//   npm run wiki:apply -- --dir /tmp/wiki-jobs
//   npm run wiki:apply -- --dir /tmp/wiki-jobs --by claude-code/claude-opus-5
//   npm run wiki:apply -- --dir /tmp/wiki-jobs --rewrite   replace wikis that already exist
//
// --by is the OKF actor recorded as the wikis' generated.by. A summary or
// contradiction check is skipped when its pin's wikis have changed since the
// export - export again for a fresh job.

import '../env';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { cleanContradictions } from '@/server/extract/contradictions';
import { composedFrom, wikiFromOutputs, type WikiOutput } from '@/server/extract/wiki';
import Source from '@/server/model/source';
import { contradictionSignature, saveContradictions } from '@/server/services/okfLint';
import { pinLinks, saveSummary } from '@/server/services/sourceWiki';

const { values: flags } = parseArgs({
  options: { dir: { type: 'string' }, by: { type: 'string', default: 'claude-code/claude-opus-5' }, rewrite: { type: 'boolean', default: false } },
});

const results = (dir: string, kind: string) => {
  const folder = path.join(dir, 'results', kind);
  return existsSync(folder)
    ? readdirSync(folder)
        .filter((f) => f.endsWith('.json'))
        .map((f) => ({ file: f, data: JSON.parse(readFileSync(path.join(folder, f), 'utf8')) }))
    : [];
};

const isPage = (p: unknown): p is WikiOutput => {
  const page = p as WikiOutput;
  return !!page && typeof page.title === 'string' && typeof page.summary === 'string' && typeof page.body === 'string' && Array.isArray(page.tags);
};

async function run() {
  if (!flags.dir) throw new Error('--dir DIR is required');
  const dir = path.resolve(flags.dir);
  if (!/^[^\s/:]+\/\S+$|^human:\S+$|^process:\S+$/.test(flags.by!)) throw new Error('--by must be an OKF actor, e.g. claude-code/claude-opus-5');

  for (const { file, data } of results(dir, 'wikis')) {
    const sourceId = Number(data.sourceId ?? path.basename(file, '.json'));
    const source = await Source.getById(sourceId);
    if (!source) {
      console.log(`wiki ${file}: no source ${sourceId}`);
      continue;
    }
    const parts: unknown[] = data.parts ?? [data];
    if (!parts.every(isPage) || (data.root !== undefined && !isPage(data.root)) || (parts.length > 1 && !data.root)) {
      console.log(`wiki ${file}: not in the wiki page schema - skipped`);
      continue;
    }
    // Applying the same directory twice rewrites every wiki in it with the
    // same content under a new version number, and a bumped version puts each
    // citing pin's summary behind its links again - so a second, harmless-
    // looking run undoes the summaries the first one just built. A source that
    // already has a wiki is left alone unless the rewrite is asked for.
    if (source.wikiVersion > 0 && !flags.rewrite) {
      console.log(`wiki for source ${sourceId}: already has version ${source.wikiVersion} - skipped (--rewrite to replace it)`);
      continue;
    }
    const written = wikiFromOutputs(source.kind, parts as WikiOutput[], data.root);
    const version = await Source.saveWiki(sourceId, written.root, { title: source.title ?? written.root.title, generatedBy: flags.by!, sourceModifiedDate: written.sourceModifiedDate });
    console.log(`wiki for source ${sourceId}: saved as version ${version}`);
  }

  for (const { file, data } of results(dir, 'summaries')) {
    const pinId = Number(data.pinId);
    const found = await pinLinks(pinId);
    const now = found?.links.map((l) => `${l.sourceId}:${l.wikiVersion}`).sort().join();
    const then = (data.versions ?? []).map((v: { sourceId: number; wikiVersion: number }) => `${v.sourceId}:${v.wikiVersion}`).sort().join();
    if (!found || now !== then) {
      console.log(`summary ${file}: pin ${pinId}'s wikis changed since the export - skipped`);
      continue;
    }
    const html = typeof data.longFormSummary === 'string' ? data.longFormSummary.trim() : '';
    if (html && !/^<ul>[\s\S]*<\/ul>$/i.test(html)) {
      console.log(`summary ${file}: longFormSummary must be one <ul> list - skipped`);
      continue;
    }
    // A title, description and update note come along when newer links changed them.
    const composed = composedFrom(data, found.links);
    await saveSummary(pinId, found.links, composed);
    const rewrote = [composed.title && 'title', composed.description && 'description'].filter(Boolean).join(' and ');
    console.log(`summary for pin ${pinId}: ${html ? `saved${rewrote ? `, ${rewrote} rewritten` : ''}` : 'nothing to summarize, links marked taken in'}`);
  }

  for (const { file, data } of results(dir, 'contradictions')) {
    const pinId = Number(data.pinId);
    const found = await pinLinks(pinId);
    if (!found || contradictionSignature(found) !== data.signature) {
      console.log(`contradictions ${file}: pin ${pinId} changed since the export - skipped`);
      continue;
    }
    const labels = Object.fromEntries(found.links.map((l) => [l.label, l.url]));
    const contradictions = cleanContradictions(data, Object.keys(labels));
    await saveContradictions(pinId, data.signature, contradictions, labels);
    console.log(`contradictions for pin ${pinId}: ${contradictions.length} recorded`);
  }
}

run()
  .catch((err) => {
    console.log('wiki:apply failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
