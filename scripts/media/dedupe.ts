// Takes the repeated pictures off pins that have them: the same poster at two
// sizes, an article's lead photo added again from its own page. New pins and
// top-ups skip these as they are found (src/server/imageHash.ts and
// src/server/model/medium.ts); this is for the pins that collected them
// before. The pin keeps the first of each repeat - the one its cards and the
// map show - and loses the later ones.
//
//   npm run media:dedupe                      list the repeats (dry run)
//   npm run media:dedupe -- --apply           remove them
//   npm run media:dedupe -- --pin 1564        one pin (repeatable)
//   npm run media:dedupe -- --distance 10     count pictures further apart as the same
//
// Read the dry run first, and widen --distance only after looking at what it
// then catches: 6 (the default) is where every pair seen was one picture, and
// by 10 two different photographs of one event are in range. Pictures are
// read from their thumbs on the CDN, so this wants the local Azurite running;
// a picture with no thumb is read from its original URL instead. Then
// `npm run backup:data`.

import '../env';
import { parseArgs } from 'node:util';
import { mediumID } from '@/lib/appConfig';
import * as db from '@/server/db';
import { hashDistance, NEAR_DUPLICATE_DISTANCE } from '@/server/imageHash';
import type Medium from '@/server/model/medium';
import { imageHashOf } from '@/server/model/medium';
import Pin from '@/server/model/pin';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    pin: { type: 'string', multiple: true },
    distance: { type: 'string' },
  },
});
const LIMIT = Number(flags.distance ?? NEAR_DUPLICATE_DISTANCE);

const label = (medium: Medium) => `${medium.id} ${medium.originalWidth ?? '?'}x${medium.originalHeight ?? '?'} ${medium.originalUrl}`;

// The pictures of one pin that repeat an earlier one, each with the picture it
// repeats and how far apart the two hashes are.
async function repeatsIn(media: Medium[]) {
  const kept: { medium: Medium; hash: string }[] = [];
  const repeats: { medium: Medium; like: Medium; distance: number }[] = [];
  for (const medium of media.filter((m) => Number(m.type) === mediumID.image)) {
    const hash = await imageHashOf(medium);
    if (!hash) {
      console.log(`   could not read ${label(medium)}`);
      continue;
    }
    const like = kept
      .map((other) => ({ ...other, distance: hashDistance(hash, other.hash) }))
      .sort((a, b) => a.distance - b.distance)
      .find((other) => other.distance <= LIMIT);
    if (like) {
      repeats.push({ medium, like: like.medium, distance: like.distance });
    } else {
      kept.push({ medium, hash });
    }
  }
  return repeats;
}

async function run() {
  const rows = await db.query<{ id: number }>(
    `SELECT p."id"
       FROM "Pin" p
       JOIN "PinMedium" pm ON pm."pinId" = p."id" AND pm."utcDeletedDateTime" IS NULL
       JOIN "Medium" m ON m."id" = pm."mediumId" AND m."type" = $1
      WHERE p."utcDeletedDateTime" IS NULL AND ($2::integer[] IS NULL OR p."id" = ANY($2::integer[]))
      GROUP BY p."id" HAVING count(*) > 1
      ORDER BY p."id"`,
    [String(mediumID.image), flags.pin ? flags.pin.map(Number) : null],
  );
  console.log(`${rows.length} pin(s) with more than one picture; the same picture is anything within ${LIMIT}${flags.apply ? '' : ' (dry run: add --apply)'}`);

  let pins = 0;
  let removed = 0;
  for (const row of rows) {
    const { pin } = await Pin.queryById(row.id);
    if (!pin) continue;
    const repeats = await repeatsIn(pin.media);
    if (!repeats.length) continue;
    pins++;
    removed += repeats.length;
    console.log(`pin ${pin.id} ${pin.title}`);
    for (const { medium, like, distance } of repeats) {
      console.log(`   ${flags.apply ? 'removing' : 'would remove'} ${label(medium)}\n     same as (${distance}) ${label(like)}`);
      if (flags.apply) await medium.deleteFromPin();
    }
  }
  console.log(`${removed} repeated picture(s) on ${pins} pin(s)${flags.apply ? ' removed' : ''}`);
}

run()
  .catch((err) => {
    console.log('media:dedupe failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
