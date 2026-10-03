'use client';

import { useEffect, useState } from 'react';
import type { CulturalDay } from '../culturalDays';
import { withPageLang } from './navigation';

// A year's cultural holidays (/api/cultural-days), in the page's language,
// fetched once per year the timeline reaches. Years the catalog does not cover
// answer an empty map.
const FIRST_YEAR = 1986;
const LAST_YEAR = 2100;
const requests = new Map<number, Promise<Record<string, CulturalDay[]>>>();

export function loadCulturalDays(year: number): Promise<Record<string, CulturalDay[]>> {
  if (!Number.isInteger(year) || year < FIRST_YEAR || year > LAST_YEAR) return Promise.resolve({});
  let request = requests.get(year);
  if (!request) {
    request = fetch(withPageLang(`/api/cultural-days?year=${year}`))
      .then((res) => (res.ok ? (res.json() as Promise<Record<string, CulturalDay[]>>) : {}))
      .catch(() => {
        requests.delete(year);
        return {};
      });
    requests.set(year, request);
  }
  return request;
}

// The year a day key ("2026-09-25", "-2560-01-01") is in.
const yearOf = (dayKey: string) => Number(dayKey.slice(0, -6));

// Every holiday of the days shown, keyed by day: what the server drew, then
// each year the days reach as it arrives.
export function useCulturalDays(initial: Record<string, CulturalDay[]>, dayKeys: string[]) {
  const [byDay, setByDay] = useState(initial);
  const years = [...new Set(dayKeys.map(yearOf))].sort().join(',');
  useEffect(() => {
    let cancelled = false;
    for (const year of years ? years.split(',').map(Number) : []) {
      loadCulturalDays(year).then((found) => {
        if (!cancelled && Object.keys(found).length) setByDay((current) => ({ ...current, ...found }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [years]);
  return byDay;
}
