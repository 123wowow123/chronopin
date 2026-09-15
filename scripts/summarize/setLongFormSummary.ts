// Usage: npx tsx scripts/summarize/setLongFormSummary.ts <pinId> < summary.txt
// Reads the summary text from stdin and writes it to Pin.longFormSummary.

import '../env';
import { text } from 'node:stream/consumers';
import * as db from '@/server/db';
import { Pin } from '@/server/model';

async function run() {
  const pinId = Number(process.argv[2]);
  if (!pinId) {
    throw new Error('usage: npx tsx scripts/summarize/setLongFormSummary.ts <pinId> < summary.txt');
  }
  const summary = (await text(process.stdin)).trim();
  if (!summary) {
    throw new Error('empty summary on stdin');
  }
  await Pin.updateLongFormSummary(pinId, summary);
  console.log(`OK pin ${pinId} (${summary.length} chars)`);
}

run()
  .catch((err) => {
    console.log('ERROR:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
