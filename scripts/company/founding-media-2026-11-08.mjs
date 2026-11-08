// Founding-site pictures for company hub pins that only had the logo fallback (Lululemon and Xiaomi: none found).
// Files are Wikimedia Commons downloads in the session scratchpad; credits below. Local base by default.
// node scripts/company/founding-media-2026-11-08.mjs [--apply]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
const apply = process.argv.includes('--apply');
const base = 'http://localhost:3000';
const D = '/private/tmp/claude-501/-Users-ianflynn-chronopin/442c8d06-8179-45a9-8679-f6bf0c2128ee/scratchpad/';
const jobs = [
  { id: 20748, file: D + 'Kingswellstudio.JPG', credit: 'Coolcaesar, CC BY-SA 4.0: the Kingswell Avenue building in Los Feliz where the Disney Brothers Cartoon Studio started', src: 'https://commons.wikimedia.org/wiki/File:Kingswellstudio.JPG' },
  { id: 20746, file: D + 'Walt_Disney_Studios_in_1929.jpg', credit: 'Walt Disney Studios on Hyperion Avenue, 1929 (public domain)', src: 'https://commons.wikimedia.org/wiki/File:Walt_Disney_Studios_in_1929.jpg' },
  { id: 20751, file: D + 'Tsmc_factory_hsinchu.JPG', credit: 'Arusanov, public domain: a TSMC fab in Hsinchu Science Park, where TSMC was founded', src: 'https://commons.wikimedia.org/wiki/File:Tsmc_factory_hsinchu.JPG' },
];
const token = fs.readFileSync('.scrape/admin-local.token', 'utf8').trim();
const call = async (method, p, body) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-media/1.0', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const t = await r.text(); if (!r.ok) throw Error(`${method} ${p}: ${r.status} ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null;
};
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', 'chronopin', '--query', '[0].value', '-o', 'tsv']).toString().trim();
const container = new BlobServiceClient('https://chronopin.blob.core.windows.net', new StorageSharedKeyCredential('chronopin', key)).getContainerClient('thumb');
for (const j of jobs) {
  const jpg = await sharp(fs.readFileSync(j.file)).jpeg({ quality: 90 }).toBuffer();
  const hash = crypto.createHash('sha256').update(jpg).digest('hex').slice(0, 16);
  const blob = container.getBlockBlobClient(`company-founding/${j.id}-${hash}.jpg`);
  console.log(apply ? 'apply' : 'dry', j.id, blob.url);
  if (!apply) continue;
  if (!(await blob.exists())) await blob.uploadData(jpg, { blobHTTPHeaders: { blobContentType: 'image/jpeg', blobCacheControl: 'public, max-age=31536000, immutable' } });
  const check = Buffer.from(await (await fetch(blob.url)).arrayBuffer());
  if (crypto.createHash('sha256').update(check).digest('hex').slice(0, 16) !== hash) throw Error('blob verify failed ' + j.id);
  const pin = (await call('GET', `/api/pins/${j.id}`)); const p = pin.pin ?? pin;
  const cur = (p.media ?? []).map((m) => ({ type: Number(m.type), originalUrl: m.originalUrl, ...(m.authorName ? { authorName: m.authorName } : {}), ...(m.authorUrl ? { authorUrl: m.authorUrl } : {}) }));
  await call('PUT', `/api/pins/${j.id}?lightweight=1`, { ...p, media: [...cur, { type: 1, originalUrl: blob.url, authorName: j.credit, authorUrl: j.src }] });
  const mid = (await call('GET', `/api/pins/${j.id}`)); const m = (mid.pin ?? mid).media;
  for (const x of m) if (x.originalUrl === blob.url && x.authorName !== j.credit) await call('PATCH', `/api/admin/db/Medium?id=${x.id}`, { authorName: j.credit, authorUrl: j.src });
  await call('POST', '/api/admin/pins/expire', { ids: [j.id] });
  const after = await call('GET', `/api/pins/${j.id}`); const a = after.pin ?? after;
  console.log(j.id, a.title, a.media.map((x) => [x.thumbName, x.authorName?.slice(0, 30)]));
}
