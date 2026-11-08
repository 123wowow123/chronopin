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
  expect(html).toContain('data-fill="solid"');
  expect(html).not.toContain('>12</span>');
});
it('shows only an outlined star for descriptive external excerpts', () => {
  const review = { provider: 'Critic', title: 'Review', sourceUrl: 'https://example.com/', quote: 'grilled steak with crispy onions', publishedDate: null, checkedAt: '2026-11-07' };
  const html = renderToStaticMarkup(<MenuItemReviews pinId={1} item={{ name: 'Soup', reviews: [review] }} hideEmpty />);
  expect(html).not.toContain('Unrated');
  expect(html).toContain('data-rated="false"');
  expect(html).toContain('data-fill="empty"');
  expect(html).toContain('not yet rated');
  expect(html).not.toContain('/5');
});
it('marks estimates from review prose and prefers reader ratings when available', () => {
  const item = { name: 'Fish', reviews: [{ provider: 'Critic', title: 'Review', sourceUrl: 'https://example.com/', quote: 'The balance was nonexistent for me.', publishedDate: null, checkedAt: '2026-11-07' }] };
  const html = renderToStaticMarkup(<MenuItemReviews pinId={1} item={item} />);
  expect(html).toContain('2.0<small>/5</small>');
  expect(html).not.toContain('≈');
  expect(html).toContain('inferred from external review text');
  expect(html).toContain('data-fill="empty"');
  expect(html).not.toContain('data-fill="solid"');
  summary.mockReturnValue({ average: 4, count: 1 });
  const mixed = renderToStaticMarkup(<MenuItemReviews pinId={1} item={item} />);
  expect(mixed).toContain('mixing 1 reader rating with 1 estimate');
  expect(mixed).toContain('3.0<small>/5</small>');
  expect(mixed).toContain('data-fill="half"');
  const rated = renderToStaticMarkup(<MenuItemReviews pinId={1} item={{ name: 'Fish' }} />);
  expect(rated).toContain('4.0 out of 5 from 1 reader rating');
  expect(rated).toContain('data-fill="solid"');
  expect(rated).not.toContain('data-fill="half"');
});
it('hides the star on an empty menu item while keeping its text clickable', () => {
  const html = renderToStaticMarkup(<MenuItemReviews pinId={1} item={{ name: 'Soup' }}><span>Soup</span></MenuItemReviews>);
  expect(html).not.toContain('data-has-reviews');
  expect(html).toContain('View reviews for Soup');
});
