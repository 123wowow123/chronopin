// Move restaurant pin assets out of Git. Requires an existing Azure CLI login.
// --update-prod also migrates production Medium rows using .scrape/admin.token.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import sharp from 'sharp';

const root = 'https://www.chronopin.com';
const updateProd = process.argv.includes('--update-prod');
if (!updateProd) throw new Error('Use --update-prod to migrate live pin references before removing image files.');
const token = updateProd ? (await readFile('.scrape/admin.token', 'utf8')).trim() : '';
const account = 'chronopin';
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', account, '--query', '[0].value', '-o', 'tsv'], { encoding: 'utf8' }).trim();
const container = new BlobServiceClient(`https://${account}.blob.core.windows.net`, new StorageSharedKeyCredential(account, key)).getContainerClient('thumb');
const files = execFileSync('rg', ['--files', '--no-ignore', 'public/restaurant-images'], {encoding: 'utf8'}).trim().split('\n').filter(Boolean);
const mapping = new Map<string, string>();
const records: { previousPath: string; blobUrl: string; sha256: string; bytes: number }[] = [];
async function batch<T>(items: T[], work: (item: T) => Promise<void>, concurrency = 4) {
  for (let offset = 0; offset < items.length; offset += concurrency) await Promise.all(items.slice(offset, offset + concurrency).map(work));
}
await batch(files, async file => {
  const data = await readFile(file);
  const metadata = await sharp(data).metadata();
  if (metadata.format !== 'webp') throw new Error(`Unexpected image format: ${file}`);
  const hash = createHash('sha256').update(data).digest('hex');
  const localPath = file.slice('public'.length);
  const name = localPath.slice(1).replace(/\.webp$/, `-${hash.slice(0, 16)}.webp`);
  const blob = container.getBlockBlobClient(name);
  if (!(await blob.exists())) await blob.uploadData(data, {
    conditions: {ifNoneMatch: '*'},
    blobHTTPHeaders: {blobContentType: 'image/webp', blobCacheControl: 'public, max-age=31536000, immutable'},
  });
  const response = await fetch(blob.url, {signal: AbortSignal.timeout(30_000)});
  if (!response.ok) throw new Error(`Blob download failed (${response.status}): ${name}`);
  const remote = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(remote).digest('hex') !== hash) throw new Error(`Blob bytes differ: ${name}`);
  await sharp(remote).raw().toBuffer();
  mapping.set(localPath, blob.url);
  records.push({previousPath: localPath, blobUrl: blob.url, sha256: hash, bytes: data.length});
  if (records.length % 50 === 0) console.log(`Verified ${records.length}/${files.length} Azure uploads`);
});
async function api(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(root + path, {
    method, headers: {Authorization: `Bearer ${token}`, ...(body ? {'Content-Type': 'application/json'} : {})},
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Production ${method} ${path}: ${response.status}`);
  return response.json();
}
const changedMediumIds: number[] = [];
const affectedPinIds = new Set<number>();
if (updateProd) {
  const media = new Map<number, {id: number; thumbName: string; originalUrl: string}>();
  for (const field of ['thumbName', 'originalUrl']) {
    const result = await api(`/api/admin/db/Medium?${field}.like=${encodeURIComponent('/restaurant-images/%')}&limit=1000`);
    if (result.total > result.rows.length) throw new Error('Medium query needs pagination');
    for (const medium of result.rows) media.set(medium.id, medium);
  }
  // Ensure every production dependency has been uploaded before changing any row.
  for (const medium of media.values()) for (const value of [medium.thumbName, medium.originalUrl]) {
    if (value?.startsWith('/restaurant-images/') && !mapping.has(value)) throw new Error(`Missing local image: ${value}`);
  }
  await batch([...media.values()], async medium => {
    const body: Record<string, string> = {};
    if (mapping.has(medium.thumbName)) body.thumbName = mapping.get(medium.thumbName)!;
    if (mapping.has(medium.originalUrl)) body.originalUrl = mapping.get(medium.originalUrl)!;
    if (!Object.keys(body).length) return;
    await api(`/api/admin/db/Medium?id=${medium.id}`, 'PATCH', body);
    // A Medium has no pinId; writing its existing links expires each pin cache.
    const links = await api(`/api/admin/db/PinMedium?mediumId=${medium.id}&utcDeletedDateTime.null=true&limit=1000`);
    if (links.total > links.rows.length) throw new Error('PinMedium query needs pagination');
    for (const link of links.rows) affectedPinIds.add(link.pinId);
    if (links.rows.length) await api(`/api/admin/db/PinMedium?mediumId=${medium.id}&utcDeletedDateTime.null=true`, 'PATCH', {mediumId: medium.id});
    changedMediumIds.push(medium.id);
    if (changedMediumIds.length % 50 === 0) console.log(`Migrated ${changedMediumIds.length} production media`);
  });
  await batch([...affectedPinIds], async id => {
    const pin = await api(`/api/pins/${id}`);
    if (pin.media.some((medium: {thumbName: string; originalUrl: string}) =>
      medium.thumbName?.startsWith('/restaurant-images/') || medium.originalUrl?.startsWith('/restaurant-images/'))) {
      throw new Error(`Production pin ${id} still has a local image`);
    }
  });
}
function replace(value: unknown): unknown {
  if (typeof value === 'string') return mapping.get(value) ?? value;
  if (Array.isArray(value)) return value.map(replace);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replace(item)]));
  return value;
}
const catalogs = [
  'src/server/data/topRestaurants.json', 'src/server/data/regionalRestaurants.json',
  'src/server/data/restaurantMenus.json', 'src/server/data/restaurantSpecials.json',
  'scripts/restaurants/mediaBackfill.json', 'scripts/backup/seedPins.json',
];
for (const path of catalogs) {
  const original = await readFile(path, 'utf8');
  const updated = JSON.stringify(replace(JSON.parse(original)), null, 2) + '\n';
  if (updated !== original) await writeFile(path, updated);
}
await writeFile('scripts/restaurants/imageStorageAudit-2026-10-08.json', JSON.stringify({
  checkedAt: new Date().toISOString(), storage: 'Azure Blob Storage',
  verifiedPhotos: records.length, changedMediumIds: changedMediumIds.sort((a,b) => a-b),
  verifiedPinIds: [...affectedPinIds].sort((a,b) => a-b),
  photos: records.sort((a,b) => a.previousPath.localeCompare(b.previousPath)),
}, null, 2) + '\n');
// Files leave the current Git tree only after uploads and production checks pass.
for (const file of files) await unlink(file);
console.log(JSON.stringify({verifiedPhotos: records.length, migratedProductionMedia: changedMediumIds.length, verifiedPins: affectedPinIds.size, removedRepositoryFiles: files.length}));
