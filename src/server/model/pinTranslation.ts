import { createHash } from 'node:crypto';
import * as db from '../db';

// A pin's words in another language (0044). English is the pins' own
// language, so it has no rows.

export const TRANSLATED_FIELDS = ['title', 'description', 'longFormSummary', 'dateConfidenceReasoning', 'delayReasoning'] as const;
export type TranslatedField = (typeof TRANSLATED_FIELDS)[number];
export type PinText = { title: string } & Partial<Record<Exclude<TranslatedField, 'title'>, string | null>>;

export type FieldHashes = Record<TranslatedField, string>;

export type PinTranslationRow = PinText & {
  pinId: number;
  locale: string;
  sourceHash: string;
  fieldHashes?: FieldHashes | null;
  utcCreatedDateTime?: string;
  utcUpdatedDateTime?: string;
};

const textOf = (value: unknown) => (typeof value === 'string' ? value : '');
const sha1 = (text: string) => createHash('sha1').update(text).digest('hex');

// What a translation was made from: a row whose hash no longer matches the
// pin was translated before an edit, and is not shown.
export function sourceHash(pin: Partial<Record<TranslatedField, unknown>>): string {
  return sha1(TRANSLATED_FIELDS.map((field) => textOf(pin[field])).join('\n--\n'));
}

// The same, a field at a time (0080): what tells which of a pin's words were
// edited since a translation of them was made.
export function fieldHashes(pin: Partial<Record<TranslatedField, unknown>>): FieldHashes {
  return Object.fromEntries(TRANSLATED_FIELDS.map((field) => [field, sha1(textOf(pin[field]))])) as FieldHashes;
}

// The pin's fields edited since the translation was made from them, or null
// when that is not known (a row from before 0080 whose pin was already edited).
export function changedFields(pin: Partial<Record<TranslatedField, unknown>>, made: FieldHashes | null | undefined): TranslatedField[] | null {
  if (!made) return null;
  const now = fieldHashes(pin);
  return TRANSLATED_FIELDS.filter((field) => made[field] !== now[field]);
}

// Where a pin's translation into a language stands. Only a current one is
// shown; the rest show the pin's English. Outdated: made from the pin's words
// before an edit. Incomplete: made from its words as they are, but cut short
// or missing a field (translatesAll).
export type TranslationState = 'current' | 'outdated' | 'incomplete' | 'missing';

export function translationState(
  pin: Partial<Record<TranslatedField, unknown>>,
  hash: string,
  row: ({ sourceHash: string } & Partial<Record<TranslatedField, unknown>>) | undefined,
): TranslationState {
  if (!row) return 'missing';
  if (row.sourceHash.trim() !== hash) return 'outdated';
  return translatesAll(pin, row) ? 'current' : 'incomplete';
}

// Whether a translated field says anything. A translation has come back as a
// lone "," before (pin 2303's zh reasoning), which a card showed as a line of
// its own with just the comma and a citation.
export function hasWords(value: unknown): value is string {
  return typeof value === 'string' && /[\p{L}\p{N}]/u.test(value);
}

// What wholeTranslation needs of a text: its start, length, bullets,
// citations and last character. TRANSLATED_SHAPES has the database work it
// out, so a query over every translation need not load all their words.
export type TextShape = { head: string; length: number; li: number; cite: number; end: string };

function count(text: string, tag: string): number {
  return text.split(tag).length - 1;
}

function shapeOf(value: unknown): TextShape | null {
  if (typeof value === 'string') {
    const trimmed = value.trimEnd();
    return { head: value.slice(0, 200), length: value.length, li: count(value, '<li>'), cite: count(value, '<cite'), end: trimmed.slice(-1) };
  }
  return value && typeof value === 'object' && 'head' in value ? (value as TextShape) : null;
}

// Each translated field as its TextShape (null when empty), under its own name.
export const TRANSLATED_SHAPES = TRANSLATED_FIELDS.map(
  (field) =>
    `CASE WHEN "${field}" IS NULL THEN NULL ELSE json_build_object('head', left("${field}", 200), 'length', length("${field}"),
       'li', (length("${field}") - length(replace("${field}", '<li>', ''))) / 4, 'cite', (length("${field}") - length(replace("${field}", '<cite', ''))) / 5,
       'end', right(regexp_replace("${field}", '\\s+$', ''), 1)) END AS "${field}"`,
).join(', ');

// Whether a translation of an English text came back whole. Hand and model
// translations have come back cut short at a double quote in the English
// (pins 2303, 2010, 2980): a summary missing its later bullets and citations,
// a description stopping mid-sentence. Such a text reads as a very short one
// ending on a letter where the English ends a sentence.
export function wholeTranslation(english: unknown, translated: unknown): boolean {
  const en = shapeOf(english);
  if (!en || !hasWords(en.head)) return true;
  const tr = shapeOf(translated);
  if (!tr || !hasWords(tr.head)) return false;
  if (tr.li !== en.li || tr.cite !== en.cite) return false;
  const cut = /[.!?。！？]/u.test(en.end) && /[\p{L}\p{N}]/u.test(tr.end) && tr.length < en.length * 0.25;
  return !cut;
}

// Whether a translation is whole in every field the pin has words in; one
// that is not is made again, as if missing. Either side may be the text or
// its TextShape.
export function translatesAll(pin: Partial<Record<TranslatedField, unknown>>, row: Partial<Record<TranslatedField, unknown>>): boolean {
  return TRANSLATED_FIELDS.every((field) => wholeTranslation(pin[field], row[field]));
}

export default class PinTranslation {
  static async forPins(pinIds: number[], locale: string): Promise<Map<number, PinTranslationRow>> {
    if (!pinIds.length) return new Map();
    const rows = await db.query<PinTranslationRow>(`SELECT * FROM "PinTranslation" WHERE "pinId" = ANY($1::int[]) AND "locale" = $2`, [pinIds, locale]);
    return new Map(rows.map((row) => [row.pinId, row]));
  }

  // Saves a translation of `source`, the pin's English words it was made from.
  static async save(pinId: number, locale: string, text: PinText, source: Partial<Record<TranslatedField, unknown>>): Promise<void> {
    await db.query(
      `INSERT INTO "PinTranslation" ("pinId", "locale", "title", "description", "longFormSummary", "dateConfidenceReasoning", "delayReasoning", "sourceHash", "fieldHashes")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT ("pinId", "locale") DO UPDATE SET
         "title" = EXCLUDED."title", "description" = EXCLUDED."description", "longFormSummary" = EXCLUDED."longFormSummary",
         "dateConfidenceReasoning" = EXCLUDED."dateConfidenceReasoning", "delayReasoning" = EXCLUDED."delayReasoning",
         "sourceHash" = EXCLUDED."sourceHash", "fieldHashes" = EXCLUDED."fieldHashes", "utcUpdatedDateTime" = now()`,
      [
        pinId,
        locale,
        text.title.slice(0, 500),
        ...(['description', 'longFormSummary', 'dateConfidenceReasoning', 'delayReasoning'] as const).map((field) => (hasWords(text[field]) ? text[field] : null)),
        sourceHash(source),
        JSON.stringify(fieldHashes(source)),
      ],
    );
  }

  static getAll(): Promise<PinTranslationRow[]> {
    return db.query<PinTranslationRow>(`SELECT * FROM "PinTranslation" ORDER BY "pinId", "locale"`);
  }

  static async restore(rows: PinTranslationRow[]): Promise<void> {
    for (const row of rows) {
      await db.query(
        `INSERT INTO "PinTranslation" ("pinId", "locale", "title", "description", "longFormSummary", "dateConfidenceReasoning", "delayReasoning", "sourceHash", "fieldHashes", "utcCreatedDateTime", "utcUpdatedDateTime")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT DO NOTHING`,
        [
          row.pinId,
          row.locale,
          row.title,
          row.description ?? null,
          row.longFormSummary ?? null,
          row.dateConfidenceReasoning ?? null,
          row.delayReasoning ?? null,
          row.sourceHash,
          row.fieldHashes ? JSON.stringify(row.fieldHashes) : null,
          row.utcCreatedDateTime,
          row.utcUpdatedDateTime,
        ],
      );
    }
  }
}
