import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const { summary } = vi.hoisted(() => ({ summary: vi.fn() }));
vi.mock('@/lib/client/menuItemReviewSummaries', () => ({ useMenuItemReviewSummary: summary }));
vi.mock('./PinReviews', () => ({ PinReviews: () => null }));
vi.mock('./PinMedia', () => ({ PinMediaFrame: () => null }));
import { MenuItemReviews } from './MenuItemReviews';
beforeEach(() => summary.mockReturnValue({ average: null, count: 0 }));
it('shows the dish average out of five rather than its review count', () => {
  summary.mockReturnValue({ average: 4.5, count: 12 });
  const html = renderToStaticMarkup(<MenuItemReviews pinId={1} item={{ name: 'Soup' }} hideEmpty />);
  expect(html).toContain('4.5 out of 5 from 12 reader ratings');
  expect(html).toContain('4.5<small>/5</small>');
  expect(html).not.toContain('>12</span>');
});
it('shows only an outlined star for unscored external reviews', () => {
  const review = { provider: 'Critic', title: 'Review', sourceUrl: 'https://example.com/', quote: 'Delicious soup.', publishedDate: null, checkedAt: '2026-11-07' };
  const html = renderToStaticMarkup(<MenuItemReviews pinId={1} item={{ name: 'Soup', reviews: [review] }} hideEmpty />);
  expect(html).not.toContain('Unrated');
  expect(html).toContain('data-rated="false"');
  expect(html).toContain('not yet rated');
  expect(html).not.toContain('/5');
});
it('hides the star on an empty menu item while keeping its text clickable', () => {
  const html = renderToStaticMarkup(<MenuItemReviews pinId={1} item={{ name: 'Soup' }}><span>Soup</span></MenuItemReviews>);
  expect(html).not.toContain('data-has-reviews');
  expect(html).toContain('View reviews for Soup');
});
