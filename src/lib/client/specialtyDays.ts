'use client';

import { withPageLang } from './navigation';
import type { SpecialtyDay } from '../specialtyDays';

// All specialty days, in the page's language, fetched once when a page
// beyond the first needs them.
let specialtyRequest: Promise<Record<string, SpecialtyDay[]>> | null = null;

export function loadSpecialtyDays() {
  specialtyRequest ??= fetch(withPageLang('/api/specialty-days'))
    .then((res) => res.json())
    .catch(() => {
      specialtyRequest = null;
      return {};
    });
  return specialtyRequest;
}
