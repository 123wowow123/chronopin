import type { RestaurantMenuProfile, RestaurantPhoto } from './restaurantMenus';

export type RestaurantCardPhoto = Pick<RestaurantPhoto, 'src' | 'alt' | 'credit'> & { sourceUrl?: string; originalUrl?: string };

export function restaurantCardPhotos(photos: (RestaurantCardPhoto | undefined)[]): RestaurantCardPhoto[] {
  const seen = new Set<string>();
  return photos.filter((photo): photo is RestaurantCardPhoto => {
    if (!photo?.src || seen.has(photo.src) || (photo.originalUrl && seen.has(photo.originalUrl))) return false;
    seen.add(photo.src);
    if (photo.originalUrl) seen.add(photo.originalUrl);
    return true;
  }).slice(0, 10);
}

export function restaurantProfilePhotos(profile?: RestaurantMenuProfile): RestaurantCardPhoto[] {
  return restaurantCardPhotos([
    profile?.photo, ...profile?.photos ?? [],
    ...profile?.menus.flatMap((menu) => menu.items.flatMap(({ image }) => image ? [{ ...image, alt: image.caption }] : [])) ?? [],
  ]);
}
