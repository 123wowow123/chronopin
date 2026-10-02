import { createHash } from 'node:crypto';
import { isLocale, type Locale } from '@/lib/i18n/config';
import * as db from '../db';
import { TARGET_LOCALES, translateAdTitle, type TargetLocale } from '../extract/translate';
import log from '../util/log';

// A chosen ad's title in the other languages (0115): the Amazon listing's
// English title, translated so a reader's ad reads in their language. A row
// is shown only while its sourceHash matches the ad's title as stored now (the
// check job renames a listing's ad when Amazon does), else the English shows.

export const AD_TITLE_MAX = 300;

export type AdTitleInput = { pinAdId: number; locale: string; sourceHash: string; title: string };
export type AdTitleToTranslate = { pinAdId: number; title: string; sourceHash: string; locales: TargetLocale[] };

export const adTitleHash = (title: string) => createHash('sha1').update(title).digest('hex');

export default class PinAdTranslation {
  // The title of each ad in `locale` that has one made from its current
  // English title, by ad id. `titles` is each ad's English title.
  static async forAds(titles: Map<number, string>, locale: Locale): Promise<Map<number, string>> {
    const out = new Map<number, string>();
    if (locale === 'en' || !titles.size) return out;
    const rows = await db.query<{ pinAdId: number; title: string; sourceHash: string }>(
      `SELECT "pinAdId", "title", "sourceHash" FROM "PinAdTranslation" WHERE "locale" = $1 AND "pinAdId" = ANY($2::integer[])`,
      [locale, [...titles.keys()]],
    );
    for (const row of rows) {
      const english = titles.get(row.pinAdId);
      if (english != null && row.sourceHash.trim() === adTitleHash(english)) out.set(row.pinAdId, row.title);
    }
    return out;
  }

  // Working ads with a language lacking a current translation of their title.
  static async pending(locales: readonly TargetLocale[] = TARGET_LOCALES, limit = 100000): Promise<AdTitleToTranslate[]> {
    const ads = await db.query<{ id: number; title: string }>(`SELECT "id", "title" FROM "PinAd" WHERE "status" = 'ok' ORDER BY "id"`);
    const rows = await db.query<{ pinAdId: number; locale: string; sourceHash: string }>(`SELECT "pinAdId", "locale", "sourceHash" FROM "PinAdTranslation"`);
    const have = new Set(rows.map((r) => `${r.pinAdId}:${r.locale}:${r.sourceHash.trim()}`));
    const out: AdTitleToTranslate[] = [];
    for (const ad of ads) {
      const hash = adTitleHash(ad.title);
      const missing = locales.filter((l) => !have.has(`${ad.id}:${l}:${hash}`));
      if (missing.length) out.push({ pinAdId: ad.id, title: ad.title, sourceHash: hash, locales: missing });
      if (out.length >= limit) break;
    }
    return out;
  }

  // Saves hand or model translations, skipping a row for an ad that is gone,
  // was renamed since the hash was taken, or whose words are empty.
  static async apply(rows: AdTitleInput[]): Promise<{ saved: number; skipped: { pinAdId: number; locale: string; reason: string }[] }> {
    const skipped: { pinAdId: number; locale: string; reason: string }[] = [];
    let saved = 0;
    const ids = [...new Set(rows.map((r) => r.pinAdId))].filter((id) => Number.isInteger(id));
    const ads = ids.length ? await db.query<{ id: number; title: string }>(`SELECT "id", "title" FROM "PinAd" WHERE "id" = ANY($1::integer[])`, [ids]) : [];
    const current = new Map(ads.map((a) => [a.id, adTitleHash(a.title)]));
    for (const row of rows) {
      const skip = (reason: string) => skipped.push({ pinAdId: row.pinAdId, locale: row.locale, reason });
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      if (!isLocale(row.locale) || row.locale === 'en') skip('not a language the site translates into');
      else if (!current.has(row.pinAdId)) skip('no such ad');
      else if (current.get(row.pinAdId) !== row.sourceHash) skip('the ad was renamed since');
      else if (!/[\p{L}\p{N}]/u.test(title) || title.length > AD_TITLE_MAX) skip('empty or too long');
      else {
        await db.query(
          `INSERT INTO "PinAdTranslation" ("pinAdId", "locale", "title", "sourceHash") VALUES ($1, $2, $3, $4)
           ON CONFLICT ("pinAdId", "locale") DO UPDATE SET "title" = EXCLUDED."title", "sourceHash" = EXCLUDED."sourceHash", "utcUpdatedDateTime" = now()`,
          [row.pinAdId, row.locale, title, row.sourceHash],
        );
        saved++;
      }
    }
    return { saved, skipped };
  }

  // Translates the ads that lack a current translation into `locales` (the
  // site's other languages by default), through the API key. Without a key,
  // or on a failed call, an ad is left as it was. Answers how many rows saved.
  static async translateMissing({ locales = TARGET_LOCALES, limit = 50, pinAdId }: { locales?: readonly TargetLocale[]; limit?: number; pinAdId?: number } = {}): Promise<number> {
    let todo = await PinAdTranslation.pending(locales);
    if (pinAdId != null) todo = todo.filter((t) => t.pinAdId === pinAdId);
    let saved = 0;
    for (const item of todo.slice(0, limit)) {
      const titles = await translateAdTitle(item.title, item.locales);
      if (!titles) continue;
      const rows = Object.entries(titles).map(([locale, title]) => ({ pinAdId: item.pinAdId, locale, sourceHash: item.sourceHash, title: title.slice(0, AD_TITLE_MAX) }));
      saved += (await PinAdTranslation.apply(rows)).saved;
    }
    if (saved) log.info(`Ad titles translated: ${saved} row(s)`);
    return saved;
  }
}
