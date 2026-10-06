// Fills src/server/data/specialtyTraditions.json with the customs people
// actually keep for a specialty day ("Baking pies" for National Pie Day),
// for every day in specialtyDays.json that has a real, commonly known way of
// being observed. Days that are just a name on a list, with no genuine
// custom behind them, are left out. Run specialty-days:traditions after this
// to translate whatever gets added.
//
//   npm run specialty-days:traditions-generate
//
// With no credit on the key, judge them by hand instead:
//
//   npm run specialty-days:traditions-generate -- --export days.json
//   npm run specialty-days:traditions-generate -- --apply answers.json
//       answers.json: [{ "day": "National Pie Day", "customs": ["Baking pies", ...] }, ...]
//       customs: [] for a day with no real, specific custom.

import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { describeError, getClient, MODEL } from '@/server/extract';

const { values: flags } = parseArgs({
  options: {
    export: { type: 'string' },
    apply: { type: 'string' },
  },
});

const DATA = path.join(import.meta.dirname, '../../src/server/data');
const days = JSON.parse(readFileSync(path.join(DATA, 'specialtyDays.json'), 'utf8')) as Record<string, string[]>;
const file = path.join(DATA, 'specialtyTraditions.json');
const traditions = JSON.parse(readFileSync(file, 'utf8')) as Record<string, string[]>;

const RUBRIC = `You know the specialty/observance days shown on a calendar: food days, novelty "National ___ Day" days, awareness days, cultural and historical days. For each day name given, decide whether there is a real, specific, commonly known way people actually celebrate or mark it — a food eaten, an activity done, a tradition followed (the kind of thing a calendar site would list as "how to celebrate"). If so, answer with 1-3 short tags (2-4 words each) naming the real things people do, in the style "Eating pie", "Tree planting", "Pirate speak", "Costumes" — specific and concrete, not vague filler like "Celebrating the day" or "Spreading awareness". If you don't know of any real, specific custom — including purely symbolic, legislative, remembrance-only, or awareness-only days with no observed activity, and days too obscure to know of any actual custom for — answer with an empty array. Never invent a custom you're not confident is real. Answer one entry per day, in the same order given.`;

function save() {
  const all = [...new Set(Object.values(days).flat())];
  const ordered = Object.fromEntries(all.filter((n) => traditions[n]).map((n) => [n, traditions[n]]));
  writeFileSync(file, `${JSON.stringify(ordered, null, 2)}\n`);
}

async function run() {
  const all = [...new Set(Object.values(days).flat())];
  const todo = all.filter((name) => !traditions[name]);
  console.log(`${todo.length} of ${all.length} specialty days need customs checked`);
  if (!todo.length) return;

  if (flags.apply) {
    const answers = JSON.parse(readFileSync(flags.apply, 'utf8')) as { day: string; customs: string[] }[];
    let added = 0;
    for (const { day, customs } of answers) {
      const cleaned = (customs ?? []).map((c) => c.trim()).filter(Boolean);
      if (cleaned.length) {
        traditions[day] = cleaned;
        added++;
      }
    }
    save();
    console.log(`applied ${added} of ${answers.length}`);
    return;
  }

  if (flags.export) {
    writeFileSync(flags.export, JSON.stringify({ rubric: RUBRIC, answer: 'A JSON array of { day, customs } for --apply, customs: [] for a day with no real custom.', days: todo }, null, 2));
    console.log(`wrote ${flags.export}`);
    return;
  }

  const anthropic = getClient();
  if (!anthropic) throw new Error('No Anthropic API key');
  const schema = {
    type: 'object',
    properties: { days: { type: 'array', items: { type: 'array', items: { type: 'string' } } } },
    required: ['days'],
    additionalProperties: false,
  };
  const BATCH = 40;
  let added = 0;
  let skipped = 0;
  for (let start = 0; start < todo.length; start += BATCH) {
    const batch = todo.slice(start, start + BATCH);
    try {
      const response = await anthropic.beta.messages
        .stream({
          model: MODEL,
          max_tokens: 8000,
          output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
          system: RUBRIC,
          messages: [{ role: 'user', content: `The ${batch.length} days, in order:\n${JSON.stringify(batch, null, 1)}` }],
        })
        .finalMessage();
      const block = response.content.find((c) => c.type === 'text');
      if (response.stop_reason !== 'end_turn' || !block || block.type !== 'text') throw new Error(`no answer (${response.stop_reason})`);
      const answer = JSON.parse(block.text) as { days: string[][] };
      if (answer.days?.length !== batch.length) {
        console.log(`  wrong count (${answer.days?.length}), batch skipped`);
        continue;
      }
      batch.forEach((name, i) => {
        const customs = (answer.days[i] ?? []).map((c) => c.trim()).filter(Boolean);
        if (customs.length) {
          traditions[name] = customs;
          added++;
        } else {
          skipped++;
        }
      });
      console.log(`  ${Math.min(start + BATCH, todo.length)}/${todo.length} (added ${added}, skipped ${skipped})`);
    } catch (err) {
      console.log(`  batch failed: ${describeError(err)}`);
    }
  }
  save();
  console.log(`done: ${added} added, ${skipped} had no real custom`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
