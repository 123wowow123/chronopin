// Uploads the reviewed picture candidates from the data-center drafts (.tmp/dc-timeline/<id>.json mediaCandidates, downloaded to
// .tmp/dc-media/<id>-<index> and viewed on contact sheets) to Azure Blob and appends them to each pin with credit. Existing media are kept.
// node scripts/construction/data-center-media-2026-10-31.mjs [--base https://www.chronopin.com] [--only 1,2] [--apply]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
const args = process.argv.slice(2);
const val = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const base = (val('--base') ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
if (!['http://127.0.0.1:3000', 'https://www.chronopin.com'].includes(base)) throw Error('Known hosts only.');
const apply = args.includes('--apply');
const only = val('--only')?.split(',').map(Number);
const DIR = '.tmp/dc-media';
// Viewed and rejected: 19269-1 shows a different, abandoned mixed-use plan; 19177-0 never downloaded (403).
const SKIP = new Set(['19269-1', '19177-0']);
const token = fs.readFileSync(base.startsWith('https') ? '.scrape/admin.token' : '.scrape/admin-local.token', 'utf8').trim();
const call = async (method, p, body) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error' });
  const t = await r.text(); if (!r.ok) throw Error(`${method} ${p}: ${r.status} ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null;
};
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', 'chronopin', '--query', '[0].value', '-o', 'tsv'], { encoding: 'utf8' }).trim();
const container = new BlobServiceClient('https://chronopin.blob.core.windows.net', new StorageSharedKeyCredential('chronopin', key)).getContainerClient('thumb');
const cache = `${DIR}/uploaded.json`;
const uploaded = fs.existsSync(cache) ? JSON.parse(fs.readFileSync(cache, 'utf8')) : {};
const ids = fs.readdirSync('.tmp/dc-timeline').filter((f) => /^\d+\.json$/.test(f)).map((f) => Number(f.slice(0, -5))).filter((id) => !only || only.includes(id)).sort((a, b) => a - b);
for (const id of ids) {
  const d = JSON.parse(fs.readFileSync(`.tmp/dc-timeline/${id}.json`, 'utf8'));
  const add = [];
  for (const [i, c] of (d.mediaCandidates ?? []).entries()) {
    const k = `${id}-${i}`;
    if (SKIP.has(k) || !fs.existsSync(`${DIR}/${k}`)) continue;
    if (!uploaded[k]) {
      const jpg = await sharp(fs.readFileSync(`${DIR}/${k}`)).rotate().resize({ width: 2000, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
      const hash = crypto.createHash('sha256').update(jpg).digest('hex').slice(0, 16);
      const blob = container.getBlockBlobClient(`datacenters/usa-${id}-${i}-${hash}.jpg`);
      if (apply) {
        if (!(await blob.exists())) await blob.uploadData(jpg, { blobHTTPHeaders: { blobContentType: 'image/jpeg', blobCacheControl: 'public, max-age=31536000, immutable' } });
        const check = Buffer.from(await (await fetch(blob.url)).arrayBuffer());
        if (crypto.createHash('sha256').update(check).digest('hex').slice(0, 16) !== hash) throw Error(`blob verify failed ${k}`);
      }
      uploaded[k] = blob.url;
    }
    add.push({ type: 1, originalUrl: uploaded[k], authorName: String(c.credit).slice(0, 200), authorUrl: c.sourcePage });
  }
  if (!add.length) continue;
  console.log(base, id, apply ? 'apply' : 'dry', add.length);
  if (!apply) continue;
  const pin = await call('GET', `/api/pins/${id}`);
  const fresh = add.filter((a) => !(pin.media ?? []).some((m) => m.originalUrl === a.originalUrl));
  if (fresh.length) {
    const cur = (pin.media ?? []).map((m) => ({ type: Number(m.type), originalUrl: m.originalUrl, ...(m.authorName ? { authorName: m.authorName } : {}), ...(m.authorUrl ? { authorUrl: m.authorUrl } : {}) }));
    await call('PUT', `/api/pins/${id}?lightweight=1`, { ...pin, media: [...cur, ...fresh] });
  }
  // thumbnail processing clears attribution on new media: restore it, then round-trip once
  const mid = await call('GET', `/api/pins/${id}`);
  let fixed = 0;
  for (const m of mid.media) { const a = add.find((x) => x.originalUrl === m.originalUrl); if (a && (m.authorName !== a.authorName || m.authorUrl !== a.authorUrl)) { await call('PATCH', `/api/admin/db/Medium?id=${m.id}`, { authorName: a.authorName, authorUrl: a.authorUrl }); fixed++; } }
  if (fixed) await call('PUT', `/api/pins/${id}?lightweight=1`, await call('GET', `/api/pins/${id}`));
  await call('POST', '/api/admin/pins/expire', { ids: [id] });
  const after = await call('GET', `/api/pins/${id}`);
  const bad = add.filter((a) => !after.media.some((m) => m.originalUrl === a.originalUrl && m.authorName === a.authorName));
  const ok = after.title === pin.title && after.user.id === pin.user.id && after.price === pin.price && after.tags.length === pin.tags.length && !bad.length;
  console.log(id, ok ? 'ok' : 'READBACK MISMATCH', after.media.length, 'media', fixed, 'credits restored');
  if (apply) fs.writeFileSync(cache, JSON.stringify(uploaded, null, 1));
}
if (apply) fs.writeFileSync(cache, JSON.stringify(uploaded, null, 1));
