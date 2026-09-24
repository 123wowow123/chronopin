// Pins in the page's language. A page (or API answer) in a language other
// than English shows each pin's translation in place of its own words, when
// one has been made from the pin as it is now; otherwise the pin's own words.
// Translations are made in the background: when a pin is saved, when its page
// is first read in a language it lacks, and by `npm run translations:sync`;
// or by hand, through pinsToTranslate and applyTranslations (the script's
// --export/--apply, and /api/admin/translations on a server).

import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n/config';
import { inBackground } from '../background';
import * as db from '../db';
import { TARGET_LOCALES, translatePinText, type TargetLocale } from '../extract/translate';
import PinTranslation, { sourceHash, TRANSLATED_FIELDS, type PinText, type TranslatedField } from '../model/pinTranslation';
import log from '../util/log';

type Localizable = { id: number; title: string; originalTitle?: string; translatedTo?: string } & Partial<Record<Exclude<TranslatedField, 'title'>, unknown>>;

// Swaps in each pin's current translation, in place, and answers the same
// array. originalTitle keeps the pin's own title (its URL slug is made from
// it); translatedTo says a pin's words were swapped. Only the fields a pin
// carries are swapped (a trending row has just a title). A translation counts
// as current when it was made from the pin's words as stored now, so an edit
// shows the new English until the new translation is in.
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
      if (field !== 'title' && field in pin && pin[field] && row[field]) (pin as Record<string, unknown>)[field] = row[field];
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
    const existing = await db.query<{ locale: string; sourceHash: string }>(`SELECT "locale", "sourceHash" FROM "PinTranslation" WHERE "pinId" = $1`, [pinId]);
    const fresh = new Set(existing.filter((row) => row.sourceHash.trim() === hash).map((row) => row.locale));
    const wanted = locales.filter((l) => force || !fresh.has(l));
    if (!wanted.length) return 0;

    const translated = await translatePinText(pin, wanted);
    if (!translated) return 0;
    let saved = 0;
    for (const locale of wanted) {
      const text = translated[locale as TargetLocale];
      if (!text) continue;
      await PinTranslation.save(pinId, locale, text, hash);
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

// The same, not waited for, into the languages offered: a page read in a
// language the pin lacks.
export function requestTranslation(pinId: number) {
  const run = async () => {
    const { offeredLocales } = await import('./cache');
    const locales = await offeredLocales();
    if (locales.length) await translatePin(pinId, { locales });
  };
  inBackground(run().catch((err) => log.warn(`translation failed for pin ${pinId}:`, (err as Error).message)));
}

export type PinToTranslate = PinText & { id: number; sourceHash: string; locales: TargetLocale[] };

// Live pins lacking a current translation in any of the languages, oldest
// first, with their words and the hash a translation of them must carry: what
// a translation by hand is made from.
export async function pinsToTranslate(locales: readonly TargetLocale[], { limit = 100_000, after = 0 }: { limit?: number; after?: number } = {}): Promise<PinToTranslate[]> {
  const pins = await db.query<PinText & { id: number }>(
    `SELECT "id", "title", "description", "longFormSummary", "dateConfidenceReasoning", "delayReasoning" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL AND "id" > $1 ORDER BY "id"`,
    [after],
  );
  const have = await db.query<{ pinId: number; locale: string; sourceHash: string }>(
    `SELECT "pinId", "locale", "sourceHash" FROM "PinTranslation" WHERE "locale" = ANY($1::text[])`,
    [locales],
  );
  const current = new Map<number, Map<string, string>>();
  for (const row of have) {
    if (!current.has(row.pinId)) current.set(row.pinId, new Map());
    current.get(row.pinId)!.set(row.locale, row.sourceHash.trim());
  }
  const out: PinToTranslate[] = [];
  for (const pin of pins) {
    const hash = sourceHash(pin);
    const missing = locales.filter((l) => current.get(pin.id)?.get(l) !== hash);
    if (!missing.length) continue;
    const text: PinText = { title: pin.title };
    for (const field of TRANSLATED_FIELDS) if (field !== 'title' && pin[field]) text[field] = pin[field];
    out.push({ id: pin.id, ...text, sourceHash: hash, locales: missing });
    if (out.length >= limit) break;
  }
  return out;
}

export type TranslationInput = Partial<PinText> & { pinId: number; locale: string; sourceHash?: string };
export type ApplyResult = { saved: number; skipped: { pinId: number; locale: string; reason: string }[] };

// Saves translations made by hand. Each is checked against the pin as it is
// now: made from other words (its sourceHash no longer matches - the pin was
// edited since it was exported) it is skipped, as it would never be shown.
// Fields the pin does not have stay empty, as the Claude path leaves them.
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
    if (typeof row.title !== 'string' || !row.title.trim()) {
      skip('no title');
      continue;
    }
    const hash = sourceHash(pin);
    if (row.sourceHash && row.sourceHash !== hash) {
      skip('the pin changed since it was exported');
      continue;
    }
    const text: PinText = { title: row.title.trim() };
    for (const field of TRANSLATED_FIELDS) {
      if (field === 'title') continue;
      const value = row[field];
      text[field] = pin[field] && typeof value === 'string' && value.trim() ? value : null;
    }
    await PinTranslation.save(pin.id, row.locale, text, hash);
    touched.add(pin.id);
    result.saved++;
  }
  for (const id of touched) await expirePin(id);
  return result;
}

// Whether a pin shown in a language has its words in it; the pin page asks
// for a translation when not.
export function needsTranslation(pin: Localizable, locale: Locale): boolean {
  return locale !== DEFAULT_LOCALE && !pin.translatedTo;
}
