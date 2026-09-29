// Pins in the page's language. A page (or API answer) in a language other
// than English shows each pin's translation in place of its own words, when
// one has been made from the pin as it is now; otherwise the pin's own words.
// Reading a pin never translates it: one without a translation shows English.
// Translations are made in the background when a pin is saved, and by
// `npm run translations:sync`;
// or by hand, through pinsToTranslate and applyTranslations (the script's
// --export/--apply, and /api/admin/translations on a server).

import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n/config';
import type { TranslationCoverage } from '@/lib/multilingual';
import * as db from '../db';
import { TARGET_LOCALES, translatePinText, type TargetLocale } from '../extract/translate';
import PinTranslation, {
  changedFields,
  hasWords,
  sourceHash,
  TRANSLATED_FIELDS,
  TRANSLATED_SHAPES,
  translatesAll,
  translationState,
  wholeTranslation,
  type FieldHashes,
  type PinText,
  type PinTranslationRow,
  type TranslatedField,
  type TranslationState,
} from '../model/pinTranslation';

type Localizable = { id: number; title: string; originalTitle?: string; translatedTo?: string } & Partial<Record<Exclude<TranslatedField, 'title'>, unknown>>;

// Swaps in each pin's current translation, in place, and answers the same
// array. originalTitle keeps the pin's own title (its URL slug is made from
// it); translatedTo says a pin's words were swapped. Only the fields a pin
// carries are swapped (a trending row has just a title). A translation counts
// as current when it was made from the pin's words as stored now, so an edit
// shows the new English until the new translation is in. A field whose
// translation is not whole (a stray ",", a summary cut short) keeps its
// English too.
export async function localizePins<T extends Localizable>(pins: T[], locale: Locale): Promise<T[]> {
  if (locale === DEFAULT_LOCALE || !pins.length) return pins;
  const ids = [...new Set(pins.map((p) => p.id))];
  const [rows, current] = await Promise.all([PinTranslation.forPins(ids, locale), currentHashes(ids)]);
  for (const pin of pins) {
    const row = rows.get(pin.id);
    if (!row || row.sourceHash.trim() !== current.get(pin.id)) continue;
    pin.originalTitle = pin.title;
    pin.title = row.title;
    for (const field of TRANSLATED_FIELDS) {
      if (field !== 'title' && field in pin && pin[field] && wholeTranslation(pin[field], row[field])) (pin as Record<string, unknown>)[field] = row[field];
    }
    pin.translatedTo = locale;
  }
  return pins;
}

// The hash of each pin's words as stored now.
async function currentHashes(ids: number[]): Promise<Map<number, string>> {
  const rows = await db.query<{ id: number } & Record<TranslatedField, string | null>>(
    `SELECT "id", "title", "description", "longFormSummary", "dateConfidenceReasoning", "delayReasoning" FROM "Pin" WHERE "id" = ANY($1::int[])`,
    [ids],
  );
  return new Map(rows.map((row) => [row.id, sourceHash(row)]));
}

// Pins being translated right now, so a burst of views asks once.
const g = globalThis as unknown as { __chronopinTranslating?: Set<number> };
const translating = (g.__chronopinTranslating ??= new Set());

// Translates the pin into each of the languages (every other one, unless
// given) whose translation is missing or out of date, and saves them.
// Resolves to how many were saved.
export async function translatePin(
  pinId: number,
  { force = false, locales = TARGET_LOCALES }: { force?: boolean; locales?: readonly TargetLocale[] } = {},
): Promise<number> {
  if (translating.has(pinId)) return 0;
  translating.add(pinId);
  try {
    const [pin] = await db.query<PinText & { id: number }>(
      `SELECT "id", "title", "description", "longFormSummary", "dateConfidenceReasoning", "delayReasoning" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
      [pinId],
    );
    if (!pin) return 0;
    const hash = sourceHash(pin);
    const existing = await db.query<{ locale: string; sourceHash: string } & Record<TranslatedField, unknown>>(
      `SELECT "locale", "sourceHash", ${TRANSLATED_SHAPES} FROM "PinTranslation" WHERE "pinId" = $1`,
      [pinId],
    );
    const fresh = new Set(existing.filter((row) => row.sourceHash.trim() === hash && translatesAll(pin, row)).map((row) => row.locale));
    const wanted = locales.filter((l) => force || !fresh.has(l));
    if (!wanted.length) return 0;

    const translated = await translatePinText(pin, wanted);
    if (!translated) return 0;
    let saved = 0;
    for (const locale of wanted) {
      const text = translated[locale as TargetLocale];
      if (!text) continue;
      await PinTranslation.save(pinId, locale, text, pin);
      saved++;
    }
    if (saved) await expirePin(pinId);
    return saved;
  } finally {
    translating.delete(pinId);
  }
}

// Outside a request (the backfill script) there is no page cache to expire;
// the pages pick the translations up when theirs runs out.
async function expirePin(pinId: number) {
  try {
    const { invalidatePin } = await import('./cache');
    invalidatePin(pinId);
  } catch {}
}

const PIN_WORDS = `"id", "title", "description", "longFormSummary", "dateConfidenceReasoning", "delayReasoning"`;

type PinWords = PinText & { id: number };
type TranslationShape = { pinId: number; locale: string; sourceHash: string; fieldHashes: FieldHashes | null; utcUpdatedDateTime: Date } & Record<
  TranslatedField,
  unknown
>;

// Each live pin (after the id given, oldest first) with where its translation
// into each of the languages stands (TranslationState), and for an outdated
// one which of the pin's fields were edited since it was made (null when not
// known) and when it was made. What the export, the admin's counts and its
// list of translations to redo all read.
async function translationStates(locales: readonly TargetLocale[], { after = 0 }: { after?: number } = {}) {
  const [pins, rows] = await Promise.all([
    db.query<PinWords & { utcUpdatedDateTime: Date }>(
      `SELECT ${PIN_WORDS}, coalesce("utcUpdatedDateTime", "utcCreatedDateTime") AS "utcUpdatedDateTime" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL AND "id" > $1 ORDER BY "id"`,
      [after],
    ),
    db.query<TranslationShape>(
      `SELECT "pinId", "locale", "sourceHash", "fieldHashes", "utcUpdatedDateTime", ${TRANSLATED_SHAPES} FROM "PinTranslation" WHERE "locale" = ANY($1::text[]) AND "pinId" > $2`,
      [locales, after],
    ),
  ]);
  const byPin = new Map<number, Map<string, TranslationShape>>();
  for (const row of rows) {
    if (!byPin.has(row.pinId)) byPin.set(row.pinId, new Map());
    byPin.get(row.pinId)!.set(row.locale, row);
  }
  return pins.map((pin) => {
    const hash = sourceHash(pin);
    const states = locales.map((locale) => {
      const row = byPin.get(pin.id)?.get(locale);
      const state = translationState(pin, hash, row);
      return {
        locale,
        state,
        changed: state === 'outdated' ? changedFields(pin, row!.fieldHashes) : null,
        translatedAt: row ? row.utcUpdatedDateTime.toISOString() : null,
      };
    });
    return { pin, hash, states, editedAt: pin.utcUpdatedDateTime.toISOString() };
  });
}

export type PinToTranslate = PinText & {
  id: number;
  sourceHash: string;
  locales: TargetLocale[];
  // Why each language is listed, and for an outdated one the fields edited
  // since (only these need translating again: applyTranslations keeps the
  // stored translation of a field left out).
  states: Partial<Record<TargetLocale, Exclude<TranslationState, 'current'>>>;
  changed: Partial<Record<TargetLocale, TranslatedField[]>>;
};

// Live pins lacking a current translation in any of the languages - missing,
// outdated by an edit, or with no words for a field the pin has
// (translatesAll) - oldest first, with their words and the hash a translation
// of them must carry: what a translation by hand is made from.
export async function pinsToTranslate(locales: readonly TargetLocale[], { limit = 100_000, after = 0 }: { limit?: number; after?: number } = {}): Promise<PinToTranslate[]> {
  const out: PinToTranslate[] = [];
  for (const { pin, hash, states } of await translationStates(locales, { after })) {
    const due = states.filter((s) => s.state !== 'current');
    if (!due.length) continue;
    const text: PinText = { title: pin.title };
    for (const field of TRANSLATED_FIELDS) if (field !== 'title' && pin[field]) text[field] = pin[field];
    out.push({
      id: pin.id,
      ...text,
      sourceHash: hash,
      locales: due.map((s) => s.locale),
      states: Object.fromEntries(due.map((s) => [s.locale, s.state])),
      changed: Object.fromEntries(due.filter((s) => s.changed).map((s) => [s.locale, s.changed])),
    });
    if (out.length >= limit) break;
  }
  return out;
}

// How many live pins each language has a current translation of (one made
// from the pin's words as they are now, so one a page would show), and how
// many an outdated or incomplete one, out of all of them: for the admin's
// language switches. The rest have none.
export async function translationCoverage(): Promise<TranslationCoverage> {
  const counts = (): Record<TargetLocale, number> => Object.fromEntries(TARGET_LOCALES.map((l) => [l, 0])) as Record<TargetLocale, number>;
  const coverage: TranslationCoverage = { total: 0, current: counts(), outdated: counts(), incomplete: counts() };
  for (const { states } of await translationStates(TARGET_LOCALES)) {
    coverage.total++;
    for (const { locale, state } of states) if (state !== 'missing') coverage[state][locale]++;
  }
  return coverage;
}

export type TranslationToRedo = {
  pinId: number;
  title: string;
  editedAt: string;
  locales: { locale: TargetLocale; state: Exclude<TranslationState, 'current'>; changed: TranslatedField[] | null; translatedAt: string | null }[];
};

// The pins whose translation into any of the languages is in the given state
// (outdated by default: the English was edited after it was translated),
// most recently edited first, and how many there are in all: the admin's
// list of translations to make again.
export async function translationsToRedo(
  locales: readonly TargetLocale[],
  state: Exclude<TranslationState, 'current'> = 'outdated',
  { limit = 200 }: { limit?: number } = {},
): Promise<{ total: number; pins: TranslationToRedo[] }> {
  const pins: TranslationToRedo[] = [];
  for (const { pin, states, editedAt } of await translationStates(locales)) {
    const due = states.filter((s) => s.state === state);
    if (due.length) pins.push({ pinId: pin.id, title: pin.title, editedAt, locales: due as TranslationToRedo['locales'] });
  }
  pins.sort((a, b) => b.editedAt.localeCompare(a.editedAt) || b.pinId - a.pinId);
  return { total: pins.length, pins: pins.slice(0, limit) };
}

export type TranslationInput = Partial<PinText> & { pinId: number; locale: string; sourceHash?: string };
export type ApplyResult = { saved: number; skipped: { pinId: number; locale: string; reason: string }[] };

// Saves translations made by hand. Each is checked against the pin as it is
// now: made from other words (its sourceHash no longer matches - the pin was
// edited since it was exported) it is skipped, as it would never be shown.
// Fields the pin does not have stay empty, as the Claude path leaves them. A
// field left out (not sent at all) keeps the stored translation of it when
// that was made from the field's English as it is now, so redoing an outdated
// translation needs only the fields edited since (PinToTranslate.changed).
export async function applyTranslations(rows: TranslationInput[]): Promise<ApplyResult> {
  const ids = [...new Set(rows.map((r) => Number(r.pinId)).filter((id) => Number.isInteger(id) && id > 0))];
  const pins = new Map(
    (
      await db.query<PinText & { id: number }>(
        `SELECT "id", "title", "description", "longFormSummary", "dateConfidenceReasoning", "delayReasoning" FROM "Pin" WHERE "id" = ANY($1::int[]) AND "utcDeletedDateTime" IS NULL`,
        [ids],
      )
    ).map((p) => [p.id, p]),
  );
  const stored = new Map<string, PinTranslationRow>();
  for (const locale of new Set(rows.map((r) => r.locale))) {
    if (!isLocale(locale) || locale === DEFAULT_LOCALE) continue;
    for (const [pinId, row] of await PinTranslation.forPins(ids, locale)) stored.set(`${pinId}:${locale}`, row);
  }
  const result: ApplyResult = { saved: 0, skipped: [] };
  const touched = new Set<number>();
  for (const row of rows) {
    const pin = pins.get(Number(row.pinId));
    const skip = (reason: string) => result.skipped.push({ pinId: row.pinId, locale: row.locale, reason });
    if (!pin) {
      skip('no such pin');
      continue;
    }
    if (!isLocale(row.locale) || row.locale === DEFAULT_LOCALE) {
      skip('not another language of the site');
      continue;
    }
    const hash = sourceHash(pin);
    if (row.sourceHash && row.sourceHash !== hash) {
      skip('the pin changed since it was exported');
      continue;
    }
    // The stored translation's fields still made from the English as it is.
    const old = stored.get(`${pin.id}:${row.locale}`);
    const changed = old ? changedFields(pin, old.fieldHashes) : null;
    const keeps = (field: TranslatedField) => row[field] === undefined && !!old && !!changed && !changed.includes(field) && wholeTranslation(pin[field], old[field]);
    const title = keeps('title') ? old!.title : row.title;
    if (typeof title !== 'string' || !title.trim()) {
      skip('no title');
      continue;
    }
    const text: PinText = { title: title.trim() };
    for (const field of TRANSLATED_FIELDS) {
      if (field === 'title') continue;
      const value = keeps(field) ? old![field] : row[field];
      text[field] = pin[field] && hasWords(value) ? value : null;
    }
    await PinTranslation.save(pin.id, row.locale, text, pin);
    touched.add(pin.id);
    result.saved++;
  }
  for (const id of touched) await expirePin(id);
  return result;
}
