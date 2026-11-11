// Backfills pin 1965 (Spotify top artist 2026 market): the 10 artists as ranking contenders (an iTunes preview of one
// well-known track each, not the market's basis; Polymarket displayed percentages read 2026-11-11) and one Spotify
// newsroom chart (the 2025 Wrapped top artists, labelled as last year's) via Azure Blob. Needs migration 0259 and the
// ranking code deployed before it can write to production. Image first: .tmp/sp/artists.png.
// node scripts/markets/spotify-top-artist-backfill-2026-11-11.mjs [--apply] [--local]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
const apply = process.argv.includes('--apply');
const local = process.argv.includes('--local');
const base = local ? 'http://localhost:3000' : 'https://www.chronopin.com';
const id = 1965;
const MARKET = 'https://polymarket.com/event/top-spotify-artist-2026';
const NEWS = 'https://newsroom.spotify.com/2025-12-03/wrapped-top-artists-songs-albums-podcasts-audiobooks/';
const P = (p) => `https://audio-ssl.itunes.apple.com/itunes-assets/${p}.plus.aac.p.m4a`;
// [rank, artist, previewed track, odds (displayed %), preview]; rank = market favourite first.
const E = [
  [1, "Bad Bunny", "NUEVAYoL", 96, P("AudioPreview221/v4/2e/97/55/2e97555a-1ed3-9e07-de57-07e1213186c9/mzaf_7594924455925081680")],
  [2, "Drake", "One Dance", 3, P("AudioPreview211/v4/99/c9/02/99c90261-eee2-f9a5-f143-7496dca1583b/mzaf_3576977620384404770")],
  [3, "Taylor Swift", "Blank Space", 1, P("AudioPreview211/v4/79/55/b1/7955b10c-6cb6-462a-861c-8e5cbcacfb76/mzaf_3395570742482345989")],
  [4, "Bruno Mars", "Just the Way You Are", 1, P("AudioPreview221/v4/04/c9/ee/04c9eeea-24ca-2198-17ea-c1c1436cb953/mzaf_16637738980836746910")],
  [5, "Beyoncé", "Love On Top", 0, P("AudioPreview211/v4/fe/0d/43/fe0d4311-3027-745d-759b-aec3354a54e7/mzaf_10947966188805060685")],
  [6, "The Weeknd", "Die For You", 0, P("AudioPreview221/v4/50/50/1a/50501a86-bd74-e90d-8a56-68c9b5e6e7d6/mzaf_4588197682084244913")],
  [7, "Kendrick Lamar", "Not Like Us", 0, P("AudioPreview211/v4/2d/e0/e8/2de0e874-cd0b-e9a9-e876-76be13a86662/mzaf_12385336780649591409")],
  [8, "Sabrina Carpenter", "Taste", 0, P("AudioPreview211/v4/26/57/a6/2657a620-c596-e0e4-efa2-e814f3572d1c/mzaf_5475540510703120797")],
  [9, "Morgan Wallen", "I'm The Problem", 0, P("AudioPreview221/v4/64/e0/d6/64e0d65e-3ddc-c83e-92c9-6b64f692c77c/mzaf_10347804800867775816")],
  [10, "Chappell Roan", "Good Luck, Babe!", 0, P("AudioPreview221/v4/c3/6d/4f/c36d4f23-b87f-046d-7a0e-e3e05d180b2a/mzaf_17235999651335214399")],
];
const candidates = E.map(([rank, name, track, odds, previewUrl]) => ({ category: 'ranking', rank, name, artist: track, odds, oddsLabel: 'winner', sourceUrl: MARKET, previewUrl, asOf: '2026-11-11' }));
const files = [
  ['.tmp/sp/artists.png', 'Spotify Wrapped 2025: Top 10 Artists Globally (Spotify newsroom; last year\'s ranking)', NEWS],
];
const token = fs.readFileSync(local ? '.scrape/admin-local.token' : '.scrape/admin.token', 'utf8').trim();
const call = async (method, p, body) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-markets/1.0', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const t = await r.text(); if (!r.ok) throw Error(`${method} ${p}: ${r.status} ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null;
};
console.log(candidates.length, 'candidates');
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', 'chronopin', '--query', '[0].value', '-o', 'tsv']).toString().trim();
const container = new BlobServiceClient('https://chronopin.blob.core.windows.net', new StorageSharedKeyCredential('chronopin', key)).getContainerClient('thumb');
const add = [];
for (const [i, [f, credit, from]] of files.entries()) {
  const jpg = await sharp(fs.readFileSync(f)).jpeg({ quality: 90 }).toBuffer();
  const hash = crypto.createHash('sha256').update(jpg).digest('hex').slice(0, 16);
  const blob = container.getBlockBlobClient(`music/spotify-top-artist-${id}-${i}-${hash}.jpg`);
  if (apply) {
    if (!(await blob.exists())) await blob.uploadData(jpg, { blobHTTPHeaders: { blobContentType: 'image/jpeg', blobCacheControl: 'public, max-age=31536000, immutable' } });
    const check = Buffer.from(await (await fetch(blob.url)).arrayBuffer());
    if (crypto.createHash('sha256').update(check).digest('hex').slice(0, 16) !== hash) throw Error(`blob verify failed ${f}`);
  }
  add.push({ type: 1, originalUrl: blob.url, authorName: credit, authorUrl: from });
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
