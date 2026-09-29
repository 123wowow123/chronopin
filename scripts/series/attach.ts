// Attaches a public data series to pins, so their pages draw the publisher's
// live chart with the pin's own week marked (PinSeries, 0062).
//
//   npm run series:attach -- --tag SPR --series WCSSTUS1
//   npm run series:attach -- --id 2617 --series WCSSTUS1 --label "SPR crude stocks"
//   npm run series:attach -- --tag SPR --series WCSSTUS1 --remove
//   npm run series:attach -- --series WCSSTUS1 --dry-run
//
// Only the handle is stored. The numbers are fetched from the publisher when
// someone opens the pin, so nothing here goes stale - but the series id is
// checked against the publisher before it is saved, because a pin pointing at
// a series that does not exist would show a reader an empty chart.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { getSeries, normaliseSeriesId } from '@/server/eiaSeries';
import { removeSeries, saveSeries } from '@/server/services/pinSeries';
import log from '@/server/util/log';

const { values: flags } = parseArgs({
  options: {
    tag: { type: 'string' },
    id: { type: 'string' },
    series: { type: 'string' },
    label: { type: 'string' },
    source: { type: 'string', default: 'eia' },
    remove: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
});

async function pinIds(): Promise<{ id: number; title: string }[]> {
  if (flags.id) {
    return db.query(`SELECT "id", "title" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [Number(flags.id)]);
  }
  if (flags.tag) {
    return db.query(
      `SELECT "p"."id", "p"."title" FROM "Pin" AS "p"
         JOIN "PinTag" AS "t" ON "t"."pinId" = "p"."id" AND lower("t"."name") = lower($1)
        WHERE "p"."utcDeletedDateTime" IS NULL ORDER BY "p"."utcStartDateTime", "p"."id"`,
      [flags.tag],
    );
  }
  throw new Error('Name the pins with --tag or --id.');
}

async function run() {
  if (!flags.series) throw new Error('Name the series with --series (e.g. WCSSTUS1).');
  const seriesId = normaliseSeriesId(flags.series);
  const pins = await pinIds();
  if (!pins.length) {
    log.warn('No live pins matched.');
    return;
  }

  if (!flags.remove) {
    const series = await getSeries(seriesId);
    if (!series) throw new Error(`${seriesId} did not answer; not attaching a series a reader cannot see.`);
    log.info(`${seriesId}: ${series.title ?? '(untitled)'} - ${series.points.length} points, ${series.units ?? 'unknown units'}, latest ${series.points.at(-1)?.day}`);
  }

  for (const pin of pins) {
    console.log(`  ${flags.remove ? 'remove' : 'attach'} ${seriesId} ${pin.id} ${pin.title.slice(0, 56)}`);
    if (flags['dry-run']) continue;
    if (flags.remove) {
      await removeSeries(pin.id, seriesId, flags.source);
    } else {
      await saveSeries(pin.id, { source: flags.source, seriesId, label: flags.label ?? null });
    }
  }
  log.success(`${flags['dry-run'] ? 'Would have changed' : 'Changed'} ${pins.length} pin(s).`);
}

run()
  .catch((err) => {
    log.error('series:attach failed:', (err as Error).message);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
