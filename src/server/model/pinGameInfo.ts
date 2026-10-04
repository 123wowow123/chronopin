// A game pin's maturity rating and platforms (PinGameInfo, 0124), read off the
// game's Steam page or Wikidata. One row per pin; a row set by hand is never
// overwritten by a refresh.

import * as db from '../db';
import {
  GAME_INFO_SOURCES,
  MATURITY_BOARDS,
  isPlatformKey,
  type GameInfoFields,
  type GameInfoSource,
  type MaturityBoard,
  type PinGameInfoJson,
} from '@/lib/gameInfo';

type Row = Omit<PinGameInfoJson, 'checkedAt'> & { checkedAt: Date };

const COLUMNS = `"maturityBoard", "maturityRating", "descriptors", "platforms", "source", "sourceUrl", "checkedAt"`;

const toJson = (row: Row): PinGameInfoJson => ({ ...row, checkedAt: new Date(row.checkedAt).toISOString() });

export async function gameInfoForPin(pinId: number): Promise<PinGameInfoJson | null> {
  const [row] = await db.query<Row>(`SELECT ${COLUMNS} FROM "PinGameInfo" WHERE "pinId" = $1`, [pinId]);
  return row ? toJson(row) : null;
}

// The fields, or a sentence saying what is wrong with them.
export function gameInfoProblem(body: Record<string, unknown>): { fields: GameInfoFields; source: GameInfoSource; sourceUrl: string | null } | string {
  const board = body.maturityBoard == null || body.maturityBoard === '' ? null : String(body.maturityBoard);
  if (board && !MATURITY_BOARDS.includes(board as MaturityBoard)) return `maturityBoard must be one of ${MATURITY_BOARDS.join(', ')}.`;
  const rating = typeof body.maturityRating === 'string' && body.maturityRating.trim() ? body.maturityRating.trim() : null;
  if (rating && rating.length > 32) return 'maturityRating is at most 32 characters.';
  if (rating && !board) return 'A maturityRating needs its maturityBoard.';
  const descriptors = body.descriptors == null ? [] : body.descriptors;
  if (!Array.isArray(descriptors) || descriptors.length > 20 || descriptors.some((d) => typeof d !== 'string' || !d.trim() || d.length > 80)) {
    return 'descriptors is a list of up to 20 short strings.';
  }
  const platforms = body.platforms == null ? [] : body.platforms;
  if (!Array.isArray(platforms) || !platforms.every(isPlatformKey)) return 'platforms must be platform keys (src/lib/gameInfo.ts PLATFORMS).';
  const source = String(body.source ?? 'hand') as GameInfoSource;
  if (!GAME_INFO_SOURCES.includes(source)) return `source must be one of ${GAME_INFO_SOURCES.join(', ')}.`;
  const sourceUrl = typeof body.sourceUrl === 'string' && /^https?:\/\/\S+$/i.test(body.sourceUrl) && body.sourceUrl.length <= 4000 ? body.sourceUrl : null;
  if (body.sourceUrl && !sourceUrl) return 'sourceUrl is not a web address.';
  return {
    fields: {
      maturityBoard: (board as MaturityBoard | null) ?? null,
      maturityRating: rating,
      descriptors: (descriptors as string[]).map((d) => d.trim()),
      platforms: [...new Set(platforms)],
    },
    source,
    sourceUrl,
  };
}

// Resolves to whether it was stored (a hand row keeps winning over a refresh).
export async function saveGameInfo(pinId: number, fields: GameInfoFields, { source, sourceUrl }: { source: GameInfoSource; sourceUrl?: string | null }): Promise<boolean> {
  const rows = await db.query(
    `INSERT INTO "PinGameInfo" ("pinId", "maturityBoard", "maturityRating", "descriptors", "platforms", "source", "sourceUrl")
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)
     ON CONFLICT ("pinId") DO UPDATE SET
       "maturityBoard" = EXCLUDED."maturityBoard", "maturityRating" = EXCLUDED."maturityRating", "descriptors" = EXCLUDED."descriptors",
       "platforms" = EXCLUDED."platforms", "source" = EXCLUDED."source", "sourceUrl" = EXCLUDED."sourceUrl", "checkedAt" = now()
     WHERE "PinGameInfo"."source" <> 'hand' OR EXCLUDED."source" = 'hand'
     RETURNING "pinId"`,
    [pinId, fields.maturityBoard, fields.maturityRating, JSON.stringify(fields.descriptors), JSON.stringify(fields.platforms), source, sourceUrl ?? null],
  );
  return rows.length > 0;
}

export async function deleteGameInfo(pinId: number): Promise<void> {
  await db.query(`DELETE FROM "PinGameInfo" WHERE "pinId" = $1`, [pinId]);
}
