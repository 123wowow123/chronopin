// Copies the cropped local pictures to real Azure (same blob names) and pushes the rows to production by URL.
import { execFileSync } from 'node:child_process';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { outcomePhotosForPin } from '../../src/server/model/pinOutcomePhoto';
import { pushOutcomePhotos } from '../../src/server/jobs/pinApi';
import * as db from '../../src/server/db';
const account = 'chronopin';
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', account, '--query', '[0].value', '-o', 'tsv'], { encoding: 'utf8' }).trim();
const container = new BlobServiceClient(`https://${account}.blob.core.windows.net`, new StorageSharedKeyCredential(account, key)).getContainerClient('thumb');
for (const id of process.argv.slice(2).map(Number)) {
  const rows = await outcomePhotosForPin(id);
  const out = [];
  for (const r of rows) {
    if (r.imageUrl.startsWith('https://chronopin.blob.core.windows.net/')) { out.push({ ...r, imageSource: null }); continue; }
    const name = r.imageUrl.split('/thumb/')[1];
    const data = Buffer.from(await (await fetch(r.imageUrl)).arrayBuffer());
    await container.getBlockBlobClient(name).uploadData(data, { blobHTTPHeaders: { blobContentType: 'image/jpeg', blobCacheControl: 'public, max-age=31536000, immutable' } });
    const url = `https://${account}.blob.core.windows.net/thumb/${name}`;
    const check = await fetch(url); if (!check.ok) throw new Error('blob check ' + name);
    out.push({ ...r, imageUrl: url, imageSource: null });
  }
  try { console.log(id, out.length, '->', await pushOutcomePhotos(id, out)); } catch (e) { console.log(id, 'FAILED', (e as Error).message); }
}
await db.closeConnection(); process.exit(0);
