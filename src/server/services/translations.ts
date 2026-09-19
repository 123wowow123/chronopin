// Pins in the page's language. A page (or API answer) in a language other
// than English shows each pin's translation in place of its own words, when
// one has been made from the pin as it is now; otherwise the pin's own words.
// Translations are made in the background: when a pin is saved, when its page
// is first read in a language it lacks, and by `npm run translations:sync`.

import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
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

// Translates the pin into every language whose translation is missing or
// out of date, and saves them. Resolves to how many were saved.
export async function translatePin(pinId: number, { force = false }: { force?: boolean } = {}): Promise<number> {
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
    const wanted = TARGET_LOCALES.filter((l) => force || !fresh.has(l));
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
    if (saved) {
      // Outside a request (the backfill script) there is no page cache to
      // expire; the pages pick the translations up when theirs runs out.
      try {
        const { invalidatePin } = await import('./cache');
        invalidatePin(pinId);
      } catch {}
    }
    return saved;
  } finally {
    translating.delete(pinId);
  }
}

// The same, not waited for: a page read in a language the pin lacks.
export function requestTranslation(pinId: number) {
  inBackground(translatePin(pinId).catch((err) => log.warn(`translation failed for pin ${pinId}:`, (err as Error).message)));
}

// Whether a pin shown in a language has its words in it; the pin page asks
// for a translation when not.
export function needsTranslation(pin: Localizable, locale: Locale): boolean {
  return locale !== DEFAULT_LOCALE && !pin.translatedTo;
}
