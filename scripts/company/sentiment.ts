// Scores how each company pin reads as news for its company (see
// src/server/extract/pinSentiment.ts), for the graph a company search shows.
// Saving a pin scores it; this catches up on pins from before, from while the
// API key had no credit, and whose title or summary changed since. Scores are
// kept in PinSentiment, which `npm run backup:data` saves.
//
//   npm run companies:sentiment                  every pin that needs a score
//   npm run companies:sentiment -- --limit 50    at most 50 of them
//   npm run companies:sentiment -- --dry-run     count them, call nothing
//
// With no credit on the key, score them by hand instead:
//
//   npm run companies:sentiment -- --export pins.json    what needs a score, and the rubric
//   npm run companies:sentiment -- --apply scores.json   [{ "id": 12, "sentiment": 0.5 }, ...]
//
// An applied score is only saved while the pin's text is still what was
// exported, so a pin edited in between waits for the next run.

import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { clampSentiment, PIN_SENTIMENT_PROMPT, scorePinText } from '@/server/extract/pinSentiment';
import PinSentiment, { sentimentHash } from '@/server/model/pinSentiment';

const { values: flags } = parseArgs({
  options: { limit: { type: 'string' }, 'dry-run': { type: 'boolean' }, export: { type: 'string' }, apply: { type: 'string' } },
});

async function run() {
  if (flags.apply) {
    const scores = JSON.parse(readFileSync(flags.apply, 'utf8')) as { id: number; sentiment: number; textHash?: string }[];
    let saved = 0;
    for (const { id, sentiment, textHash } of scores) {
      const context = await PinSentiment.context(id);
      if (!context || typeof sentiment !== 'number' || !Number.isFinite(sentiment)) continue;
      if (textHash && textHash !== sentimentHash(context)) {
        console.log(`pin ${id}: its text changed since the export, skipped`);
        continue;
      }
      await PinSentiment.set(id, context, clampSentiment(sentiment));
      saved++;
    }
    console.log(`saved ${saved} of ${scores.length}`);
    return;
  }

  const pins = await PinSentiment.unscored(flags.limit ? Number(flags.limit) : 100_000);
  console.log(`${pins.length} pin(s) to score`);
  if (flags.export) {
    writeFileSync(
      flags.export,
      JSON.stringify(
        {
          rubric: PIN_SENTIMENT_PROMPT,
          answer: 'A JSON array of { id, sentiment, textHash } for --apply, textHash copied from the pin.',
          pins: pins.map((p) => ({ id: p.id, company: p.company, title: p.title, summary: p.description ?? '', textHash: sentimentHash(p) })),
        },
        null,
        2,
      ),
    );
    console.log(`wrote ${flags.export}`);
    return;
  }
  if (flags['dry-run']) return;

  let scored = 0;
  for (const pin of pins) {
    const sentiment = await scorePinText(pin);
    if (sentiment == null) {
      console.log(`pin ${pin.id}: not scored`);
      continue;
    }
    await PinSentiment.set(pin.id, pin, sentiment);
    scored++;
  }
  console.log(`scored ${scored} of ${pins.length}`);
}

run()
  .catch((err) => {
    console.log('companies:sentiment failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
