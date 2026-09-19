// Writes pins and their links' wikis out as an Open Knowledge Format bundle
// (src/lib/okf.ts): a directory of markdown any OKF consumer can read.
//
//   npm run okf:export                          every pin that cites a link, into ./okf-bundle
//   npm run okf:export -- --pin 930 --pin 716   just those pins and their links
//   npm run okf:export -- --out /tmp/bundle     somewhere else
//
// The directory is replaced, not merged, so a link that is gone leaves no
// stale concept behind.

import '../env';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { loadOkfBundle } from '@/server/okf';

const { values: flags } = parseArgs({
  options: { pin: { type: 'string', multiple: true }, out: { type: 'string', default: './okf-bundle' } },
});

async function run() {
  const pinIds = flags.pin?.map(Number);
  const files = await loadOkfBundle(pinIds);
  const out = path.resolve(flags.out!);
  rmSync(out, { recursive: true, force: true });
  for (const [file, content] of files) {
    const target = path.join(out, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  console.log(`wrote ${files.size} file(s) to ${out}`);
}

run()
  .catch((err) => {
    console.log('okf:export failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
