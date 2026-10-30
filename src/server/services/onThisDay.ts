// Data for the /on-this-day/[day] pages: what Chronopin has pinned on one
// calendar day (UTC, "10-30") in earlier years, grouped by year, newest year
// first. Cached with Cache Components like src/server/services/topics.ts.

import { cacheLife, cacheTag } from 'next/cache';
import Pins from '../model/pins';
import Topics from '../model/topics';
import onThisDayTable from '../data/onThisDay.json';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { dayKeyIn } from '@/lib/format';
import type { OnThisDay } from '@/lib/onThisDay';
import { toJson, type PinJson } from '@/lib/types';
import { TAGS } from './cache';
import { timelineMinConfidence } from './timeline';
import { localizePins } from './translations';

// A busy year (the current one) must not crowd out the others.
const PER_YEAR = 4;
const MAX_PINS = 60;

export type YearGroup = { year: number; pins: PinJson[]; total: number };

export type OnThisDayPage = {
  monthDay: string;
  years: YearGroup[];
  // Pins on this day in all earlier years, shown or not.
  total: number;
  // The one Wikipedia headline for the date (src/server/data/onThisDay.json).
  headline: OnThisDay | null;
  // The earliest year with a pin: the span the sentence quotes.
  firstYear: number | null;
};

export async function onThisDayPage(monthDay: string, locale: Locale = DEFAULT_LOCALE): Promise<OnThisDayPage> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline);
  const rows = await Topics.onThisDayIds(monthDay, new Date(), await timelineMinConfidence());
  const groups = new Map<number, number[]>();
  for (const row of rows) {
    // Astronomical year of the UTC day: 1 BC is 0, 2561 BC is -2560.
    const year = Number(dayKeyIn(row.start, 'UTC').slice(0, -6));
    groups.set(year, [...(groups.get(year) ?? []), row.id]);
  }
  const picked = [...groups].sort((a, b) => b[0] - a[0]).map(([year, ids]) => ({ year, ids, shown: ids.slice(0, PER_YEAR) }));
  const wanted: number[] = [];
  for (const g of picked) if (wanted.length + g.shown.length <= MAX_PINS) wanted.push(...g.shown);
  const loaded = toJson<PinJson[]>((await Pins.queryByIds(wanted)).pins);
  await localizePins(loaded, locale);
  const byId = new Map(loaded.map((p) => [p.id, p]));
  const years: YearGroup[] = picked
    .map((g) => ({ year: g.year, total: g.ids.length, pins: g.shown.map((id) => byId.get(id)).filter((p): p is PinJson => !!p) }))
    .filter((g) => g.pins.length);
  return {
    monthDay,
    years,
    total: rows.length,
    headline: (onThisDayTable as Record<string, OnThisDay>)[monthDay] ?? null,
    firstYear: picked.length ? picked[picked.length - 1].year : null,
  };
}
