import type { RestaurantMenu } from '../../src/lib/restaurantMenus';

type SourceItem = { title?: string; price?: string | number | null; variationGroups?: { items?: SourceItem[] }[] };
export type SourceSpecialMenu = {
  title?: string;
  description?: string | null;
  sections?: { title?: string; description?: string | null; items?: SourceItem[] }[];
};

const happyHour = /happy[\s-]*hour|social[\s-]*hour|golden[\s-]*hour/i;
const clean = (value?: string | null) => (value ?? '').replace(/<[^>]+>/g, '').replace(/\*+|\^+/g, '').trim();
const priceOf = (value: SourceItem['price']) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) < 1000 ? Number(value) : undefined;

// Import facts from an already verified, branch-specific published menu.
// A combined regular/happy-hour menu requires explicit happy-hour prices.
export function importSpecialMenu(menu: SourceSpecialMenu): { items: RestaurantMenu['items']; full: boolean; conditions: string[] } {
  const mixed = /à la carte|a la carte|bar menu|dinner|brunch|lunch/i.test(menu.title ?? '');
  const sections = menu.sections ?? [];
  const happySection = sections.findIndex((section) => happyHour.test(section.title ?? ''));
  const items: RestaurantMenu['items'] = [];
  for (const [index, section] of sections.entries()) {
    if (happySection >= 0 && index < happySection) continue;
    if (/brunch|dinner|lunch|regular menu/i.test(section.title ?? '') && !happyHour.test(section.title ?? '')) continue;
    const category = clean(section.title) || 'Specials';
    const terms = `${section.title ?? ''} ${section.description ?? ''}`;
    const reduction = terms.match(/\$(\d+(?:\.\d+)?)\s*off/i);
    const discount = reduction ? `$${reduction[1]} off regular price` : /half[\s-]*(?:price|off)|1\/2\s*off|50%\s*off/i.test(terms) ? '50% off regular price' : undefined;
    for (const item of section.items ?? []) {
      const name = clean(item.title);
      if (!name) continue;
      const variations = item.variationGroups?.flatMap((group) => group.items ?? []) ?? [];
      const happyVariations = variations.filter((variation) => happyHour.test(variation.title ?? ''));
      if (happyVariations.length) {
        for (const variation of happyVariations) {
          const price = priceOf(variation.price);
          if (price === undefined) continue;
          const portion = clean(variation.title).replace(/happy[\s-]*hour\s*[-–:]?\s*/i, '').trim();
          items.push({ name: portion ? `${name} — ${portion}` : name, category, price });
        }
        continue;
      }
      if (mixed && happySection < 0) continue;
      if (discount) {
        items.push({ name, category, priceLabel: discount });
        continue;
      }
      const price = priceOf(item.price);
      if (price !== undefined) items.push({ name, category, price });
      else for (const variation of variations) {
        if (/regular|dinner|lunch|brunch|taco tuesday/i.test(variation.title ?? '')) continue;
        const price = priceOf(variation.price);
        if (price !== undefined) items.push({ name: `${name} — ${clean(variation.title)}`, category, price });
      }
    }
  }
  const unique = [...new Map(items.map((item) => [`${item.category}\0${item.name}`, item])).values()];
  const drink = (item: RestaurantMenu['items'][number]) => Number(/cocktail|wine|beer|draft|drink|liquor|spirit|beverage|sake/i.test(item.category ?? ''));
  unique.sort((a, b) => drink(a) - drink(b));
  // Retain a useful sample when a publisher's menu is unusually long.
  let words = 0;
  const selected = unique.filter((item) => { words += item.name.split(/\s+/).length; return words <= 140; });
  const text = [menu.description, ...sections.flatMap((section) => [section.title, section.description])].join(' ');
  const surcharges = [...text.matchAll(/(\d+(?:\.\d+)?)%\s+(?:[\w-]+\s+){0,3}surcharge|surcharge\s+(?:of\s+)?(\d+(?:\.\d+)?)%/gi)].map((match) => match[1] || match[2]);
  const conditions = [...new Set(surcharges.map((amount) => `Published menu lists a ${amount}% surcharge.`))];
  if (/dine[\s-]*in only|not available for take out/i.test(text)) conditions.push('Dine-in only.');
  if (/bar\s*(?:&|and|\+)\s*patio/i.test(text)) conditions.push('Available in the bar and patio.');
  else if (/bar only|served in the bar|at the bar|in bar only|bar seats|bar areas/i.test(text)) conditions.push('Available in the bar.');
  if (/patio only/i.test(text)) conditions.push('Patio seating only.');
  if (/weather permitting/i.test(text)) conditions.push('Subject to suitable weather.');
  return { items: selected, full: selected.length === unique.length && !mixed, conditions };
}
