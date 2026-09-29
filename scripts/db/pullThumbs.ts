// Copies the thumbnails and avatars the local database uses from production's
// public `thumb` container into Azurite - the reverse of `npm run thumbs:push`.
// `npm run db:pull-prod` brings production's pins without their blobs, so
// every thumb made on production 404s locally and cards show a broken image.
// Downloads only the names Azurite lacks and never overwrites one. The prod
// container is public, so no `az login` is needed.
//
//   npm run thumbs:pull

import '../env';
import { thumbUrlPrefix } from '@/lib/appConfig';
import { createThumbContainer, uploadThumb } from '@/server/azureBlob';
import * as db from '@/server/db';

const PROD = 'https://chronopin.blob.core.windows.net/thumb/';
const CONCURRENCY = 16;

async function exists(url: string) {
  const res = await fetch(url, { method: 'HEAD' });
  return res.ok;
}

async function main() {
  if (thumbUrlPrefix.startsWith(PROD)) throw new Error('thumbUrlPrefix points at production; run this against Azurite');
  await createThumbContainer();
  const names = (
    await db.query<{ name: string }>(
      `SELECT "thumbName" AS name FROM "Medium" WHERE "thumbName" IS NOT NULL
       UNION SELECT "pictureUrl" FROM "User" WHERE "pictureUrl" LIKE 'avatar/%'`,
    )
  ).map((row) => row.name);

  let copied = 0;
  let present = 0;
  const absent: string[] = [];
  let next = 0;
  async function worker() {
    while (next < names.length) {
      const name = names[next++];
      if (await exists(thumbUrlPrefix + name)) {
        present++;
        continue;
      }
      const res = await fetch(PROD + name);
      if (!res.ok) {
        absent.push(name);
        continue;
      }
      await uploadThumb(name, Buffer.from(await res.arrayBuffer()), res.headers.get('content-type') ?? 'application/octet-stream');
      copied++;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`${names.length} in use: ${present} already local, ${copied} copied, ${absent.length} not on production either.`);
  for (const name of absent.slice(0, 20)) console.log(`  missing: ${name}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
