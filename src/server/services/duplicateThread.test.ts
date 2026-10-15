import { describe, expect, it, vi, beforeEach } from 'vitest';
import { rethreadDuplicateGroup, rethreadAllDuplicateGroups } from './duplicateThread';
import * as db from '../db';
import PinDuplicate from '../model/pinDuplicate';
import * as prequel from '../scrape/prequel';
import * as cache from './cache';

describe('duplicateThread', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(cache, 'invalidatePin').mockImplementation(() => {});
  });

  it('rethreads duplicate pins: detaches duplicate and reparents its children to canonical', async () => {
    // Group: [4810, 5023]
    // 4810: parentId = 4807 (external parent)
    // 5023: parentId = 4810 (duplicate parent)
    // 15308: parentId = 5023 (child of 5023)
    vi.spyOn(PinDuplicate, 'group').mockResolvedValue([4810, 5023]);

    const setParentSpy = vi.spyOn(prequel, 'setParent').mockResolvedValue(undefined as any);
    const querySpy = vi.spyOn(db, 'query').mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('SELECT p."id", p."parentId"')) {
        return [
          {
            id: 4810,
            parentId: 4807,
            title: 'Google Announces Gemini 4 Argon',
            favoriteCount: 0,
            viewCount: 3,
            likeCount: 0,
            utcCreatedDateTime: '2026-09-28T19:56:15.222Z',
          },
          {
            id: 5023,
            parentId: 4810,
            title: 'Gemini 4 Argon Announced',
            favoriteCount: 1,
            viewCount: 3,
            likeCount: 0,
            utcCreatedDateTime: '2026-09-30T20:50:31.171Z',
          },
        ] as any;
      }
      if (sql.includes('SELECT "id", "parentId"') && sql.includes('WHERE "parentId" = ANY')) {
        return [
          { id: 5023, parentId: 4810 },
          { id: 15308, parentId: 5023 },
        ] as any;
      }
      return [] as any;
    });

    const result = await rethreadDuplicateGroup(5023);

    expect(result).not.toBeNull();
    expect(result?.canonicalId).toBe(4810);
    expect(result?.detached).toEqual([5023]);
    expect(result?.reparented).toEqual([{ childId: 15308, from: 5023, to: 4810 }]);

    // Verify 5023 was set to parentId = NULL
    expect(querySpy).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "Pin" SET "parentId" = NULL WHERE "id" = $1'),
      [5023],
    );

    // Verify 15308 was reparented to 4810
    expect(setParentSpy).toHaveBeenCalledWith(15308, 4810);
  });

  it('clears parent when pin in duplicate group pointed to its own duplicate', async () => {
    vi.spyOn(PinDuplicate, 'group').mockResolvedValue([100, 200]);

    const querySpy = vi.spyOn(db, 'query').mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('SELECT p."id", p."parentId"')) {
        return [
          {
            id: 100,
            parentId: 200, // canonical pointed to duplicate!
            title: 'Event A',
            favoriteCount: 10,
            viewCount: 20,
            likeCount: 5,
            utcCreatedDateTime: '2026-09-01T00:00:00Z',
          },
          {
            id: 200,
            parentId: null,
            title: 'Event B',
            favoriteCount: 1,
            viewCount: 2,
            likeCount: 0,
            utcCreatedDateTime: '2026-09-02T00:00:00Z',
          },
        ] as any;
      }
      if (sql.includes('WHERE "parentId" = ANY')) {
        return [] as any;
      }
      return [] as any;
    });

    const result = await rethreadDuplicateGroup(100);

    expect(result).not.toBeNull();
    expect(result?.canonicalId).toBe(100);
    expect(querySpy).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "Pin" SET "parentId" = NULL WHERE "id" = $1'),
      [100],
    );
  });

  it('returns null when duplicate group has no thread connections', async () => {
    vi.spyOn(PinDuplicate, 'group').mockResolvedValue([100, 200]);
    vi.spyOn(db, 'query').mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('SELECT p."id", p."parentId"')) {
        return [
          { id: 100, parentId: null, title: 'A', favoriteCount: 0, viewCount: 0, likeCount: 0, utcCreatedDateTime: '2026-01-01' },
          { id: 200, parentId: null, title: 'B', favoriteCount: 0, viewCount: 0, likeCount: 0, utcCreatedDateTime: '2026-01-02' },
        ] as any;
      }
      return [] as any;
    });

    const result = await rethreadDuplicateGroup(100);
    expect(result).toBeNull();
  });
});
