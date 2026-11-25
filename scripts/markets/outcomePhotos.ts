// Uploads the pictures a manifest lists to Azure Blob Storage (thumb container,
// outcome-photos/<pinId>/) and saves one PinOutcomePhoto row per picture, so a
// market pin shows the people behind its outcomes (0268).
//
//   npx tsx --env-file=.env.local scripts/markets/outcomePhotos.ts <manifest.json> <image dir> [--prod]
//
// Without --prod the rows go to the local database. With --prod they go through
// the authenticated admin API (.scrape/admin.token), which needs the table to
// exist there (deploy). Pictures themselves are never committed to Git.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

const [manifestPath, dir] = process.argv.slice(2);
const prod = process.argv.includes('--prod');
const { pinId, photos } = JSON.parse(await readFile(manifestPath, 'utf8')) as {
  pinId: number;
  photos: { label: string; person: string; file: string; authorName: string; authorUrl: string }[];
};

const account = 'chronopin';
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', account, '--query', '[0].value', '-o', 'tsv'], { encoding: 'utf8' }).trim();
const container = new BlobServiceClient(`https://${account}.blob.core.windows.net`, new StorageSharedKeyCredential(account, key)).getContainerClient('thumb');

const rows: { label: string; person: string; imageUrl: string; authorName: string; authorUrl: string }[] = [];
for (const p of photos) {
  const data = await readFile(`${dir}/${p.file}`);
  const hash = createHash('sha256').update(data).digest('hex');
  const name = `outcome-photos/${pinId}/${p.person.normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase()}-${hash.slice(0, 12)}.jpg`;
  const blob = container.getBlockBlobClient(name);
  if (!(await blob.exists())) await blob.uploadData(data, { blobHTTPHeaders: { blobContentType: 'image/jpeg', blobCacheControl: 'public, max-age=31536000, immutable' } });
  // Verify the public blob before anything points at it.
  const res = await fetch(blob.url);
  const remote = Buffer.from(await res.arrayBuffer());
  if (!res.ok || createHash('sha256').update(remote).digest('hex') !== hash) throw new Error(`Blob check failed: ${name} (${res.status})`);
  rows.push({ label: p.label, person: p.person, imageUrl: blob.url, authorName: p.authorName, authorUrl: p.authorUrl });
  console.log('uploaded', p.person, blob.url);
}

if (prod) {
  const token = (await readFile('.scrape/admin.token', 'utf8')).trim();
  for (const r of rows) {
    const res = await fetch('https://www.chronopin.com/api/admin/db/PinOutcomePhoto', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinId, ...r }),
    });
    if (!res.ok) throw new Error(`prod ${r.label}: ${res.status} ${await res.text()}`);
  }
  console.log('saved to production');
} else {
  const db = await import('../../src/server/db');
  for (const r of rows) {
    await db.query(
      `INSERT INTO "PinOutcomePhoto" ("pinId","label","person","imageUrl","authorName","authorUrl") VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT ("pinId","label") DO UPDATE SET "person"=EXCLUDED."person","imageUrl"=EXCLUDED."imageUrl","authorName"=EXCLUDED."authorName","authorUrl"=EXCLUDED."authorUrl"`,
      [pinId, r.label, r.person, r.imageUrl, r.authorName, r.authorUrl],
    );
  }
  await db.closeConnection();
  console.log('saved to local database');
}
