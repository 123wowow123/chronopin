// Pins with references that are missing reasoning (added before 0011, or
// found by hand before this backfill), for generating it by hand when the
// app's Anthropic key has no credit.
//
//   npm run references:reasoning:list -- --batch=0 --of=10 --out=/tmp/batch-0.json

import '../env';
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { batchOf } from './select';

const { values: flags } = parseArgs({
  options: {
    batch: { type: 'string', default: '0' },
    of: { type: 'string', default: '1' },
    out: { type: 'string' },
  },
});

async function main() {
  // Pins by e2e test users are residue, not content (see scripts/data/excludeE2e.ts).
  const rows = await db.query(
    `
    SELECT "p"."id", "p"."title", "p"."description", "p"."sourceUrl", "p"."dateConfidence", "p"."dateConfidenceReasoning",
           "p"."utcStartDateTime", "p"."utcEndDateTime",
           json_agg(json_build_object(
             'id', "r"."id", 'url', "r"."url", 'title', "r"."title", 'confidence', "r"."confidence",
             'publishedDate', "r"."publishedDate", 'startDate', "r"."startDate", 'endDate', "r"."endDate"
           ) ORDER BY "r"."confidence" DESC) AS "references"
    FROM "Pin" AS "p"
    JOIN "User" AS "u" ON "u"."id" = "p"."userId"
    JOIN "PinReference" AS "r" ON "r"."pinId" = "p"."id"
    WHERE "p"."utcDeletedDateTime" IS NULL
      AND "r"."reasoning" IS NULL
      AND "u"."email" !~* '^e2e-[a-z0-9]+@example\\.com$'
    GROUP BY "p"."id"
    ORDER BY "p"."id"`,
  );
  const mine = batchOf(rows, Number(flags.batch), Number(flags.of));
  const refCount = mine.reduce((n: number, p: any) => n + p.references.length, 0);
  if (flags.out) {
    writeFileSync(flags.out, JSON.stringify(mine, null, 2));
    console.log(`${rows.length} pin(s) with unreasoned references; wrote batch ${flags.batch}/${flags.of} (${mine.length} pins, ${refCount} refs) to ${flags.out}`);
  } else {
    console.log(JSON.stringify(mine, null, 2));
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
