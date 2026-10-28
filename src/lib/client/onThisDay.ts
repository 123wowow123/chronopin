'use client';

import { useEffect, useState } from 'react';
import type { OnThisDay } from '../onThisDay';

// All dates' historical events, fetched once the first time a timeline date
// asks for one and shared by every tag after.
let request: Promise<Record<string, OnThisDay>> | null = null;
let loaded: Record<string, OnThisDay> | null = null;

function load() {
  // `v` busts the browser's hour-long cache of the response when its data changes.
  request ??= fetch('/api/on-this-day?v=1')
    .then((res) => res.json())
    .then((all) => (loaded = all))
    .catch(() => {
      request = null;
      return {};
    });
  return request;
}

// The event of a date ("10-27"), once loaded; undefined until then.
export function useOnThisDay(monthDay: string): OnThisDay | undefined {
  const [all, setAll] = useState(loaded);
  useEffect(() => {
    if (!loaded) load().then(setAll);
  }, []);
  return all?.[monthDay];
}
