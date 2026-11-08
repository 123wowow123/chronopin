// Attaches the three photos in Meta's Los Lunas site information sheet (the PDF at
// https://civiccommunities.com/portfolio/park-blvd/, extracted with `pdfimages -all` into .tmp/ll) to pin 7301 via Azure Blob.
// node scripts/construction/meta-los-lunas-media-2026-10-31.mjs [--apply]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
const apply = process.argv.includes('--apply');
const base = 'https://www.chronopin.com';
const id = 20874;
const SRC = 'https://civiccommunities.com/portfolio/park-blvd/';
const SRC2 = SRC;
const credit = 'Civic Communities, Park Blvd. At-Grade Crossing project page';
const file = '/private/tmp/claude-501/-Users-ianflynn-chronopin/d37124f9-bfce-4344-885d-7479a77f745b/images/1.png';
const token = fs.readFileSync('.scrape/admin.token', 'utf8').trim();
const call = async (method, p, body) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-construction/1.0', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const t = await r.text(); if (!r.ok) throw Error(`${method} ${p}: ${r.status} ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null;
};
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', 'chronopin', '--query', '[0].value', '-o', 'tsv']).toString().trim();
const container = new BlobServiceClient('https://chronopin.blob.core.windows.net', new StorageSharedKeyCredential('chronopin', key)).getContainerClient('thumb');
const jpg = await sharp(fs.readFileSync(file)).jpeg({ quality: 90 }).toBuffer();
const hash = crypto.createHash('sha256').update(jpg).digest('hex').slice(0, 16);
const blob = container.getBlockBlobClient(`construction/usa-${id}-parkblvd-aerial-${hash}.jpg`);
if (apply) {
  if (!(await blob.exists())) await blob.uploadData(jpg, { blobHTTPHeaders: { blobContentType: 'image/jpeg', blobCacheControl: 'public, max-age=31536000, immutable' } });
  const check = Buffer.from(await (await fetch(blob.url)).arrayBuffer());
  if (crypto.createHash('sha256').update(check).digest('hex').slice(0, 16) !== hash) throw Error('blob verify failed');
}
const aerial = { type: 1, originalUrl: blob.url, authorName: credit, authorUrl: SRC };
console.log(apply ? 'apply' : 'dry', blob.url);
if (!apply) process.exit(0);
const pin = await call('GET', `/api/pins/${id}`);
const cur = (pin.media ?? []).filter((m) => m.originalUrl !== aerial.originalUrl).map((m) => ({ type: Number(m.type), originalUrl: m.originalUrl, ...(m.authorName ? { authorName: m.authorName } : {}), ...(m.authorUrl ? { authorUrl: m.authorUrl } : {}) }));
await call('PUT', `/api/pins/${id}?lightweight=1`, { ...pin, media: [aerial] });
const one = await call('GET', `/api/pins/${id}`);
await call('PUT', `/api/pins/${id}?lightweight=1`, { ...one, media: [aerial, ...cur] });
const mid = await call('GET', `/api/pins/${id}`);
for (const m of mid.media) {
  const a = [aerial, ...cur].find((x) => x.originalUrl === m.originalUrl);
  if (a?.authorName && (m.authorName !== a.authorName || m.authorUrl !== a.authorUrl)) await call('PATCH', `/api/admin/db/Medium?id=${m.id}`, { authorName: a.authorName, authorUrl: a.authorUrl });
}
await call('POST', '/api/admin/pins/expire', { ids: [id] });
const after = await call('GET', `/api/pins/${id}`);
console.log(after.title, after.media.map((m) => [m.id, m.originalUrl.slice(-40), m.authorName]));
