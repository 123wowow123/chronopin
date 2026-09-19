// Tops existing pins up to three media, at least one of them a picture (see
// src/lib/mediaTarget.ts), from the keyless sources a scrape uses
// (src/server/scrape/findImages.ts): the company's own announcement, the
// pin's dated referenced articles' lead images, then Wikipedia. Nothing here
// calls Claude.
//
//   npm run media:top-up                     list what it would add (dry run)
//   npm run media:top-up -- --apply          add it
//   npm run media:top-up -- --apply --min    only pins with no picture at all
//   npm run media:top-up -- --apply --limit 50 --offset 100
//   npm run media:top-up -- --apply --pin 123 --pin 456
//   npm run media:top-up -- --apply --delay 6   seconds between pins (default 4)
//
// Pins with no picture come first, then the pins with the fewest media.
// Wikimedia's image CDN answers 429 after a few quick downloads, so each
// download retries with a growing pause and pins are spaced out. A pin nothing
// was found for is left as it is. Then `npm run backup:data`.

import '../env';
import { parseArgs } from 'node:util';
import { mediumID } from '@/lib/appConfig';
import { picturesNeeded } from '@/lib/mediaTarget';
import * as db from '@/server/db';
import Medium from '@/server/model/medium';
import Pin from '@/server/model/pin';
import { findPinImages } from '@/server/scrape/findImages';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    min: { type: 'boolean', default: false },
    limit: { type: 'string' },
    offset: { type: 'string' },
    delay: { type: 'string' },
    pin: { type: 'string', multiple: true },
  },
});
const DELAY_MS = Number(flags.delay ?? 4) * 1000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function store(pin: Pin, image: { originalUrl: string; width?: number; height?: number }): Promise<boolean> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await new Medium({ type: mediumID.image, originalUrl: image.originalUrl, originalWidth: image.width || undefined, originalHeight: image.height || undefined }, pin).createAndSaveToCDN();
      return true;
    } catch (err) {
      const message = (err as Error).message || String(err);
      if (attempt === 4 || !/429|timeout|fetch failed|ECONN/i.test(message)) {
        console.log(`   skipped ${image.originalUrl.slice(0, 80)}: ${message.slice(0, 80)}`);
        return false;
      }
      await sleep(8000 * attempt);
    }
  }
  return false;
}

async function run() {
  const rows = await db.query<{ id: number; media: number; images: number }>(
    `SELECT p."id",
            (SELECT count(*) FROM "PinMedium" pm WHERE pm."pinId" = p."id")::int AS "media",
            (SELECT count(*) FROM "PinMedium" pm JOIN "Medium" m ON m."id" = pm."mediumId" WHERE pm."pinId" = p."id" AND m."type" = $1)::int AS "images"
       FROM "Pin" p
      WHERE p."utcDeletedDateTime" IS NULL AND ($2::integer[] IS NULL OR p."id" = ANY($2::integer[]))
      ORDER BY "images" > 0, "media", p."id"`,
    [String(mediumID.image), flags.pin ? flags.pin.map(Number) : null],
  );
  const todo = rows
    .filter((r) => picturesNeeded(r.media, r.images) > 0 && (!flags.min || r.images === 0))
    .slice(Number(flags.offset ?? 0), flags.limit ? Number(flags.offset ?? 0) + Number(flags.limit) : undefined);
  console.log(`${todo.length} pin(s) below three media${flags.min ? ' with no picture' : ''}${flags.apply ? '' : ' (dry run: add --apply)'}`);
  if (!flags.apply) return;

  let added = 0;
  let touched = 0;
  for (const row of todo) {
    const { pin } = await Pin.queryById(row.id);
    if (!pin) continue;
    const need = picturesNeeded(row.media, row.images);
    const found = await findPinImages(
      {
        title: pin.title,
        company: pin.company,
        companyWikiUrl: pin.companyWikiUrl,
        utcStartDateTime: pin.utcStartDateTime,
        references: pin.references.map((r) => ({ url: r.url, startDate: r.startDate, publishedDate: r.publishedDate })),
      },
      need,
      pin.media.map((m) => m.originalUrl!),
    ).catch((err) => {
      console.log(`pin ${row.id}: search failed - ${(err as Error).message.slice(0, 80)}`);
      return { images: [], references: [] };
    });
    let stored = 0;
    for (const image of found.images.slice(0, Math.max(need, 1))) {
      if (await store(pin, image)) stored++;
    }
    if (stored) touched++;
    added += stored;
    console.log(`pin ${row.id}: had ${row.media} media (${row.images} pictures), needed ${need}, found ${found.images.length}, added ${stored}`);
    await sleep(DELAY_MS);
  }
  console.log(`${touched} pin(s) topped up, ${added} picture(s) added`);
}

run()
  .catch((err) => {
    console.log('media:top-up failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
