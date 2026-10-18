// Makes the small copy (`s/<name>`) of every Medium thumb that lacks one, in
// whichever storage AZURE_STORAGE_CONNECTION_STRING points at. New thumbs get
// theirs when saved (src/server/image.ts saveThumb); this fills in the rest.
// Reads each full thumb from thumbUrlPrefix, never overwrites a small copy.
//
//   npm run thumbs:small

import '../env';
import { smallThumbName, thumbUrlPrefix } from '@/lib/appConfig';
import { createThumbContainer } from '@/server/azureBlob';
import { uploadSmallThumb } from '@/server/image';
import * as db from '@/server/db';

const CONCURRENCY = 8;

async function retry<T>(job: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await job();
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
}

async function main() {
  await createThumbContainer();
  const names = (await db.query<{ name: string }>(`SELECT DISTINCT "thumbName" AS name FROM "Medium" WHERE "thumbName" IS NOT NULL`)).map(
    (row) => row.name,
  );
  let made = 0;
  let present = 0;
  const failed: string[] = [];
  let next = 0;
  async function worker() {
    while (next < names.length) {
      const name = names[next++];
      try {
        if ((await retry(() => fetch(thumbUrlPrefix + smallThumbName(name), { method: 'HEAD' }))).ok) {
          present++;
          continue;
        }
        const buffer = await retry(async () => {
          const res = await fetch(thumbUrlPrefix + name);
          if (!res.ok) throw new Error(`full thumb ${res.status}`);
          return Buffer.from(await res.arrayBuffer());
        });
        await retry(() => uploadSmallThumb(name, buffer));
        made++;
      } catch (err) {
        failed.push(name);
        console.error(`  failed: ${name}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`${names.length} thumbs: ${present} already small, ${made} made, ${failed.length} failed.`);
  if (failed.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
