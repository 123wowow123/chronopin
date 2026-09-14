// The fixed pin categories. One list, shared by the extractor's schema and the
// pin form (the Angular app kept two copies in sync by hand). Add a new
// category here rather than filing a pin under "Other".
export const CATEGORIES = [
  'Consumer Electronics',
  'Software',
  'Computing & Semiconductors',
  'Gaming & Entertainment',
  'Space & Astronomy',
  'Infrastructure & Transportation',
  'Architecture & Real Estate',
  'Automotive',
  'Energy',
  'Corporate & Finance',
  'Policy & Legal',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

// URL slug for a category or company name: "Space & Astronomy" -> "space-astronomy".
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
