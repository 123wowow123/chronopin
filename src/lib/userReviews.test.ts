import { describe, expect, it } from 'vitest';
import { isReviewable, parsePhotoTags, problemWithComment, validStars } from './userReviews';

describe('parsePhotoTags', () => {
  it('accepts regions inside the photo, from JSON or a list', () => {
    const tag = { item: ' Mapo tofu ', x: 0.1, y: 0.2, w: 0.3, h: 0.25 };
    expect(parsePhotoTags(JSON.stringify([tag]))).toEqual({ tags: [{ ...tag, item: 'Mapo tofu' }] });
    expect(parsePhotoTags(null)).toEqual({ tags: [] });
  });
  it('rejects nameless, tiny and out-of-frame regions', () => {
    expect(parsePhotoTags([{ item: '', x: 0, y: 0, w: 0.5, h: 0.5 }])).toHaveProperty('problem');
    expect(parsePhotoTags([{ item: 'A', x: 0, y: 0, w: 0.001, h: 0.5 }])).toHaveProperty('problem');
    expect(parsePhotoTags([{ item: 'A', x: 0.8, y: 0, w: 0.5, h: 0.5 }])).toHaveProperty('problem');
    expect(parsePhotoTags('nope')).toHaveProperty('problem');
  });
});

describe('review input', () => {
  it('takes whole stars from 1 to 5', () => {
    expect([0, 1, 5, 6, 2.5, '3'].map(validStars)).toEqual([false, true, true, false, false, false]);
  });
  it('limits comments', () => {
    expect(problemWithComment('fine')).toBeNull();
    expect(problemWithComment('x'.repeat(1001))).not.toBeNull();
  });
  it('reviews pins on the category landing pages', () => {
    expect(isReviewable(['Food'])).toBe(true);
    expect(isReviewable(['Elections'])).toBe(false);
  });
});
