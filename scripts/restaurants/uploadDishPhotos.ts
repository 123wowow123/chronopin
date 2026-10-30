// Upload dish photos (local files) to the public thumb container as WebP and verify the public blob.
// Usage: tsx scripts/restaurants/uploadDishPhotos.ts <blob-prefix> <file>...   (requires an Azure CLI login)
// Prints one JSON line per file: { file, src, width, height }.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import sharp from 'sharp';

const [prefix, ...files] = process.argv.slice(2);
if (!prefix || !files.length) throw new Error('Usage: uploadDishPhotos.ts <blob-prefix> <file>...');
const account = 'chronopin';
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', account, '--query', '[0].value', '-o', 'tsv'], { encoding: 'utf8' }).trim();
const container = new BlobServiceClient(`https://${account}.blob.core.windows.net`, new StorageSharedKeyCredential(account, key)).getContainerClient('thumb');
for (const file of files) {
  const { data, info } = await sharp(await readFile(file)).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const hash = createHash('sha256').update(data).digest('hex');
  const blob = container.getBlockBlobClient(`${prefix}/${basename(file).replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-')}-${hash.slice(0, 16)}.webp`);
  if (!(await blob.exists())) await blob.uploadData(data, { conditions: { ifNoneMatch: '*' }, blobHTTPHeaders: { blobContentType: 'image/webp', blobCacheControl: 'public, max-age=31536000, immutable' } });
  const response = await fetch(blob.url);
  if (!response.ok) throw new Error(`Blob download failed (${response.status}): ${blob.url}`);
  if (createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex') !== hash) throw new Error(`Blob bytes differ: ${blob.url}`);
  console.log(JSON.stringify({ file, src: blob.url, width: info.width, height: info.height }));
}
