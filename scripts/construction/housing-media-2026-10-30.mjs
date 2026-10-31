// Uploads reviewed housing-pin pictures (from .tmp/housing-timeline/<id>.json mediaCandidates, each viewed by hand) to Azure Blob
// and appends them to the pin with credit. Existing media are kept as the API returns them; readback is diffed.
// node scripts/construction/housing-media-2026-10-30.mjs [--base https://www.chronopin.com] [--apply]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
const args = process.argv.slice(2);
const base = ((args.includes('--base') ? args[args.indexOf('--base') + 1] : undefined) ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
if (!['http://127.0.0.1:3000', 'https://www.chronopin.com'].includes(base)) throw Error('Known hosts only.');
const apply = args.includes('--apply');
const token = fs.readFileSync(base.startsWith('https') ? '.scrape/admin.token' : '.scrape/admin-local.token', 'utf8').trim();
// pin id -> candidate indexes that were viewed and kept (7059's two renderings show the superseded 15-story design and are left out)
const KEEP = { 3238: [0], 7030: [0, 1, 2], 7032: [0], 7040: [0, 1], 7047: [0], 7059: [2], 7069: [0, 1, 2], 7203: [0], 7222: [0] };
const call = async (method, p, body) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error' });
  const t = await r.text(); if (!r.ok) throw Error(`${method} ${p}: ${r.status} ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null;
};
// Thumbnail processing clears attribution on new media: restore it through the audited Medium API, then round-trip to refresh the page.
async function credit(id, add) {
  const pin = await call('GET', `/api/pins/${id}`);
  let fixed = 0;
  for (const m of pin.media) {
    const a = add.find((x) => x.originalUrl === m.originalUrl);
    if (a && (m.authorName !== a.authorName || m.authorUrl !== a.authorUrl)) { await call('PATCH', `/api/admin/db/Medium?id=${m.id}`, { authorName: a.authorName, authorUrl: a.authorUrl }); fixed++; }
  }
  if (fixed) { const again = await call('GET', `/api/pins/${id}`); await call('PUT', `/api/pins/${id}?lightweight=1`, again); }
  const after = await call('GET', `/api/pins/${id}`);
  const bad = add.filter((a) => !after.media.some((m) => m.originalUrl === a.originalUrl && m.authorName === a.authorName && m.authorUrl === a.authorUrl));
  console.log(id, bad.length ? 'CREDIT MISSING' : 'credits ok', fixed, 'restored', after.media.length, 'media');
}
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', 'chronopin', '--query', '[0].value', '-o', 'tsv'], { encoding: 'utf8' }).trim();
const container = new BlobServiceClient('https://chronopin.blob.core.windows.net', new StorageSharedKeyCredential('chronopin', key)).getContainerClient('thumb');
const cache = '.tmp/housing-media/uploaded.json';
const uploaded = fs.existsSync(cache) ? JSON.parse(fs.readFileSync(cache, 'utf8')) : {};
for (const [id, idx] of Object.entries(KEEP)) {
  const cands = JSON.parse(fs.readFileSync(`.tmp/housing-timeline/${id}.json`, 'utf8')).mediaCandidates;
  const add = [];
  for (const i of idx) {
    const c = cands[i], k = `${id}-${i}`;
    if (!uploaded[k]) {
      const raw = fs.readFileSync(`.tmp/housing-media/${k}`);
      const jpg = await sharp(raw).rotate().resize({ width: 2000, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
      const hash = crypto.createHash('sha256').update(jpg).digest('hex').slice(0, 16);
      const blob = container.getBlockBlobClient(`housing/usa-${id}-${i}-${hash}.jpg`);
      if (apply) {
        if (!(await blob.exists())) await blob.uploadData(jpg, { blobHTTPHeaders: { blobContentType: 'image/jpeg', blobCacheControl: 'public, max-age=31536000, immutable' } });
        const check = Buffer.from(await (await fetch(blob.url)).arrayBuffer());
        if (crypto.createHash('sha256').update(check).digest('hex').slice(0, 16) !== hash) throw Error(`blob verify failed ${k}`);
      }
      uploaded[k] = blob.url;
    }
    add.push({ type: 1, originalUrl: uploaded[k], authorName: c.credit, authorUrl: c.sourcePage });
  }
  console.log(base, id, apply ? 'apply' : 'dry', add.length);
  if (!apply) continue;
  const pin = await call('GET', `/api/pins/${id}`);
  if (pin.media.some((m) => add.some((a) => a.originalUrl === m.originalUrl))) { await credit(id, add); continue; }
  const before = pin.media.map((m) => [m.originalUrl, m.authorName ?? null]);
  const body = { ...pin, media: [...pin.media.map((m) => ({ type: Number(m.type), originalUrl: m.originalUrl, ...(m.authorName ? { authorName: m.authorName } : {}), ...(m.authorUrl ? { authorUrl: m.authorUrl } : {}) })), ...add] };
  await call('PUT', `/api/pins/${id}?lightweight=1`, body);
  await credit(id, add);
  const after = await call('GET', `/api/pins/${id}`);
  const ok = before.every(([u, a], j) => after.media[j]?.originalUrl === u && (after.media[j].authorName ?? null) === a) && add.every((a) => after.media.some((m) => m.originalUrl === a.originalUrl && m.authorName === a.authorName));
  console.log(id, ok ? 'ok' : 'READBACK MISMATCH', after.media.length, 'media; title/author kept:', after.title === pin.title && after.user.id === pin.user.id, 'price', after.price === pin.price, 'tags', after.tags.length === pin.tags.length, 'summary', after.longFormSummary === pin.longFormSummary);
  if (apply) fs.writeFileSync(cache, JSON.stringify(uploaded, null, 1));
}
if (apply) fs.writeFileSync(cache, JSON.stringify(uploaded, null, 1));
