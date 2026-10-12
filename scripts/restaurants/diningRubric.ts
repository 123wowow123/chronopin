// Stores the dining rubrics in scripts/restaurants/diningRubric.json
// (PinDining, 0170) for the restaurant pins they name, and backs each one with
// wikis: every page a score was read from becomes one of the pin's
// references (so the rubric's citation is a [n] into its References panel) and
// gets a link wiki written from what was read there. The file is an array of
//
//   { "pinId": 2464,
//     "scores": { "food": 4.5, "service": 5, "ambience": 4.5, "value": null, "acclaim": 5 },
//     "basis": "OpenTable (3,657 ratings ...): Food 4.7 ... Value not scored ...",
//     "sourceUrl": "https://www.opentable.com/r/eleven-madison-park",
//     "reviews": [ { "url": "https://...", "title": "...", "publishedDate": "2026-09-30", "quote": "..." } ],
//     "sources": [ { "url": "https://www.opentable.com/r/eleven-madison-park",
//                    "title": "Eleven Madison Park on OpenTable",
//                    "reasoning": "What the page states that the rubric uses.",
//                    "text": "the figures as read from the page",
//                    "wiki": { "title": "...", "summary": "...", "body": "...", "tags": ["..."], "lastModified": "2026-10-12" } } ] }
//
// Each score is 0-5 in half steps, or null where no figure is published (the
// rubric is in docs/okf/scraping/strategy.md, "Dining rubric"). "sources" is
// optional: each one is added to the pin as a reference when the pin does not
// have the link already (credited to the admin account) and its wiki is saved
// for the link unless the link already has one. Pin ids that do not exist in
// this database are skipped and counted: the list is written against local ids.
//
//   npm run restaurants:dining                   upsert them into this database
//   npm run restaurants:dining -- --dry          validate and report, store nothing
//   npm run restaurants:dining -- --file f.json  use another list

import '../env';
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { diningProblem, saveDining } from '@/server/model/pinDining';
import { addReferences } from '@/server/services/addReferences';
import { applyPrebuiltWikis, parsePrebuiltWikis } from '@/server/services/prebuiltWikis';

const { values: flags } = parseArgs({ options: { dry: { type: 'boolean', default: false }, file: { type: 'string' } } });
const ADMIN_USER_ID = 1;
const ACTOR = 'claude-code/claude-sonnet-5-5';

type Source = { url: string; title?: string; reasoning?: string; text?: string; wiki?: Record<string, unknown> };
type Entry = { pinId: number; scores?: Record<string, unknown>; basis?: string | null; sourceUrl?: string | null; reviews?: unknown; sources?: Source[] };

async function run() {
  const file = flags.file ? flags.file : new URL('./diningRubric.json', import.meta.url);
  if (!existsSync(file)) {
    console.log(`${String(file)} does not exist: nothing to store`);
    return 0;
  }
  const entries: Entry[] = JSON.parse(readFileSync(file, 'utf8'));
  let stored = 0;
  let kept = 0;
  let skipped = 0;
  let referenced = 0;
  let wikis = 0;
  const invalid: string[] = [];
  for (const { pinId, scores, basis, sourceUrl, reviews, sources = [] } of entries) {
    const [pin] = await db.query<{ title: string }>(`SELECT "title" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
    if (!pin) {
      skipped++;
      continue;
    }
    const body = { ...scores, ...(reviews === undefined ? {} : { reviews }), source: 'session', basis: basis ?? null, sourceUrl: sourceUrl ?? null };
    const checked = diningProblem(body);
    if (typeof checked === 'string') {
      invalid.push(`${pinId} ${pin.title}: ${checked}`);
      continue;
    }
    if (flags.dry) continue;
    if (await saveDining(pinId, checked.scores, checked)) stored++;
    else kept++;
    // Wiki backing: the pages the scores came from are the pin's references...
    const candidates = sources.map((s) => ({ url: s.url, title: s.title, confidence: 90, reasoning: s.reasoning }));
    if (candidates.length) {
      const added = await addReferences(pinId, candidates, ADMIN_USER_ID);
      referenced += added?.added.length ?? 0;
    }
    // ...and each gets a wiki written from what was read there.
    const written = sources.filter((s) => s.wiki);
    if (written.length) {
      const items = parsePrebuiltWikis(written.map((s) => ({ url: s.url, title: s.title, text: s.text, generatedBy: ACTOR, wiki: s.wiki })));
      const results = await applyPrebuiltWikis(items, { pinId });
      for (const r of results) {
        if (r.status === 'saved') wikis++;
        else console.log(`  wiki ${r.status}: ${r.url}${'message' in r ? ` (${r.message})` : ''}`);
      }
    }
  }
  for (const line of invalid) console.log(`invalid: ${line}`);
  console.log(
    `${entries.length} entries${flags.dry ? ' (dry run, nothing stored)' : `: ${stored} stored, ${kept} kept (set by hand), ${referenced} references added, ${wikis} wikis saved`}, ${skipped} skipped (no such pin in this database), ${invalid.length} invalid`,
  );
  return invalid.length ? 1 : 0;
}
run()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
