// Copies the thumbnails (and their small `s/` copies) and avatars the local database uses from production's
// public `thumb` container into Azurite - the reverse of `npm run thumbs:push`.
// `npm run db:pull-prod` brings production's pins without their blobs, so
// every thumb made on production 404s locally and cards show a broken image.
// Downloads only the names Azurite lacks and never overwrites one. The prod
// container is public, so no `az login` is needed.
//
//   npm run thumbs:pull
//   npm run thumbs:pull -- --restaurants

import '../env';
import { parseArgs } from 'node:util';
import { thumbUrlPrefix } from '@/lib/appConfig';
import { createThumbContainer, uploadThumb } from '@/server/azureBlob';
import * as db from '@/server/db';

const PROD = 'https://chronopin.blob.core.windows.net/thumb/';
const CONCURRENCY = 16;
const { values } = parseArgs({ options: { restaurants: { type: 'boolean', default: false } } });

// A reset connection on one of 14k requests must not end the run: retry with a growing pause.
async function retry<T>(job: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await job();
    } catch (err) {
      if (attempt === 5) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
}

async function exists(url: string) {
  const res = await retry(() => fetch(url, { method: 'HEAD' }));
  return res.ok;
}

async function main() {
  if (thumbUrlPrefix.startsWith(PROD)) throw new Error('thumbUrlPrefix points at production; run this against Azurite');
  await createThumbContainer();
  const rows = values.restaurants
    ? await db.query<{ name: string }>(
      `SELECT DISTINCT "m"."thumbName" AS name FROM "Medium" AS "m"
       JOIN "PinMedium" AS "pm" ON "pm"."mediumId" = "m"."id"
       JOIN "Pin" AS "p" ON "p"."id" = "pm"."pinId"
       WHERE "m"."thumbName" IS NOT NULL AND "p"."utcDeletedDateTime" IS NULL
         AND EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id"
           AND "t"."name" IN ('Restaurant', 'Restaurant Opening', 'Top Restaurants'))`,
    )
    : await db.query<{ name: string }>(
      `SELECT "thumbName" AS name FROM "Medium" WHERE "thumbName" IS NOT NULL
       UNION SELECT 's/' || "thumbName" FROM "Medium" WHERE "thumbName" IS NOT NULL
       UNION SELECT "pictureUrl" FROM "User" WHERE "pictureUrl" LIKE 'avatar/%'`,
    );
  // Public assets and full URLs are served directly, not from the blob store.
  const names = [...new Set(rows.flatMap(({ name }) => {
    if (name.startsWith('/') || /^https?:\/\//i.test(name)) return [];
    return values.restaurants ? [name, `s/${name}`] : [name];
  }))];

  let copied = 0;
  let present = 0;
  const absent: string[] = [];
  const failed: string[] = [];
  let next = 0;
  async function worker() {
    while (next < names.length) {
      const name = names[next++];
      try {
        if (await exists(thumbUrlPrefix + name)) {
          present++;
          continue;
        }
        const got = await retry(async () => {
          const res = await fetch(PROD + name);
          return { type: res.headers.get('content-type'), body: res.ok ? Buffer.from(await res.arrayBuffer()) : null };
        });
        const { body } = got;
        if (!body) {
          absent.push(name);
          continue;
        }
        await retry(() => uploadThumb(name, body, got.type ?? 'application/octet-stream'));
        copied++;
      } catch (err) {
        failed.push(name);
        console.error(`  failed: ${name}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`${names.length} in use: ${present} already local, ${copied} copied, ${absent.length} not on production either, ${failed.length} failed.`);
  if (failed.length) process.exitCode = 1;
  for (const name of absent.slice(0, 20)) console.log(`  missing: ${name}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
