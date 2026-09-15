// The fixed pin categories. One list, shared by the extractor's schema and the
// pin form (the Angular app kept two copies in sync by hand). Add a new
// category here rather than filing a pin under "Other".
export const CATEGORIES = [
  'Consumer Electronics',
  'Software',
  'Computing & Semiconductors',
  'Gaming & Entertainment',
  'Anime',
  'Movies',
  'TV Series',
  'Music & Audio',
  'Sports',
  'Science & Research',
  'Marine',
  'Climate & Environment',
  'Geopolitics',
  'Demographics',
  'Robotics',
  'Health & Medicine',
  'Food & Beverage',
  'Futurism',
  'Space & Astronomy',
  'Infrastructure & Transportation',
  'Architecture & Real Estate',
  'Aerospace',
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

// The list's spelling of a category typed in any case, or the value itself
// when it is not on the list.
export function canonicalCategory(value: string): string {
  const lower = value.toLowerCase();
  return CATEGORIES.find((category) => category.toLowerCase() === lower) ?? value;
}

// The category filter's pills: every category with pins (counts keyed by
// lowercased category), plus the picked ones so they can be unpicked even
// when nothing matches - busiest first, then by name.
export function categoryOptions(counts: Record<string, number>, selected: string[] = []): { name: string; count: number }[] {
  const byKey = new Map<string, { name: string; count: number }>();
  for (const [key, count] of Object.entries(counts)) {
    if (key && count > 0) byKey.set(key.toLowerCase(), { name: canonicalCategory(key), count });
  }
  for (const name of selected) {
    const key = name.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, { name: canonicalCategory(name), count: 0 });
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
