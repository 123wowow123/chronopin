import { expect, it } from 'vitest';
import { landingMediaSlides } from './landingMedia';
import { restaurantCardPhotos } from './restaurantPhotos';

it('retains all supported media and credits, excluding demoted images and unsupported embeds', () => {
  const media = [
    { type: 1, thumbName: 'interior.webp', originalUrl: 'https://venue/interior.jpg', authorName: 'Photographer', authorUrl: 'https://venue/gallery' },
    { type: 1, thumbName: 'exterior.webp', originalUrl: 'https://venue/exterior.jpg' },
    { type: 3, originalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { type: 1, thumbName: 'rejected.webp', weight: 0.5 },
    { type: 9, originalUrl: 'https://unsupported.example' },
  ];
  const slides = landingMediaSlides(media, 'Venue');
  expect(slides).toHaveLength(3);
  expect(slides[0]).toMatchObject({ alt: 'Venue', credit: 'Photographer', sourceUrl: 'https://venue/gallery' });
  expect(slides[2].medium.thumbName).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  expect(media[2]).not.toHaveProperty('thumbName');
});

it('deduplicates original URLs across native media and extra cover photography without inventing slides', () => {
  const native = landingMediaSlides([{ type: 1, thumbName: 'photo.webp', originalUrl: 'https://venue/photo.jpg' }], 'Venue');
  const slides = restaurantCardPhotos([...native, { src: 'https://venue/photo.jpg', alt: 'Cover', credit: 'Venue' }]);
  expect(slides).toHaveLength(1);
  expect(landingMediaSlides([], 'Missing media')).toEqual([]);
});
