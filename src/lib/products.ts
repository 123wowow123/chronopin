import type { PinJson } from './types';

// Computing is left off: its pins are chips, supercomputers and retired
// headsets, news rather than something to buy.
// The /products landing page: product pins by shelf, each with where to buy
// it. The shelves are the categories whose pins are goods you can buy (not
// films, restaurants or events); see src/server/model/products.ts.

// A shelf is a category or a tag its pins carry, shown under its label. Order
// is the page's tab order, and a pin sits on the first shelf that has it.
export const PRODUCT_SHELVES = [
  { name: 'Electronics', label: 'Electronics' },
  { name: 'Audio', label: 'Audio' },
  { name: 'Fashion', label: 'Fashion' },
  { name: 'Watches', label: 'Watches' },
  { name: 'Gaming', label: 'Video Games' },
  { name: 'Tabletop', label: 'Board & Card Games' },
  { name: 'Collectibles', label: 'Collectibles' },
  { name: 'Ice Cream', label: 'Ice Cream' },
  { name: 'Snack', label: 'Snacks' },
  { name: 'Alcoholic Drinks', label: 'Alcoholic Drinks' },
  { name: 'Comics', label: 'Comics' },
];

// Products on one shelf.
export const SHELF_SIZE = 12;

// Fewer than this and the page is thin: it asks not to be indexed.
export const MIN_INDEXED_PRODUCTS = 8;

// The /cars page is thin below this and asks not to be indexed.
export const MIN_INDEXED_CARS = 8;


// Whether a product pin is suitable or crafted for kids and families:
// tagged Kids, Toys, or Family, categorized as such, explicitly marked, or
// describing children's / kid-friendly utility, and not an adult / alcoholic beverage.
export function isKidsFriendlyProduct(
  pin: Partial<PinJson> & { blurb?: string; kidsFriendly?: boolean },
  shelfName?: string,
): boolean {
  if (typeof pin.kidsFriendly === 'boolean') return pin.kidsFriendly;
  if (shelfName === 'Alcoholic Drinks') return false;

  const categories = (pin.categories ?? []).map((c) => (typeof c === 'string' ? c.trim() : '')).filter(Boolean);
  if (categories.some((c) => /alcoholic|alcohol/i.test(c))) return false;

  const tags = (pin.tags ?? [])
    .map((t) => (typeof t === 'string' ? t : t?.name ?? ''))
    .map((s) => s.trim())
    .filter(Boolean);
  if (tags.some((t) => /^(?:alcoholic drinks|alcohol|cider|beer|wine|whisky|whiskey|bourbon|vodka|gin|cocktails?|sake)$/i.test(t))) {
    return false;
  }

  const combinedText = [pin.title, pin.productName, pin.blurb, pin.description].filter(Boolean).join(' ');
  if (/\b(?:not for (?:kids|children)|unsuitable for (?:kids|children)|adults only|18\+|rated r|mature audience)\b/i.test(combinedText)) {
    return false;
  }

  if (tags.some((tag) => /^(?:kids?|family|child(?:ren)?|toys?|toddlers?|babies|baby)(?:[- ]friendly)?$/i.test(tag))) {
    return true;
  }

  if (categories.some((cat) => /^(?:kids?|family|child(?:ren)?|toys?|toddlers?|baby)$/i.test(cat))) {
    return true;
  }

  if (/\b(?:kids?[- ]friendly|child(?:ren)?[- ]friendly|family[- ]friendly|for (?:kids|children|toddlers|babies)|designed for (?:kids|children)|made for (?:kids|children))\b/i.test(combinedText)) {
    return true;
  }

  return false;
}
