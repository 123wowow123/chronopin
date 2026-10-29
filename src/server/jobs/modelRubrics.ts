// The AI model release pins that lack their rubric or spec tables: read by the
// jobs' model_rubric_gaps tool (./tools.ts) for the modelRubrics task
// (docs/okf/scraping/daily-jobs.md#modelrubrics).
//
// A language-model pin carries PinLlmPerf (0213), an AI video model pin
// PinVideoPerf (0212), both with sourced charts/tables (PinPerf) and media,
// and each rubric with independent
// reviews. A new model pin has none of them the day it is saved; this finds it.
// Strategy: docs/okf/scraping/strategy.md ("Language model rubric", "Video model
// rubric").

import * as db from '../db';
import { perfForPin } from '../model/pinPerf';
import { perfProblem } from '@/lib/pinPerf';

import { rubricKind, type RubricKind } from '@/lib/modelRubricKind';
export type RubricGap = { pinId: number; title: string; kind: RubricKind; start: string; needs: ('rubric' | 'tables' | 'media')[]; author: string | null };

export async function modelRubricGaps(limit = 5, skip: number[] = []): Promise<{ gaps: RubricGap[]; remaining: number }> {
  const rows = await db.query<{ id: number; title: string; start: Date; author: string | null; hasLlm: boolean; hasVideo: boolean; hasTables: boolean; hasImage: boolean; predicted: boolean }>(
    `SELECT p."id", p."title", p."utcStartDateTime" AS "start", u."userName" AS "author",
       EXISTS (SELECT 1 FROM "PinLlmPerf" x WHERE x."pinId" = p."id") AS "hasLlm",
       EXISTS (SELECT 1 FROM "PinVideoPerf" x WHERE x."pinId" = p."id") AS "hasVideo",
       EXISTS (SELECT 1 FROM "PinPerf" x WHERE x."pinId" = p."id"
         AND (jsonb_array_length(x."charts") > 0 OR jsonb_array_length(x."tables") > 0)) AS "hasTables",
       EXISTS (SELECT 1 FROM "PinMedium" pm JOIN "Medium" m ON m."id" = pm."mediumId"
         WHERE pm."pinId" = p."id" AND pm."utcDeletedDateTime" IS NULL
           AND m."type" = '1') AS "hasImage",
       EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = p."id" AND t."name" = 'Predicted') AS "predicted"
     FROM "Pin" p LEFT JOIN "User" u ON u."id" = p."userId"
     WHERE p."utcDeletedDateTime" IS NULL AND p."utcStartDateTime" <= now()
       AND EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = p."id" AND t."name" = 'AI Models')
     ORDER BY p."utcStartDateTime" DESC`,
  );
  const gaps: RubricGap[] = [];
  for (const row of rows) {
    const kind = rubricKind(row.title);
    if (!kind || row.predicted || skip.includes(row.id)) continue;
    const needs: RubricGap['needs'] = [];
    if (kind === 'llm' ? !row.hasLlm : !row.hasVideo) needs.push('rubric');
    if (!row.hasTables) needs.push('tables');
    if (!row.hasImage) needs.push('media');
    if (needs.length) gaps.push({ pinId: row.id, title: row.title, kind, start: row.start.toISOString().slice(0, 10), needs, author: row.author });
  }
  return { gaps: gaps.slice(0, limit), remaining: Math.max(0, gaps.length - limit) };
}

// Each collection replaces only itself. A table-only update must never erase
// benchmark graphs (or a chart-only update the existing specifications).
export async function modelPerformanceUpdate(pinId: number, input: { charts?: unknown; tables?: unknown }) {
  if (input.charts === undefined && input.tables === undefined) throw new Error('Send charts or tables');
  for (const blocks of [input.charts, input.tables]) {
    if (Array.isArray(blocks) && blocks.some((block) => !/^https:\/\/\S+$/i.test(block?.sourceUrl ?? ''))) {
      throw new Error('Every model chart and table needs its opened HTTPS sourceUrl');
    }
  }
  const current = await perfForPin(pinId);
  const parsed = perfProblem({ charts: input.charts ?? current?.charts ?? [], tables: input.tables ?? current?.tables ?? [] });
  if (typeof parsed === 'string') throw new Error(parsed);
  return parsed;
}
