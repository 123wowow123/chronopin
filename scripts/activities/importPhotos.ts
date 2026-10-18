// Import researched photos (JSON arrays of {key,imageUrl,pageUrl,credit}) into the activity photo manifest:
// download, re-encode as WebP, upload to Azure Blob Storage, verify the public blob, record credit and source page.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import sharp from 'sharp';
import catalog from '@/server/data/activities.json';

const MANIFEST = 'src/server/data/activityPhotos.json';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const manifest: any[] = JSON.parse(await readFile(MANIFEST, 'utf8'));
const have = new Set(manifest.map((p) => p.key));
const keys = new Set(catalog.map((i) => `${i.citySlug}/${i.slug}`));
const inputs: { key: string; imageUrl: string; pageUrl: string; credit: string }[] = [];
for (const file of process.argv.slice(2)) inputs.push(...JSON.parse(await readFile(file, 'utf8')));
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', 'chronopin', '--query', '[0].value', '-o', 'tsv'], { encoding: 'utf8' }).trim();
const container = new BlobServiceClient('https://chronopin.blob.core.windows.net', new StorageSharedKeyCredential('chronopin', key)).getContainerClient('thumb');

let ok = 0;
for (const input of inputs) {
  const [citySlug, slug] = input.key.split('/');
  try {
    if (!keys.has(input.key) || have.has(input.key)) throw new Error('unknown or already has photo');
    if (!/^https:\/\//.test(input.imageUrl) || !/^https:\/\//.test(input.pageUrl) || !input.credit?.trim()) throw new Error('needs https urls and a credit');
    const res = await fetch(input.imageUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(40_000) });
    if (!res.ok) throw new Error(`download ${res.status}`);
    const data = Buffer.from(await res.arrayBuffer());
    const info = await sharp(data).metadata();
    if (!info.width || !info.height || info.width < 800 || info.height < 450) throw new Error(`too small ${info.width}x${info.height}`);
    const out = await sharp(data).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    const sha256 = createHash('sha256').update(out.data).digest('hex');
    if (manifest.some((p) => p.sha256 === sha256)) throw new Error('same picture already used');
    const name = `activity-images/${citySlug}/${slug}-${sha256.slice(0, 16)}.webp`;
    const blob = container.getBlockBlobClient(name);
    if (!(await blob.exists())) await blob.uploadData(out.data, { conditions: { ifNoneMatch: '*' }, blobHTTPHeaders: { blobContentType: 'image/webp', blobCacheControl: 'public, max-age=31536000, immutable' } });
    const check = await fetch(blob.url);
    if (!check.ok || createHash('sha256').update(Buffer.from(await check.arrayBuffer())).digest('hex') !== sha256) throw new Error('blob verify failed');
    manifest.push({ key: input.key, image: blob.url, width: out.info.width, height: out.info.height, credit: input.credit.trim(), sourceUrl: input.pageUrl, imageSourceUrl: input.imageUrl, sha256 });
    have.add(input.key); ok++;
  } catch (error) { console.log(`skip ${input.key}: ${(error as Error).message}`); }
}
await writeFile(MANIFEST, JSON.stringify(manifest.sort((a, b) => a.key.localeCompare(b.key)), null, 1) + '\n');
console.log(`imported ${ok}/${inputs.length}; manifest ${manifest.length}`);
