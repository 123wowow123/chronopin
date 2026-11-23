// Keeps the WebP renditions restaurant and landing photos are served from
// (src/lib/preparedImage.ts) in step with their originals, so pages load them
// straight from Azure rather than through the VM's /_next/image resizer.
// Only what changed is touched:
//   - an original with a rendition missing gets that rendition made;
//   - an original modified after its renditions were made gets them remade;
//   - a rendition whose original was deleted is deleted;
//   - everything else is left alone.
// Each upload is read back from its public URL.
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

// Rendition name -> when it was written.
const renditions = new Map<string, Date>();
for (const width of PREPARED_WIDTHS) {
  for (const prefix of prefixes) {
    for await (const blob of container.listBlobsFlat({ prefix: `r/v1/${width}/${prefix}` })) renditions.set(blob.name, blob.properties.lastModified);
  }
}
const expected = new Set<string>();
const todo: { name: string; widths: number[]; replace: boolean }[] = [];
let missing = 0, stale = 0;
for (const prefix of prefixes) {
  for await (const blob of container.listBlobsFlat({ prefix })) {
    if (!isPreparableName(blob.name)) continue;
    const widths: number[] = [];
    let replace = false;
    for (const width of PREPARED_WIDTHS) {
      const target = preparedName(blob.name, width);
      expected.add(target);
      const written = renditions.get(target);
      if (!written) { widths.push(width); missing++; }
      else if (written < blob.properties.lastModified) { widths.push(width); replace = true; stale++; }
    }
    if (widths.length) todo.push({ name: blob.name, widths, replace });
  }
}
const orphans = [...renditions.keys()].filter((name) => !expected.has(name));
console.log(`${renditions.size} renditions present: ${missing} missing, ${stale} older than their original, ${orphans.length} whose original is gone.`);
console.log(`${todo.length} originals to prepare; ${expected.size - missing - stale} renditions up to date and left alone.`);
const work = todo.slice(0, limit);
const removals = orphans.slice(0, limit);
if (values['dry-run']) {
  for (const item of work.slice(0, 20)) console.log(`Would ${item.replace ? 'remake' : 'make'} ${item.widths.join('/')} for ${item.name}`);
  for (const name of removals.slice(0, 20)) console.log(`Would delete ${name}`);
  process.exit(0);
}

let made = 0, deleted = 0, done = 0;
const failures: string[] = [];
async function pool<T>(items: T[], run: (item: T) => Promise<void>, label: (item: T) => string) {
  const queue = [...items];
  await Promise.all(Array.from({ length: concurrency }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      try { await run(item); } catch (err) { failures.push(`${label(item)}: ${(err as Error).message}`); }
      if (++done % 250 === 0) console.log(`${done}/${work.length + removals.length} done, ${made} made, ${deleted} deleted`);
    }
  }));
}
await pool(work, async (item) => {
  const original = await container.getBlobClient(item.name).downloadToBuffer();
  // Awaited first: `made += await` reads `made` before the await and loses
  // the other workers' counts.
  const count = await uploadPreparedRenditions(container, item.name, original, { widths: item.widths, replace: item.replace });
  made += count;
}, (item) => item.name);
await pool(removals, async (name) => {
  if ((await container.getBlockBlobClient(name).deleteIfExists()).succeeded) deleted++;
}, (name) => name);
console.log(`${made} renditions made and verified, ${deleted} orphaned renditions deleted.`);
if (failures.length) {
  console.log(`${failures.length} failed:`);
  for (const failure of failures.slice(0, 50)) console.log(`  ${failure}`);
  process.exitCode = 1;
}
