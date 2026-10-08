// Upload specials photos to the production public thumb container before
// switching the catalogs. Requires the existing Azure CLI login.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

const account = 'chronopin';
const origin = `https://${account}.blob.core.windows.net`;
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', account, '--query', '[0].value', '-o', 'tsv'], { encoding: 'utf8' }).trim();
const container = new BlobServiceClient(origin, new StorageSharedKeyCredential(account, key)).getContainerClient('thumb');
const catalogs = ['src/server/data/restaurantMenus.json', 'src/server/data/restaurantSpecials.json'];
const loaded = await Promise.all(catalogs.map(async (path) => ({ path, records: JSON.parse(await readFile(path, 'utf8')) })));
const replacements = new Map<string, string>();
for (const { records } of loaded) {
  for (const record of records) {
    const src: string | undefined = record.photo?.src;
    if (!src?.startsWith('/restaurant-images/') || replacements.has(src)) continue;
    const buffer = await readFile(`public${src}`);
    const hash = createHash('sha256').update(buffer).digest('hex');
    const name = src.slice(1).replace(/\.webp$/, `-${hash.slice(0, 16)}.webp`);
    const blob = container.getBlockBlobClient(name);
    if (!(await blob.exists())) {
      await blob.uploadData(buffer, {
        conditions: { ifNoneMatch: '*' },
        blobHTTPHeaders: { blobContentType: 'image/webp', blobCacheControl: 'public, max-age=31536000, immutable' },
      });
    }
    const response = await fetch(blob.url);
    if (!response.ok || response.headers.get('content-type') !== 'image/webp') throw new Error(`Photo is not publicly available: ${name}`);
    const remote = Buffer.from(await response.arrayBuffer());
    if (createHash('sha256').update(remote).digest('hex') !== hash) throw new Error(`Photo verification failed: ${name}`);
    replacements.set(src, blob.url);
    console.log(`Verified ${name}`);
  }
}
// Update only after every upload has passed the public download check.
for (const { path, records } of loaded) {
  for (const record of records) {
    if (record.photo && replacements.has(record.photo.src)) record.photo.src = replacements.get(record.photo.src);
  }
  await writeFile(path, JSON.stringify(records, null, 2) + '\n');
}
// A shared photo may still be used by a different guide. Keep those files.
const otherCatalogs = ['src/server/data/topRestaurants.json', 'src/server/data/regionalRestaurants.json', 'scripts/restaurants/mediaBackfill.json'];
const remaining = (await Promise.all(otherCatalogs.map((path) => readFile(path, 'utf8')))).join('\n');
for (const src of replacements.keys()) {
  if (!remaining.includes(JSON.stringify(src))) await unlink(`public${src}`);
}
console.log(`Moved ${replacements.size} specials photos to Azure Blob Storage.`);
