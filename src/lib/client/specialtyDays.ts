'use client';

// All specialty days, fetched once when a page beyond the first needs them.
let specialtyRequest: Promise<Record<string, string[]>> | null = null;

export function loadSpecialtyDays() {
  specialtyRequest ??= fetch('/api/specialty-days')
    .then((res) => res.json())
    .catch(() => {
      specialtyRequest = null;
      return {};
    });
  return specialtyRequest;
}
