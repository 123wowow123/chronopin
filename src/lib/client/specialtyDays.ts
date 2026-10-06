'use client';

import { withPageLang } from './navigation';
import type { SpecialtyDay } from '../specialtyDays';

// All specialty days, in the page's language, fetched once when a page
// beyond the first needs them.
let specialtyRequest: Promise<Record<string, SpecialtyDay[]>> | null = null;

export function loadSpecialtyDays() {
  // `v` busts the browser's hour-long cache of the response when its shape changes (3: customs).
  specialtyRequest ??= fetch(withPageLang('/api/specialty-days?v=3'))
    .then((res) => res.json())
    .catch(() => {
      specialtyRequest = null;
      return {};
    });
  return specialtyRequest;
}
