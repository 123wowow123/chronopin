// Kept apart from restaurantMenus so client code can classify categories without bundling the menu data.
const DRINK_CATEGORY = /\b(drinks?|beverages?|cocktails?|beers?|wines?|spirits|alcohol|coffee|tea)\b/i;
export function isDrinkCategory(category: string): boolean {
  return DRINK_CATEGORY.test(category) && !/^food\b/i.test(category);
}
