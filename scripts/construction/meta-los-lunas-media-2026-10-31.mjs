// Attaches the three photos in Meta's Los Lunas site information sheet (the PDF at
// https://datacenters.atmeta.com/asset/los-lunas/, extracted with `pdfimages -all` into .tmp/ll) to pin 7301 via Azure Blob.
// node scripts/construction/meta-los-lunas-media-2026-10-31.mjs [--apply]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
const apply = process.argv.includes('--apply');
const base = 'https://www.chronopin.com';
const id = 7301;
const SRC = 'https://datacenters.atmeta.com/asset/los-lunas/';
const files = [
  ['.tmp/ll/p-005.jpg', 'Meta Los Lunas data center exterior (Meta site information sheet)', false],
  ['.tmp/ll/p-006.jpg', 'Meta Los Lunas community event (Meta site information sheet)', false],
  ['.tmp/ll/p-004.jpg', 'Meta Los Lunas community STEM outreach (Meta site information sheet)', true],
];
const token = fs.readFileSync('.scrape/admin.token', 'utf8').trim();
const call = async (method, p, body) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-datacenter/1.0', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const t = await r.text(); if (!r.ok) throw Error(`${method} ${p}: ${r.status} ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null;
};
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', 'chronopin', '--query', '[0].value', '-o', 'tsv']).toString().trim();
const container = new BlobServiceClient('https://chronopin.blob.core.windows.net', new StorageSharedKeyCredential('chronopin', key)).getContainerClient('thumb');
const add = [];
for (const [i, [f, credit, rotate]] of files.entries()) {
  let img = sharp(fs.readFileSync(f)).rotate(rotate ? 90 : undefined);
  const jpg = await img.jpeg({ quality: 90 }).toBuffer();
  const hash = crypto.createHash('sha256').update(jpg).digest('hex').slice(0, 16);
  const blob = container.getBlockBlobClient(`datacenters/usa-${id}-meta-${i}-${hash}.jpg`);
  if (apply) {
    if (!(await blob.exists())) await blob.uploadData(jpg, { blobHTTPHeaders: { blobContentType: 'image/jpeg', blobCacheControl: 'public, max-age=31536000, immutable' } });
    const check = Buffer.from(await (await fetch(blob.url)).arrayBuffer());
    if (crypto.createHash('sha256').update(check).digest('hex').slice(0, 16) !== hash) throw Error(`blob verify failed ${f}`);
  }
  add.push({ type: 1, originalUrl: blob.url, authorName: credit, authorUrl: SRC });
}
console.log(apply ? 'apply' : 'dry', add.map((a) => a.originalUrl));
if (!apply) process.exit(0);
const pin = await call('GET', `/api/pins/${id}`);
const cur = (pin.media ?? []).map((m) => ({ type: Number(m.type), originalUrl: m.originalUrl, ...(m.authorName ? { authorName: m.authorName } : {}), ...(m.authorUrl ? { authorUrl: m.authorUrl } : {}) }));
await call('PUT', `/api/pins/${id}?lightweight=1`, { ...pin, media: [...cur, ...add.filter((a) => !cur.some((c) => c.originalUrl === a.originalUrl))] });
const mid = await call('GET', `/api/pins/${id}`);
let fixed = 0;
for (const m of mid.media) {
  const a = add.find((x) => x.originalUrl === m.originalUrl);
  if (a && (m.authorName !== a.authorName || m.authorUrl !== a.authorUrl)) { await call('PATCH', `/api/admin/db/Medium?id=${m.id}`, { authorName: a.authorName, authorUrl: a.authorUrl }); fixed++; }
}
if (fixed) await call('PUT', `/api/pins/${id}?lightweight=1`, await call('GET', `/api/pins/${id}`));
await call('POST', '/api/admin/pins/expire', { ids: [id] });
const after = await call('GET', `/api/pins/${id}`);
const bad = add.filter((a) => !after.media.some((m) => m.originalUrl === a.originalUrl && m.authorName === a.authorName));
console.log(id, !bad.length && after.title === pin.title ? 'ok' : 'READBACK MISMATCH', after.media.length, 'media', fixed, 'credits restored');
