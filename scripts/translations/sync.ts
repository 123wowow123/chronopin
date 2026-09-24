// Translates pins into the site's other languages (src/server/extract/translate.ts)
// where a translation is missing or older than the pin's last edit. Saving a
// pin translates it; this catches up on pins from before, or from while the
// API key had no credit. Translations are saved in PinTranslation, so
// `npm run backup:data` keeps them.
//
//   npm run translations:sync                   every pin that needs it
//   npm run translations:sync -- --locale zh    only into Chinese (comma list)
//   npm run translations:sync -- --limit 50     at most 50 pins
//   npm run translations:sync -- --pin 123      one pin
//   npm run translations:sync -- --force        redo even current translations (with --pin)
//   npm run translations:sync -- --dry-run      count them, call nothing
//
// Without credit, by hand: --export writes the pins' words to translate to a
// file, each with the sourceHash of the words it was given, and --apply reads
// the translations back, skipping any whose pin was edited since (services/
// translations.ts applyTranslations; POST /api/admin/translations does the
// same on a server).
//
//   npm run translations:sync -- --export /tmp/todo.json --locale zh --limit 20
//   npm run translations:sync -- --apply /tmp/done.json
//
// The --apply file is [{ "pinId": 1, "locale": "es", "sourceHash": "...", "title": "...", "description": "...", ... }].
// Each pin is one Claude call for all its languages.

import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { TARGET_LOCALES, type TargetLocale } from '@/server/extract/translate';
import { applyTranslations, pinsToTranslate, translatePin, type TranslationInput } from '@/server/services/translations';

const { values: flags } = parseArgs({
  options: {
    locale: { type: 'string' },
    limit: { type: 'string' },
    pin: { type: 'string' },
    force: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    export: { type: 'string' },
    apply: { type: 'string' },
  },
});

function localesFlag(): TargetLocale[] {
  if (!flags.locale) return [...TARGET_LOCALES];
  const asked = flags.locale.split(',').map((l) => l.trim());
  const bad = asked.filter((l) => !(TARGET_LOCALES as readonly string[]).includes(l));
  if (bad.length) throw new Error(`--locale takes ${TARGET_LOCALES.join(', ')}; not ${bad.join(', ')}`);
  return TARGET_LOCALES.filter((l) => asked.includes(l));
}

async function apply(file: string) {
  const rows = JSON.parse(readFileSync(file, 'utf8')) as TranslationInput[];
  const { saved, skipped } = await applyTranslations(rows);
  for (const s of skipped) console.log(`skipped pin ${s.pinId} ${s.locale}: ${s.reason}`);
  console.log(`saved ${saved} of ${rows.length} translation(s)`);
}

async function run() {
  if (flags.apply) return apply(flags.apply);

  const locales = localesFlag();
  const limit = flags.limit ? Number(flags.limit) : 100_000;
  const pins = flags.pin ? [] : await pinsToTranslate(locales, { limit });
  const ids = flags.pin ? [Number(flags.pin)] : pins.map((p) => p.id);
  console.log(`${ids.length} pin(s) to translate into ${locales.join(', ')}`);
  if (flags['dry-run']) return;

  if (flags.export) {
    writeFileSync(flags.export, JSON.stringify({ locales, pins }, null, 2));
    console.log(`wrote ${flags.export}`);
    return;
  }

  let done = 0;
  for (const id of ids) {
    const saved = await translatePin(id, { force: !!flags.force, locales });
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
