import { expect, it } from 'vitest';
import { inferredMenuItemRating, inferredReviewRating } from './restaurantReviewRatings';

const review = (quote: string) => ({ provider: 'Critic', title: 'Review', sourceUrl: 'https://example.com/', quote, publishedDate: null, checkedAt: '2026-11-07' });

it('averages assessed praise and criticism while excluding descriptive excerpts', () => {
  expect(inferredMenuItemRating([
    review('I loved it that much.'),
    review('The balance was nonexistent for me.'),
    review('grilled steak with crispy onions'),
  ])).toBe(3.5);
});

it('does not give unassessed text or missing reviews a default score', () => {
  expect(inferredMenuItemRating()).toBeNull();
  expect(inferredReviewRating(review('grilled steak with crispy onions'))).toBeNull();
  expect(inferredReviewRating(review('__proto__'))).toBeNull();
});
