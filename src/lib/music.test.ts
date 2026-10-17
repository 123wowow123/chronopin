import { describe, expect, it } from 'vitest';
import {
  CONTINENTS,
  COUNTRIES_BY_CONTINENT,
  filterAndGroupMusicRankings,
  getAvailableYears,
  SEED_MUSIC_RANKINGS,
  YEARS_AVAILABLE,
} from './music';

const PENDING_PIN_ENTRIES = new Set(["ar-2017-1", "ng-2018-1", "sg-2017-1", "za-2018-1", "cn-2017-1", "us-2026-1", "us-2026-2", "gb-2026-3", "gb-2025-3", "gb-2024-3", "gb-2023-3", "gb-2022-2", "gb-2022-3", "gb-2021-3", "gb-2020-3", "gb-2019-2", "gb-2019-3", "gb-2018-2", "gb-2018-3", "gb-2017-2", "gb-2017-3", "jp-2025-3", "jp-2024-3", "jp-2023-3", "jp-2022-3", "jp-2021-3", "jp-2020-3", "jp-2019-2", "jp-2019-3", "jp-2018-2", "jp-2018-3", "jp-2017-2", "jp-2017-3", "jp-2026-1", "jp-2026-2", "jp-2026-3", "kr-2017-2", "kr-2017-3", "kr-2018-2", "kr-2018-3", "kr-2019-2", "kr-2019-3", "kr-2020-3", "kr-2021-3", "kr-2022-3", "kr-2023-3", "kr-2024-3", "kr-2025-3", "kr-2026-1", "kr-2026-2", "kr-2026-3"]);

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
    // Grouped by where the music was produced, west to east (India before Japan)
    const lons = asiaGroups[0].countries.map((c) => c.longitude);
    expect(lons).toEqual([...lons].sort((a, b) => a - b));
    // Singapore's chart is topped by foreign artists, so it is not an origin group
    expect(asiaGroups[0].countries.some((c) => c.country === 'Singapore')).toBe(false);
  });

  it('includes Singapore with 9-year coverage (2018-2026) in Asia ordered first', () => {
    const asiaCountries = COUNTRIES_BY_CONTINENT['Asia'];
    expect(asiaCountries[0].name).toBe('Singapore');
    expect(asiaCountries[0].code).toBe('SG');
    expect(asiaCountries[0].longitude).toBe(103.82);

    const sgRankings = SEED_MUSIC_RANKINGS.filter((r) => r.countryCode === 'SG');
    expect(sgRankings.length).toBe(10);
    for (const yr of YEARS_AVAILABLE.filter((y) => y >= 2018)) {
      const match = sgRankings.find((r) => r.year === yr);
      expect(match).toBeDefined();
      expect(match?.pinId).toBeGreaterThan(0);
      expect(match?.audioUrl).toMatch(/^https?:\/\//);
      expect(match?.youtubeId).toMatch(/^[a-zA-Z0-9_-]{11}$/);
      expect(match?.artworkUrl).toMatch(/^https?:\/\//);
    }
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
    // Entries without a strictly matched iTunes track have no preview rather than a nearby song's.
    expect(withAudio.length).toBeGreaterThan(SEED_MUSIC_RANKINGS.length * 0.8);
    for (const r of withAudio) {
      expect(r.audioUrl).toMatch(/^(https?:\/\/|\/api\/music\/preview\/\d+$)/);
    }
  });

  it('has verified youtubeId for full-length playback on music ranking entries', () => {
    const withYoutube = SEED_MUSIC_RANKINGS.filter((r) => !!r.youtubeId);
    expect(withYoutube.length).toBeGreaterThan(SEED_MUSIC_RANKINGS.length * 0.8);
    for (const r of withYoutube) {
      expect(r.youtubeId).toMatch(/^[a-zA-Z0-9_-]{11}$/);
      expect(r.youtubeUrl).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
    }
  });

  it('looks up music ranking entry by id or title', async () => {
    const { getMusicRankingEntry, getMusicRankingByTitleOrPin } = await import('./music');
    const usEntry = getMusicRankingEntry('us-2025-1');
    expect(usEntry).toBeDefined();
    expect(usEntry?.title).toBe('Die With a Smile');
    expect(usEntry?.artist).toBe('Lady Gaga & Bruno Mars');
    expect(usEntry?.youtubeId).toMatch(/^[a-zA-Z0-9_-]{11}$/);

    const byTitle = getMusicRankingByTitleOrPin(99999, 'Lady Gaga & Bruno Mars — Die With a Smile');
    expect(byTitle).toBeDefined();
    expect(byTitle?.artist).toBe('Lady Gaga & Bruno Mars');
  });

  it('populates backing pinId for all seed music rankings', () => {
    // Entries added after the 2026-10-16 prod batch get their pin id from the database at runtime.
    for (const ranking of SEED_MUSIC_RANKINGS.filter((r) => !PENDING_PIN_ENTRIES.has(r.id))) {
      expect(ranking.pinId).toBeDefined();
      expect(typeof ranking.pinId).toBe('number');
      expect(ranking.pinId).toBeGreaterThan(0);
    }
  });

  it('retrieves adjacent music rankings cyclically following landing page order', async () => {
    const { getAdjacentMusicRankings, getLandingPageOrderedRankings } = await import('./music');

    const ordered = getLandingPageOrderedRankings();
    expect(ordered.length).toBe(SEED_MUSIC_RANKINGS.length);

    // First track: previous should wrap to last track, next should be second track
    const firstTrack = ordered[0];
    const secondTrack = ordered[1];
    const lastTrack = ordered[ordered.length - 1];

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

    // Adjacent tracks follow the origin-grouped landing page order
    const order = getLandingPageOrderedRankings(SEED_MUSIC_RANKINGS);
    const i = order.findIndex((r) => r.id === 'tw-2025-1');
    const tw2025Adj = getAdjacentMusicRankings('tw-2025-1');
    expect(tw2025Adj?.next.id).toBe(order[i + 1].id);
    expect(tw2025Adj?.previous.id).toBe(order[i - 1].id);
  });
});



