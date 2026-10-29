// A video game pin's rubric (PinGamePerf, 0229): seven scores (null where an
// axis does not apply) with the sentence they rest on and the release year
// they are relative to. One row per pin; a row set by hand is never
// overwritten by an estimate. The sibling of ./pinGasCarPerf, except that the
// year is required: it is the game's own era, there is no current edition.

import * as db from '../db';
import {
  GAME_PERF_KEYS, GAME_PERF_MAX, GAME_PERF_SOURCES, GAME_PERF_YEAR_MAX, GAME_PERF_YEAR_MIN,
  isGamePerfScore, isGamePerfYear, type GamePerfScores, type GamePerfSource, type PinGamePerfJson,
} from '@/lib/pinGamePerf';

type Row = Omit<PinGamePerfJson, 'checkedAt'> & { checkedAt: Date };

const COLUMNS = `${GAME_PERF_KEYS.map((key) => `"${key}"::float8 AS "${key}"`).join(', ')}, "source", "basis", "sourceUrl", "rubricYear", "checkedAt"`;

export async function gamePerfForPin(pinId: number): Promise<PinGamePerfJson | null> {
  const [row] = await db.query<Row>(`SELECT ${COLUMNS} FROM "PinGamePerf" WHERE "pinId" = $1`, [pinId]);
  return row ? { ...row, checkedAt: new Date(row.checkedAt).toISOString() } : null;
}

// The scores, or a sentence saying what is wrong with them.
export function gamePerfProblem(body: Record<string, unknown>): {
  scores: GamePerfScores;
  rubricYear: number;
  source: GamePerfSource;
  basis: string | null;
  sourceUrl: string | null;
} | string {
  const scores = {} as GamePerfScores;
  for (const key of GAME_PERF_KEYS) {
    const value = body[key] === undefined ? null : body[key];
    if (value !== null && !isGamePerfScore(value)) return `${key} must be a number from 0 to ${GAME_PERF_MAX} in half steps, or null when it does not apply.`;
    scores[key] = value;
  }
  if (GAME_PERF_KEYS.every((key) => scores[key] === null)) return 'At least one axis needs a score.';
  if (!isGamePerfYear(body.rubricYear)) return `rubricYear is the game's release year, a whole year from ${GAME_PERF_YEAR_MIN} to ${GAME_PERF_YEAR_MAX}.`;
  const source = String(body.source ?? 'hand') as GamePerfSource;
  if (!GAME_PERF_SOURCES.includes(source)) return `source must be one of ${GAME_PERF_SOURCES.join(', ')}.`;
  const basis = typeof body.basis === 'string' && body.basis.trim() ? body.basis.trim() : null;
  if (basis && basis.length > 1000) return 'basis is at most 1000 characters.';
  const sourceUrl = typeof body.sourceUrl === 'string' && /^https?:\/\/\S+$/i.test(body.sourceUrl) && body.sourceUrl.length <= 4000 ? body.sourceUrl : null;
  if (body.sourceUrl && !sourceUrl) return 'sourceUrl is not a web address.';
  return { scores, rubricYear: body.rubricYear, source, basis, sourceUrl };
}

// Resolves to whether it was stored (a hand row keeps winning over an estimate).
export async function saveGamePerf(
  pinId: number,
  scores: GamePerfScores,
  { rubricYear, source, basis, sourceUrl }: { rubricYear: number; source: GamePerfSource; basis?: string | null; sourceUrl?: string | null },
): Promise<boolean> {
  const columns = ['pinId', ...GAME_PERF_KEYS, 'source', 'basis', 'sourceUrl', 'rubricYear'];
  const values: unknown[] = [pinId, ...GAME_PERF_KEYS.map((key) => scores[key]), source, basis ?? null, sourceUrl ?? null, rubricYear];
  const rows = await db.query(
    `INSERT INTO "PinGamePerf" (${columns.map((column) => `"${column}"`).join(', ')})
     VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')})
     ON CONFLICT ("pinId") DO UPDATE SET ${columns.slice(1).map((column) => `"${column}" = EXCLUDED."${column}"`).join(', ')}, "checkedAt" = now()
     WHERE "PinGamePerf"."source" <> 'hand' OR EXCLUDED."source" = 'hand'
     RETURNING "pinId"`,
    values,
  );
  return rows.length > 0;
}

export async function deleteGamePerf(pinId: number): Promise<void> {
  await db.query(`DELETE FROM "PinGamePerf" WHERE "pinId" = $1`, [pinId]);
}
