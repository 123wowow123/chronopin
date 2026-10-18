// Translates the customs under specialty days ("Baking pies" under "National
// Pie Day"). src/server/data/specialtyTraditions.json lists them per day in
// English; specialtyTraditions.labels.json maps each to its name in the other
// languages. Run it after adding to the first; it only asks for what is missing.
//
//   npm run specialty-days:traditions

import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { LANGUAGE_NAMES } from '@/lib/i18n/config';
import { describeError, getClient, MODEL } from '@/server/extract';
import { TARGET_LOCALES, type TargetLocale } from '@/server/extract/translate';

const DATA = path.join(import.meta.dirname, '../../src/server/data');
const days = JSON.parse(readFileSync(path.join(DATA, 'specialtyTraditions.json'), 'utf8')) as Record<string, string[]>;
const file = path.join(DATA, 'specialtyTraditions.labels.json');
const labels = JSON.parse(readFileSync(file, 'utf8')) as Record<string, Partial<Record<TargetLocale, string>>>;

const SYSTEM_PROMPT = `You translate the customs people keep on a calendar day ("Baking pies", "Pirate speak", "Tree planting") into other languages, for short tags under the day's name. Write each the way a site in that language would, natural and short, not word for word. Keep proper names as commonly written in that language. Answer one translation per item, in order.`;

async function run() {
  const all = [...new Set(Object.values(days).flat())];
  const todo = all.filter((name) => TARGET_LOCALES.some((l) => !labels[name]?.[l]));
  console.log(`${todo.length} of ${all.length} customs need translating`);
  if (!todo.length) return;
  const anthropic = getClient();
  if (!anthropic) throw new Error('No Anthropic API key');
  const list = { type: 'array', items: { type: 'string' } };
  const schema = { type: 'object', properties: Object.fromEntries(TARGET_LOCALES.map((l) => [l, list])), required: [...TARGET_LOCALES], additionalProperties: false };
  const languages = TARGET_LOCALES.map((l) => `${l}: ${LANGUAGE_NAMES[l]}`).join('\n');
  for (let start = 0; start < todo.length; start += 100) {
    const batch = todo.slice(start, start + 100);
    try {
      const response = await anthropic.beta.messages
        .stream({
          model: MODEL,
          max_tokens: 32000,
          output_config: { effort: 'low', format: { type: 'json_schema', schema } },
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: `Languages, by the key to answer under:\n${languages}\n\nThe ${batch.length} customs:\n${JSON.stringify(batch, null, 1)}` }],
        })
        .finalMessage();
      const block = response.content.find((c) => c.type === 'text');
      if (response.stop_reason !== 'end_turn' || !block || block.type !== 'text') throw new Error(`no answer (${response.stop_reason})`);
      const answer = JSON.parse(block.text) as Record<TargetLocale, string[]>;
      for (const locale of TARGET_LOCALES) {
        if (answer[locale]?.length !== batch.length) {
          console.log(`  ${locale}: wrong count, skipped`);
          continue;
        }
        batch.forEach((name, i) => {
          if (answer[locale][i]?.trim()) (labels[name] ??= {})[locale] = answer[locale][i].trim();
        });
      }
    } catch (err) {
      console.log(`  failed: ${describeError(err)}`);
    }
  }
  writeFileSync(file, `${JSON.stringify(Object.fromEntries(all.filter((n) => labels[n]).map((n) => [n, labels[n]])), null, 2)}\n`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
