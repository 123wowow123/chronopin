// Merge researched city-guide files (openings, specials, details, top-pick photos)
// into the repository catalogs. Photos are downloaded, converted to WebP, uploaded to
// Azure Blob Storage (existing Azure CLI login) and verified before any URL is written.
//   npx tsx scripts/restaurants/mergeCityGuides.ts <dir containing one folder per region slug>
// Each folder holds openings.json, specials.json, details.json and top-photos.json.
// Re-running is safe: rows are matched by source URL / slug and replaced.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import sharp from 'sharp';
import { parseSpecialVenue } from '@/server/restaurantSpecialValidation';

const dir = process.argv[2];
if (!dir) throw new Error('Pass the research directory.');
const account = 'chronopin';
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', account, '--query', '[0].value', '-o', 'tsv'], { encoding: 'utf8' }).trim();
const container = new BlobServiceClient(`https://${account}.blob.core.windows.net`, new StorageSharedKeyCredential(account, key)).getContainerClient('thumb');
const read = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const readOpt = async (path: string) => { try { return await read(path); } catch { return []; } };

const failures: string[] = [];
// Download, convert (max 1200px wide) and upload one photo; null when it cannot be used.
async function upload(sourceUrl: string | null | undefined, blobDir: string, slug: string): Promise<string | null> {
  if (!sourceUrl) return null;
  try {
    const response = await fetch(sourceUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; chronopin-dev)' }, signal: AbortSignal.timeout(45_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const webp = await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    const hash = createHash('sha256').update(webp).digest('hex');
    const blob = container.getBlockBlobClient(`restaurant-images/${blobDir}/${slug}-${hash.slice(0, 16)}.webp`);
    if (!(await blob.exists())) await blob.uploadData(webp, { conditions: { ifNoneMatch: '*' }, blobHTTPHeaders: { blobContentType: 'image/webp', blobCacheControl: 'public, max-age=31536000, immutable' } });
    const check = await fetch(blob.url, { signal: AbortSignal.timeout(30_000) });
    if (!check.ok || check.headers.get('content-type') !== 'image/webp') throw new Error('not public');
    if (createHash('sha256').update(Buffer.from(await check.arrayBuffer())).digest('hex') !== hash) throw new Error('bytes differ');
    return blob.url;
  } catch (error) {
    failures.push(`${blobDir}/${slug}: ${sourceUrl} (${(error as Error).message})`);
    return null;
  }
}

const catalogPath = 'src/server/data/regionalRestaurants.json';
const specialsPath = 'src/server/data/restaurantSpecials.json';
const detailsPath = 'src/server/data/restaurantDetails.json';
const catalog: any[] = await read(catalogPath);
const specials: any[] = await read(specialsPath);
const details: any[] = await read(detailsPath);

for (const region of (await readdir(dir, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name)) {
  const folder = `${dir}/${region}`;
  for (const photo of await readOpt(`${folder}/top-photos.json`)) {
    const row = catalog.find((item) => item.regionSlug === region && item.kind === 'top' && item.slug === photo.slug);
    if (!row) { failures.push(`${region}: no top pick ${photo.slug}`); continue; }
    const image = await upload(photo.imageSourceUrl, `${region}/top`, row.slug);
    if (image) Object.assign(row, { image, imageSourceUrl: photo.imageSourceUrl, imageCredit: photo.imageCredit, imageNote: photo.imageNote ?? null });
  }
  for (const opening of await readOpt(`${folder}/openings.json`)) {
    const image = await upload(opening.imageSourceUrl, `${region}/openings`, opening.slug);
    const row = { ...opening, regionSlug: region, kind: 'opening', image };
    const index = catalog.findIndex((item) => item.sourceUrl === row.sourceUrl);
    if (index >= 0) catalog[index] = row; else catalog.push(row);
  }
  for (const venue of await readOpt(`${folder}/specials.json`)) {
    for (const field of ['review', 'photo', 'location', 'lunchNote']) if (venue[field] == null) delete venue[field];
    const { photo } = venue;
    if (photo) photo.src = (await upload(photo.originalUrl, `${region}/specials`, venue.slug ?? 'venue')) ?? undefined;
    if (photo && !photo.src) delete venue.photo;
    parseSpecialVenue({ regionSlug: region, enabled: true, profile: venue });
    const index = specials.findIndex((item) => item.pinSourceUrl === venue.pinSourceUrl);
    if (index >= 0) specials[index] = venue; else specials.push(venue);
  }
  for (const detail of await readOpt(`${folder}/details.json`)) {
    const index = details.findIndex((item) => item.pinSourceUrl === detail.pinSourceUrl);
    if (index >= 0) details[index] = detail; else details.push(detail);
  }
}
await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
await writeFile(specialsPath, JSON.stringify(specials, null, 2) + '\n');
await writeFile(detailsPath, JSON.stringify(details, null, 2) + '\n');
console.log(failures.length ? `Photos not stored (${failures.length}):\n${failures.join('\n')}` : 'All photos stored.');
