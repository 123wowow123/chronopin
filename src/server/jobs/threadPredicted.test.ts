import { describe, expect, it, vi } from 'vitest';
import { findThreadCandidates } from './threadPredicted';
import * as db from '../db';

describe('findThreadCandidates', () => {
  it('finds earlier candidate pins for recurring subjects', async () => {
    vi.spyOn(db, 'query').mockImplementation(async (sql: string, params?: unknown[]) => {
      if (typeof sql === 'string' && sql.includes('ILIKE')) {
        return [
          {
            id: 1945,
            title: 'Starship Reaches Orbit for the First Time on Flight 14',
            utcStartDateTime: new Date('2026-09-28T12:00:00Z'),
          },
        ] as any;
      }
      return [] as any;
    });

    const candidates = await findThreadCandidates({
      id: 1992,
      title: 'Two SpaceX Starships Dock in Orbit',
      utcStartDateTime: '2027-12-31T00:00:00Z',
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe(1945);
    expect(candidates[0].reason).toContain('starship');

    vi.restoreAllMocks();
  });

  it('excludes self and future pins from candidates', async () => {
    vi.spyOn(db, 'query').mockImplementation(async (sql: string, params?: unknown[]) => {
      // Return pins including one that is the pin itself
      if (typeof sql === 'string' && sql.includes('ILIKE')) {
        return [
          {
            id: 2000,
            title: 'Artemis IV Launch',
            utcStartDateTime: new Date('2028-09-01T00:00:00Z'),
          },
          {
            id: 238,
            title: 'Artemis III Crewed Lunar Landing',
            utcStartDateTime: new Date('2027-06-01T00:00:00Z'),
          },
        ] as any;
      }
      return [] as any;
    });

    const candidates = await findThreadCandidates({
      id: 2000, // self
      title: 'NASA Lands Astronauts on the Moon Again',
      utcStartDateTime: '2029-12-31T00:00:00Z',
    });

    expect(candidates.some((c) => c.id === 2000)).toBe(false);
    expect(candidates.some((c) => c.id === 238)).toBe(true);

    vi.restoreAllMocks();
  });

  it('excludes confirmed duplicate pins from candidates', async () => {
    vi.spyOn(db, 'query').mockImplementation(async (sql: string, params?: unknown[]) => {
      if (typeof sql === 'string' && sql.includes('pinDuplicateGroup')) {
        return [{ group: [5023, 4810] }] as any;
      }
      if (typeof sql === 'string' && sql.includes('ILIKE')) {
        return [
          {
            id: 4810,
            title: 'Google Announces Gemini 4 Argon',
            utcStartDateTime: new Date('2026-09-30T00:00:00Z'),
          },
        ] as any;
      }
      return [] as any;
    });

    const candidates = await findThreadCandidates({
      id: 5023, // duplicate of 4810
      title: 'Gemini 4 Argon Announced',
      utcStartDateTime: '2026-09-30T00:00:00Z',
    });

    // 4810 is in the same duplicate group as 5023, so must be excluded
    expect(candidates.some((c) => c.id === 4810)).toBe(false);

    vi.restoreAllMocks();
  });

  it('matches brent and wti crude oil monthly pins into recurring threads', async () => {
    vi.spyOn(db, 'query').mockImplementation(async (sql: string, params?: unknown[]) => {
      if (typeof sql === 'string' && sql.includes('ILIKE') && params?.includes('%brent%')) {
        return [
          {
            id: 17029,
            title: 'Brent Crude Oil Settlement — September 2026: $97.92/bbl',
            utcStartDateTime: new Date('2026-09-30T21:00:00Z'),
          },
        ] as any;
      }
      return [] as any;
    });

    const candidates = await findThreadCandidates({
      id: 17030,
      title: 'Brent Crude Oil Price — October 2026',
      utcStartDateTime: '2026-10-30T21:00:00Z',
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe(17029);
    expect(candidates[0].reason).toContain('brent');

    vi.restoreAllMocks();
  });
});
