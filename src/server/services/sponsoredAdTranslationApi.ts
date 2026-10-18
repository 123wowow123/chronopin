import { createHash } from 'node:crypto';
import { isLocale, LOCALES } from '@/lib/i18n/config';
import * as db from '../db';
import { HttpError } from '../http';
import Ad from '../model/ad';
import { readAdTranslations, type AdText, type AdTranslations } from '../extract/sponsoredAdTranslation';

type TranslationSource = AdText & { id: number; autoTranslate: boolean; translations: AdTranslations };
export function adTranslationHash(source: AdText): string {
  return createHash('sha256').update(JSON.stringify([source.title, source.body])).digest('hex');
}
async function sourceFor(id: number): Promise<TranslationSource> {
  const [ad] = await db.query<TranslationSource>(
    `SELECT "id", "title", "body", "autoTranslate", "translations" FROM "SponsoredAd" WHERE "id" = $1`, [id],
  );
  if (!ad) throw new HttpError(404, 'No such ad.');
  return ad;
}

// The session gets the exact source and hash, translates it itself, and sends
// back only the languages it has completed. No model is called by this API.
export async function exportAdTranslations(id: number) {
  const ad = await sourceFor(id);
  const translations = readAdTranslations(ad.translations, ad);
  return {
    id: ad.id, title: ad.title, body: ad.body, autoTranslate: ad.autoTranslate,
    sourceHash: adTranslationHash(ad), locales: LOCALES, translations,
    missingLocales: LOCALES.filter((locale) => !translations[locale]),
  };
}

export async function applyAdTranslations(id: number, input: Record<string, unknown>) {
  if (typeof input.sourceHash !== 'string' || !/^[a-f0-9]{64}$/.test(input.sourceHash)) throw new HttpError(422, 'sourceHash must be the hash returned by GET.');
  const raw = input.translations;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Object.keys(raw).length) throw new HttpError(422, 'Expected a non-empty translations object keyed by site language.');
  if ('autoTranslate' in input && typeof input.autoTranslate !== 'boolean') throw new HttpError(422, 'autoTranslate must be a boolean.');
  const ad = await sourceFor(id);
  if (adTranslationHash(ad) !== input.sourceHash) throw new HttpError(409, 'The ad text changed. Fetch the source again before translating.');
  const translations = readAdTranslations(raw, ad);
  for (const [locale, text] of Object.entries(raw)) {
    if (!isLocale(locale) || !translations[locale]) throw new HttpError(422, `Invalid or incomplete translation for ${locale}. Supply a non-empty title (up to 240 characters) and body (up to 560 characters).`);
    if (!ad.body.trim() && (text as AdText).body.trim()) throw new HttpError(422, 'An ad without body text must keep its translated body empty.');
  }
  const [saved] = await db.query<{ autoTranslate: boolean }>(
    `UPDATE "SponsoredAd" SET "translations" = "translations" || $2::jsonb,
       "autoTranslate" = coalesce($5::boolean, "autoTranslate"), "utcUpdatedDateTime" = now()
     WHERE "id" = $1 AND "title" = $3 AND "body" = $4 RETURNING "autoTranslate"`,
    [id, JSON.stringify(translations), ad.title, ad.body, input.autoTranslate ?? null],
  );
  if (!saved) throw new HttpError(409, 'The ad text changed during save. Fetch the source again before translating.');
  Ad.expireInventory();
  return { saved: Object.keys(translations).length, locales: Object.keys(translations), sourceHash: input.sourceHash, autoTranslate: saved.autoTranslate };
}


export async function pendingAdTranslations(limit = 25, after = 0) {
  const rows = await db.query<TranslationSource>(
    `SELECT "id", "title", "body", "autoTranslate", "translations" FROM "SponsoredAd"
     WHERE "autoTranslate" AND "id" > $1 ORDER BY "id" LIMIT $2`, [after, limit],
  );
  const ads = rows.flatMap((ad) => {
    const translations = readAdTranslations(ad.translations, ad);
    const missingLocales = LOCALES.filter((locale) => !translations[locale]);
    return missingLocales.length ? [{ id: ad.id, title: ad.title, body: ad.body, sourceHash: adTranslationHash(ad), missingLocales }] : [];
  });
  return { ads, nextAfter: rows.length === limit ? rows[rows.length - 1].id : null };
}
