import * as db from '../db';
import type { Row } from '../db';
import PinView from './pinView';

export const DUPLICATE_STATUSES = ['suggested', 'confirmed', 'rejected'] as const;
export type DuplicateStatus = (typeof DUPLICATE_STATUSES)[number];
export type DuplicateReason = 'similar' | 'sourceUrl';
export const DUPLICATE_VERDICTS = ['same', 'different', 'unsure'] as const;
export type DuplicateVerdict = (typeof DUPLICATE_VERDICTS)[number];

// The other pin in a pair, as the pin page's review panel lists it.
export type DuplicateCandidate = {
  status: DuplicateStatus;
  reason: DuplicateReason;
  score: number | null;
  // Claude's read on the pair from both pins and their references; null until checked.
  verdict: DuplicateVerdict | null;
  verdictReasoning: string | null;
  pin: {
    id: number;
    title: string;
    userId: number | null;
    user?: { id: number; userName: string; pictureUrl?: string };
    utcStartDateTime: string;
    allDay: boolean;
    utcCreatedDateTime: string;
    // Its picture for the review row, chosen as a card's is.
    thumbName?: string | null;
    originalUrl?: string | null;
  };
};

// A pair is stored lower id first (see 0014_pin_duplicates_and_views.sql).
function ordered(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

// The UTC calendar days between a pin's start and `start`, compared in SQL.
const DAYS_APART = `abs(("Pin"."utcStartDateTime" AT TIME ZONE 'UTC')::date - ($2::timestamptz AT TIME ZONE 'UTC')::date)`;

export default class PinDuplicate {
  // Live pins among ids (other than pinId) starting within maxDays of start.
  static async withinDays(pinId: number, start: Date | string, ids: number[], maxDays: number): Promise<number[]> {
    if (!ids.length) {
      return [];
    }
    const rows = await db.query<{ id: number }>(
      `SELECT "id" FROM "Pin"
       WHERE "id" = ANY($3::integer[]) AND "id" <> $1 AND "utcDeletedDateTime" IS NULL
         AND ${DAYS_APART} <= $4`,
      [pinId, start, ids, maxDays],
    );
    return rows.map((row) => row.id);
  }

  // Live pins by anyone with the same source URL (scheme ignored, as
  // Pin.findBySourceUrl compares), starting within maxDays of start.
  static async sameSourceUrl(pinId: number, start: Date | string, sourceUrlKey: string, maxDays: number): Promise<number[]> {
    const rows = await db.query<{ id: number }>(
      `SELECT "id" FROM "Pin"
       WHERE regexp_replace(btrim("sourceUrl"), '^https?://', '', 'i') = $3
         AND "id" <> $1 AND "utcDeletedDateTime" IS NULL
         AND ${DAYS_APART} <= $4`,
      [pinId, start, sourceUrlKey, maxDays],
    );
    return rows.map((row) => row.id);
  }

  // Forgets the pin's undecided suggestions whose pins no longer start within
  // maxDays of each other (an edit moved a date). Only dates: title scores are
  // not symmetric, so the other pin's own check may be what found the pair.
  // Confirmed and rejected pairs are people's decisions and stay.
  static async clearStaleSuggestions(pinId: number, maxDays: number) {
    await db.query(
      `DELETE FROM "PinDuplicate" AS "d"
       USING "Pin" AS "a", "Pin" AS "b"
       WHERE "d"."status" = 'suggested' AND $1 IN ("d"."pinId", "d"."otherPinId")
         AND "a"."id" = "d"."pinId" AND "b"."id" = "d"."otherPinId"
         AND abs(("a"."utcStartDateTime" AT TIME ZONE 'UTC')::date - ("b"."utcStartDateTime" AT TIME ZONE 'UTC')::date) > $2`,
      [pinId, maxDays],
    );
  }

  // Suggests a pair unless it is already known (suggested or decided).
  // Resolves to whether a row was added.
  static async suggest(a: number, b: number, reason: DuplicateReason, score: number | null): Promise<boolean> {
    const [pinId, otherPinId] = ordered(a, b);
    const rows = await db.query(
      `INSERT INTO "PinDuplicate" ("pinId", "otherPinId", "reason", "score")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("pinId", "otherPinId") DO NOTHING
       RETURNING "pinId"`,
      [pinId, otherPinId, reason, score],
    );
    return rows.length > 0;
  }

  static async find(a: number, b: number): Promise<{ status: DuplicateStatus } | undefined> {
    const [pinId, otherPinId] = ordered(a, b);
    const rows = await db.query<{ status: DuplicateStatus }>(`SELECT "status" FROM "PinDuplicate" WHERE "pinId" = $1 AND "otherPinId" = $2`, [
      pinId,
      otherPinId,
    ]);
    return rows[0];
  }

  // Records Claude's verdict on a pair.
  static async setVerdict(a: number, b: number, verdict: DuplicateVerdict, reasoning: string) {
    const [pinId, otherPinId] = ordered(a, b);
    await db.query(
      `UPDATE "PinDuplicate"
       SET "verdict" = $3, "verdictReasoning" = $4, "utcVerifiedDateTime" = now()
       WHERE "pinId" = $1 AND "otherPinId" = $2`,
      [pinId, otherPinId, verdict, reasoning.slice(0, 2000)],
    );
  }

  // The pin's undecided pairs whose verdict is missing or out of date: never
  // checked, or either pin has gained a reference since. References keep their
  // creation time through a save (they are re-inserted with it), so an edit
  // that adds none does not call for another check. Closest match first.
  static async needingVerdict(pinId: number, limit: number): Promise<[number, number][]> {
    const rows = await db.query<{ pinId: number; otherPinId: number }>(
      `SELECT "d"."pinId", "d"."otherPinId"
       FROM "PinDuplicate" AS "d"
       WHERE "d"."status" = 'suggested' AND $1 IN ("d"."pinId", "d"."otherPinId")
         AND ("d"."utcVerifiedDateTime" IS NULL OR EXISTS (
           SELECT 1 FROM "PinReference" AS "r"
           WHERE "r"."pinId" IN ("d"."pinId", "d"."otherPinId") AND "r"."utcCreatedDateTime" > "d"."utcVerifiedDateTime"))
       ORDER BY "d"."score" DESC NULLS FIRST, "d"."pinId", "d"."otherPinId"
       LIMIT $2`,
      [pinId, limit],
    );
    return rows.map((row) => [row.pinId, row.otherPinId]);
  }

  static async decide(a: number, b: number, status: DuplicateStatus, userId: number) {
    const [pinId, otherPinId] = ordered(a, b);
    await db.query(
      `UPDATE "PinDuplicate"
       SET "status" = $3, "decidedByUserId" = $4, "utcDecidedDateTime" = now()
       WHERE "pinId" = $1 AND "otherPinId" = $2`,
      [pinId, otherPinId, status, userId],
    );
  }

  // The pin's confirmed group (itself included), or just the pin when it has none.
  static async group(pinId: number): Promise<number[]> {
    const rows = await db.query<{ group: number[] | null }>(`SELECT "pinDuplicateGroup"($1) AS "group"`, [pinId]);
    return rows[0]?.group ?? [pinId];
  }

  // Every pair the pin is in, with the other (live) pin: suggestions first,
  // then by Claude's verdict (same, unsure, unchecked, different), then
  // closest match first.
  static async listForPin(pinId: number): Promise<DuplicateCandidate[]> {
    const rows = await db.query(
      `
      SELECT "d"."status", "d"."reason", "d"."score", "d"."verdict", "d"."verdictReasoning",
        "Pin"."id", "Pin"."title", "Pin"."userId", "Pin"."utcStartDateTime", "Pin"."allDay", "Pin"."utcCreatedDateTime",
        "User"."userName", "User"."pictureUrl"
      FROM "PinDuplicate" AS "d"
        JOIN "Pin"
          ON "Pin"."id" = CASE WHEN "d"."pinId" = $1 THEN "d"."otherPinId" ELSE "d"."pinId" END
         AND "Pin"."utcDeletedDateTime" IS NULL
        LEFT JOIN "User" ON "User"."id" = "Pin"."userId"
      WHERE $1 IN ("d"."pinId", "d"."otherPinId")
      ORDER BY "d"."status" = 'suggested' DESC,
        CASE "d"."verdict" WHEN 'same' THEN 0 WHEN 'unsure' THEN 1 WHEN 'different' THEN 3 ELSE 2 END,
        "d"."score" DESC NULLS LAST, "Pin"."id"`,
      [pinId],
    );
    const pictures = await PinView.pictures(rows.map((row) => row.id));
    return rows.map((row) => ({
      status: row.status,
      reason: row.reason,
      score: row.score,
      verdict: row.verdict ?? null,
      verdictReasoning: row.verdictReasoning ?? null,
      pin: {
        id: row.id,
        title: row.title,
        userId: row.userId,
        user: row.userName ? { id: row.userId, userName: row.userName, pictureUrl: row.pictureUrl ?? undefined } : undefined,
        utcStartDateTime: row.utcStartDateTime,
        allDay: row.allDay,
        utcCreatedDateTime: row.utcCreatedDateTime,
        ...pictures.get(row.id),
      },
    }));
  }

  // For backups: every pair, decisions included.
  static getAll(): Promise<Row[]> {
    return db.query(`
      SELECT "pinId", "otherPinId", "reason", "score", "status", "decidedByUserId", "utcCreatedDateTime", "utcDecidedDateTime",
        "verdict", "verdictReasoning", "utcVerifiedDateTime"
      FROM "PinDuplicate"
      ORDER BY "pinId", "otherPinId"`);
  }

  static async restore(pairs: Row[] | undefined) {
    for (const pair of pairs || []) {
      await db.query(
        `INSERT INTO "PinDuplicate" ("pinId", "otherPinId", "reason", "score", "status", "decidedByUserId", "utcCreatedDateTime", "utcDecidedDateTime",
           "verdict", "verdictReasoning", "utcVerifiedDateTime")
         VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()), $8, $9, $10, $11)
         ON CONFLICT ("pinId", "otherPinId") DO NOTHING`,
        [
          pair.pinId,
          pair.otherPinId,
          pair.reason,
          pair.score ?? null,
          pair.status,
          pair.decidedByUserId ?? null,
          pair.utcCreatedDateTime ?? null,
          pair.utcDecidedDateTime ?? null,
          pair.verdict ?? null,
          pair.verdictReasoning ?? null,
          pair.utcVerifiedDateTime ?? null,
        ],
      );
    }
  }
}
