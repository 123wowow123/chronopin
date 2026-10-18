// Server service providing top music rankings grouped by continent and country,
// backed by verified native Pin records in ChronoPin.

import { cacheLife, cacheTag } from 'next/cache';
import * as db from '../db';
import {
  filterAndGroupMusicRankings,
  SEED_MUSIC_RANKINGS,
  type ContinentGroup,
  type MusicRankingEntry,
} from '@/lib/music';
import { TAGS } from './cache';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';

export async function musicRankings(_locale: Locale = DEFAULT_LOCALE): Promise<MusicRankingEntry[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline, TAGS.sitemap);

  try {
    // Look up backed pins in the database to get live pin IDs and details
    const rows = await db.query<{ id: number; title: string; productName: string | null; sourceUrl: string | null }>(
      `SELECT p."id", p."title", p."productName", p."sourceUrl"
       FROM "Pin" p
       JOIN "PinTag" pt ON pt."pinId" = p."id"
       WHERE pt."name" = 'Music Ranking' AND p."utcDeletedDateTime" IS NULL`,
    );

    const pinBySourceUrl = new Map<string, number>();
    const pinByTrackTitle = new Map<string, number>();
    const pinByExactTitle = new Map<string, number>();

    for (const r of rows) {
      if (r.sourceUrl) pinBySourceUrl.set(r.sourceUrl.toLowerCase(), r.id);
      if (r.productName) pinByTrackTitle.set(r.productName.toLowerCase(), r.id);
      pinByTrackTitle.set(r.title.toLowerCase(), r.id);
      pinByExactTitle.set(r.title.toLowerCase(), r.id);
    }

    return SEED_MUSIC_RANKINGS.map((entry) => {
      // The same song and source page repeat across ranks and countries, so the exact pin title wins.
      const exactTitle = `${entry.artist} — "${entry.title}" (${entry.chartName} #${entry.rank} ${entry.year})`.toLowerCase();
      const pinId =
        pinByExactTitle.get(exactTitle) ??
        (entry.sourceUrl ? pinBySourceUrl.get(entry.sourceUrl.toLowerCase()) : undefined) ??
        pinByTrackTitle.get(entry.title.toLowerCase()) ??
        rows.find((r) => r.title.toLowerCase().includes(entry.title.toLowerCase()))?.id;

      return {
        ...entry,
        pinId,
      };
    });
  } catch {
    // If database lookup is unavailable (e.g. during build phase), return seed items
    return SEED_MUSIC_RANKINGS;
  }
}

export async function groupedMusicRankings(options: {
  year?: number | 'all';
  continent?: string;
  country?: string;
  query?: string;
  locale?: Locale;
} = {}): Promise<ContinentGroup[]> {
  const rankings = await musicRankings(options.locale);
  return filterAndGroupMusicRankings(rankings, options);
}

