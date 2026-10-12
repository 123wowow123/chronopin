// Stores the car performance rubrics in scripts/products/carPerf.json
// (PinCarPerf, 0167) for the vehicle pins they name. The file is an array of
//
//   { "pinId": 14012,
//     "scores": { "range": 4, "charging": 3.5, "acceleration": 4.5,
//                 "assistance": null, "space": 3, "value": 5 },
//     "basis": "CLTC 800 km ... (variant scored, figures, any null axis)",
//     "sourceUrl": "https://...",
//     "reviews": [ { "url": "https://...", "title": "...",
//                    "publishedDate": "2026-09-30", "quote": "..." } ] }
//
// "reviews" is optional: independent road tests of this model, at most 6, each
// with an https url, a title, a YYYY-MM-DD day (or null) and a short quote (at
// most 300 characters). An entry without the key leaves the reviews the row
// already has; "reviews": [] clears them.
//
// Each score is 0-5 in half steps, or null where the spec is not published
// (the rubric is in docs/okf/scraping/strategy.md, "Car performance rubric").
// Each entry is an editorial estimate ("session"); a rubric set by hand is
// never overwritten. Pin ids that do not exist in this database are skipped
// and counted: the list is written against production's ids.
//
//   npm run products:carperf                   upsert them into this database
//   npm run products:carperf -- --dry          validate and report, store nothing
//   npm run products:carperf -- --file f.json  use another list (ids of the database it is run against)
//   npm run products:carperf -- --out c.json   also write [{pinId, body}] to PUT to another database's
//                                              /api/pins/:id/car-performance (prod: see login-from-env-local)

import '../env';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { carPerfProblem, saveCarPerf } from '@/server/model/pinCarPerf';

const { values: flags } = parseArgs({ options: { dry: { type: 'boolean', default: false }, out: { type: 'string' }, file: { type: 'string' } } });

type Entry = { pinId: number; scores?: Record<string, unknown>; basis?: string | null; sourceUrl?: string | null; reviews?: unknown };

async function run() {
  const file = flags.file ? flags.file : new URL('./carPerf.json', import.meta.url);
  if (!existsSync(file)) {
    console.log(`${String(file)} does not exist: nothing to store`);
    return 0;
  }
  const entries: Entry[] = JSON.parse(readFileSync(file, 'utf8'));
  const posts: { pinId: number; body: Record<string, unknown> }[] = [];
  let stored = 0;
  let kept = 0;
  let skipped = 0;
  const invalid: string[] = [];
  for (const { pinId, scores, basis, sourceUrl, reviews } of entries) {
    const [pin] = await db.query<{ title: string }>(`SELECT "title" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
    if (!pin) {
      skipped++;
      continue;
    }
    // No reviews key: the body has none either, so a stored row keeps its reviews.
    const body = { ...scores, ...(reviews === undefined ? {} : { reviews }), source: 'session', basis: basis ?? null, sourceUrl: sourceUrl ?? null };
    const checked = carPerfProblem(body);
    if (typeof checked === 'string') {
      invalid.push(`${pinId} ${pin.title}: ${checked}`);
      continue;
    }
    posts.push({ pinId, body });
    if (!flags.dry) {
      if (await saveCarPerf(pinId, checked.scores, checked)) stored++;
      else kept++;
    }
  }
  if (flags.out) writeFileSync(flags.out, JSON.stringify(posts, null, 2));
  for (const line of invalid) console.log(`invalid: ${line}`);
  console.log(
    `${entries.length} entries: ${posts.length} valid${flags.dry ? ' (dry run, nothing stored)' : `: ${stored} stored, ${kept} kept (set by hand)`}, ${skipped} skipped (no such pin in this database), ${invalid.length} invalid`,
  );
  return invalid.length ? 1 : 0;
}
run()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
