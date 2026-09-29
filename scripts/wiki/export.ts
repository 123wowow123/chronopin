// The Claude jobs the link wikis are waiting on, written out to be done by
// hand - in a Claude Code session when the app's Anthropic key has no credit.
// wiki:apply saves the answers. See docs/okf/playbooks/without-api-credit.md.
//
//   npm run wiki:export -- --out /tmp/wiki-jobs            every job due
//   npm run wiki:export -- --out /tmp/wiki-jobs --pin 930  just that pin's
//
// DIR/prompts.md               the app's own prompts and output schemas - follow them exactly
// DIR/wikis/<sourceId>.json    a link to write up: its text, in parts when long
// DIR/summaries/<pinId>.json   a pin whose summary is behind: the wikis to compose it from
// DIR/contradictions/<pinId>.json  a pin to check: the same wikis
//
// Answers go in DIR/results/{wikis,summaries,contradictions}/<id>.json.
// Summaries and contradiction checks need their pin's wikis, so a pin with
// links still waiting on a wiki shows up there only on the next export,
// after those wikis are applied.

import '../env';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { CONTRADICTION_PROMPT, CONTRADICTION_SCHEMA } from '@/server/extract/contradictions';
import {
  COMPOSE_PROMPT, COMPOSE_SCHEMA, composeInput, pageSchema, partContent, ROOT_PROMPT, splitText, WIKI_PROMPT, wikiHeader,
} from '@/server/extract/wiki';
import Source, { PinSource } from '@/server/model/source';
import { fetchSourceText } from '@/server/scrape/sourceText';
import { pinsDueForContradictionCheck } from '@/server/services/okfLint';
import { pinLinks, syncPinSources } from '@/server/services/sourceWiki';

const { values: flags } = parseArgs({
  options: { out: { type: 'string' }, pin: { type: 'string', multiple: true }, 'retry-failed': { type: 'boolean' }, limit: { type: 'string' } },
});

const json = (file: string, data: unknown) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
};

// wiki:recover-dead holds this while it runs (scripts/wiki/recoverDead.ts).
// An export taken mid-recovery writes out whichever links it has not reached
// yet with the text they are about to stop having, and whoever answers those
// jobs then judges a page that no longer exists - marking a link unusable
// from a wall that has since been replaced by the article. Cheaper to wait.
const RECOVER_LOCK_KEY = 0x7a11c0de;

async function recoveryIsRunning(): Promise<boolean> {
  const client = await db.getPool().connect();
  try {
    const { rows } = await client.query<{ free: boolean }>('SELECT pg_try_advisory_lock($1) AS free', [RECOVER_LOCK_KEY]);
    // Taking it proves nobody else holds it; give it straight back.
    if (rows[0].free) await client.query('SELECT pg_advisory_unlock($1)', [RECOVER_LOCK_KEY]);
    return !rows[0].free;
  } finally {
    client.release();
  }
}

async function run() {
  if (!flags.out) throw new Error('--out DIR is required');
  if (await recoveryIsRunning()) {
    throw new Error('wiki:recover-dead is running - its links are still changing, so wait for it to finish before exporting');
  }
  const out = path.resolve(flags.out);
  const limit = flags.limit ? Number(flags.limit) : 100_000;
  const pinIds = flags.pin?.map(Number);
  rmSync(out, { recursive: true, force: true });
  // prompts.md is written even when nothing is due, and the job writers are
  // what otherwise create the directory - so a run with 0 jobs needs it here.
  mkdirSync(out, { recursive: true });
  if (pinIds) for (const id of pinIds) await syncPinSources(id);

  // Links waiting on a wiki.
  const sourceIds = pinIds
    ? [...new Set((await Promise.all(pinIds.map((pinId) => Source.needingWiki({ pinId, force: flags['retry-failed'] })))).flat())]
    : await Source.needingWiki({ limit, force: flags['retry-failed'] });
  let wikis = 0;
  for (const id of sourceIds.slice(0, limit)) {
    const source = await Source.getById(id);
    if (!source) continue;
    let { text, title } = source;
    if (!text) {
      try {
        const fetched = await fetchSourceText(source.url, source.kind);
        await Source.setText(id, fetched);
        ({ text } = fetched);
        title = title ?? fetched.title ?? null;
      } catch (err) {
        await Source.markFailed(id, (err as Error).message);
        console.log(`source ${id}: could not read ${source.url} - ${(err as Error).message}`);
        continue;
      }
    }
    const header = wikiHeader(source.url, source.kind, title);
    const parts = splitText(text!);
    json(path.join(out, 'wikis', `${id}.json`), {
      sourceId: id,
      url: source.url,
      kind: source.kind,
      wikiVersion: source.wikiVersion,
      // One entry per call: each is the whole user message for that call.
      parts: parts.map((part, i) => partContent(header, part, i, parts.length)),
      answer: parts.length === 1 ? 'results/wikis/<sourceId>.json = one page (schema: wiki page with topics and lastModified)' : 'results/wikis/<sourceId>.json = { parts: [one page per part, with topics], root: main page written from the parts (ROOT prompt, with lastModified) }',
    });
    wikis++;
  }

  // Pins whose summary is behind their (written) wikis.
  const staleIds = (await PinSource.staleSummaryPinIds(100_000)).filter((id) => !pinIds || pinIds.includes(id)).slice(0, limit);
  let summaries = 0;
  for (const pinId of staleIds) {
    const found = await pinLinks(pinId);
    if (!found?.links.length) continue;
    json(path.join(out, 'summaries', `${pinId}.json`), {
      pinId,
      versions: found.links.map((l) => ({ sourceId: l.sourceId, wikiVersion: l.wikiVersion })),
      labels: Object.fromEntries(found.links.map((l) => [l.label, l.url])),
      input: composeInput(found.about, found.links, found.currentSummary),
    });
    summaries++;
  }

  const due = await pinsDueForContradictionCheck(pinIds, limit);
  for (const { pinId, signature, found } of due) {
    json(path.join(out, 'contradictions', `${pinId}.json`), {
      pinId,
      signature,
      labels: Object.fromEntries(found.links.map((l) => [l.label, l.url])),
      input: composeInput(found.about, found.links),
    });
  }

  writeFileSync(
    path.join(out, 'prompts.md'),
    [
      '# Wiki jobs',
      '',
      'Answer each job as the app would: follow the system prompt for its kind and return exactly the JSON its schema describes, one file per job under results/.',
      '',
      '## Wiki (wikis/<sourceId>.json)',
      '',
      'System prompt for each part:',
      '',
      '```text', WIKI_PROMPT, '```',
      '',
      'Schema for a one-part link (the whole answer), and for each part of a longer one (drop lastModified there):',
      '',
      '```json', JSON.stringify(pageSchema({ topics: true, root: true }), null, 2), '```',
      '',
      'For a link in parts, the main page is written from the part pages with this system prompt, and the answer is { "parts": [...], "root": {...} }:',
      '',
      '```text', ROOT_PROMPT, '```',
      '',
      '```json', JSON.stringify(pageSchema({ topics: false, root: true }), null, 2), '```',
      '',
      '## Summary (summaries/<pinId>.json)',
      '',
      'Input is the file\'s "input". Answer { "pinId", "versions" (copied from the job), "longFormSummary", "title", "description", "update" } with citations as [S], [1], [2]... labels in the summary; title, description and update are null unless links marked (new) changed what the pin states.',
      '',
      '```text', COMPOSE_PROMPT, '```',
      '',
      '```json', JSON.stringify(COMPOSE_SCHEMA, null, 2), '```',
      '',
      '## Contradiction check (contradictions/<pinId>.json)',
      '',
      'Input is the file\'s "input". Answer { "pinId", "signature" (copied from the job), "contradictions": [...] }.',
      '',
      '```text', CONTRADICTION_PROMPT, '```',
      '',
      '```json', JSON.stringify(CONTRADICTION_SCHEMA, null, 2), '```',
      '',
    ].join('\n'),
  );
  console.log(`${wikis} wiki(s), ${summaries} summary(ies), ${due.length} contradiction check(s) written to ${out}`);
}

run()
  .catch((err) => {
    console.log('wiki:export failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
