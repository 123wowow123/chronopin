// Backfills pin 20928 (Eurovision Asia winner market): the 11 entries as contenders (entry category, iTunes
// previews, Polymarket prices read 2026-11-11) and three contest images from the organiser's site via Azure Blob.
// Images are downloaded first into .tmp/esca (ignored). node scripts/markets/eurovision-asia-backfill-2026-11-11.mjs [--apply]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
const apply = process.argv.includes('--apply');
const base = 'https://www.chronopin.com';
const id = 20928;
const MARKET = 'https://polymarket.com/event/eurovision-asia-winner-2026';
const NEWS = 'https://eurovisionasia.com/news/11-countries-to-participate-eurovision-song-contest-asia-2026/';
const P = (p) => `https://audio-ssl.itunes.apple.com/itunes-assets/${p}.plus.aac.p.m4a`;
// rank = market favourite first; odds = Yes price in cents on 2026-11-11.
const E = [
  [1, 'Bluest Sky', 'Aina Abdul · Malaysia', 61, P('AudioPreview211/v4/f3/cc/07/f3cc07a3-e752-85a8-8b27-693d3d79cdb4/mzaf_9300630784844343209')],
  [2, 'Sobra-Sobra', 'CARMELLE · Philippines', 29, P('AudioPreview221/v4/76/8c/38/768c384f-eecc-921b-fbdb-aa8ce862d379/mzaf_18043330794634198339')],
  [3, 'EM TIÊN', 'Tóc Tiên · Vietnam', 10, P('AudioPreview221/v4/79/26/43/7926435c-061d-e0bc-83d0-14b27d251f2b/mzaf_5189603465905180277')],
  [4, 'Aroma', 'MANG x DAOU · Thailand', 6, P('AudioPreview221/v4/12/24/87/1224873c-478a-4ec8-d775-6aa802be15ad/mzaf_8659922367533844822')],
  [5, 'Ananta Maya', 'Pratik Himal Rai · Nepal', 7, P('AudioPreview211/v4/bc/17/f2/bc17f2cf-57f0-f6e9-3175-ff25a0c84602/mzaf_13140786815539382261')],
  [6, 'DEEP DIVE', 'JUNHEE · South Korea', 4, P('AudioPreview221/v4/2f/63/56/2f635661-a445-9f1a-6770-4106bf584d8b/mzaf_10766300497385725679')],
  [7, 'BAE', 'Thinla · Laos', 1, P('AudioPreview221/v4/e7/dc/74/e7dc745b-7a99-daa6-8f12-cec5769db38a/mzaf_17655002300194596285')],
  [8, 'Chamguigeer (Without You)', 'Beck · Mongolia', 0, P('AudioPreview221/v4/e6/0b/80/e60b8066-8afb-36f5-7197-3a65b55e17eb/mzaf_2172365844802952633')],
  [9, 'Lhayi Semo', 'Nyendra · Bhutan', 0, P('AudioPreview211/v4/57/90/01/579001fb-983a-bb5f-1108-b414e5b96db9/mzaf_9834788316350499991')],
  [10, 'I Let You Go', 'Monetrey · Cambodia', 0, P('AudioPreview211/v4/88/d2/2e/88d22e0c-d7ba-680f-0d07-d8b5cb9ec3d8/mzaf_17296188389719025483')],
  [11, 'Tumi Ele', 'Beatmosphere · Bangladesh', 0, P('AudioPreview221/v4/5b/c2/f8/5bc2f8a4-549e-dcf4-3d96-a833cd49de7d/mzaf_16912733918155829494')],
];
const candidates = E.map(([rank, name, artist, odds, previewUrl]) => ({ category: 'entry', rank, name, artist, odds, oddsLabel: 'winner', sourceUrl: MARKET, previewUrl, asOf: '2026-11-11' }));
const files = [
  ['.tmp/esca/ESC_Asia_Trophy_04.jpg', 'Eurovision Song Contest Asia 2026 trophy (EBU / Eurovision Song Contest Asia)'],
  ['.tmp/esca/ESCAsia_RunningOrder_16x9.png', 'Eurovision Song Contest Asia 2026 Grand Final running order (EBU / Eurovision Song Contest Asia)'],
  ['.tmp/esca/thinla_asia_26_r1_1.jpg', 'Thinla of Laos rehearsing "BAE" at Eurovision Song Contest Asia 2026 (EBU / Eurovision Song Contest Asia)'],
];
const token = fs.readFileSync('.scrape/admin.token', 'utf8').trim();
const call = async (method, p, body) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-markets/1.0', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const t = await r.text(); if (!r.ok) throw Error(`${method} ${p}: ${r.status} ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null;
};
console.log(candidates.length, 'candidates');
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', 'chronopin', '--query', '[0].value', '-o', 'tsv']).toString().trim();
const container = new BlobServiceClient('https://chronopin.blob.core.windows.net', new StorageSharedKeyCredential('chronopin', key)).getContainerClient('thumb');
const add = [];
for (const [i, [f, credit]] of files.entries()) {
  const jpg = await sharp(fs.readFileSync(f)).jpeg({ quality: 90 }).toBuffer();
  const hash = crypto.createHash('sha256').update(jpg).digest('hex').slice(0, 16);
  const blob = container.getBlockBlobClient(`music/eurovision-asia-${id}-${i}-${hash}.jpg`);
  if (apply) {
    if (!(await blob.exists())) await blob.uploadData(jpg, { blobHTTPHeaders: { blobContentType: 'image/jpeg', blobCacheControl: 'public, max-age=31536000, immutable' } });
    const check = Buffer.from(await (await fetch(blob.url)).arrayBuffer());
    if (crypto.createHash('sha256').update(check).digest('hex').slice(0, 16) !== hash) throw Error(`blob verify failed ${f}`);
  }
  add.push({ type: 1, originalUrl: blob.url, authorName: credit, authorUrl: NEWS });
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
await call('PUT', `/api/pins/${id}/candidates`, candidates);
await call('POST', '/api/admin/pins/expire', { ids: [id] });
const after = await call('GET', `/api/pins/${id}`);
const cands = await call('GET', `/api/pins/${id}/candidates`);
const bad = add.filter((a) => !after.media.some((m) => m.originalUrl === a.originalUrl && m.authorName === a.authorName));
console.log(id, !bad.length && after.title === pin.title && after.utcStartDateTime === pin.utcStartDateTime ? 'ok' : 'READBACK MISMATCH', after.media.length, 'media', fixed, 'credits restored', cands.length, 'candidates');
