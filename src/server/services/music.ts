// Server service providing top music rankings grouped by continent and country,
// backed by verified native Pin records in ChronoPin.

import { cacheLife, cacheTag } from 'next/cache';
import * as db from '../db';
import type { MediumJson } from '@/lib/types';
import {
  filterAndGroupMusicRankings,
  SEED_MUSIC_RANKINGS,
  type ContinentGroup,
  type MusicRankingEntry,
} from '@/lib/music';
import { TAGS } from './cache';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';

// Fewer rankings than this and /music is noindex and out of the sitemap.
export const MIN_INDEXED_RANKINGS = 8;

export interface MusicPinRow {
  id: number;
  title: string;
  productName: string | null;
  sourceUrl: string | null;
  media: MediumJson[] | null;
  tags?: string[] | null;
}

/**
 * Matches catalog entries to live database pins, preferring surviving single-year pins
 * and falling back to consolidated country chart pins (`Music Chart`) once single-year pins retire.
 */
export function resolveMusicRankings(
  rows: MusicPinRow[],
  seedRankings: MusicRankingEntry[] = SEED_MUSIC_RANKINGS,
): MusicRankingEntry[] {
  const knownCountries = new Set(seedRankings.map((entry) => entry.country.toLowerCase()));
  const chartPinByCountry = new Map<string, { id: number; title: string }>();
  const singleRows: MusicPinRow[] = [];

  for (const r of rows) {
    const tags = r.tags ?? [];
    if (tags.includes('Music Chart')) {
      for (const tag of tags) {
        const key = tag.toLowerCase();
        if (knownCountries.has(key) && !chartPinByCountry.has(key)) {
          chartPinByCountry.set(key, { id: r.id, title: r.title });
        }
      }
      continue;
    }
    singleRows.push(r);
  }

  const pinBySourceUrl = new Map<string, number>();
  const pinByTrackTitle = new Map<string, number>();
  const pinByExactTitle = new Map<string, number>();

  for (const r of singleRows) {
    if (r.sourceUrl) pinBySourceUrl.set(r.sourceUrl.toLowerCase(), r.id);
    if (r.productName) pinByTrackTitle.set(r.productName.toLowerCase(), r.id);
    pinByTrackTitle.set(r.title.toLowerCase(), r.id);
    pinByExactTitle.set(r.title.toLowerCase(), r.id);
  }

  const mediaByPin = new Map(singleRows.map((row) => [row.id, row.media ?? []]));

  // A ranking card must open its native pin page, so entries without a backing pin are not listed.
  return seedRankings
    .map((entry) => {
      // The same song and source page repeat across ranks and countries, so the exact pin title wins.
      const exactTitle = `${entry.artist} — "${entry.title}" (${entry.chartName} #${entry.rank} ${entry.year})`.toLowerCase();
      const singlePinId =
        pinByExactTitle.get(exactTitle) ??
        (entry.sourceUrl ? pinBySourceUrl.get(entry.sourceUrl.toLowerCase()) : undefined) ??
        pinByTrackTitle.get(entry.title.toLowerCase()) ??
        singleRows.find((r) => r.title.toLowerCase().includes(entry.title.toLowerCase()))?.id;

      if (singlePinId) {
        return {
          ...entry,
          pinId: singlePinId,
          media: mediaByPin.get(singlePinId),
        };
      }

      const chartPin = chartPinByCountry.get(entry.country.toLowerCase());
      if (chartPin) {
        // Keep media undefined so each card retains its own song artwork and YouTube video preview.
        return {
          ...entry,
          pinId: chartPin.id,
          pinTitle: chartPin.title,
          media: undefined,
        };
      }

      return entry;
    })
    .filter((entry) => entry.pinId);
}

export async function musicRankings(_locale: Locale = DEFAULT_LOCALE): Promise<MusicRankingEntry[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline, TAGS.sitemap);

  try {
    // Look up backed pins in the database to get live pin IDs and details
    const rows = await db.query<MusicPinRow>(
      `SELECT p."id", p."title", p."productName", p."sourceUrl",
         (SELECT jsonb_agg(to_jsonb(m) ORDER BY pm."weight" DESC, m."id") FROM "PinMedium" pm
          JOIN "Medium" m ON m."id" = pm."mediumId" WHERE pm."pinId" = p."id" AND pm."utcDeletedDateTime" IS NULL) AS media,
         (SELECT array_agg(pt2."name"::text) FROM "PinTag" pt2 WHERE pt2."pinId" = p."id") AS tags
       FROM "Pin" p
       JOIN "PinTag" pt ON pt."pinId" = p."id"
       WHERE pt."name" = 'Music Ranking' AND p."utcDeletedDateTime" IS NULL`,
    );

    return resolveMusicRankings(rows);
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

