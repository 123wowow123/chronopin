import { describe, expect, it } from 'vitest';
import type { MusicRankingEntry } from '@/lib/music';
import { resolveMusicRankings, type MusicPinRow } from './music';

const sampleSeed = [
  {
    id: 'us-2025-1',
    year: 2025,
    rank: 1,
    title: 'Die With a Smile',
    artist: 'Lady Gaga & Bruno Mars',
    chartName: 'Billboard Year-End Hot 100',
    country: 'United States',
    sourceUrl: 'https://www.billboard.com/charts/year-end/2025/hot-100-songs/',
  },
  {
    id: 'gb-2025-1',
    year: 2025,
    rank: 1,
    title: 'APT.',
    artist: 'ROSÉ & Bruno Mars',
    chartName: 'Official Charts UK Singles',
    country: 'United Kingdom',
    sourceUrl: 'https://www.officialcharts.com/charts/end-of-year-singles-chart/2025/',
  },
] as MusicRankingEntry[];

describe('resolveMusicRankings', () => {
  it('matches active single-year pins first and falls back to consolidated country chart pins', () => {
    const rows: MusicPinRow[] = [
      {
        id: 16032,
        title: 'Lady Gaga & Bruno Mars — "Die With a Smile" (Billboard Year-End Hot 100 #1 2025)',
        productName: 'Die With a Smile',
        sourceUrl: 'https://www.billboard.com/charts/year-end/2025/hot-100-songs/',
        media: [{ id: 1, type: '1', originalUrl: 'https://cdn.example/us.jpg' }] as MusicPinRow['media'],
        tags: ['Music', 'Music Ranking', 'United States'],
      },
      {
        id: 21001,
        title: 'United States Billboard Hot 100 year-end #1 singles (2017–2026)',
        productName: null,
        sourceUrl: 'https://www.billboard.com/charts/year-end/2025/hot-100-songs/',
        media: [{ id: 2, type: '1', originalUrl: 'https://cdn.example/us-chart.jpg' }] as MusicPinRow['media'],
        tags: ['Music', 'Music Ranking', 'Music Chart', 'United States'],
      },
      {
        id: 21002,
        title: 'United Kingdom Official Singles Chart year-end #1s (2017–2026)',
        productName: null,
        sourceUrl: 'https://www.officialcharts.com/charts/end-of-year-singles-chart/',
        media: [{ id: 3, type: '1', originalUrl: 'https://cdn.example/gb-chart.jpg' }] as MusicPinRow['media'],
        tags: ['Music', 'Music Ranking', 'Music Chart', 'United Kingdom'],
      },
    ];

    const resolved = resolveMusicRankings(rows, sampleSeed);
    expect(resolved).toHaveLength(2);

    // US still has an active single-year pin, so it wins with its own media and no pinTitle override.
    expect(resolved[0].pinId).toBe(16032);
    expect(resolved[0].pinTitle).toBeUndefined();
    expect(resolved[0].media).toHaveLength(1);

    // UK single-year pin is retired, so it resolves cleanly to the consolidated UK chart pin.
    expect(resolved[1].pinId).toBe(21002);
    expect(resolved[1].pinTitle).toBe('United Kingdom Official Singles Chart year-end #1s (2017–2026)');
    expect(resolved[1].media).toBeUndefined();
  });

  it('drops entries with neither a single-year pin nor a consolidated chart pin', () => {
    const resolved = resolveMusicRankings([], sampleSeed);
    expect(resolved).toEqual([]);
  });
});
