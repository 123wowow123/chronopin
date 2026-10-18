// Adds references found by hand to one pin, touching nothing else on it.
//
//   npm run references:apply -- --id=123 --file=/tmp/refs-123.json
//   npm run references:apply -- --id=123 --refs='[{"url":"https://...","title":"...","confidence":85,"publishedDate":"2013-11-12","startDate":"2014-03-01","endDate":null,"reasoning":"..."}]'
//
// A reference's startDate/endDate move the pin's dates when it is more
// confident than the source, exactly as saving the edit form would. Timed pins
// are read in this machine's time zone, as the form reads them in the author's.
//
// The whole pin is loaded before pin.update(), which rewrites every column, so
// no other field is wiped. Candidates go through freshReferences (confidence
// >= 70, not the source, not already present, at most 5 in all).

import '../env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import Pin from '@/server/model/pin';
import PinReference from '@/server/model/pinReference';
import { formDates, pinToForm } from '@/lib/pinForm';
import type { PinJson } from '@/lib/types';
import { freshReferences, type Candidate } from './select';

const { values: flags } = parseArgs({
  options: {
    id: { type: 'string' },
    refs: { type: 'string' },
    file: { type: 'string' },
  },
});

async function main() {
  const id = Number(flags.id);
  if (!Number.isInteger(id)) throw new Error('--id is required');
  const raw = flags.file ? readFileSync(flags.file, 'utf8') : flags.refs;
  if (!raw) throw new Error('--refs or --file is required');
  const candidates: Candidate[] = JSON.parse(raw);

  const { pin } = await Pin.queryById(id);
  if (!pin) throw new Error(`pin ${id} not found (or deleted)`);

  const fresh = freshReferences(candidates, pin.references.map((r) => r.url), pin.sourceUrl);
  if (!fresh.length) {
    console.log(`pin ${id}: nothing new to add (${pin.references.length} reference(s) kept)`);
    return;
  }

  fresh.forEach((r) => pin.addReference(new PinReference(r)));
  const problem = PinReference.problem(pin.references);
  if (problem) throw new Error(`pin ${id}: rejected, nothing written - ${problem}`);

  const before = [pin.utcStartDateTime, pin.utcEndDateTime].map(String).join(' - ');
  const { dates, overridden } = formDates(pinToForm(pin.toJSON() as PinJson));
  // Left alone otherwise: the form's HH:MM would round away a timed pin's seconds.
  if (overridden || pin.sourceStartDateTime) {
    Object.assign(pin, dates);
  }

  await pin.update();
  console.log(`pin ${id}: added ${fresh.length}, now ${pin.references.length} - ${fresh.map((r) => r.url).join(', ')}`);
  if (overridden) {
    console.log(`pin ${id}: dates ${before} -> ${[pin.utcStartDateTime, pin.utcEndDateTime].join(' - ')} from a more confident reference`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
