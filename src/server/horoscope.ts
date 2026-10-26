// A user's horoscope for a day: the transits to their own chart, with the
// reading stored for that exact set of transits, or - when nothing is in
// aspect - the sun sign's reading.

import { birthMoment } from '@/lib/birthDetails';
import { sunSign } from '@/lib/horoscope';
import { natalChart, transitKey, transitsOn, type Transit } from '@/lib/transits';
import type { Birth } from './model/userBirth';

const charts = new Map<string, ReturnType<typeof natalChart>>();

// The chart is a pure function of the birth details, so it is kept.
function chartFor(birthday: string, birth: Birth | null) {
  const moment = birth?.time && birth.timeZone ? birthMoment(birthday, birth.time, birth.timeZone) : null;
  const key = `${birthday}|${moment?.toISOString() ?? ''}|${birth?.latitude ?? ''}|${birth?.longitude ?? ''}`;
  let chart = charts.get(key);
  if (!chart) {
    chart = natalChart(birthday, moment ? { at: moment, latitude: birth?.latitude ?? undefined, longitude: birth?.longitude ?? undefined } : undefined);
    if (charts.size > 5000) charts.clear();
    charts.set(key, chart);
  }
  return chart;
}

export type PersonalSky = { sign: string | null; transits: Transit[]; key: string };

export function personalSky(birthday: string | null | undefined, birth: Birth | null, day: string): PersonalSky | null {
  const sign = sunSign(birthday);
  if (!birthday || !sign) return null;
  const transits = transitsOn(chartFor(birthday, birth), day);
  return { sign: sign.slug, transits, key: transitKey(transits) };
}
