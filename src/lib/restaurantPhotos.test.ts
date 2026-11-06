import { expect, it } from 'vitest';
import { restaurantCardPhotos, restaurantProfilePhotos } from './restaurantPhotos';
import type { RestaurantMenuProfile } from './restaurantMenus';

it('deduplicates covers, native thumbnails and matching original URLs while retaining attribution', () => {
  const photo = { src: 'https://cdn/cover.webp', originalUrl: 'https://venue/photo.jpg', alt: 'Patio', credit: 'Restaurant' };
  expect(restaurantCardPhotos([undefined, photo, { ...photo }, { ...photo, src: 'https://cdn/other-size.webp' }])).toEqual([photo]);
});

it('puts venue photographs ahead of exact menu-item photographs without borrowing another profile', () => {
  const profile = { photo: { src: 'cover', alt: 'Interior', credit: 'Venue' }, photos: [{ src: 'patio', alt: 'Patio', credit: 'Venue' }], menus: [{ items: [{ image: { src: 'dish', caption: 'Pretzel', credit: 'Venue', sourceUrl: 'https://venue/menu' } }] }] } as RestaurantMenuProfile;
  expect(restaurantProfilePhotos(profile).map((photo) => [photo.src, photo.alt])).toEqual([['cover', 'Interior'], ['patio', 'Patio'], ['dish', 'Pretzel']]);
  expect(restaurantProfilePhotos()).toEqual([]);
});
