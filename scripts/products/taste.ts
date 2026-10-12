// Stores the taste-profile estimates in scripts/products/taste.json
// (PinTaste, 0157) for the consumable product pins they name: snacks, food
// launches and beer/spirits/wine releases. Each is an editorial estimate made
// from the pin's own text and says what it rests on ("basis"); a profile set
// by hand is never overwritten.
//
//   npm run products:taste                  what would be stored
//   npm run products:taste -- --apply       store them in this database
//   npm run products:taste -- --file f.json  use another list (ids of the database it is run against)
//   npm run products:taste -- --out t.json  write [{pinId, body}] to PUT to another database's
//                                           /api/pins/:id/taste (prod: see login-from-env-local)

import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { saveTaste, tasteProblem } from '@/server/model/pinTaste';

const { values: flags } = parseArgs({ options: { apply: { type: 'boolean', default: false }, out: { type: 'string' }, file: { type: 'string' } } });

type Entry = Record<string, unknown> & { pinId: number };

async function run() {
  const entries: Entry[] = JSON.parse(readFileSync(flags.file ? flags.file : new URL('./taste.json', import.meta.url), 'utf8'));
  const posts: { pinId: number; body: Record<string, unknown> }[] = [];
  let stored = 0;
  let kept = 0;
  for (const { pinId, ...fields } of entries) {
    const [pin] = await db.query<{ title: string; sourceUrl: string | null }>(`SELECT "title", "sourceUrl" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
    if (!pin) {
      console.log(`${pinId}: no such pin here, skipped`);
      continue;
    }
    const body = { ...fields, source: 'session', sourceUrl: pin.sourceUrl && /^https?:\/\//i.test(pin.sourceUrl) ? pin.sourceUrl : null };
    const checked = tasteProblem(body);
    if (typeof checked === 'string') throw new Error(`${pinId} ${pin.title}: ${checked}`);
    posts.push({ pinId, body });
    if (flags.apply) {
      if (await saveTaste(pinId, checked.scores, checked)) stored++;
      else kept++;
    }
  }
  if (flags.out) writeFileSync(flags.out, JSON.stringify(posts, null, 2));
  console.log(`${posts.length} profiles${flags.apply ? `: ${stored} stored, ${kept} kept (set by hand)` : ' (dry run)'}`);
  process.exit(0);
}
run();
