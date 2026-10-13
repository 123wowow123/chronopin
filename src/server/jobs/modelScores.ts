// The AI model pins whose arena score is still missing, and the ones that got
// one since: read by the jobs' model_scores tool (./tools.ts) for the
// modelScores task (docs/okf/scraping/daily-jobs.md#modelscores).
//
// A model is priced on OpenRouter the day it ships but LMArena scores it days
// or weeks later, and the pin's cost/quality chart shows it as "awaiting"
// until then (src/server/modelChart.ts). The chart reads both sources live, so
// the dot appears on its own; what does not happen on its own is the
// "Frontier Model" tag, which is only added when a pin is created. A model
// scored later is tagged here, so the tag follows the score.

import { FRONTIER_TAG } from '@/lib/modelChart';
import * as db from '../db';
import { buildModelChart, modelPinIndex, readModelUniverse, unscoredFor } from '../modelChart';

export type AwaitingScore = { pinId: number; title: string; model: string; price: number; year: number; daysWaiting: number };
export type NeedsFrontierTag = { pinId: number; title: string; models: string[]; userTags: string[] };

// Fresh from both sources, not the hour's cache: this is the check itself.
export async function modelScores(): Promise<{ arenaPublishedOn: string | null; awaiting: AwaitingScore[]; needsFrontierTag: NeedsFrontierTag[]; scoredModels: number }> {
  const [universe, pins] = await Promise.all([readModelUniverse(), modelPinIndex()]);
  if (!universe.points.length) throw new Error('the arena returned no scores; nothing was checked');

  const rows = await db.query<{ id: number; title: string; start: Date; tags: string[]; frontier: boolean }>(
    `SELECT p."id", p."title", p."utcStartDateTime" AS "start",
       COALESCE((SELECT array_agg(t."name"::text) FROM "PinTag" t WHERE t."pinId" = p."id" AND t."source" = 'user'), '{}') AS "tags",
       EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = p."id" AND t."name" = $2) AS "frontier"
     FROM "Pin" p WHERE p."id" = ANY($1::int[]) AND p."utcDeletedDateTime" IS NULL`,
    [pins.map((pin) => pin.id), FRONTIER_TAG],
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  const now = Date.now();

  const awaiting: AwaitingScore[] = [];
  for (const pin of pins) {
    const row = byId.get(pin.id);
    if (!row) continue;
    const u = unscoredFor(universe, pin.title);
    if (!u) continue;
    awaiting.push({ pinId: pin.id, title: pin.title, model: u.name, price: u.price, year: u.year, daysWaiting: Math.max(0, Math.floor((now - row.start.getTime()) / 86_400_000)) });
  }
  awaiting.sort((a, b) => b.daysWaiting - a.daysWaiting);

  const frontier = new Map<number, string[]>();
  for (const p of buildModelChart(universe, null, pins).points) {
    if (p.frontier && p.pinId != null) frontier.set(p.pinId, [...(frontier.get(p.pinId) ?? []), `${p.name} (${p.year})`]);
  }
  const needsFrontierTag: NeedsFrontierTag[] = [];
  for (const [pinId, models] of frontier) {
    const row = byId.get(pinId);
    if (row && !row.frontier) needsFrontierTag.push({ pinId, title: row.title, models, userTags: row.tags });
  }

  return { arenaPublishedOn: universe.publishedOn, awaiting, needsFrontierTag, scoredModels: universe.points.length };
}
