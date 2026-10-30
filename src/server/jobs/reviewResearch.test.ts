import { afterEach, expect, it, vi } from 'vitest';
import * as db from '../db';
import { adminDbRequest, prodBase, reviewResearchRequest } from './pinApi';
import { completionYear, mergeResearchedReviews, saveResearchedReviews } from './reviewResearch';

vi.mock('../db', () => ({ query: vi.fn() }));
vi.mock('./pinApi', () => ({ adminDbRequest: vi.fn(), prodBase: vi.fn(), reviewResearchRequest: vi.fn() }));
afterEach(() => vi.resetAllMocks());
const review = { url: 'https://critic.example/test', title: 'Road test', quote: 'The steering is excellent.', publishedDate: '2026-10-20', sentiment: 0.7 };

it('retains other reviews and a known publication day without carrying an obsolete score', () => {
  const other = { ...review, url: 'https://other.example/test' };
  const result = mergeResearchedReviews([review, other], [{ ...review, quote: 'Changed verdict.', sentiment: -0.4, publishedDate: null }], 6);
  expect(result).toEqual([{ ...review, quote: 'Changed verdict.', sentiment: -0.4 }, other]);
  expect(() => mergeResearchedReviews([review], [other], 1)).toThrow(/exceed/);
});

it('matches production by sourceUrl and preserves each environments axes and basis', async () => {
  vi.mocked(db.query).mockResolvedValue([{ title: 'Vehicle', sourceUrl: 'https://maker.example/vehicle' }]);
  vi.mocked(prodBase).mockReturnValue('https://prod.example');
  vi.mocked(adminDbRequest).mockResolvedValue({ rows: [{ id: 900 }] });
  const rows = new Map([
    ['/api/pins/10/car-performance', { range: 3, basis: 'Local specifications', reviews: [], source: 'session' }],
    ['/api/pins/900/car-performance', { range: 4, basis: 'Production specifications', reviews: [], source: 'session' }],
  ]);
  vi.mocked(reviewResearchRequest).mockImplementation(async (method, path, body) => {
    if (method === 'PUT') rows.set(path, body as any);
    return structuredClone(rows.get(path)) as any;
  });
  const result = await saveResearchedReviews('PinCarPerf', 10, [review], 'Verified exact model');
  expect(result.saved).toEqual([{ pinId: 10, production: false, reviews: 1 }, { pinId: 900, production: true, reviews: 1 }]);
  expect(rows.get('/api/pins/10/car-performance')).toMatchObject({ range: 3, basis: 'Local specifications', reviews: [review] });
  expect(rows.get('/api/pins/900/car-performance')).toMatchObject({ range: 4, basis: 'Production specifications', reviews: [review] });
});

it('preflights hand rows in both environments before writing either', async () => {
  vi.mocked(db.query).mockResolvedValue([{ title: 'Film', sourceUrl: 'https://studio.example/film' }]);
  vi.mocked(prodBase).mockReturnValue('https://prod.example');
  vi.mocked(adminDbRequest).mockResolvedValue({ rows: [{ id: 900 }] });
  vi.mocked(reviewResearchRequest).mockResolvedValueOnce(null).mockResolvedValueOnce({ source: 'hand', reviews: [] });
  await expect(saveResearchedReviews('PinCriticReview', 10, [review], 'Verified exact film')).rejects.toThrow(/hand/);
  expect(vi.mocked(reviewResearchRequest).mock.calls.every(([method]) => method === 'GET')).toBe(true);
});

it('does not claim success if production fails read-back verification', async () => {
  vi.mocked(db.query).mockResolvedValue([{ title: 'Film', sourceUrl: 'https://studio.example/film' }]);
  vi.mocked(prodBase).mockReturnValue('https://prod.example');
  vi.mocked(adminDbRequest).mockResolvedValue({ rows: [{ id: 900 }] });
  vi.mocked(reviewResearchRequest).mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    .mockResolvedValueOnce({}).mockResolvedValueOnce({ reviews: [review] })
    .mockResolvedValueOnce({}).mockResolvedValueOnce({ reviews: [] });
  await expect(saveResearchedReviews('PinCriticReview', 10, [review], 'Verified exact film')).rejects.toThrow(/verification/);
});

it('reads the stated completion year from the profile milestones', () => {
  expect(completionYear([{ label: 'Groundbreaking', date: '2025-11-19' }, { label: 'Estimated completion (delivery)', date: 'Early 2028' }])).toBe(2028);
  expect(completionYear([{ label: 'Groundbreaking', date: '2025-11-19' }])).toBeNull();
  expect(completionYear(null)).toBeNull();
});
