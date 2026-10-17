import { describe, expect, it } from 'vitest';
import {
  CONTINENTS,
  COUNTRIES_BY_CONTINENT,
  filterAndGroupMusicRankings,
  getAvailableYears,
  SEED_MUSIC_RANKINGS,
  YEARS_AVAILABLE,
} from './music';

describe('music', () => {
  it('defines continents ordered from west to east', () => {
    expect(CONTINENTS).toEqual([
      'North America',
      'Latin America',
      'Europe',
      'Africa',
      'Asia',
      'Oceania',
    ]);
  });

  it('orders countries within each continent from west to east', () => {
    for (const continent of CONTINENTS) {
      const countries = COUNTRIES_BY_CONTINENT[continent];
      expect(countries.length).toBeGreaterThan(0);
      for (let i = 1; i < countries.length; i++) {
        expect(countries[i].longitude).toBeGreaterThanOrEqual(countries[i - 1].longitude);
      }
    }
  });

  it('contains comprehensive seed music rankings across all continents', () => {
    expect(SEED_MUSIC_RANKINGS.length).toBeGreaterThan(20);
    const continentsCovered = new Set(SEED_MUSIC_RANKINGS.map((r) => r.continent));
    for (const continent of CONTINENTS) {
      expect(continentsCovered.has(continent)).toBe(true);
    }
  });

  it('extracts available years sorted in descending order', () => {
    const years = getAvailableYears(SEED_MUSIC_RANKINGS);
    expect(years.length).toBeGreaterThan(4);
    for (let i = 1; i < years.length; i++) {
      expect(years[i]).toBeLessThan(years[i - 1]);
    }
    expect(years).toContain(2025);
    expect(years).toContain(2024);
  });

  it('filters and groups music rankings by continent and country', () => {
    const groups = filterAndGroupMusicRankings(SEED_MUSIC_RANKINGS);
    expect(groups.length).toBeGreaterThan(0);
    // Ensure continent order is preserved in output groups
    const continentIndices = groups.map((g) => CONTINENTS.indexOf(g.name));
    for (let i = 1; i < continentIndices.length; i++) {
      expect(continentIndices[i]).toBeGreaterThan(continentIndices[i - 1]);
    }

    // Check country group structure
    for (const group of groups) {
      expect(group.countries.length).toBeGreaterThan(0);
      for (const countryGroup of group.countries) {
        expect(countryGroup.country).toBeTruthy();
        expect(countryGroup.countryFlag).toBeTruthy();
        expect(countryGroup.chartName).toBeTruthy();
        expect(countryGroup.rankings.length).toBeGreaterThan(0);
      }
    }
  });

  it('filters by year correctly', () => {
    const groups2024 = filterAndGroupMusicRankings(SEED_MUSIC_RANKINGS, { year: 2024 });
    for (const group of groups2024) {
      for (const countryGroup of group.countries) {
        for (const ranking of countryGroup.rankings) {
          expect(ranking.year).toBe(2024);
        }
      }
    }
  });

  it('covers multiple top songs across continents for every available year', () => {
    for (const yr of YEARS_AVAILABLE) {
      const yearGroups = filterAndGroupMusicRankings(SEED_MUSIC_RANKINGS, { year: yr });
      expect(yearGroups.length).toBeGreaterThanOrEqual(4);
      const totalSongsInYear = yearGroups.reduce(
        (sum, g) => sum + g.countries.reduce((cSum, c) => cSum + c.rankings.length, 0),
        0,
      );
      expect(totalSongsInYear).toBeGreaterThanOrEqual(10);
    }
  });

  it('filters by continent correctly', () => {
    const asiaGroups = filterAndGroupMusicRankings(SEED_MUSIC_RANKINGS, { continent: 'Asia' });
    expect(asiaGroups.length).toBe(1);
    expect(asiaGroups[0].name).toBe('Asia');
    expect(asiaGroups[0].countries.some((c) => c.country === 'Japan')).toBe(true);
    expect(asiaGroups[0].countries.some((c) => c.country === 'South Korea')).toBe(true);
  });

  it('filters by search query matching title or artist', () => {
    const searchShaboozey = filterAndGroupMusicRankings(SEED_MUSIC_RANKINGS, { query: 'Shaboozey' });
    expect(searchShaboozey.length).toBeGreaterThan(0);
    for (const group of searchShaboozey) {
      for (const countryGroup of group.countries) {
        for (const ranking of countryGroup.rankings) {
          expect(ranking.artist.toLowerCase().includes('shaboozey') || ranking.title.toLowerCase().includes('shaboozey')).toBe(true);
        }
      }
    }
  });

  it('has verified audioUrl audio previews for music ranking entries', () => {
    const withAudio = SEED_MUSIC_RANKINGS.filter((r) => !!r.audioUrl);
    expect(withAudio.length).toBe(SEED_MUSIC_RANKINGS.length);
    for (const r of SEED_MUSIC_RANKINGS) {
      expect(r.audioUrl).toMatch(/^https?:\/\//);
    }
  });

  it('has verified youtubeId for full-length playback on music ranking entries', () => {
    const withYoutube = SEED_MUSIC_RANKINGS.filter((r) => !!r.youtubeId);
    expect(withYoutube.length).toBe(SEED_MUSIC_RANKINGS.length);
    for (const r of SEED_MUSIC_RANKINGS) {
      expect(r.youtubeId).toMatch(/^[a-zA-Z0-9_-]{11}$/);
      expect(r.youtubeUrl).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
    }
  });

  it('looks up music ranking entry by id or title', async () => {
    const { getMusicRankingEntry, getMusicRankingByTitleOrPin } = await import('./music');
    const usEntry = getMusicRankingEntry('us-2026-1');
    expect(usEntry).toBeDefined();
    expect(usEntry?.title).toBe('Birds of a Feather');
    expect(usEntry?.artist).toBe('Billie Eilish');
    expect(usEntry?.youtubeId).toBe('V9PVRfjEBTI');

    const byTitle = getMusicRankingByTitleOrPin(99999, 'Billie Eilish — Birds of a Feather');
    expect(byTitle).toBeDefined();
    expect(byTitle?.artist).toBe('Billie Eilish');
  });

  it('populates backing pinId for all seed music rankings', () => {
    for (const ranking of SEED_MUSIC_RANKINGS) {
      expect(ranking.pinId).toBeDefined();
      expect(typeof ranking.pinId).toBe('number');
      expect(ranking.pinId).toBeGreaterThan(0);
    }
  });

  it('retrieves adjacent music rankings cyclically', async () => {
    const { getAdjacentMusicRankings } = await import('./music');

    // First track: previous should wrap to last track, next should be second track
    const firstTrack = SEED_MUSIC_RANKINGS[0];
    const secondTrack = SEED_MUSIC_RANKINGS[1];
    const lastTrack = SEED_MUSIC_RANKINGS[SEED_MUSIC_RANKINGS.length - 1];

    const adjacentFirst = getAdjacentMusicRankings(firstTrack.id);
    expect(adjacentFirst).toBeDefined();
    expect(adjacentFirst?.previous.id).toBe(lastTrack.id);
    expect(adjacentFirst?.next.id).toBe(secondTrack.id);

    // Can also lookup by pinId number
    const adjacentByPinId = getAdjacentMusicRankings(firstTrack.pinId!);
    expect(adjacentByPinId).toBeDefined();
    expect(adjacentByPinId?.next.id).toBe(secondTrack.id);

    // Last track: next should wrap to first track
    const adjacentLast = getAdjacentMusicRankings(lastTrack.id);
    expect(adjacentLast).toBeDefined();
    expect(adjacentLast?.next.id).toBe(firstTrack.id);

    // Adjacent tracks all have valid backing pins for continuous play
    expect(adjacentFirst?.next.pinId).toBeDefined();
    expect(adjacentFirst?.previous.pinId).toBeDefined();
  });
});



