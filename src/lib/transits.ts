// Today's transits against a natal chart, from planetary positions alone.
// A birthday gives the day, not the hour, so the natal planets are read at
// noon UTC; the Moon moves 13 degrees a day and is left out until a birth
// time is known (see natalChart's `born`). The chart is tropical, as astro.com's
// default is, and the aspects are the five major ones.

import { Body, e_tilt, Ecliptic, GeoVector, MakeTime, SiderealTime } from 'astronomy-engine';

const PLANETS = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'] as const;
// The Moon and the Ascendant need the hour and place of birth.
export type Planet = (typeof PLANETS)[number] | 'Moon' | 'Ascendant';

// Aspect angles; the sextile is the weakest and gets half the orb.
const ASPECTS = [
  { name: 'conjunction', angle: 0, orb: 1 },
  { name: 'sextile', angle: 60, orb: 0.5 },
  { name: 'square', angle: 90, orb: 1 },
  { name: 'trine', angle: 120, orb: 1 },
  { name: 'opposition', angle: 180, orb: 1 },
] as const;
export type AspectName = (typeof ASPECTS)[number]['name'];

// Geocentric ecliptic longitude of date, in degrees 0-360.
export function longitude(body: Exclude<Planet, 'Ascendant'>, date: Date): number {
  const time = MakeTime(date);
  // The vector from Earth, light-time corrected, in the ecliptic of date.
  const lon = Ecliptic(GeoVector(Body[body], time, true)).elon;
  return ((lon % 360) + 360) % 360;
}

export type Chart = Partial<Record<Planet, number>>;

// The ecliptic longitude rising on the eastern horizon at an instant and place.
export function ascendant(date: Date, latitude: number, eastLongitude: number): number {
  const time = MakeTime(date);
  const rad = Math.PI / 180;
  // Local sidereal time as an angle (the "RAMC"), and the obliquity of the ecliptic.
  const ramc = (((SiderealTime(time) * 15 + eastLongitude) % 360) + 360) % 360 * rad;
  const eps = e_tilt(time).mobl * rad;
  const asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(latitude * rad) * Math.sin(eps))) / rad;
  return ((asc % 360) + 360) % 360;
}

// A birthday (YYYY-MM-DD) as a chart: noon UTC unless the exact moment is
// known, in which case the Moon and, with a place, the Ascendant join it.
export function natalChart(birthday: string, born?: { at: Date; latitude?: number; longitude?: number }): Chart {
  const when = born?.at ?? new Date(`${birthday}T12:00:00Z`);
  const chart: Chart = {};
  for (const p of born ? [...PLANETS, 'Moon' as const] : PLANETS) chart[p] = longitude(p, when);
  if (born && born.latitude != null && born.longitude != null) chart.Ascendant = ascendant(when, born.latitude, born.longitude);
  return chart;
}

// Where every planet is at noon UTC on a day.
export function transitChart(day: string): Chart {
  const when = new Date(`${day}T12:00:00Z`);
  const chart: Chart = {};
  for (const p of PLANETS) chart[p] = longitude(p, when);
  return chart;
}

export type Transit = { planet: Planet; aspect: AspectName; natal: Planet; orb: number };

// The angle between two longitudes, 0-180.
const separation = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

// Slow planets matter more, and a Sun-on-Sun return is the least news.
const WEIGHT: Record<string, number> = { Pluto: 6, Neptune: 6, Uranus: 5, Saturn: 5, Jupiter: 4, Mars: 3, Venus: 2, Mercury: 2, Sun: 1, Moon: 2, Ascendant: 5 };

// Transiting planets in aspect to natal planets on a day, strongest first,
// at most `limit`. A planet in aspect to its own natal place is kept (a Sun
// return is its own story) but a transit of one planet to itself by the same
// aspect can only be a conjunction.
export function transitsOn(natal: Chart, day: string, limit = 3): Transit[] {
  const sky = transitChart(day);
  const found: Transit[] = [];
  for (const planet of PLANETS) {
    for (const target of Object.keys(natal) as Planet[]) {
      const sep = separation(sky[planet]!, natal[target]!);
      for (const a of ASPECTS) {
        const orb = Math.abs(sep - a.angle);
        if (orb <= a.orb) found.push({ planet, aspect: a.name, natal: target, orb: Math.round(orb * 100) / 100 });
      }
    }
  }
  const score = (t: Transit) => WEIGHT[t.planet] + WEIGHT[t.natal] - t.orb * 4;
  return found.sort((x, y) => score(y) - score(x)).slice(0, limit);
}

// A stable key for a set of transits, so everyone with the same sky today
// shares one reading: "Sun conjunction Pluto|Mars trine Venus".
export const transitKey = (transits: Transit[]) =>
  transits
    .map((t) => `${t.planet} ${t.aspect} ${t.natal}`)
    .sort()
    .join('|');

export const describeTransit = (t: Transit) => `Transiting ${t.planet} ${t.aspect} natal ${t.natal} (orb ${t.orb}°)`;
