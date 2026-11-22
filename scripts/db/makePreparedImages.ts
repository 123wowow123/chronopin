// Makes the WebP renditions restaurant and landing photos are served from
// (src/lib/preparedImage.ts), straight from Azure rather than through the VM's
// /_next/image resizer. Never overwrites or deletes: only missing renditions
// are made, and each upload is read back from its public URL.
//
//   npm run images:prepared                       local Azurite
//   npm run images:prepared -- --prod             production storage (needs `az login`)
//   npm run images:prepared -- --prod --prefix restaurant-dishes/san-diego --dry-run
import '../env';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { BlobServiceClient } from '@azure/storage-blob';
import config from '@/server/config';
import { PREPARED_PREFIXES, PREPARED_WIDTHS, isPreparableName, preparedName } from '@/lib/preparedImage';
import { uploadPreparedRenditions } from '@/server/preparedImages';

const SUB = '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5';
const { values } = parseArgs({ options: {
  prod: { type: 'boolean', default: false },
  prefix: { type: 'string', multiple: true },
  limit: { type: 'string' },
  concurrency: { type: 'string', default: '8' },
  'dry-run': { type: 'boolean', default: false },
} });
const prefixes = values.prefix ?? [...PREPARED_PREFIXES];
if (prefixes.some((prefix) => !PREPARED_PREFIXES.some((covered) => prefix.startsWith(covered)))) {
  throw new Error(`--prefix must sit under ${PREPARED_PREFIXES.join(', ')}: the site only uses renditions there`);
}
const limit = values.limit ? Number(values.limit) : Infinity;
const concurrency = Number(values.concurrency);

const connection = values.prod
  ? execFileSync('az', ['storage', 'account', 'show-connection-string', '--subscription', SUB, '-n', 'chronopin', '--query', 'connectionString', '-o', 'tsv'], { encoding: 'utf8' }).trim()
  : config.azureStorage.connectionString;
const container = BlobServiceClient.fromConnectionString(connection).getContainerClient('thumb');

const existing = new Set<string>();
for (const width of PREPARED_WIDTHS) {
  for (const prefix of prefixes) {
    for await (const blob of container.listBlobsFlat({ prefix: `r/v1/${width}/${prefix}` })) existing.add(blob.name);
  }
}
const todo: string[] = [];
for (const prefix of prefixes) {
  for await (const blob of container.listBlobsFlat({ prefix })) {
    if (isPreparableName(blob.name) && PREPARED_WIDTHS.some((width) => !existing.has(preparedName(blob.name, width)))) todo.push(blob.name);
  }
}
console.log(`${todo.length} originals need renditions (${existing.size} renditions already present).`);
const work = todo.slice(0, limit);
if (values['dry-run']) {
  for (const name of work.slice(0, 20)) console.log(`Would prepare ${name}`);
  process.exit(0);
}

let made = 0, done = 0;
const failures: string[] = [];
async function prepare(name: string) {
  const original = await container.getBlobClient(name).downloadToBuffer();
  made += await uploadPreparedRenditions(container, name, original, existing);
}
const queue = [...work];
await Promise.all(Array.from({ length: concurrency }, async () => {
  for (let name = queue.shift(); name; name = queue.shift()) {
    try { await prepare(name); } catch (err) { failures.push(`${name}: ${(err as Error).message}`); }
    if (++done % 250 === 0) console.log(`${done}/${work.length} originals, ${made} renditions made`);
  }
}));
console.log(`${made} renditions made and verified for ${done - failures.length}/${work.length} originals.`);
if (failures.length) {
  console.log(`${failures.length} failed:`);
  for (const failure of failures.slice(0, 50)) console.log(`  ${failure}`);
  process.exitCode = 1;
}
