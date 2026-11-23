// Resumable, source-URL matched hotel additions. Database-allocated IDs only.
// node scripts/hotels/expandTravelShelves.mjs [--catalog scripts/hotels/<batch>.json] [--apply]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

const catalogFlag = process.argv.indexOf('--catalog');
const file = catalogFlag < 0 ? 'scripts/hotels/travel-expansion-2026-11-22.json' : process.argv[catalogFlag + 1];
if (!file?.match(/^scripts\/hotels\/[\w-]+\.json$/)) throw Error('Expected a research catalog in scripts/hotels.');
const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
const batchDate = file.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? '2026-11-22';
const apply = process.argv.includes('--apply');
const stateDir = catalogFlag < 0
  ? '.scrape/prod-batches/travel-2026-11-22'
  : `.scrape/prod-batches/${file.split('/').at(-1).replace(/\.json$/, '')}`;
fs.mkdirSync(stateDir, { recursive: true });
const postedFile = `${stateDir}/posted.json`;
const posted = fs.existsSync(postedFile) ? JSON.parse(fs.readFileSync(postedFile, 'utf8')) : {};
const persist = () => fs.writeFileSync(postedFile, JSON.stringify(posted, null, 2) + '\n');

if (apply) {
  const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', 'chronopin', '--query', '[0].value', '-o', 'tsv'], { encoding: 'utf8' }).trim();
  const container = new BlobServiceClient('https://chronopin.blob.core.windows.net', new StorageSharedKeyCredential('chronopin', key)).getContainerClient('thumb');
  for (const entry of catalog) {
    for (const media of entry.media) {
      if (!media.blobUrl) {
        const response = await fetch(media.imageSourceUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30_000) });
        if (!response.ok) throw Error(`${media.key}: download ${response.status}`);
        const input = Buffer.from(await response.arrayBuffer());
        // These exact images were visually reviewed in the research contact sheet.
        const output = await sharp(input).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
        const sha256 = createHash('sha256').update(output.data).digest('hex');
        const blob = container.getBlockBlobClient(`travel/${batchDate}/${media.key}-${sha256.slice(0, 16)}.webp`);
        if (!(await blob.exists())) await blob.uploadData(output.data, { conditions: { ifNoneMatch: '*' }, blobHTTPHeaders: { blobContentType: 'image/webp', blobCacheControl: 'public, max-age=31536000, immutable' } });
        Object.assign(media, { blobUrl: blob.url, width: output.info.width, height: output.info.height, sha256 });
      }
      const check = await fetch(media.blobUrl, { signal: AbortSignal.timeout(30_000) });
      assert.equal(check.status, 200);
      assert.equal(createHash('sha256').update(Buffer.from(await check.arrayBuffer())).digest('hex'), media.sha256);
      fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
    }
  }
}

for (const [environment, base, tokenFile] of [
  ['prod', 'https://www.chronopin.com', '.scrape/admin.token'],
  ['local', 'http://localhost:3000', '.scrape/admin-local.token'],
]) {
  const token = fs.readFileSync(tokenFile, 'utf8').trim();
  const call = async (method, route, body) => {
    const res = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(120_000) });
    const text = await res.text();
    if (!res.ok) throw Error(`${environment} ${method} ${route}: ${res.status} ${text.slice(0, 250)}`);
    return text ? JSON.parse(text) : null;
  };
  for (const entry of catalog) {
    const found = await call('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(entry.pin.sourceUrl)}&utcDeletedDateTime.null=true&limit=5`);
    assert.ok(found.rows.length <= 1, `${entry.key}: ambiguous source identity`);
    let id = found.rows[0]?.id;
    console.log(environment, entry.key, id ? `existing ${id}` : 'new pin');
    if (!apply) continue;
    if (!id) {
      const start = performance.now();
      const home = await fetch(base, { signal: AbortSignal.timeout(6000) });
      assert.ok(home.ok && performance.now() - start < 6000, 'Homepage latency gate failed');
      const result = await call('POST', '/api/admin/pins', { userName: '@TravelDesk', pins: [{ ...entry.pin, media: entry.media.map(m => ({ type: 1, originalUrl: m.blobUrl, authorName: m.credit, authorUrl: m.sourceUrl })) }] });
      id = result.results[0]?.id;
      if (!id) throw Error(JSON.stringify(result));
      posted[environment] ??= {};
      posted[environment][entry.key] = id;
      persist();
      await new Promise(resolve => setTimeout(resolve, 1200));
    } else {
      // A rerun only continues pins created by this batch; never repurpose another pin.
      assert.equal(posted[environment]?.[entry.key], id, 'Existing pin requires identity review before mutation');
    }
    await call('PUT', `/api/pins/${id}/hotel`, entry.hotel);
    await call('PUT', `/api/pins/${id}/factory`, entry.factory);
    const pin = await call('GET', `/api/pins/${id}`);
    for (const media of entry.media) {
      const saved = pin.media.find(m => m.originalUrl === media.blobUrl);
      assert.ok(saved, `${entry.key}: media missing`);
      if (saved.authorName !== media.credit || saved.authorUrl !== media.sourceUrl) await call('PATCH', `/api/admin/db/Medium?id=${saved.id}`, { authorName: media.credit, authorUrl: media.sourceUrl });
    }
    await call('POST', '/api/admin/pins/expire', { ids: [id] });
    const saved = await call('GET', `/api/pins/${id}`);
    assert.equal(saved.title, entry.pin.title);
    assert.equal(saved.sourceUrl, entry.pin.sourceUrl);
    assert.equal(saved.address, entry.pin.address);
    assert.equal(saved.latitude, entry.pin.latitude);
    assert.equal(saved.longitude, entry.pin.longitude);
    assert.equal(saved.user?.userName, '@TravelDesk');
    assert.equal(saved.utcStartDateTime, new Date(entry.pin.utcStartDateTime).toISOString());
    assert.ok(entry.pin.tags.every(tag => saved.tags.some(t => t.name === tag)));
    assert.ok(entry.pin.references.every(ref => saved.references.some(r => r.url === ref.url)));
    assert.ok(entry.media.every(m => saved.media.some(s => s.originalUrl === m.blobUrl && s.authorName === m.credit && s.authorUrl === m.sourceUrl)));
    const hotel = await call('GET', `/api/pins/${id}/hotel`);
    for (const field of ['rooms', 'service', 'location', 'cleanliness', 'value', 'acclaim', 'reviews', 'basis', 'sourceUrl']) assert.deepEqual(hotel[field], entry.hotel[field]);
    const factory = await call('GET', `/api/pins/${id}/factory`);
    assert.deepEqual(factory.milestones, entry.factory.milestones);
    fs.writeFileSync(`${stateDir}/${environment}-${entry.key}.json`, JSON.stringify({ pin: saved, hotel, factory }, null, 2));
    console.log(environment, entry.key, id, 'verified');
  }
}

if (apply) {
  const runtime = catalog.map(({ pin, shelves, destination, pricePerNight, topActivities, priceSource, priceBasis, bestTimeToGo }) => ({ sourceUrl: pin.sourceUrl, shelves, destination, pricePerNight, topActivities, priceSource, priceBasis, ...(bestTimeToGo ? { bestTimeToGo } : {}), checkedAt: batchDate }));
  const runtimeFile = 'src/server/data/travelResorts.json';
  const existing = fs.existsSync(runtimeFile) ? JSON.parse(fs.readFileSync(runtimeFile, 'utf8')) : [];
  const merged = new Map(existing.map(entry => [entry.sourceUrl, entry]));
  for (const entry of runtime) merged.set(entry.sourceUrl, entry);
  fs.writeFileSync(runtimeFile, JSON.stringify([...merged.values()], null, 2) + '\n');
  console.log('Saved source-URL based travel shelf catalog.');
}
