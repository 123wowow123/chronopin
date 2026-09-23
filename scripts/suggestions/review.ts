// Reviews suggestions left on pins that have not been reviewed yet (see
// src/server/services/suggestions.ts). Posting a suggestion reviews it once
// the response is out; this catches up on the ones from while the API key had
// no credit, the server restarted mid-review, or a review failed.
//
//   npm run suggestions:review                    every open suggestion
//   npm run suggestions:review -- --id 12         just that one
//   npm run suggestions:review -- --limit 5       at most 5 of them
//   npm run suggestions:review -- --retry-failed  those out of tries too
//   npm run suggestions:review -- --dry-run       list them, call nothing
//
// Without credit, a Claude Code session can do the review by hand:
//
//   npm run suggestions:review -- --export /tmp/suggestions.json
//     each open suggestion as {id, system, schema, input}: the same prompt,
//     record schema and pin context the API call gets
//   npm run suggestions:review -- --apply /tmp/reviews.json
//     [{id, verdict, verdictReasoning, references: [...]}], each in the
//     record schema; only put in references to pages you actually fetched
//
// Applying adds the kept references to the pin (credited to whoever suggested
// them, dates moved as the form would, the author notified) and records the
// verdict on the suggestion.

import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { urlKey } from '@/lib/citations';
import * as db from '@/server/db';
import type { FoundReference } from '@/server/extract/references';
import { cleanReview, suggestionTask } from '@/server/extract/suggestion';
import AiFeedback from '@/server/model/aiFeedback';
import Pin from '@/server/model/pin';
import { applyReview, reviewFeedback, reviewInput } from '@/server/services/suggestions';
import { refreshPin } from '@/server/services/sourceWiki';

const { values: flags } = parseArgs({
  options: {
    id: { type: 'string' },
    limit: { type: 'string' },
    'retry-failed': { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    export: { type: 'string' },
    apply: { type: 'string' },
  },
});

async function openIds() {
  if (flags.id) return [Number(flags.id)];
  return AiFeedback.openIds({ limit: flags.limit ? Number(flags.limit) : 100_000, retryFailed: !!flags['retry-failed'] });
}

// Added references rebuild the pin's wikis and summary off the update event,
// which a script would otherwise exit under. The rebuild runs one at a time
// per pin, so this waits for that one and then finds nothing left to do.
async function settleWiki(id: number, outcome: string) {
  if (outcome !== 'applied') return;
  const feedback = await AiFeedback.byId(id);
  if (feedback) await refreshPin(Number(feedback.pinId));
}

async function exportTasks(file: string) {
  const tasks = [];
  for (const id of await openIds()) {
    const feedback = await AiFeedback.byId(id);
    const { pin } = feedback ? await Pin.queryById(feedback.pinId) : { pin: undefined };
    if (!feedback || !pin) continue;
    tasks.push({ id, pinId: pin.id, ...suggestionTask(reviewInput(pin, feedback)) });
  }
  // A file, not stdout: closing the pool prints there.
  writeFileSync(file, JSON.stringify(tasks, null, 2));
  console.log(`${tasks.length} open suggestion(s) written to ${file}`);
}

async function applyFile(file: string) {
  const reviews: { id: number; verdict: string; verdictReasoning: string; references?: FoundReference[] }[] = JSON.parse(readFileSync(file, 'utf8'));
  for (const recorded of reviews) {
    const feedback = await AiFeedback.byId(Number(recorded.id));
    const { pin } = feedback ? await Pin.queryById(feedback.pinId) : { pin: undefined };
    if (!feedback || !pin) {
      console.log(`suggestion ${recorded.id}: not found`);
      continue;
    }
    // By hand there is no search result to check a URL against: the session
    // vouches it fetched each one.
    const seen = new Set((recorded.references || []).map((r) => urlKey(r.url)).filter((key): key is string => !!key));
    const review = { ...cleanReview(recorded, seen, pin.sourceUrl || ''), model: 'claude-code (by hand)' };
    const outcome = await applyReview(feedback, review);
    console.log(`suggestion ${recorded.id} (pin ${pin.id}): ${outcome}, ${review.verdict}`);
    await settleWiki(feedback.id, outcome);
  }
}

async function run() {
  if (flags.export) return exportTasks(flags.export);
  if (flags.apply) return applyFile(flags.apply);

  const ids = await openIds();
  console.log(`${ids.length} open suggestion(s)`);
  if (flags['dry-run']) return;
  const counts: Record<string, number> = {};
  for (const id of ids) {
    const outcome = await reviewFeedback(id);
    counts[outcome] = (counts[outcome] || 0) + 1;
    console.log(`suggestion ${id}: ${outcome}`);
    await settleWiki(id, outcome);
    // Out of credit for one is out of credit for all.
    if (outcome === 'unavailable') break;
  }
  console.log(counts);
}

run()
  .catch((err) => {
    console.log('suggestions:review failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
