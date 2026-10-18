// Find a representative photo for each seasonal activity from its own source page (og:image / twitter:image),
// re-encode it as WebP, upload it to Azure Blob Storage and record it in src/server/data/activityPhotos.json.
// `npm run activities:seed` then attaches the recorded photos to pins that have none. Needs an Azure CLI login.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import sharp from 'sharp';
import catalog from '@/server/data/activities.json';
import type { ActivityCatalogItem } from '@/lib/activities';

const MANIFEST = 'src/server/data/activityPhotos.json';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
type Photo = { key: string; image: string; width: number; height: number; credit: string; sourceUrl: string; imageSourceUrl: string; sha256: string };

const items = catalog as ActivityCatalogItem[];
const manifest: Photo[] = JSON.parse(await readFile(MANIFEST, 'utf8').catch(() => '[]'));
const done = new Set(manifest.map((p) => p.key));
const account = 'chronopin';
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', account, '--query', '[0].value', '-o', 'tsv'], { encoding: 'utf8' }).trim();
const container = new BlobServiceClient(`https://${account}.blob.core.windows.net`, new StorageSharedKeyCredential(account, key)).getContainerClient('thumb');

const meta = (html: string, names: string[]) => {
  for (const name of names) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i');
    const tag = html.match(re)?.[0];
    const content = tag?.match(/content=["']([^"']+)["']/i)?.[1];
    if (content) return content.replace(/&amp;/g, '&');
  }
  return null;
};

const rejected: string[] = [];
async function photoFor(item: ActivityCatalogItem): Promise<Photo | null> {
  const page = await fetch(item.sourceUrl, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(25_000), redirect: 'follow' }).catch(() => null);
  if (!page?.ok) return null;
  const html = (await page.text()).slice(0, 400_000);
  const found = meta(html, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']);
  if (!found) return null;
  const imageUrl = new URL(found, page.url).href;
  const response = await fetch(imageUrl, { headers: { 'User-Agent': UA, Referer: item.sourceUrl }, signal: AbortSignal.timeout(30_000) }).catch(() => null);
  if (!response?.ok) return null;
  const data = Buffer.from(await response.arrayBuffer());
  const info = await sharp(data).metadata().catch(() => null);
  if (!info?.width || !info.height || info.width < 700 || info.height < 400 || /\.(svg|gif)(\?|$)/i.test(imageUrl)) { rejected.push(`${item.slug}: small/format ${info?.width}x${info?.height}`); return null; }
  const out = await sharp(data).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const sha256 = createHash('sha256').update(out.data).digest('hex');
  const name = `activity-images/${item.citySlug}/${item.slug}-${sha256.slice(0, 16)}.webp`;
  const blob = container.getBlockBlobClient(name);
  if (!(await blob.exists())) await blob.uploadData(out.data, { conditions: { ifNoneMatch: '*' }, blobHTTPHeaders: { blobContentType: 'image/webp', blobCacheControl: 'public, max-age=31536000, immutable' } });
  const check = await fetch(blob.url, { signal: AbortSignal.timeout(30_000) });
  if (!check.ok || createHash('sha256').update(Buffer.from(await check.arrayBuffer())).digest('hex') !== sha256) throw new Error(`Blob verify failed: ${name}`);
  const host = new URL(item.sourceUrl).hostname.replace(/^www\./, '');
  return { key: `${item.citySlug}/${item.slug}`, image: blob.url, width: out.info.width, height: out.info.height, credit: `Photo: ${host} (official page)`, sourceUrl: item.sourceUrl, imageSourceUrl: imageUrl, sha256 };
}

const todo = items.filter((item) => !done.has(`${item.citySlug}/${item.slug}`));
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < todo.length) {
    const item = todo[next++]!;
    try {
      const photo = await photoFor(item);
      if (photo) manifest.push(photo);
      console.log(`${photo ? 'ok  ' : 'none'} ${item.citySlug}/${item.slug}`);
    } catch (error) { console.log(`ERR  ${item.citySlug}/${item.slug} ${(error as Error).message}`); }
  }
}));

// An image shared by several activities is a site-wide banner, not the activity itself: drop those.
const bySha = new Map<string, Photo[]>();
for (const photo of manifest) bySha.set(photo.imageSourceUrl, [...(bySha.get(photo.imageSourceUrl) ?? []), photo]);
const unique = manifest.filter((photo) => bySha.get(photo.imageSourceUrl)!.length === 1);
console.log(`${manifest.length} found, ${manifest.length - unique.length} dropped as shared banners, ${items.length - unique.length} activities without a photo`);
if (rejected.length) console.log(rejected.join('\n'));
await writeFile(MANIFEST, JSON.stringify(unique.sort((a, b) => a.key.localeCompare(b.key)), null, 1) + '\n');
