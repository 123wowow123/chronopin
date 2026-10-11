// Stores the research notes agents wrote (what was searched, what stayed a
// gap) as PersonResearchNote rows (0163), so each person's wiki says how far a
// search went. Reads the same JSON files people:radar reads.
//
//   npm run people:notes -- out/*.json --topic legal       radar research files
//   npm run people:notes -- pilot2/out-q*.json --topic society
//   add --dry-run to count only
//
// File entries: { id, name, note, mattersChecked?, axes?, matters? }. The
// coverage is read from the entry: a note that says sources were blocked,
// unreadable, unfetched or the search ran short is "partial" (so "nothing
// found" is weak); an entry with a result is "searched"; no result and no
// such caveat is "not-found" for society/standing, "searched" for legal.
// One note per person and topic; a later run replaces it. Each wiki is
// rebuilt afterwards.

import '../env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import PersonWiki from '@/server/model/personWiki';
import { RESEARCH_TOPICS, type ResearchTopic } from '@/lib/people';

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: { topic: { type: 'string' }, 'dry-run': { type: 'boolean', default: false }, date: { type: 'string' }, coverage: { type: 'string' } },
});

const WEAK = /\b403\b|\b404\b|\b429\b|blocked|unreadable|not readable|could not (?:be )?(?:fetch|read|reach|access)|did not (?:web)?fetch|no pages? (?:were )?fetched|not fetched|ran out|budget|paywall|snippet|unfetchable|not verif|single search|one search|only (?:a )?search|no (?:official |primary |government )?pages? (?:were )?(?:web)?fetched|no (?:official |primary )?(?:source|page)s? (?:was|were) (?:fetched|opened|read)/i;

type Entry = { id: number; name: string; note?: string; mattersChecked?: boolean; axes?: Record<string, unknown>; matters?: unknown[] };

async function main() {
  const topic = (flags.topic ?? 'legal') as ResearchTopic;
  if (!RESEARCH_TOPICS.includes(topic)) throw new Error(`--topic must be one of ${RESEARCH_TOPICS.join(', ')}`);
  const date = flags.date ?? new Date().toISOString().slice(0, 10);
  const touched = new Set<number>();
  let n = 0;
  for (const file of positionals) {
    const entries = JSON.parse(readFileSync(file, 'utf8')) as Entry[];
    for (const e of entries) {
      const note = (e.note ?? '').replace(/\s+/g, ' ').trim();
      if (!note) continue;
      const found = !!(e.axes && Object.keys(e.axes).length) || !!e.matters?.length;
      const weak = WEAK.test(note) || (topic === 'legal' && e.mattersChecked === false);
      const coverage = flags.coverage === 'partial' ? 'partial' : weak ? 'partial' : found || topic === 'legal' ? 'searched' : 'not-found';
      const [person] = await db.query<{ id: number; name: string }>(`SELECT "id", "name" FROM "Person" WHERE "id" = $1`, [e.id]);
      if (!person || person.name !== e.name) {
        console.log(`skip ${e.id} ${e.name}: not found or renamed`);
        continue;
      }
      n += 1;
      if (flags['dry-run']) continue;
      await db.query(
        `INSERT INTO "PersonResearchNote" ("personId", "topic", "coverage", "checkedDate", "note")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("personId", "topic") DO UPDATE SET "coverage" = EXCLUDED."coverage", "checkedDate" = EXCLUDED."checkedDate", "note" = EXCLUDED."note"`,
        [person.id, topic, coverage, date, note.slice(0, 4000)],
      );
      touched.add(person.id);
    }
  }
  for (const id of touched) await PersonWiki.rebuild(id);
  console.log(`${n} note(s) ${flags['dry-run'] ? 'read' : 'saved'}, ${touched.size} wiki(s) rebuilt`);
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
