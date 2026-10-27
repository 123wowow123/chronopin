import { expect, it } from 'vitest';
import { findReviewCatalogEntry } from './reviewCatalog';

it('ignores colliding database ids and finds the legacy source identity', () => {
  const wrong = { pinId: 17209, sourceUrl: 'https://ratings.example/busan' };
  const right = { pinId: 17190, sourceUrl: 'https://ratings.example/onjium' };
  expect(findReviewCatalogEntry([wrong, right], 'https://guide.example/onjium', right.sourceUrl)).toBe(right);
  expect(findReviewCatalogEntry([wrong], 'https://guide.example/onjium', right.sourceUrl)).toBeUndefined();
});

it('prefers an explicit pin URL over a shared scoring source', () => {
  const right = { pinSourceUrl: 'https://guide.example/onjium', sourceUrl: 'https://ratings.example/shared' };
  expect(findReviewCatalogEntry([{ sourceUrl: right.sourceUrl }, right], right.pinSourceUrl, right.sourceUrl)).toBe(right);
});

it('refuses ambiguous identities and does not match a different explicit pin', () => {
  expect(() => findReviewCatalogEntry([{ sourceUrl: 'https://ratings.example/shared' }, { sourceUrl: 'https://ratings.example/shared' }], 'https://guide.example/onjium', 'https://ratings.example/shared')).toThrow(/Ambiguous/);
  expect(findReviewCatalogEntry([{ pinSourceUrl: 'https://guide.example/other', sourceUrl: 'https://ratings.example/shared' }], 'https://guide.example/onjium', 'https://ratings.example/shared')).toBeUndefined();
});
