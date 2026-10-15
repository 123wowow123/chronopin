import { after } from 'next/server';
import { LOCALES, type Locale } from '@/lib/i18n/config';
import type { AdJson } from '@/lib/ads';
import * as db from '../db';
import Ad from '../model/ad';
import { readAdTranslations, translateSponsoredAd, type AdTranslations } from '../extract/sponsoredAdTranslation';
import log from '../util/log';

export async function refreshAdTranslations(id: number): Promise<void> {
  const [ad] = await db.query<{ title: string; body: string; translations: AdTranslations }>(
    `SELECT "title", "body", "translations" FROM "SponsoredAd" WHERE "id" = $1 AND "autoTranslate"`, [id],
  );
  if (!ad) return;
  const existing = readAdTranslations(ad.translations, ad);
  if (LOCALES.every((locale) => existing[locale])) return;
  const translated = await translateSponsoredAd(ad);
  if (!translated || !Object.keys(translated).length) return;
  // An in-flight translation must never overwrite translations for newer text,
  // or become visible after the owner has switched translation off.
  await db.query(
    `UPDATE "SponsoredAd" SET "translations" = $2::jsonb || "translations"
     WHERE "id" = $1 AND "autoTranslate" AND "title" = $3 AND "body" = $4`,
    [id, JSON.stringify(translated), ad.title, ad.body],
  );
  Ad.expireInventory();
}

export function scheduleAdTranslation(ad: { id: number; autoTranslate: boolean }) {
  if (ad.autoTranslate) after(() => refreshAdTranslations(ad.id).catch((error) => {
    log.warn('Sponsored ad translation failed:', (error as Error).message);
  }));
}

// Read saved translations only; serving an ad never calls a model.
export async function localizeSponsoredAds(ads: AdJson[], locale: Locale): Promise<void> {
  const ids = ads.filter((ad) => ad.kind === 'sponsored' && /^u:\d+$/.test(ad.key)).map((ad) => Number(ad.key.slice(2)));
  if (!ids.length) return;
  const rows = await db.query<{ id: number; title: string; body: string; translations: AdTranslations }>(
    `SELECT "id", "title", "body", "translations" FROM "SponsoredAd" WHERE "id" = ANY($1::int[]) AND "autoTranslate"`, [ids],
  );
  for (const row of rows) {
    const text = readAdTranslations(row.translations, row)[locale];
    const ad = ads.find((item) => item.key === `u:${row.id}`);
    // Also protect against an inventory snapshot taken before a source edit.
    if (text && ad && ad.title === row.title && (ad.body ?? '') === row.body) {
      ad.title = text.title;
      ad.body = text.body || null;
    }
  }
}
