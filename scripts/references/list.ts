// Pins that still have fewer than --below stored references, for backfilling
// references by hand (e.g. when the app's Anthropic key has no credit).
//
//   npm run references:list -- --below=2 --batch=0 --of=8 --out=/tmp/batch-0.json

import '../env';
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { batchOf } from './select';

const { values: flags } = parseArgs({
  options: {
    below: { type: 'string', default: '2' },
    batch: { type: 'string', default: '0' },
    of: { type: 'string', default: '1' },
    out: { type: 'string' },
  },
});

async function main() {
  // Pins by e2e test users are residue, not content (see scripts/data/excludeE2e.ts).
  const rows = await db.query(
    `
    SELECT "p"."id", "p"."title", "p"."description", "p"."sourceUrl", "p"."dateConfidence",
           "p"."utcStartDateTime", "p"."utcEndDateTime",
           COALESCE(json_agg(json_build_object('url', "r"."url", 'confidence', "r"."confidence"))
                    FILTER (WHERE "r"."id" IS NOT NULL), '[]') AS "references"
    FROM "Pin" AS "p"
    LEFT JOIN "User" AS "u" ON "u"."id" = "p"."userId"
    LEFT JOIN "PinReference" AS "r" ON "r"."pinId" = "p"."id"
    WHERE "p"."utcDeletedDateTime" IS NULL
      AND COALESCE("u"."email", '') !~* '^e2e-[a-z0-9]+@example\\.com$'
    GROUP BY "p"."id"
    HAVING COUNT("r"."id") < $1
    ORDER BY "p"."id"`,
    [Number(flags.below)],
  );
  const mine = batchOf(rows, Number(flags.batch), Number(flags.of));
  if (flags.out) {
    writeFileSync(flags.out, JSON.stringify(mine, null, 2));
    console.log(`${rows.length} pin(s) below ${flags.below} references; wrote batch ${flags.batch}/${flags.of} (${mine.length}) to ${flags.out}`);
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
