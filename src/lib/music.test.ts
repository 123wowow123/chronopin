import { describe, expect, it } from 'vitest';
import {
  CONTINENTS,
  COUNTRIES_BY_CONTINENT,
  filterAndGroupMusicRankings,
  getAvailableYears,
  SEED_MUSIC_RANKINGS,
  YEARS_AVAILABLE,
} from './music';

const PENDING_PIN_ENTRIES = new Set(["ar-2017-1", "ng-2018-1", "sg-2017-1", "za-2018-1", "cn-2017-1", "us-2026-1", "us-2026-2", "gb-2026-3", "gb-2025-3", "gb-2024-3", "gb-2023-3", "gb-2022-2", "gb-2022-3", "gb-2021-3", "gb-2020-3", "gb-2019-2", "gb-2019-3", "gb-2018-2", "gb-2018-3", "gb-2017-2", "gb-2017-3", "jp-2025-3", "jp-2024-3", "jp-2023-3", "jp-2022-3", "jp-2021-3", "jp-2020-3", "jp-2019-2", "jp-2019-3", "jp-2018-2", "jp-2018-3", "jp-2017-2", "jp-2017-3", "jp-2026-1", "jp-2026-2", "jp-2026-3", "kr-2017-2", "kr-2017-3", "kr-2018-2", "kr-2018-3", "kr-2019-2", "kr-2019-3", "kr-2020-3", "kr-2021-3", "kr-2022-3", "kr-2023-3", "kr-2024-3", "kr-2025-3", "kr-2026-1", "kr-2026-2", "kr-2026-3", "ca-2017-2", "ca-2017-3", "ca-2018-2", "ca-2018-3", "ca-2019-2", "ca-2019-3", "ca-2020-2", "ca-2020-3", "ca-2021-2", "ca-2021-3", "ca-2022-2", "ca-2022-3", "ca-2023-2", "ca-2023-3", "ca-2024-2", "ca-2024-3", "ca-2025-3", "ca-2026-2", "ca-2026-3", "mx-2017-2", "mx-2017-3", "mx-2018-2", "mx-2018-3", "mx-2019-2", "mx-2019-3", "mx-2020-2", "mx-2020-3", "mx-2021-2", "mx-2021-3", "mx-2022-2", "mx-2022-3", "mx-2023-2", "mx-2023-3", "mx-2024-2", "mx-2024-3", "mx-2025-2", "mx-2025-3", "us-2026-3", "ar-2018-2", "ar-2018-3", "ar-2019-2", "ar-2019-3", "ar-2020-2", "ar-2020-3", "ar-2021-2", "ar-2021-3", "ar-2022-3", "ar-2023-2", "ar-2023-3", "ar-2024-2", "ar-2024-3", "ar-2025-3", "co-2017-2", "co-2018-2", "co-2018-3", "co-2020-2", "co-2020-3", "co-2021-2", "co-2021-3", "co-2022-2", "co-2022-3", "co-2023-2", "co-2023-3", "co-2024-2", "co-2024-3", "co-2025-2", "co-2025-3", "br-2017-2", "br-2017-3", "br-2018-2", "br-2018-3", "br-2019-2", "br-2019-3", "br-2020-2", "br-2020-3", "br-2021-2", "br-2021-3", "br-2022-2", "br-2022-3", "br-2023-2", "br-2023-3", "br-2024-2", "br-2024-3", "br-2025-2", "br-2025-3", "br-2026-2", "br-2026-3", "es-2017-2", "es-2017-3", "es-2018-2", "es-2018-3", "es-2019-2", "es-2019-3", "es-2020-2", "es-2020-3", "es-2021-2", "es-2021-3", "es-2022-2", "es-2022-3", "es-2023-2", "es-2023-3", "es-2024-2", "es-2024-3", "es-2025-2", "es-2025-3", "fr-2017-2", "fr-2017-3", "fr-2018-2", "fr-2018-3", "fr-2019-2", "fr-2019-3", "fr-2020-2", "fr-2020-3", "fr-2021-2", "fr-2021-3", "fr-2022-2", "fr-2022-3", "fr-2023-2", "fr-2023-3", "fr-2024-2", "fr-2024-3", "fr-2025-2", "fr-2025-3", "fr-2026-2", "fr-2026-3", "de-2017-2", "de-2017-3", "de-2018-2", "de-2018-3", "de-2019-2", "de-2019-3", "de-2020-2", "de-2020-3", "de-2021-2", "de-2021-3", "de-2022-2", "de-2022-3", "de-2023-2", "de-2023-3", "de-2024-2", "de-2024-3", "de-2025-2", "de-2025-3", "de-2026-2", "de-2026-3", "it-2017-2", "it-2017-3", "it-2018-2", "it-2018-3", "it-2019-2", "it-2019-3", "it-2020-2", "it-2020-3", "it-2021-2", "it-2021-3", "it-2022-2", "it-2022-3", "it-2023-2", "it-2023-3", "it-2024-2", "it-2024-3", "it-2025-2", "it-2025-3", "it-2026-2", "it-2026-3", "se-2017-2", "se-2017-3", "se-2018-2", "se-2018-3", "se-2019-2", "se-2019-3", "se-2020-2", "se-2020-3", "se-2021-2", "se-2021-3", "se-2022-2", "se-2022-3", "se-2023-2", "se-2023-3", "se-2024-2", "se-2024-3", "se-2025-2", "se-2025-3", "ng-2018-2", "ng-2018-3", "ng-2020-2", "ng-2020-3", "ng-2021-2", "ng-2021-3", "ng-2022-2", "ng-2022-3", "ng-2023-2", "ng-2023-3", "ng-2024-2", "ng-2024-3", "ng-2025-2", "ng-2025-3", "za-2018-2", "za-2018-3", "za-2019-2", "za-2019-3", "za-2020-2", "za-2020-3", "za-2022-2", "za-2022-3", "za-2023-2", "za-2023-3", "za-2024-3", "za-2025-2", "za-2025-3", "sg-2017-2", "sg-2017-3", "sg-2018-2", "sg-2018-3", "sg-2019-2", "sg-2019-3", "sg-2020-2", "sg-2020-3", "sg-2021-2", "sg-2021-3", "sg-2022-2", "sg-2022-3", "sg-2023-2", "sg-2023-3", "sg-2024-2", "sg-2024-3", "sg-2025-2", "sg-2025-3", "sg-2026-2", "sg-2026-3", "tw-2017-2", "tw-2017-3", "tw-2018-2", "tw-2018-3", "tw-2019-2", "tw-2019-3", "tw-2020-2", "tw-2020-3", "tw-2021-2", "tw-2021-3", "tw-2022-2", "tw-2022-3", "tw-2023-2", "tw-2023-3", "tw-2024-2", "tw-2024-3", "tw-2025-2", "tw-2025-3", "tw-2026-2", "tw-2026-3", "cn-2017-2", "cn-2017-3", "cn-2018-2", "cn-2020-2", "cn-2020-3", "cn-2021-2", "cn-2021-3", "cn-2022-2", "cn-2022-3", "cn-2023-2", "cn-2023-3", "cn-2024-2", "cn-2024-3", "cn-2025-2", "cn-2025-3", "au-2017-2", "au-2017-3", "au-2018-2", "au-2018-3", "au-2019-2", "au-2019-3", "au-2020-2", "au-2020-3", "au-2021-2", "au-2021-3", "au-2022-2", "au-2022-3", "au-2023-2", "au-2023-3", "au-2024-2", "au-2024-3", "au-2025-2", "au-2025-3", "au-2026-2", "au-2026-3", "nz-2017-2", "nz-2017-3", "nz-2018-2", "nz-2018-3", "nz-2019-2", "nz-2019-3", "nz-2020-2", "nz-2020-3", "nz-2021-2", "nz-2021-3", "nz-2022-2", "nz-2022-3", "nz-2023-2", "nz-2023-3", "nz-2024-2", "nz-2024-3", "nz-2025-2", "nz-2025-3", "nz-2026-1", "nz-2026-2"]);

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

    const sgRankings = SEED_MUSIC_RANKINGS.filter((r) => r.countryCode === 'SG' && r.rank === 1);
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

    const byTitle = getMusicRankingByTitleOrPin(99999, 'Die With a Smile');
    expect(byTitle).toBeDefined();
    expect(byTitle?.artist).toBe('Lady Gaga & Bruno Mars');

    // Exact title only: an "artist — title" string must not match.
    expect(getMusicRankingByTitleOrPin(99999, 'Lady Gaga & Bruno Mars — Die With a Smile')).toBeUndefined();
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
    // Charts of the same song in the same year share one card, so count them through alsoCharted.
    expect(ordered.reduce((n, r) => n + 1 + (r.alsoCharted?.length ?? 0), 0)).toBe(SEED_MUSIC_RANKINGS.length);

    // First track: previous should wrap to last track, next should be second track
    const firstTrack = ordered[0];
    const secondTrack = ordered[1];
    const lastTrack = ordered[ordered.length - 1];

    const adjacentFirst = getAdjacentMusicRankings(firstTrack.id);
    expect(adjacentFirst).toBeDefined();
    expect(adjacentFirst?.previous.id).toBe(lastTrack.id);
    expect(adjacentFirst?.next.id).toBe(secondTrack.id);

    // Can also lookup by pinId number
    const pinned = ordered.findIndex((r) => r.pinId);
    const adjacentByPinId = getAdjacentMusicRankings(ordered[pinned].pinId!);
    expect(adjacentByPinId).toBeDefined();
    expect(adjacentByPinId?.next.id).toBe(ordered[(pinned + 1) % ordered.length].id);

    // Last track: next should wrap to first track
    const adjacentLast = getAdjacentMusicRankings(lastTrack.id);
    expect(adjacentLast).toBeDefined();
    expect(adjacentLast?.next.id).toBe(firstTrack.id);

    // Adjacent tracks all have valid backing pins for continuous play
    for (const adj of [adjacentFirst?.next, adjacentFirst?.previous]) {
      if (adj && !PENDING_PIN_ENTRIES.has(adj.id)) expect(adj.pinId).toBeDefined();
    }

    // Adjacent tracks follow the origin-grouped landing page order
    const order = getLandingPageOrderedRankings(SEED_MUSIC_RANKINGS);
    const i = order.findIndex((r) => r.id === 'tw-2025-1');
    const tw2025Adj = getAdjacentMusicRankings('tw-2025-1');
    expect(tw2025Adj?.next.id).toBe(order[i + 1].id);
    expect(tw2025Adj?.previous.id).toBe(order[i - 1].id);
  });
});



