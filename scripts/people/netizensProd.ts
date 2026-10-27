// Sends the netizens (role 'netizen') to production: each local picture is
// uploaded to the production blob account (thumb/people/<slug>.<ext>, the key
// read with `az` as scripts/activities/photos.ts does), checked as a public
// download, and the profile is posted to POST /api/people with that URL.
//
//   npx tsx scripts/people/netizensProd.ts --token-file .scrape/admin.token [--base https://www.chronopin.com] [--dry-run]

import '../env';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { SignJWT } from 'jose';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import * as db from '@/server/db';
import Person from '@/server/model/person';

const { values: flags } = parseArgs({ options: { 'token-file': { type: 'string' }, sign: { type: 'boolean', default: false }, base: { type: 'string', default: 'https://www.chronopin.com' }, 'dry-run': { type: 'boolean', default: false } } });
if (!flags['token-file'] && !flags.sign) throw new Error('--token-file or --sign is required');
// --sign: a 1-hour admin token signed as the daily jobs sign theirs (JOBS_PROD_SESSION_SECRET).
async function bearer() {
  if (!flags.sign) return readFileSync(flags['token-file']!, 'utf8').trim();
  const [admin] = await db.query<{ id: number }>(`SELECT "id" FROM "User" WHERE "role" = 'admin' ORDER BY "id" LIMIT 1`);
  return new SignJWT({ id: admin.id, role: 'admin' }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.JOBS_PROD_SESSION_SECRET));
}
const account = 'chronopin';
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', account, '--query', '[0].value', '-o', 'tsv'], { encoding: 'utf8' }).trim();
const container = new BlobServiceClient(`https://${account}.blob.core.windows.net`, new StorageSharedKeyCredential(account, key)).getContainerClient('thumb');

(async () => {
  const headers = { Authorization: `Bearer ${await bearer()}`, 'Content-Type': 'application/json' };
  const people = await db.query<{ id: number; slug: string; name: string; photoUrl: string | null; bioguideId: string | null; govtrackId: number | null; wikidataId: string | null }>(
    `SELECT "id", "slug", "name"::text AS "name", "photoUrl", "bioguideId", "govtrackId", "wikidataId" FROM "Person" WHERE "role" = 'netizen' ORDER BY "id"`,
  );
  for (const p of people) {
    const profile = await Person.profile(p.id);
    let photoUrl = p.photoUrl;
    if (photoUrl && photoUrl.startsWith('http://127.0.0.1')) {
      const local = await fetch(photoUrl);
      const type = local.headers.get('content-type') ?? 'image/jpeg';
      const buf = Buffer.from(await local.arrayBuffer());
      const name = `people/${photoUrl.split('/people/')[1]}`;
      photoUrl = `https://${account}.blob.core.windows.net/thumb/${name}`;
      if (flags['dry-run']) { console.log(`DRY ${p.name} ${buf.length}B -> ${photoUrl}`); continue; }
      await container.getBlockBlobClient(name).uploadData(buf, { blobHTTPHeaders: { blobContentType: type, blobCacheControl: 'public, max-age=86400' } });
      const check = await fetch(photoUrl);
      if (!check.ok || (await check.arrayBuffer()).byteLength !== buf.length) throw new Error(`Blob did not verify: ${photoUrl}`);
    }
    if (flags['dry-run']) continue;
    const res = await fetch(`${flags.base}/api/people`, { method: 'POST', headers, body: JSON.stringify({ ...profile, photoUrl, bioguideId: p.bioguideId, govtrackId: p.govtrackId, wikidataId: p.wikidataId }) });
    console.log(`${p.name}: ${res.status}`);
    if (!res.ok) throw new Error(await res.text());
  }
  await db.closeConnection();
})();
