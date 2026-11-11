// Backfills pin 20934 (Jay-Z Super Bowl LXI halftime setlist market): the 25 songs as setlist contenders (iTunes
// previews, Polymarket displayed percentages read 2026-11-11) and two images via Azure Blob. Needs migration 0258 and
// the setlist code deployed before it can write to production.
// Images first: .tmp/jz/featured.jpg (Roc Nation announcement photo via JamBase) and .tmp/jz/sofi.jpg (Commons).
// node scripts/markets/jayz-halftime-backfill-2026-11-11.mjs [--apply] [--local]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
const apply = process.argv.includes('--apply');
const local = process.argv.includes('--local');
const base = local ? 'http://localhost:3000' : 'https://www.chronopin.com';
const id = 20934;
const MARKET = 'https://polymarket.com/event/what-songs-will-be-played-at-the-2027-big-game-halftime-show';
const NEWS = 'https://www.jambase.com/article/jay-z-super-bowl-2027-halftime-show';
// [rank, song, credited artist, odds (displayed %), preview]; rank = market favourite first.
const E = [
  [1, "Public Service Announcement", "JAŸ-Z", 83, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/7d/99/d3/7d99d37e-be5f-c033-5ccb-13866d0977f7/mzaf_4280449250806879361.plus.aac.p.m4a"],
  [2, "99 Problems", "JAŸ-Z", 80, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/51/1b/8f/511b8fec-a046-935f-203c-ad1432069fac/mzaf_4532894864537422430.plus.aac.p.m4a"],
  [3, "Izzo (H.O.V.A.)", "JAŸ-Z", 79, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/c3/c9/9c/c3c99c8c-eaa3-0123-1d58-322a890be184/mzaf_9498455868862873571.plus.aac.p.m4a"],
  [4, "Empire State of Mind", "JAŸ-Z", 74, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/ae/bc/cb/aebccb04-d478-ec54-db5c-584cb98d837d/mzaf_9745470800380850630.plus.aac.p.m4a"],
  [5, "Dirt Off Your Shoulder", "JAŸ-Z", 61, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/bc/4e/8b/bc4e8b14-a055-95a1-c228-526d382726df/mzaf_16650936511284073892.plus.aac.p.m4a"],
  [6, "Encore", "JAŸ-Z", 60, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e9/c8/66/e9c866b2-1eac-a1d6-116e-ad3ad96a378b/mzaf_15591602067571024602.plus.aac.p.m4a"],
  [7, "Hard Knock Life (Ghetto Anthem)", "JAŸ-Z", 60, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/37/da/38/37da3892-36be-9cff-f6c0-6023769caa57/mzaf_4159653196642044068.plus.aac.p.m4a"],
  [8, "Run This Town", "JAŸ-Z & Kanye West", 57, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/6c/e0/a7/6ce0a78c-50fa-6a37-2f8a-896e5dfec476/mzaf_14092848530528726163.plus.aac.p.m4a"],
  [9, "'03 Bonnie & Clyde", "JAŸ-Z", 52, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/2d/c2/14/2dc21438-be7d-9d56-21e6-7bf45abcc13f/mzaf_7064376656488920955.plus.aac.p.m4a"],
  [10, "Crazy in Love", "Beyoncé", 51, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/7a/7f/b3/7a7fb397-c707-f7a6-93be-1db3cd1c7fcb/mzaf_10719026518601275807.plus.aac.p.m4a"],
  [11, "No Church in the Wild", "Kanye West & JAŸ-Z", 51, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e8/66/cc/e866cc16-6768-85ca-4ae7-0095f8b7f250/mzaf_14372111657021711865.plus.aac.p.m4a"],
  [12, "Heart of the City (Ain't No Love)", "JAŸ-Z", 50, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/20/35/66/2035664d-a8bf-dbb8-dddc-83e79191f775/mzaf_7414687090065560050.plus.aac.p.m4a"],
  [13, "I Just Wanna Love U (Give It 2 Me)", "JAŸ-Z", 47, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/3c/ef/29/3cef29fe-8d4e-8344-33ef-a2b3a2eaae7a/mzaf_11977460692973754194.plus.aac.p.m4a"],
  [14, "Big Pimpin'", "JAŸ-Z", 47, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e3/88/c8/e388c88b-bf66-a383-66cf-b262dd652d97/mzaf_15604876658983990069.plus.aac.p.m4a"],
  [15, "God Did", "DJ Khaled", 46, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/97/2f/d3/972fd3a1-3b40-5635-bb0f-f70e2bb7bbbc/mzaf_10595984984567544298.plus.aac.p.m4a"],
  [16, "N****s in Paris", "Kanye West & JAŸ-Z", 41, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/6f/b7/24/6fb724f8-ed43-d85b-5a8d-a384801cdf97/mzaf_711589637216351513.plus.aac.p.m4a"],
  [17, "Jigga What, Jigga Who", "JAŸ-Z", 34, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview128/v4/72/17/3d/72173dda-63c1-25db-f841-7cb6c3b41d0f/mzaf_3851514202828296902.plus.aac.p.m4a"],
  [18, "Holy Grail", "JAŸ-Z", 32, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/5f/38/84/5f3884e8-7d1c-624f-769a-6f88155b1832/mzaf_6134241458588083305.plus.aac.p.m4a"],
  [19, "On to the Next One", "JAŸ-Z", 28, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/52/36/8d/52368d04-acfa-1e18-adec-da110da6ff29/mzaf_11258355468674870804.plus.aac.p.m4a"],
  [20, "Drunk in Love", "Beyoncé", 24, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/42/15/eb/4215eb99-6656-8916-97ed-348f7f035f9a/mzaf_6922506136578698447.plus.aac.p.m4a"],
  [21, "Umbrella", "Rihanna", 22, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/7b/45/22/7b452241-882c-409b-3a9b-23306b14286a/mzaf_8588243939716013218.plus.aac.p.m4a"],
  [22, "Young Forever", "JAŸ-Z & Mr Hudson", 19, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/9a/5c/87/9a5c8757-3869-3d93-fc25-5e5ee551124b/mzaf_9774118482442581104.plus.aac.p.m4a"],
  [23, "Can I Get A...", "JAŸ-Z", 17, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f8/18/ae/f818aecd-4ed4-a9cb-26a5-13b0df78502c/mzaf_986879399527266686.plus.aac.p.m4a"],
  [24, "Show Me What You Got", "JAŸ-Z", 17, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/c8/f0/93/c8f09375-af82-5fee-43e5-222368bc7034/mzaf_3159992704046478258.plus.aac.p.m4a"],
  [25, "Apeshit", "THE CARTERS", 13, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f9/30/c8/f930c8af-12f1-8624-3e14-05551e16bbb5/mzaf_7912738779603066458.plus.aac.p.m4a"],
];
const candidates = E.map(([rank, name, artist, odds, previewUrl]) => ({ category: 'setlist', rank, name, artist, odds, oddsLabel: 'played', sourceUrl: MARKET, previewUrl, asOf: '2026-11-11' }));
const files = [
  ['.tmp/jz/featured.jpg', 'JAŸ-Z, Super Bowl LXI halftime show announcement (photo via Roc Nation, as published by JamBase)', NEWS],
  ['.tmp/jz/sofi.jpg', 'SoFi Stadium, Inglewood (Wikimedia Commons, CC BY 2.0)', 'https://commons.wikimedia.org/wiki/File:SoFi_Stadium_(51162010487).jpg'],
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
  const blob = container.getBlockBlobClient(`music/jayz-halftime-${id}-${i}-${hash}.jpg`);
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
