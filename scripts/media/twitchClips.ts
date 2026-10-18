// Gives pins about a game the most-watched Twitch clip of its category, as a
// gameplay video and as a reference (findGameClip in
// src/server/scrape/twitch.ts). Needs TWITCH_CLIENT_ID and
// TWITCH_CLIENT_SECRET in .env.local. Nothing here calls Claude.
//
//   npm run media:twitch                          list what it would add (dry run)
//   npm run media:twitch -- --apply
//   npm run media:twitch -- --category Gaming     (the default)
//   npm run media:twitch -- --apply --limit 20 --offset 40
//   npm run media:twitch -- --apply --pin 123 --pin 456
//   npm run media:twitch -- --apply --delay 1     seconds between pins (default 0.5)
//
// A pin whose title Twitch has no category for (an unreleased game, a
// sequel's number) is left as it is. Pins that already carry a Twitch clip are
// skipped. Then `npm run thumbs:push` for prod, and `npm run backup:data`.

import '../env';
import { parseArgs } from 'node:util';
import { mediumID } from '@/lib/appConfig';
import * as db from '@/server/db';
import Medium from '@/server/model/medium';
import Pin from '@/server/model/pin';
import PinReference from '@/server/model/pinReference';
import { findGameClip, twitchConfigured } from '@/server/scrape/twitch';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    category: { type: 'string', default: 'Gaming' },
    limit: { type: 'string' },
    offset: { type: 'string' },
    delay: { type: 'string' },
    pin: { type: 'string', multiple: true },
  },
});
const DELAY_MS = Number(flags.delay ?? 0.5) * 1000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  if (!twitchConfigured()) throw new Error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are not set');
  const rows = await db.query<{ id: number }>(
    `SELECT p."id"
       FROM "Pin" p
      WHERE p."utcDeletedDateTime" IS NULL
        AND ($1::integer[] IS NULL OR p."id" = ANY($1::integer[]))
        AND EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = p."id" AND t."kind" = 'category' AND t."name" = $2)
        AND NOT EXISTS (
              SELECT 1 FROM "PinMedium" pm JOIN "Medium" m ON m."id" = pm."mediumId"
               WHERE pm."pinId" = p."id" AND pm."utcDeletedDateTime" IS NULL AND m."type" = $3 AND m."originalUrl" LIKE '%clips.twitch.tv%')
      ORDER BY p."id"`,
    [flags.pin ? flags.pin.map(Number) : null, flags.category, String(mediumID.youtube)],
  );
  const from = Number(flags.offset ?? 0);
  const todo = rows.slice(from, flags.limit ? from + Number(flags.limit) : undefined);
  console.log(`${todo.length} ${flags.category} pin(s) without a Twitch clip${flags.apply ? '' : ' (dry run: add --apply)'}`);

  let found = 0;
  let added = 0;
  for (const row of todo) {
    const { pin } = await Pin.queryById(row.id);
    if (!pin) continue;
    const clip = await findGameClip({ title: pin.title, productName: pin.productName });
    if (!clip) {
      await sleep(DELAY_MS);
      continue;
    }
    found++;
    console.log(`pin ${row.id} "${pin.title.slice(0, 50)}": ${(clip.reference.title ?? '').slice(0, 90)}`);
    if (flags.apply) {
      try {
        const medium = new Medium(clip.medium, pin);
        await medium.addThumb();
        await medium.save();
        if (!(pin.references ?? []).some((r: PinReference) => r.url === clip.reference.url)) await new PinReference(clip.reference, pin).save();
        added++;
      } catch (err) {
        console.log(`   not stored: ${(err as Error).message.slice(0, 100)}`);
      }
    }
    await sleep(DELAY_MS);
  }
  console.log(`${found} clip(s) found, ${added} added`);
}

run()
  .catch((err) => {
    console.log('media:twitch failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
