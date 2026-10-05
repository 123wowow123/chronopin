import { isLocale, type Locale } from '@/lib/i18n/config';
import * as db from '../db';
import { TARGET_LOCALES, translateAdTitle, type TargetLocale } from '../extract/translate';
import log from '../util/log';
import { AD_TITLE_MAX, adTitleHash } from './pinAdTranslation';

// A holiday ad's title in the other languages (0129), the counterpart of
// PinAdTranslation for the HolidayAd listings (0121). Shown only while its
// sourceHash matches the ad's title as stored now.

export type HolidayTitleInput = { holidayAdId: number; locale: string; sourceHash: string; title: string };
export type HolidayTitleToTranslate = { holidayAdId: number; title: string; sourceHash: string; locales: TargetLocale[] };

export default class HolidayAdTranslation {
  // The title of each ad in `locale` made from its current English title, by ad id.
  static async forAds(titles: Map<number, string>, locale: Locale): Promise<Map<number, string>> {
    const out = new Map<number, string>();
    if (locale === 'en' || !titles.size) return out;
    const rows = await db.query<{ holidayAdId: number; title: string; sourceHash: string }>(
      `SELECT "holidayAdId", "title", "sourceHash" FROM "HolidayAdTranslation" WHERE "locale" = $1 AND "holidayAdId" = ANY($2::integer[])`,
      [locale, [...titles.keys()]],
    );
    for (const row of rows) {
      const english = titles.get(row.holidayAdId);
      if (english != null && row.sourceHash.trim() === adTitleHash(english)) out.set(row.holidayAdId, row.title);
    }
    return out;
  }

  // Working ads with a language lacking a current translation of their title.
  static async pending(locales: readonly TargetLocale[] = TARGET_LOCALES, limit = 100000): Promise<HolidayTitleToTranslate[]> {
    const ads = await db.query<{ id: number; title: string }>(`SELECT "id", "title" FROM "HolidayAd" WHERE "status" = 'ok' ORDER BY "id"`);
    const rows = await db.query<{ holidayAdId: number; locale: string; sourceHash: string }>(`SELECT "holidayAdId", "locale", "sourceHash" FROM "HolidayAdTranslation"`);
    const have = new Set(rows.map((r) => `${r.holidayAdId}:${r.locale}:${r.sourceHash.trim()}`));
    const out: HolidayTitleToTranslate[] = [];
    for (const ad of ads) {
      const hash = adTitleHash(ad.title);
      const missing = locales.filter((l) => !have.has(`${ad.id}:${l}:${hash}`));
      if (missing.length) out.push({ holidayAdId: ad.id, title: ad.title, sourceHash: hash, locales: missing });
      if (out.length >= limit) break;
    }
    return out;
  }

  // Saves hand or model translations, skipping a row for an ad that is gone,
  // was renamed since the hash was taken, or whose words are empty.
  static async apply(rows: HolidayTitleInput[]): Promise<{ saved: number; skipped: { holidayAdId: number; locale: string; reason: string }[] }> {
    const skipped: { holidayAdId: number; locale: string; reason: string }[] = [];
    let saved = 0;
    const ids = [...new Set(rows.map((r) => r.holidayAdId))].filter((id) => Number.isInteger(id));
    const ads = ids.length ? await db.query<{ id: number; title: string }>(`SELECT "id", "title" FROM "HolidayAd" WHERE "id" = ANY($1::integer[])`, [ids]) : [];
    const current = new Map(ads.map((a) => [a.id, adTitleHash(a.title)]));
    for (const row of rows) {
      const skip = (reason: string) => skipped.push({ holidayAdId: row.holidayAdId, locale: row.locale, reason });
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      if (!isLocale(row.locale) || row.locale === 'en') skip('not a language the site translates into');
      else if (!current.has(row.holidayAdId)) skip('no such ad');
      else if (current.get(row.holidayAdId) !== row.sourceHash) skip('the ad was renamed since');
      else if (!/[\p{L}\p{N}]/u.test(title) || title.length > AD_TITLE_MAX) skip('empty or too long');
      else {
        await db.query(
          `INSERT INTO "HolidayAdTranslation" ("holidayAdId", "locale", "title", "sourceHash") VALUES ($1, $2, $3, $4)
           ON CONFLICT ("holidayAdId", "locale") DO UPDATE SET "title" = EXCLUDED."title", "sourceHash" = EXCLUDED."sourceHash", "utcUpdatedDateTime" = now()`,
          [row.holidayAdId, row.locale, title, row.sourceHash],
        );
        saved++;
      }
    }
    return { saved, skipped };
  }

  // Translates the ads lacking a current translation through the API key.
  // Without a key, or on a failed call, an ad is left as it was.
  static async translateMissing({ locales = TARGET_LOCALES, limit = 50, holidayAdId }: { locales?: readonly TargetLocale[]; limit?: number; holidayAdId?: number } = {}): Promise<number> {
    let todo = await HolidayAdTranslation.pending(locales);
    if (holidayAdId != null) todo = todo.filter((t) => t.holidayAdId === holidayAdId);
    let saved = 0;
    for (const item of todo.slice(0, limit)) {
      const titles = await translateAdTitle(item.title, item.locales);
      if (!titles) continue;
      const rows = Object.entries(titles).map(([locale, title]) => ({ holidayAdId: item.holidayAdId, locale, sourceHash: item.sourceHash, title: title.slice(0, AD_TITLE_MAX) }));
      saved += (await HolidayAdTranslation.apply(rows)).saved;
    }
    if (saved) log.info(`Holiday ad titles translated: ${saved} row(s)`);
    return saved;
  }
}
