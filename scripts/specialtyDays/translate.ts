// Names the specialty days ("National Peanut Day") in the site's other
// languages: src/server/data/specialtyDays.<locale>.json maps each English
// name in specialtyDays.json to its own, and a name a language lacks shows in
// English (src/server/specialtyDays.ts). Run it after `specialty-days:build`
// adds names; it only asks for the ones missing.
//
//   npm run specialty-days:translate                  every missing name, every language
//   npm run specialty-days:translate -- --locale zh   only Chinese (comma list)
//   npm run specialty-days:translate -- --limit 100   at most 100 names
//   npm run specialty-days:translate -- --dry-run     count them, call nothing
//
// Without credit, by hand: --export writes the missing names, and --apply
// reads back { "<locale>": { "<English name>": "<name>" } }, keeping only
// names specialtyDays.json has.
//
//   npm run specialty-days:translate -- --export /tmp/days.json --locale zh
//   npm run specialty-days:translate -- --apply /tmp/days-zh.json

import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import type Anthropic from '@anthropic-ai/sdk';
import { LANGUAGE_NAMES } from '@/lib/i18n/config';
import { describeError, getClient, MODEL } from '@/server/extract';
import { TARGET_LOCALES, type TargetLocale } from '@/server/extract/translate';
import { hasWords } from '@/server/model/pinTranslation';

const DATA = path.join(import.meta.dirname, '../../src/server/data');
// Names per request: enough to keep the run to a few dozen calls, few enough
// that a lost answer costs little.
const BATCH = 150;

const { values: flags } = parseArgs({
  options: {
    locale: { type: 'string' },
    limit: { type: 'string' },
    'dry-run': { type: 'boolean' },
    export: { type: 'string' },
    apply: { type: 'string' },
  },
});

const SYSTEM_PROMPT = `You translate the names of specialty days - the "National Peanut Day", "World Kindness Day" and "Festival of Latest Novelties" observances on a calendar site - for its readers in other languages. Each name is shown as a short tag on the date.

- Write each name the way a site in that language would name the day: natural and short, not word for word.
- Use the established name where the day has one in that language (World Health Day, Halloween).
- Keep the words that make the day what it is: "National" (the United States), "International", "World", the food or thing it celebrates.
- Keep proper names, brands and titles as they are commonly written in that language.
- A part in parentheses (the country that keeps the day) is translated too and kept in parentheses.
- Answer with one translation per name, in the order given.`;

function localesFlag(): TargetLocale[] {
  if (!flags.locale) return [...TARGET_LOCALES];
  const asked = flags.locale.split(',').map((l) => l.trim());
  const bad = asked.filter((l) => !(TARGET_LOCALES as readonly string[]).includes(l));
  if (bad.length) throw new Error(`--locale takes ${TARGET_LOCALES.join(', ')}; not ${bad.join(', ')}`);
  return TARGET_LOCALES.filter((l) => asked.includes(l));
}

// Every English name, in date order, once.
function englishNames(): string[] {
  const days = JSON.parse(readFileSync(path.join(DATA, 'specialtyDays.json'), 'utf8')) as Record<string, string[]>;
  return [...new Set(Object.values(days).flat())];
}

function labelsFile(locale: TargetLocale): string {
  return path.join(DATA, `specialtyDays.${locale}.json`);
}

function readLabels(locale: TargetLocale): Record<string, string> {
  return JSON.parse(readFileSync(labelsFile(locale), 'utf8')) as Record<string, string>;
}

// Written in the English file's order, so a rebuild's diff shows only what changed.
function writeLabels(locale: TargetLocale, labels: Record<string, string>, names: string[]) {
  const ordered = Object.fromEntries(names.filter((name) => hasWords(labels[name])).map((name) => [name, labels[name].trim()]));
  writeFileSync(labelsFile(locale), `${JSON.stringify(ordered, null, 2)}\n`);
}

function missingNames(locales: TargetLocale[], names: string[]): Map<TargetLocale, string[]> {
  return new Map(
    locales.map((locale) => {
      const labels = readLabels(locale);
      return [locale, names.filter((name) => !hasWords(labels[name]))];
    }),
  );
}

async function translateBatch(anthropic: Anthropic, names: string[], locales: TargetLocale[]): Promise<Partial<Record<TargetLocale, string[]>> | null> {
  const list = { type: 'array', items: { type: 'string' } };
  const schema = { type: 'object', properties: Object.fromEntries(locales.map((l) => [l, list])), required: [...locales], additionalProperties: false };
  const languages = locales.map((l) => `${l}: ${LANGUAGE_NAMES[l]}`).join('\n');
  try {
    const response = await anthropic.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 32000,
        output_config: { effort: 'low', format: { type: 'json_schema', schema } },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Languages, by the key to answer under:\n${languages}\n\nThe ${names.length} names:\n${JSON.stringify(names, null, 1)}` }],
      })
      .finalMessage();
    const block = response.content.find((c): c is Anthropic.Beta.BetaTextBlock => c.type === 'text');
    if (response.stop_reason !== 'end_turn' || !block) {
      console.log(`  no answer (${response.stop_reason})`);
      return null;
    }
    return JSON.parse(block.text) as Partial<Record<TargetLocale, string[]>>;
  } catch (err) {
    console.log(`  failed: ${describeError(err)}`);
    return null;
  }
}

function apply(file: string, names: string[]) {
  const given = JSON.parse(readFileSync(file, 'utf8')) as Partial<Record<TargetLocale, Record<string, string>>>;
  const known = new Set(names);
  for (const locale of TARGET_LOCALES) {
    const rows = given[locale];
    if (!rows) continue;
    const labels = readLabels(locale);
    let saved = 0;
    for (const [name, label] of Object.entries(rows)) {
      if (!known.has(name) || !hasWords(label)) continue;
      labels[name] = label;
      saved++;
    }
    writeLabels(locale, labels, names);
    console.log(`${locale}: saved ${saved} of ${Object.keys(rows).length}`);
  }
}

async function run() {
  const names = englishNames();
  if (flags.apply) return apply(flags.apply, names);

  const locales = localesFlag();
  const limit = flags.limit ? Number(flags.limit) : Infinity;
  const missing = missingNames(locales, names);
  for (const [locale, list] of missing) console.log(`${locale}: ${list.length} of ${names.length} names missing`);
  // Every name some language still needs, in date order.
  const wanted = names.filter((name) => [...missing.values()].some((list) => list.includes(name))).slice(0, limit);
  if (flags['dry-run'] || !wanted.length) return;

  if (flags.export) {
    writeFileSync(flags.export, JSON.stringify({ locales, names: wanted }, null, 2));
    console.log(`wrote ${wanted.length} name(s) to ${flags.export}`);
    return;
  }

  const anthropic = getClient();
  if (!anthropic) throw new Error('No Anthropic API key: use --export and --apply');
  for (let start = 0; start < wanted.length; start += BATCH) {
    const batch = wanted.slice(start, start + BATCH);
    const asked = locales.filter((l) => batch.some((name) => missing.get(l)!.includes(name)));
    console.log(`names ${start + 1}-${start + batch.length} of ${wanted.length} into ${asked.join(', ')}`);
    const answer = await translateBatch(anthropic, batch, asked);
    if (!answer) continue;
    for (const locale of asked) {
      const out = answer[locale];
      // Lined up by position, so a list of another length cannot be trusted.
      if (!out || out.length !== batch.length) {
        console.log(`  ${locale}: ${out?.length ?? 0} answers for ${batch.length} names, skipped`);
        continue;
      }
      const labels = readLabels(locale);
      batch.forEach((name, i) => {
        if (hasWords(out[i])) labels[name] = out[i];
      });
      writeLabels(locale, labels, names);
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
