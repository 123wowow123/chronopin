// The fixed pin categories. One list, shared by the extractor's schema and the
// pin form (the Angular app kept two copies in sync by hand). Add a new
// category here rather than filing a pin under "Other".
export const CATEGORIES = [
  'Consumer Electronics',
  'Software',
  'AI Models',
  'Computing & Semiconductors',
  'Gaming & Entertainment',
  'Anime',
  'Anime Movie',
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
  'Cryptocurrency',
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

// Whether a tag's name is a category's (in any case): such a tag is a
// category tag, one of the cloud's top groups.
export function isCategory(name: string | null | undefined): boolean {
  if (!name) return false;
  const lower = name.trim().toLowerCase();
  return CATEGORIES.some((category) => category.toLowerCase() === lower);
}

// Whether a pin's categories include any of these, in any case.
export function hasCategory(categories: readonly (string | null | undefined)[] | null | undefined, wanted: readonly string[]): boolean {
  const lower = new Set(wanted.map((c) => c.toLowerCase()));
  return !!categories?.some((c) => !!c && lower.has(c.trim().toLowerCase()));
}

// A request body's categories: an array of names, one comma-separated string,
// or a single category (the old one-category field). Each in the list's
// spelling, without repeats; names not on the list are dropped. undefined
// when the body has none, which leaves a pin's categories as they are.
export function parseCategories(input: unknown): string[] | undefined {
  if (input === undefined || input === null) return undefined;
  const list = Array.isArray(input) ? input : typeof input === 'string' ? input.split(',') : [];
  const out: string[] = [];
  for (const raw of list) {
    if (typeof raw !== 'string' || !isCategory(raw)) continue;
    const name = canonicalCategory(raw.trim());
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

// The categories a pin's create or edit body gives: its categories (or the
// old single category), plus any category named among its tags. undefined
// when it names none at all, which leaves an edited pin's as they are.
export function bodyCategories(body: { categories?: unknown; category?: unknown }, tags: string[] | undefined): string[] | undefined {
  const given = parseCategories(body.categories ?? body.category);
  const typed = tags ? parseCategories(tags.filter(isCategory)) : undefined;
  if (given === undefined && !typed?.length) return undefined;
  return parseCategories([...(given ?? []), ...(typed ?? [])]);
}

// One category or a pin's list of them, as a list.
export function categoryList(categories: string | readonly (string | null | undefined)[] | null | undefined): string[] {
  if (!categories) return [];
  return (typeof categories === 'string' ? [categories] : categories).filter((c): c is string => !!c);
}

// The first of a pin's categories that is one of these, in the list's spelling.
export function firstCategoryOf(categories: string | readonly (string | null | undefined)[] | null | undefined, wanted: readonly string[]): string | undefined {
  const found = categoryList(categories).find((c) => hasCategory([c], wanted));
  return found && canonicalCategory(found.trim());
}
