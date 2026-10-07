import regional from '@/server/data/regionalRestaurants.json';
import sanDiego from '@/server/data/topRestaurants.json';
import prices from '@/server/data/restaurantPrices.json';
import { restaurantSourceKey } from '@/lib/restaurantMenus';

const ranges = new Map([...sanDiego, ...regional, ...prices.map((price) => ({ sourceUrl: price.pinSourceUrl, priceRange: price.priceRange }))].flatMap((restaurant) => {
  const range = 'priceRange' in restaurant ? restaurant.priceRange : undefined;
  return range && /^\${1,4}$/.test(range)
    ? [[restaurantSourceKey(restaurant.sourceUrl), range] as const]
    : [];
}));

export function restaurantPriceRange(sourceUrl: string | null | undefined): string | undefined {
  return sourceUrl ? ranges.get(restaurantSourceKey(sourceUrl)) : undefined;
}
