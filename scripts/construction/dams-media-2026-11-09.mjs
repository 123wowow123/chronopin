// Pictures for the 8 US dam pins on production (19-26). Every image was downloaded from the cited page and viewed first.
// Uploads to Azure Blob (container thumb, construction/), verifies the public blob, then PUTs the pin's media (main image first),
// restores credits through /api/admin/db/Medium, expires the pin and reads it back.
//   node scripts/construction/dams-media-2026-11-09.mjs [--apply] [--only 20919,20920]   (images read from IMG_DIR)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',').map(Number) : null;
const IMG_DIR = process.env.IMG_DIR ?? '/private/tmp/claude-501/-Users-ianflynn-chronopin/47ba3a3c-0e85-453a-929b-5aa42bbb0243/scratchpad/img';
const base = 'https://www.chronopin.com';
const token = fs.readFileSync('.scrape/admin.token', 'utf8').trim();
const call = async (method, p, body) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-construction/1.0', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const t = await r.text(); if (!r.ok) throw Error(`${method} ${p}: ${r.status} ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null;
};
const VW = { name: 'Valley Water', url: 'https://www.valleywater.org/news-events/news-releases/Anderson-Dam-Tunnel-Project-on-track-for-completion-in-2026' };
const VW2 = { name: 'Valley Water', url: 'https://www.valleywater.org/news-events/news-releases/ValleyWaterreachesmajormilestoneinrebuildingAndersonDam' };
const DW = { name: 'Denver Water', url: 'https://www.denverwater.org/tap/major-milestone-gross-dam-construction' };
const RR = { name: 'U.S. Army Corps of Engineers, Louisville District (via DVIDS)', url: 'https://www.dvidshub.net/news/570430/groundbreaking-ceremony-rough-river-dam-safety-modification-project-marks-beginning-work-phase-2' };
const RR3 = { name: 'U.S. Army Corps of Engineers, Louisville District (via DVIDS)', url: 'https://www.dvidshub.net/news/558854/louisville-district-holds-public-meeting-phase-2-rough-river-dam-safety-modification-project' };
const HN = { name: 'FlatironDragados / U.S. Army Corps of Engineers (project graphic)', url: 'https://www.fdcorp.com/en/news/dams/2026/usace-contract-award-finalized-for-howard-a-hanson-dam-additional-water-storage-fish-passage' };
const PR = { name: 'California Construction News (Prado Dam)', url: 'https://www.californiaconstructionnews.com/?p=11990' };
const PR2 = { name: 'U.S. Army Corps of Engineers (via DVIDS)', url: 'https://www.dvidshub.net/news/440474/senior-dam-safety-program-manager-visits-prado-dam-spillway-project' };
const SI = { name: 'Sites Project Authority', url: 'https://sitesproject.org/about-sites/' };
const GD1 = { name: 'Rye Development (rendering), via Northwest Public Broadcasting', url: 'https://www.nwpb.org/local/2026-02-03/goldendale-energy-storage-project-receives-milestone-license-tribes-continue-to-raise-concerns' };
const GD2 = { name: 'Northwest News Network (view toward John Day Dam and the project site)', url: 'https://www.nwnewsnetwork.org/environment-and-planning/2024-02-09/controversial-energy-project-moves-closer-to-breaking-ground' };
// [pin id, slug, [[file, credit]...]] main image first.
const PINS = [
  [20919, 'anderson-retrofit', [['an_aerial.jpg', VW2], ['an_portal.jpg', VW], ['an_weir.jpg', VW]]],
  [20920, 'anderson-tunnel', [['an_pipe.jpg', VW], ['an_blog1.jpg', VW], ['an_blog2.jpg', VW]]],
  [20921, 'gross', [['gr_wide.jpg', DW], ['gr_down.jpg', DW], ['gr_conc.jpg', DW]]],
  [20922, 'rough-river', [['rr_2.jpg', RR], ['rr_1.jpg', RR], ['rr_3.jpg', RR3]]],
  [20923, 'hanson', [['hn_3.jpg', HN], ['hn_2.jpg', HN], ['hn_1.jpg', HN]]],
  [20924, 'prado', [['pr_2.png', PR], ['pr_1.png', PR], ['pr_4.jpg', PR2]]],
  [20925, 'sites', [['si_loc.jpg', SI], ['si_sched.png', SI]]],
  [20926, 'goldendale', [['gd_1.jpg', GD1], ['gd_2.jpg', GD2]]],
];
const key = apply ? execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', 'chronopin', '--query', '[0].value', '-o', 'tsv']).toString().trim() : null;
const container = key ? new BlobServiceClient('https://chronopin.blob.core.windows.net', new StorageSharedKeyCredential('chronopin', key)).getContainerClient('thumb') : null;
for (const [id, slug, items] of PINS) {
  if (only && !only.includes(id)) continue;
  const pin = await call('GET', `/api/pins/${id}`);
  if ((pin.media ?? []).length) { console.log(`${id}: already has ${pin.media.length} media, skipped`); continue; }
  const media = [];
  for (const [file, credit] of items) {
    const jpg = await sharp(fs.readFileSync(`${IMG_DIR}/${file}`)).rotate().resize({ width: 2400, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
    const hash = crypto.createHash('sha256').update(jpg).digest('hex').slice(0, 16);
    const name = `construction/usa-${id}-${slug}-${file.replace(/\.\w+$/, '')}-${hash}.jpg`;
    if (!apply) { console.log(`dry ${id} ${name} ${(jpg.length / 1024) | 0}KB <- ${credit.name}`); continue; }
    const blob = container.getBlockBlobClient(name);
    if (!(await blob.exists())) await blob.uploadData(jpg, { blobHTTPHeaders: { blobContentType: 'image/jpeg', blobCacheControl: 'public, max-age=31536000, immutable' } });
    const check = Buffer.from(await (await fetch(blob.url)).arrayBuffer());
    if (crypto.createHash('sha256').update(check).digest('hex').slice(0, 16) !== hash) throw Error(`blob verify failed ${name}`);
    media.push({ type: 1, originalUrl: blob.url, authorName: credit.name, authorUrl: credit.url });
  }
  if (!apply) continue;
  await call('PUT', `/api/pins/${id}?lightweight=1`, { ...pin, media });
  const got = await call('GET', `/api/pins/${id}`);
  for (const m of got.media) {
    const want = media.find((x) => x.originalUrl === m.originalUrl);
    if (want && (m.authorName !== want.authorName || m.authorUrl !== want.authorUrl)) await call('PATCH', `/api/admin/db/Medium?id=${m.id}`, { authorName: want.authorName, authorUrl: want.authorUrl });
  }
  await call('POST', '/api/admin/pins/expire', { ids: [id] });
  const after = await call('GET', `/api/pins/${id}`);
  console.log(id, after.title.slice(0, 40), after.media.map((m) => [m.id, m.originalUrl.slice(-34), m.authorName?.slice(0, 22)]));
}
