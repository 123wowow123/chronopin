// Translates pins into the site's other languages (src/server/extract/translate.ts)
// where a translation is missing or older than the pin's last edit. Saving a
// pin translates it; this catches up on pins from before, or from while the
// API key had no credit. Translations are saved in PinTranslation, so
// `npm run backup:data` keeps them.
//
//   npm run translations:sync                   every pin that needs it
//   npm run translations:sync -- --limit 50     at most 50 pins
//   npm run translations:sync -- --pin 123      one pin
//   npm run translations:sync -- --force        redo even current translations (with --pin)
//   npm run translations:sync -- --dry-run      count them, call nothing
//
// Without credit, by hand: --export writes the pins' words to translate to a
// file, and --apply reads the translations back, each checked against the pin
// as it is now.
//
//   npm run translations:sync -- --export /tmp/todo.json --limit 20
//   npm run translations:sync -- --apply /tmp/done.json
//
// The --apply file is [{ "pinId": 1, "locale": "es", "title": "...", "description": "...", ... }].
// Each pin is one Claude call for all languages.

import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { isLocale } from '@/lib/i18n/config';
import * as db from '@/server/db';
import { TARGET_LOCALES } from '@/server/extract/translate';
import PinTranslation, { sourceHash, TRANSLATED_FIELDS, type PinText } from '@/server/model/pinTranslation';
import { translatePin } from '@/server/services/translations';

const { values: flags } = parseArgs({
  options: {
    limit: { type: 'string' },
    pin: { type: 'string' },
    force: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    export: { type: 'string' },
    apply: { type: 'string' },
  },
});

type PinRow = PinText & { id: number };

async function pinText(ids: number[]): Promise<PinRow[]> {
  return db.query<PinRow>(
    `SELECT "id", "title", "description", "longFormSummary", "dateConfidenceReasoning", "delayReasoning" FROM "Pin" WHERE "id" = ANY($1::int[]) AND "utcDeletedDateTime" IS NULL ORDER BY "id"`,
    [ids],
  );
}

async function apply(file: string) {
  const rows = JSON.parse(readFileSync(file, 'utf8')) as (PinText & { pinId: number; locale: string })[];
  const pins = new Map((await pinText([...new Set(rows.map((r) => r.pinId))])).map((p) => [p.id, p]));
  let saved = 0;
  for (const row of rows) {
    const pin = pins.get(row.pinId);
    if (!pin || !isLocale(row.locale) || row.locale === 'en' || !row.title?.trim()) {
      console.log(`skipped pin ${row.pinId} ${row.locale}: no such pin, language or title`);
      continue;
    }
    // Fields the pin does not have stay empty, as the Claude path leaves them.
    const text: PinText = { title: row.title.trim() };
    for (const field of TRANSLATED_FIELDS) if (field !== 'title') text[field] = pin[field] ? row[field] || null : null;
    await PinTranslation.save(pin.id, row.locale, text, sourceHash(pin));
    saved++;
  }
  console.log(`saved ${saved} of ${rows.length} translation(s)`);
}

async function run() {
  if (flags.apply) return apply(flags.apply);

  const limit = flags.limit ? Number(flags.limit) : 100_000;
  const ids = flags.pin ? [Number(flags.pin)] : await PinTranslation.stale(TARGET_LOCALES, limit);
  console.log(`${ids.length} pin(s) to translate into ${TARGET_LOCALES.join(', ')}`);
  if (flags['dry-run']) return;

  if (flags.export) {
    writeFileSync(flags.export, JSON.stringify({ locales: TARGET_LOCALES, pins: await pinText(ids) }, null, 2));
    console.log(`wrote ${flags.export}`);
    return;
  }

  let done = 0;
  for (const id of ids) {
    const saved = await translatePin(id, { force: !!flags.force });
    if (saved) done++;
    console.log(`pin ${id}: ${saved ? `${saved} language(s)` : 'not translated'}`);
  }
  console.log(`translated ${done} of ${ids.length}`);
}

run()
  .catch((err) => {
    console.log('translations:sync failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
