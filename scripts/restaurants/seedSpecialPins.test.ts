import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../env', () => ({}));
vi.mock('@/server/db', () => ({ query: vi.fn(), closeConnection: vi.fn() }));
vi.mock('@/server/model/restaurantSpecialVenue', () => ({ listSpecialVenues: vi.fn() }));
vi.mock('@/server/model/pin', () => ({ default: { findBySourceUrls: vi.fn() } }));
import * as db from '@/server/db';
import { listSpecialVenues } from '@/server/model/restaurantSpecialVenue';
import Pin from '@/server/model/pin';
import { seedSpecialPins } from './seedSpecialPins';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listSpecialVenues).mockResolvedValue([{ profile: { pinSourceUrl: 'https://example.com/branch', checkedAt: '2026-10-29' } }] as any);
  vi.mocked(Pin.findBySourceUrls).mockResolvedValue(new Map());
});
it('defaults to read-only discovery rather than creating check-date pins', async () => {
  expect(await seedSpecialPins()).toEqual({ created: 1, dryRun: true });
  expect(db.query).not.toHaveBeenCalled();
});
it('refuses publication without reviewed branch-opening evidence before any write', async () => {
  await expect(seedSpecialPins({ dryRun: false })).rejects.toThrow('Do not use profile.checkedAt as an opening date');
  expect(db.query).not.toHaveBeenCalled();
});
it('leaves existing canonical pins alone', async () => {
  vi.mocked(Pin.findBySourceUrls).mockResolvedValue(new Map([['https://example.com/branch', { id: 1, title: 'Existing restaurant' }]]));
  expect(await seedSpecialPins({ dryRun: false })).toEqual({ created: 0, dryRun: false });
  expect(db.query).not.toHaveBeenCalled();
});
