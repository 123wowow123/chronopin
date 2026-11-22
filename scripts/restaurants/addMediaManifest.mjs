// Appends verified, already-downloaded images to pins via Azure Blob + the native PUT API, in local and prod.
// node scripts/restaurants/addMediaManifest.mjs manifest.json [--apply]
// manifest: [{ id, file, credit, authorUrl }]  (file = local path, credit -> Medium.authorName)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
const apply = process.argv.includes('--apply');
const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const envs = [['local', 'http://localhost:3000', '.scrape/admin-local.token'], ['prod', 'https://www.chronopin.com', '.scrape/admin.token']];
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', 'chronopin', '--query', '[0].value', '-o', 'tsv']).toString().trim();
const container = new BlobServiceClient('https://chronopin.blob.core.windows.net', new StorageSharedKeyCredential('chronopin', key)).getContainerClient('thumb');
const blobs = [];
for (const [i, m] of manifest.entries()) {
  const jpg = await sharp(fs.readFileSync(m.file)).rotate().resize({ width: 2048, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  const hash = crypto.createHash('sha256').update(jpg).digest('hex').slice(0, 16);
  const blob = container.getBlockBlobClient(`restaurant-images/media-gap-2026-11-21/pin-${m.id}-${i}-${hash}.jpg`);
  if (apply) {
    if (!(await blob.exists())) await blob.uploadData(jpg, { blobHTTPHeaders: { blobContentType: 'image/jpeg', blobCacheControl: 'public, max-age=31536000, immutable' } });
    const check = Buffer.from(await (await fetch(blob.url)).arrayBuffer());
    if (crypto.createHash('sha256').update(check).digest('hex').slice(0, 16) !== hash) throw Error('blob verify failed ' + m.file);
  }
  blobs.push({ ...m, url: blob.url });
}
console.log(apply ? 'apply' : 'dry', blobs.map((b) => `${b.id} ${b.url}`));
if (!apply) process.exit(0);
for (const [name, base, tf] of envs) {
  const token = fs.readFileSync(tf, 'utf8').trim();
  const call = async (method, p, body) => {
    const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-media/1.0', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const t = await r.text(); if (!r.ok) throw Error(`${name} ${method} ${p}: ${r.status} ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null;
  };
  for (const id of [...new Set(blobs.map((b) => b.id))]) {
    const add = blobs.filter((b) => b.id === id).map((b) => ({ type: 1, originalUrl: b.url, authorName: b.credit, authorUrl: b.authorUrl }));
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
    const kept = cur.every((c) => after.media.some((m) => m.originalUrl === c.originalUrl));
    console.log(name, id, !bad.length && kept && after.title === pin.title && after.authorId === pin.authorId ? 'ok' : 'READBACK MISMATCH', after.media.length, 'media', fixed, 'credits restored');
  }
}
