// Top music rankings around the world, grouped by continent and then by country,
// honoring ChronoPin's west-to-east ordering and backed by native Pin records.

export type Continent =
  | 'North America'
  | 'Latin America'
  | 'Europe'
  | 'Africa'
  | 'Asia'
  | 'Oceania';

export interface CountryMeta {
  name: string;
  code: string;
  flag: string;
  chartName: string;
  chartAuthority: string;
  longitude: number;
}

// Continents ordered West to East by approximate median longitude
export const CONTINENTS: readonly Continent[] = [
  'North America',
  'Latin America',
  'Europe',
  'Africa',
  'Asia',
  'Oceania',
] as const;

export const CONTINENT_SLUGS: Record<Continent, string> = {
  'North America': 'north-america',
  'Latin America': 'latin-america',
  Europe: 'europe',
  Africa: 'africa',
  Asia: 'asia',
  Oceania: 'oceania',
};

// Countries within each continent ordered West to East by national center longitude
export const COUNTRIES_BY_CONTINENT: Record<Continent, readonly CountryMeta[]> = {
  'North America': [
    {
      name: 'Mexico',
      code: 'MX',
      flag: '🇲🇽',
      chartName: 'Monitor Latino Mexico Top 100',
      chartAuthority: 'Monitor Latino / AMPROFON',
      longitude: -102.55,
    },
    {
      name: 'United States',
      code: 'US',
      flag: '🇺🇸',
      chartName: 'Billboard Hot 100',
      chartAuthority: 'Billboard / Luminate',
      longitude: -98.58,
    },
    {
      name: 'Canada',
      code: 'CA',
      flag: '🇨🇦',
      chartName: 'Billboard Canadian Hot 100',
      chartAuthority: 'Music Canada / Billboard',
      longitude: -96.35,
    },
  ],
  'Latin America': [
    {
      name: 'Colombia',
      code: 'CO',
      flag: '🇨🇴',
      chartName: 'Monitor Latino Colombia',
      chartAuthority: 'Monitor Latino',
      longitude: -74.29,
    },
    {
      name: 'Argentina',
      code: 'AR',
      flag: '🇦🇷',
      chartName: 'Billboard Argentina Hot 100',
      chartAuthority: 'Billboard Argentina / CAPIF',
      longitude: -63.61,
    },
    {
      name: 'Brazil',
      code: 'BR',
      flag: '🇧🇷',
      chartName: 'Crowley / Pro-Música Brasil Top 100',
      chartAuthority: 'Pro-Música Brasil / Crowley Broadcast',
      longitude: -51.92,
    },
  ],
  Europe: [
    {
      name: 'Spain',
      code: 'ES',
      flag: '🇪🇸',
      chartName: 'PROMUSICAE Top 100 Canciones',
      chartAuthority: 'PROMUSICAE / AGEDI',
      longitude: -3.74,
    },
    {
      name: 'United Kingdom',
      code: 'GB',
      flag: '🇬🇧',
      chartName: 'Official Charts UK Singles',
      chartAuthority: 'Official Charts Company',
      longitude: -1.55,
    },
    {
      name: 'France',
      code: 'FR',
      flag: '🇫🇷',
      chartName: 'SNEP Top 200 Singles',
      chartAuthority: 'SNEP',
      longitude: 2.21,
    },
    {
      name: 'Germany',
      code: 'DE',
      flag: '🇩🇪',
      chartName: 'GfK Top 100 Singles',
      chartAuthority: 'GfK Entertainment / BVMI',
      longitude: 10.45,
    },
    {
      name: 'Italy',
      code: 'IT',
      flag: '🇮🇹',
      chartName: 'FIMI Top of the Music',
      chartAuthority: 'FIMI / GfK Italia',
      longitude: 12.56,
    },
    {
      name: 'Sweden',
      code: 'SE',
      flag: '🇸🇪',
      chartName: 'Sverigetopplistan Årslistor',
      chartAuthority: 'GLF / Ifpi Sverige',
      longitude: 18.06,
    },
  ],
  Africa: [
    {
      name: 'Nigeria',
      code: 'NG',
      flag: '🇳🇬',
      chartName: 'TurnTable Official Nigeria Top 100',
      chartAuthority: 'TurnTable Charts',
      longitude: 8.67,
    },
    {
      name: 'South Africa',
      code: 'ZA',
      flag: '🇿🇦',
      chartName: 'The Official South African Charts (TOSAC)',
      chartAuthority: 'Recording Industry of South Africa (RiSA)',
      longitude: 25.08,
    },
  ],
  Asia: [
    {
      name: 'China',
      code: 'CN',
      flag: '🇨🇳',
      chartName: 'TME Tencent Music Uni Chart',
      chartAuthority: 'Tencent Music Entertainment',
      longitude: 104.19,
    },
    {
      name: 'Taiwan',
      code: 'TW',
      flag: '🇹🇼',
      chartName: 'KKBOX Annual Top 100 Singles',
      chartAuthority: 'KKBOX',
      longitude: 120.96,
    },
    {
      name: 'South Korea',
      code: 'KR',
      flag: '🇰🇷',
      chartName: 'Circle Digital Chart (Melon Year-End)',
      chartAuthority: 'Korea Music Content Association (KMCA)',
      longitude: 127.76,
    },
    {
      name: 'Japan',
      code: 'JP',
      flag: '🇯🇵',
      chartName: 'Billboard Japan Hot 100 (Oricon Annual)',
      chartAuthority: 'Billboard Japan / Oricon',
      longitude: 139.69,
    },
  ],
  Oceania: [
    {
      name: 'Australia',
      code: 'AU',
      flag: '🇦🇺',
      chartName: 'ARIA Top 100 Singles',
      chartAuthority: 'Australian Recording Industry Association',
      longitude: 133.77,
    },
    {
      name: 'New Zealand',
      code: 'NZ',
      flag: '🇳🇿',
      chartName: 'Recorded Music NZ Official Top 40',
      chartAuthority: 'Recorded Music NZ',
      longitude: 174.88,
    },
  ],
};

export interface MusicRankingEntry {
  id: string;
  year: number;
  rank: number;
  title: string;
  artist: string;
  chartName: string;
  chartAuthority: string;
  continent: Continent;
  country: string;
  countryCode: string;
  countryFlag: string;
  sourceUrl: string;
  releaseDate: string;
  genres: string[];
  artworkUrl: string;
  audioUrl?: string;
  youtubeId?: string;
  youtubeUrl?: string;
  streamsOrUnits?: string;
  weeksAtNumberOne?: number;
  summary: string;
  pinId?: number;
}

export interface CountryGroup {
  country: string;
  countryCode: string;
  countryFlag: string;
  chartName: string;
  chartAuthority: string;
  rankings: MusicRankingEntry[];
}

export interface ContinentGroup {
  name: Continent;
  slug: string;
  countries: CountryGroup[];
}

export const YEARS_AVAILABLE = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017] as const;

import { RAW_SEED_MUSIC_RANKINGS } from './musicCatalog';

// Prod pin ids from the 2026-10-16 music batch (.scrape/prod-batches/music-2026-10-16/posted-prod.json)
// and verified local database seeding records.
const MUSIC_PIN_IDS: Record<string, number> = {
  'mx-2026-1': 16073,
  'us-2026-1': 16031,
  'us-2026-2': 16074,
  'us-2026-3': 16075,
  'ca-2026-1': 16076,
  'es-2026-1': 16136,
  'gb-2026-1': 16060,
  'gb-2026-2': 16077,
  'fr-2026-1': 16137,
  'de-2026-1': 16078,
  'it-2026-1': 16138,
  'ng-2026-1': 16139,
  'za-2026-1': 16140,
  'kr-2026-1': 16066,
  'kr-2026-2': 16079,
  'jp-2026-1': 16069,
  'jp-2026-2': 16080,
  'au-2026-1': 16060,
  'mx-2025-1': 16040,
  'us-2025-1': 16032,
  'us-2025-2': 16081,
  'us-2025-3': 16044,
  'ca-2025-1': 16038,
  'ca-2025-2': 16025,
  'co-2025-1': 16042,
  'ar-2025-1': 16044,
  'br-2025-1': 16046,
  'es-2025-1': 16048,
  'gb-2025-1': 16050,
  'gb-2025-2': 16082,
  'fr-2025-1': 16053,
  'de-2025-1': 16055,
  'it-2025-1': 16057,
  'se-2025-1': 16058,
  'ng-2025-1': 16059,
  'za-2025-1': 16061,
  'cn-2025-1': 16063,
  'tw-2025-1': 16065,
  'kr-2025-1': 16067,
  'kr-2025-2': 16141,
  'jp-2025-1': 16070,
  'jp-2025-2': 16063,
  'au-2025-1': 16072,
  'nz-2025-1': 16074,
  'mx-2024-1': 16041,
  'us-2024-1': 16033,
  'us-2024-2': 16083,
  'us-2024-3': 16081,
  'ca-2024-1': 16039,
  'co-2024-1': 16043,
  'ar-2024-1': 16045,
  'br-2024-1': 16047,
  'es-2024-1': 16049,
  'gb-2024-1': 16051,
  'gb-2024-2': 16044,
  'fr-2024-1': 16054,
  'de-2024-1': 16056,
  'ng-2024-1': 16060,
  'za-2024-1': 16062,
  'cn-2024-1': 16064,
  'kr-2024-1': 16068,
  'kr-2024-2': 16061,
  'jp-2024-1': 16071,
  'jp-2024-2': 16064,
  'au-2024-1': 16073,
  'mx-2023-1': 16084,
  'us-2023-1': 16034,
  'us-2023-2': 16085,
  'us-2023-3': 16086,
  'ca-2023-1': 16046,
  'co-2023-1': 16037,
  'ar-2023-1': 16039,
  'br-2023-1': 16041,
  'es-2023-1': 16142,
  'gb-2023-1': 16052,
  'gb-2023-2': 16087,
  'de-2023-1': 16088,
  'it-2023-1': 16089,
  'se-2023-1': 16143,
  'ng-2023-1': 16054,
  'kr-2023-1': 16062,
  'kr-2023-2': 16090,
  'jp-2023-1': 16065,
  'jp-2023-2': 16091,
  'au-2023-1': 16028,
  'mx-2022-1': 16092,
  'us-2022-1': 16035,
  'us-2022-2': 16093,
  'us-2022-3': 16094,
  'ca-2022-1': 16093,
  'co-2022-1': 16095,
  'ar-2022-1': 16096,
  'br-2022-1': 16097,
  'es-2022-1': 16144,
  'gb-2022-1': 16093,
  'fr-2022-1': 16098,
  'it-2022-1': 16099,
  'ng-2022-1': 16100,
  'za-2022-1': 16145,
  'kr-2022-1': 16101,
  'kr-2022-2': 16102,
  'jp-2022-1': 16103,
  'jp-2022-2': 16104,
  'au-2022-1': 16093,
  'mx-2021-1': 16105,
  'us-2021-1': 16036,
  'us-2021-2': 16106,
  'us-2021-3': 16107,
  'ca-2021-1': 16030,
  'co-2021-1': 16108,
  'ar-2021-1': 16109,
  'br-2021-1': 16110,
  'es-2021-1': 16146,
  'gb-2021-1': 16111,
  'gb-2021-2': 16112,
  'fr-2021-1': 16113,
  'de-2021-1': 16114,
  'it-2021-1': 16115,
  'ng-2021-1': 16116,
  'za-2021-1': 16117,
  'kr-2021-1': 16118,
  'kr-2021-2': 16119,
  'jp-2021-1': 16120,
  'jp-2021-2': 16121,
  'au-2021-1': 16029,
  'mx-2020-1': 16122,
  'us-2020-1': 16037,
  'us-2020-2': 16123,
  'us-2020-3': 16124,
  'ca-2020-1': 16031,
  'co-2020-1': 16125,
  'br-2020-1': 16126,
  'es-2020-1': 16147,
  'gb-2020-1': 16031,
  'gb-2020-2': 16127,
  'fr-2020-1': 16128,
  'de-2020-1': 16031,
  'it-2020-1': 16129,
  'se-2020-1': 16148,
  'ng-2020-1': 16130,
  'za-2020-1': 16131,
  'kr-2020-1': 16132,
  'kr-2020-2': 16133,
  'jp-2020-1': 16134,
  'jp-2020-2': 16135,
  'au-2020-1': 16031,
  'mx-2019-1': 16149,
  'us-2019-1': 16150,
  'us-2019-2': 16151,
  'us-2019-3': 16152,
  'ca-2019-1': 16153,
  'co-2019-1': 16154,
  'br-2019-1': 16155,
  'gb-2019-1': 16156,
  'kr-2019-1': 16157,
  'jp-2019-1': 16134,
  'au-2019-1': 16158,
  'us-2018-1': 16159,
  'us-2018-2': 16160,
  'us-2018-3': 16161,
  'ca-2018-1': 16159,
  'co-2018-1': 16162,
  'gb-2018-1': 16163,
  'kr-2018-1': 16164,
  'jp-2018-1': 16165,
  'au-2018-1': 16166,
  'mx-2017-1': 16167,
  'us-2017-1': 16168,
  'us-2017-2': 16167,
  'us-2017-3': 16169,
  'ca-2017-1': 16168,
  'co-2017-1': 16170,
  'gb-2017-1': 16168,
  'kr-2017-1': 16171,
  'jp-2017-1': 16172,
  'au-2017-1': 16168,
};

export const SEED_MUSIC_RANKINGS: MusicRankingEntry[] = RAW_SEED_MUSIC_RANKINGS.map(
  (item) => ({
    ...item,
    pinId: item.pinId ?? MUSIC_PIN_IDS[item.id],
  }),
);

// Helper to filter and group music rankings hierarchically by continent and country
export function filterAndGroupMusicRankings(
  rankings: MusicRankingEntry[],
  options: {
    year?: number | 'all';
    continent?: string;
    country?: string;
    query?: string;
  } = {},
): ContinentGroup[] {
  const { year = 'all', continent = 'all', country = 'all', query = '' } = options;
  const q = query.trim().toLowerCase();

  const filtered = rankings.filter((item) => {
    if (year !== 'all' && item.year !== Number(year)) return false;
    if (continent !== 'all' && item.continent !== continent) return false;
    if (country !== 'all' && item.country !== country) return false;
    if (q) {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchArtist = item.artist.toLowerCase().includes(q);
      const matchCountry = item.country.toLowerCase().includes(q);
      const matchChart = item.chartName.toLowerCase().includes(q);
      const matchGenre = item.genres.some((g) => g.toLowerCase().includes(q));
      if (!matchTitle && !matchArtist && !matchCountry && !matchChart && !matchGenre) {
        return false;
      }
    }
    return true;
  });

  const continentMap = new Map<Continent, Map<string, MusicRankingEntry[]>>();
  for (const c of CONTINENTS) {
    continentMap.set(c, new Map());
  }

  for (const item of filtered) {
    let countryMap = continentMap.get(item.continent);
    if (!countryMap) {
      countryMap = new Map();
      continentMap.set(item.continent, countryMap);
    }
    const countryList = countryMap.get(item.country) || [];
    countryList.push(item);
    countryMap.set(item.country, countryList);
  }

  const groups: ContinentGroup[] = [];

  for (const c of CONTINENTS) {
    const countryMap = continentMap.get(c);
    if (!countryMap || countryMap.size === 0) continue;

    // Sort countries west to east within this continent
    const countriesMeta = COUNTRIES_BY_CONTINENT[c] || [];
    const countryGroups: CountryGroup[] = [];

    for (const meta of countriesMeta) {
      const countryRankings = countryMap.get(meta.name);
      if (countryRankings && countryRankings.length > 0) {
        // Sort by year descending, then rank ascending
        countryRankings.sort((a, b) => b.year - a.year || a.rank - b.rank);
        countryGroups.push({
          country: meta.name,
          countryCode: meta.code,
          countryFlag: meta.flag,
          chartName: meta.chartName,
          chartAuthority: meta.chartAuthority,
          rankings: countryRankings,
        });
      }
    }

    if (countryGroups.length > 0) {
      groups.push({
        name: c,
        slug: CONTINENT_SLUGS[c],
        countries: countryGroups,
      });
    }
  }

  return groups;
}

export function getAvailableYears(rankings: MusicRankingEntry[]): number[] {
  const years = new Set<number>();
  for (const r of rankings) {
    years.add(r.year);
  }
  return Array.from(years).sort((a, b) => b - a);
}

export function getMusicRankingEntry(idOrPinId: string | number): MusicRankingEntry | undefined {
  if (typeof idOrPinId === 'number') {
    return SEED_MUSIC_RANKINGS.find((r) => r.pinId === idOrPinId);
  }
  return SEED_MUSIC_RANKINGS.find((r) => r.id === idOrPinId || String(r.pinId) === idOrPinId);
}

export function getMusicRankingByTitleOrPin(id: number, title?: string, productName?: string | null): MusicRankingEntry | undefined {
  const byPinId = SEED_MUSIC_RANKINGS.find((r) => r.pinId === id);
  if (byPinId) return byPinId;

  if (productName) {
    const pLower = productName.toLowerCase().trim();
    const byProduct = SEED_MUSIC_RANKINGS.find((r) => r.title.toLowerCase().trim() === pLower);
    if (byProduct) return byProduct;
  }

  if (title) {
    const tLower = title.toLowerCase();
    const byTitle = SEED_MUSIC_RANKINGS.find(
      (r) => tLower.includes(r.title.toLowerCase()) || r.title.toLowerCase().includes(tLower),
    );
    if (byTitle) return byTitle;
  }

  return undefined;
}

export function getAdjacentMusicRankings(idOrPinId: number | string): {
  previous: MusicRankingEntry;
  next: MusicRankingEntry;
} | undefined {
  const numId = typeof idOrPinId === 'number' ? idOrPinId : Number(idOrPinId);
  const idx = SEED_MUSIC_RANKINGS.findIndex(
    (r) => r.pinId === numId || r.id === String(idOrPinId),
  );
  if (idx === -1) return undefined;
  const previous = SEED_MUSIC_RANKINGS[(idx - 1 + SEED_MUSIC_RANKINGS.length) % SEED_MUSIC_RANKINGS.length];
  const next = SEED_MUSIC_RANKINGS[(idx + 1) % SEED_MUSIC_RANKINGS.length];
  return { previous, next };
}

