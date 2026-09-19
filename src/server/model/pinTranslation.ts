import { createHash } from 'node:crypto';
import * as db from '../db';

// A pin's words in another language (0044). English is the pins' own
// language, so it has no rows.

export const TRANSLATED_FIELDS = ['title', 'description', 'longFormSummary', 'dateConfidenceReasoning', 'delayReasoning'] as const;
export type TranslatedField = (typeof TRANSLATED_FIELDS)[number];
export type PinText = { title: string } & Partial<Record<Exclude<TranslatedField, 'title'>, string | null>>;

export type PinTranslationRow = PinText & { pinId: number; locale: string; sourceHash: string; utcCreatedDateTime?: string; utcUpdatedDateTime?: string };

// What a translation was made from: a row whose hash no longer matches the
// pin was translated before an edit, and is not shown.
export function sourceHash(pin: Partial<Record<TranslatedField, unknown>>): string {
  const text = TRANSLATED_FIELDS.map((field) => (typeof pin[field] === 'string' ? pin[field] : '')).join('\n--\n');
  return createHash('sha1').update(text).digest('hex');
}

export default class PinTranslation {
  static async forPins(pinIds: number[], locale: string): Promise<Map<number, PinTranslationRow>> {
    if (!pinIds.length) return new Map();
    const rows = await db.query<PinTranslationRow>(`SELECT * FROM "PinTranslation" WHERE "pinId" = ANY($1::int[]) AND "locale" = $2`, [pinIds, locale]);
    return new Map(rows.map((row) => [row.pinId, row]));
  }

  static async save(pinId: number, locale: string, text: PinText, hash: string): Promise<void> {
    await db.query(
      `INSERT INTO "PinTranslation" ("pinId", "locale", "title", "description", "longFormSummary", "dateConfidenceReasoning", "delayReasoning", "sourceHash")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT ("pinId", "locale") DO UPDATE SET
         "title" = EXCLUDED."title", "description" = EXCLUDED."description", "longFormSummary" = EXCLUDED."longFormSummary",
         "dateConfidenceReasoning" = EXCLUDED."dateConfidenceReasoning", "delayReasoning" = EXCLUDED."delayReasoning",
         "sourceHash" = EXCLUDED."sourceHash", "utcUpdatedDateTime" = now()`,
      [pinId, locale, text.title.slice(0, 500), text.description ?? null, text.longFormSummary ?? null, text.dateConfidenceReasoning ?? null, text.delayReasoning ?? null, hash],
    );
  }

  // Live pins missing a current translation in any of the languages, by id,
  // for the backfill (translations:sync).
  static async stale(locales: readonly string[], limit: number): Promise<number[]> {
    const pins = await db.query<{ id: number } & Record<TranslatedField, string | null>>(
      `SELECT "id", "title", "description", "longFormSummary", "dateConfidenceReasoning", "delayReasoning" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL ORDER BY "id"`,
    );
    const rows = await db.query<{ pinId: number; locale: string; sourceHash: string }>(`SELECT "pinId", "locale", "sourceHash" FROM "PinTranslation"`);
    const have = new Map<number, Map<string, string>>();
    for (const row of rows) {
      if (!have.has(row.pinId)) have.set(row.pinId, new Map());
      have.get(row.pinId)!.set(row.locale, row.sourceHash.trim());
    }
    const out: number[] = [];
    for (const pin of pins) {
      const hash = sourceHash(pin);
      const current = have.get(pin.id);
      if (locales.some((l) => current?.get(l) !== hash)) out.push(pin.id);
      if (out.length >= limit) break;
    }
    return out;
  }

  static getAll(): Promise<PinTranslationRow[]> {
    return db.query<PinTranslationRow>(`SELECT * FROM "PinTranslation" ORDER BY "pinId", "locale"`);
  }

  static async restore(rows: PinTranslationRow[]): Promise<void> {
    for (const row of rows) {
      await db.query(
        `INSERT INTO "PinTranslation" ("pinId", "locale", "title", "description", "longFormSummary", "dateConfidenceReasoning", "delayReasoning", "sourceHash", "utcCreatedDateTime", "utcUpdatedDateTime")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING`,
        [row.pinId, row.locale, row.title, row.description ?? null, row.longFormSummary ?? null, row.dateConfidenceReasoning ?? null, row.delayReasoning ?? null, row.sourceHash, row.utcCreatedDateTime, row.utcUpdatedDateTime],
      );
    }
  }
}
