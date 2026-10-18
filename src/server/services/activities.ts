// Data for the /activities landing pages: the seasonal-activity catalog joined to its backing pins.
// Every card links to the native pin page; an activity without a live pin is not shown.

import { cacheLife, cacheTag } from 'next/cache';
import * as db from '../db';
import Pins, { pinConfidenceOf } from '../model/pins';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import type { ActivityCatalogItem } from '@/lib/activities';
import { toJson, type PinJson } from '@/lib/types';
import { TAGS } from './cache';
import { timelineMinConfidence } from './timeline';
import { localizePins } from './translations';
import { activityCatalog, activityPinSourceUrls } from './activitySeed';

export type ActivityPin = PinJson & { activity: ActivityCatalogItem };

export async function activityPins(locale: Locale = DEFAULT_LOCALE): Promise<ActivityPin[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline, TAGS.sitemap);
  if (!activityCatalog.length) return [];
  const minConfidence = await timelineMinConfidence();
  const urls = activityPinSourceUrls();
  const rows = await db.query<{ id: number; sourceUrl: string }>(
    `SELECT p.id, p."sourceUrl" FROM "Pin" p
     WHERE p."sourceUrl" = ANY($1::text[]) AND p."utcDeletedDateTime" IS NULL
       AND ($2::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $2) >= $2)`,
    [[...urls.values()], minConfidence],
  );
  if (!rows.length) return [];
  const idByUrl = new Map(rows.map((row) => [row.sourceUrl, row.id]));
  const loaded = toJson<PinJson[]>((await Pins.queryByIds(rows.map((row) => row.id))).pins);
  await localizePins(loaded, locale);
  const pinById = new Map(loaded.map((pin) => [pin.id, pin]));
  const result: ActivityPin[] = [];
  for (const activity of activityCatalog) {
    const id = idByUrl.get(urls.get(`${activity.citySlug}/${activity.slug}`)!);
    const pin = id ? pinById.get(id) : undefined;
    if (pin) result.push({ ...pin, activity });
  }
  return result;
}
