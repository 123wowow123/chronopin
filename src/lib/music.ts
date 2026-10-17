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
      name: 'Singapore',
      code: 'SG',
      flag: '🇸🇬',
      chartName: 'The Official Singapore Chart (RIAS Top Streaming)',
      chartAuthority: 'Recording Industry Association Singapore (RIAS)',
      longitude: 103.82,
    },
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
  /** Where the music was produced (primary artist's origin); the chart fields above are where it charted. */
  originCountry?: string;
  originCountryCode?: string;
  originFlag?: string;
  originContinent?: Continent;
  /** City / region of origin when known. */
  originArea?: string;
  /** The album (or single/EP) this recording is released on. */
  album?: MusicAlbum;
  /** Published weekly-chart run of the song (peak, weeks charted, weeks at #1). */
  songStats?: MusicSongStats;
}

export interface MusicSongStats {
  peak?: number | null;
  weeksOnChart?: number | null;
  weeksAtNumberOne?: number | null;
  chart?: string;
  sourceUrl?: string;
  asOf?: string;
}

export interface MusicAlbumCertification {
  body: string;
  level: string;
  region?: string;
  date?: string | null;
}

export interface MusicAlbumStats {
  certifications: MusicAlbumCertification[];
  /** Sourced sales figure with its unit type and market. */
  units?: string | null;
  peak?: { chart: string; position: number } | null;
  sourceUrl?: string;
}

export interface MusicAlbumTrack {
  n: number;
  title: string;
  /** 30-second preview clip. */
  previewUrl: string;
  durationMs?: number;
}

export interface MusicAlbum {
  title: string;
  kind: 'album' | 'single' | 'ep';
  url?: string;
  artworkUrl?: string;
  releaseDate?: string;
  trackCount?: number;
  stats?: MusicAlbumStats;
  tracks: MusicAlbumTrack[];
}

export interface CountryGroup {
  country: string;
  countryCode: string;
  countryFlag: string;
  chartName: string;
  chartAuthority: string;
  longitude: number;
  rankings: MusicRankingEntry[];
}

export interface ContinentGroup {
  name: Continent;
  slug: string;
  countries: CountryGroup[];
}

export const YEARS_AVAILABLE = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017] as const;

import { RAW_SEED_MUSIC_RANKINGS } from './musicCatalog';
import { ORIGIN_BY_CODE } from './musicOrigins';

// Prod pin ids from the 2026-10-16 music batch (.scrape/prod-batches/music-2026-10-16/posted-prod.json)
// and verified local database seeding records.
const MUSIC_PIN_IDS: Record<string, number> = {
  "us-2025-1": 16032,
  "us-2024-1": 16033,
  "us-2023-1": 16034,
  "us-2022-1": 16035,
  "us-2021-1": 16036,
  "us-2020-1": 16037,
  "ca-2025-1": 16038,
  "ca-2024-1": 16039,
  "mx-2025-1": 16040,
  "mx-2024-1": 16041,
  "co-2025-1": 16042,
  "co-2024-1": 16043,
  "ar-2025-1": 16044,
  "ar-2024-1": 16045,
  "br-2025-1": 16046,
  "br-2024-1": 16047,
  "es-2025-1": 16048,
  "es-2024-1": 16049,
  "gb-2025-1": 16050,
  "gb-2024-1": 16051,
  "gb-2023-1": 16052,
  "fr-2025-1": 16053,
  "fr-2024-1": 16054,
  "de-2025-1": 16055,
  "de-2024-1": 16056,
  "it-2025-1": 16057,
  "se-2025-1": 16058,
  "ng-2025-1": 16059,
  "ng-2024-1": 16060,
  "za-2025-1": 16061,
  "za-2024-1": 16062,
  "cn-2025-1": 16063,
  "cn-2024-1": 16064,
  "tw-2025-1": 16065,
  "kr-2025-1": 16067,
  "kr-2024-1": 16068,
  "jp-2025-1": 16070,
  "jp-2024-1": 16071,
  "au-2025-1": 16072,
  "au-2024-1": 16073,
  "nz-2025-1": 16074,
  "ar-2026-1": 16084,
  "br-2026-1": 16085,
  "fr-2026-1": 16087,
  "de-2026-1": 16088,
  "it-2026-1": 16089,
  "gb-2026-2": 16092,
  "ng-2026-1": 16093,
  "za-2026-1": 16094,
  "tw-2026-1": 16098,
  "ca-2025-2": 16100,
  "us-2025-2": 16101,
  "us-2025-3": 16102,
  "gb-2025-2": 16103,
  "jp-2025-2": 16104,
  "kr-2025-2": 16105,
  "us-2024-2": 16106,
  "us-2024-3": 16107,
  "it-2024-1": 16108,
  "se-2024-1": 16109,
  "gb-2024-2": 16110,
  "jp-2024-2": 16111,
  "kr-2024-2": 16112,
  "tw-2024-1": 16113,
  "nz-2024-1": 16114,
  "ca-2023-1": 16115,
  "mx-2023-1": 16116,
  "us-2023-2": 16117,
  "us-2023-3": 16118,
  "ar-2023-1": 16119,
  "br-2023-1": 16120,
  "co-2023-1": 16121,
  "fr-2023-1": 16122,
  "de-2023-1": 16123,
  "it-2023-1": 16124,
  "es-2023-1": 16125,
  "se-2023-1": 16126,
  "gb-2023-2": 16127,
  "ng-2023-1": 16128,
  "za-2023-1": 16129,
  "cn-2023-1": 16130,
  "jp-2023-1": 16131,
  "jp-2023-2": 16132,
  "kr-2023-1": 16133,
  "kr-2023-2": 16134,
  "tw-2023-1": 16135,
  "au-2023-1": 16137,
  "nz-2023-1": 16138,
  "ca-2022-1": 16139,
  "mx-2022-1": 16140,
  "us-2022-2": 16141,
  "us-2022-3": 16142,
  "ar-2022-1": 16143,
  "br-2022-1": 16144,
  "co-2022-1": 16145,
  "fr-2022-1": 16146,
  "de-2022-1": 16147,
  "it-2022-1": 16148,
  "es-2022-1": 16149,
  "se-2022-1": 16150,
  "gb-2022-1": 16151,
  "ng-2022-1": 16152,
  "za-2022-1": 16153,
  "cn-2022-1": 16154,
  "jp-2022-1": 16155,
  "jp-2022-2": 16156,
  "kr-2022-1": 16157,
  "kr-2022-2": 16158,
  "tw-2022-1": 16159,
  "au-2022-1": 16160,
  "nz-2022-1": 16161,
  "ca-2021-1": 16162,
  "mx-2021-1": 16163,
  "us-2021-2": 16164,
  "us-2021-3": 16165,
  "ar-2021-1": 16166,
  "br-2021-1": 16167,
  "co-2021-1": 16168,
  "fr-2021-1": 16169,
  "de-2021-1": 16170,
  "it-2021-1": 16171,
  "es-2021-1": 16172,
  "se-2021-1": 16173,
  "gb-2021-1": 16174,
  "gb-2021-2": 16175,
  "ng-2021-1": 16176,
  "za-2021-1": 16177,
  "cn-2021-1": 16178,
  "jp-2021-1": 16179,
  "jp-2021-2": 16180,
  "kr-2021-1": 16181,
  "kr-2021-2": 16182,
  "tw-2021-1": 16183,
  "au-2021-1": 16184,
  "nz-2021-1": 16185,
  "ca-2020-1": 16186,
  "mx-2020-1": 16187,
  "us-2020-2": 16188,
  "us-2020-3": 16189,
  "ar-2020-1": 16190,
  "br-2020-1": 16191,
  "co-2020-1": 16192,
  "fr-2020-1": 16193,
  "de-2020-1": 16194,
  "it-2020-1": 16195,
  "es-2020-1": 16196,
  "se-2020-1": 16197,
  "gb-2020-1": 16198,
  "gb-2020-2": 16199,
  "ng-2020-1": 16200,
  "za-2020-1": 16201,
  "cn-2020-1": 16202,
  "jp-2020-1": 16203,
  "jp-2020-2": 16204,
  "kr-2020-1": 16205,
  "kr-2020-2": 16206,
  "tw-2020-1": 16207,
  "au-2020-1": 16208,
  "nz-2020-1": 16209,
  "ca-2019-1": 16210,
  "mx-2019-1": 16211,
  "us-2019-1": 16212,
  "us-2019-2": 16213,
  "us-2019-3": 16214,
  "ar-2019-1": 16215,
  "br-2019-1": 16216,
  "co-2019-1": 16217,
  "fr-2019-1": 16218,
  "ca-2026-1": 16219,
  "gb-2026-1": 16220,
  "au-2026-1": 16221,
  "de-2019-1": 16222,
  "it-2019-1": 16223,
  "es-2019-1": 16224,
  "se-2019-1": 16225,
  "gb-2019-1": 16226,
  "cn-2019-1": 16228,
  "jp-2019-1": 16229,
  "tw-2019-1": 16230,
  "us-2018-2": 16232,
  "us-2018-3": 16233,
  "br-2018-1": 16234,
  "co-2018-1": 16235,
  "it-2018-1": 16236,
  "jp-2018-1": 16241,
  "kr-2018-1": 16242,
  "au-2018-1": 16244,
  "nz-2018-1": 16245,
  "ca-2017-1": 16246,
  "us-2017-1": 16247,
  "us-2017-2": 16248,
  "us-2017-3": 16249,
  "br-2017-1": 16251,
  "co-2017-1": 16252,
  "fr-2017-1": 16253,
  "de-2017-1": 16254,
  "it-2017-1": 16255,
  "es-2017-1": 16256,
  "se-2017-1": 16257,
  "gb-2017-1": 16258,
  "jp-2017-1": 16262,
  "kr-2017-1": 16263,
  "tw-2017-1": 16264,
  "au-2017-1": 16265,
  "nz-2017-1": 16266,
  "ca-2018-1": 16297,
  "us-2018-1": 16231,
  "gb-2018-1": 16237,
  "cn-2018-1": 16240,
  "tw-2018-1": 16243,
  "mx-2017-1": 16298,
  "za-2019-1": 16267,
  "kr-2019-1": 16268,
  "au-2019-1": 16269,
  "nz-2019-1": 16270,
  "mx-2018-1": 16271,
  "ar-2018-1": 16272,
  "fr-2018-1": 16273,
  "de-2018-1": 16274,
  "es-2018-1": 16275,
  "se-2018-1": 16276,
  "sg-2026-1": 16277,
  "sg-2025-1": 16278,
  "sg-2024-1": 16279,
  "sg-2023-1": 16280,
  "sg-2022-1": 16281,
  "sg-2021-1": 16282,
  "sg-2020-1": 16283,
  "sg-2019-1": 16284,
  "sg-2018-1": 16285
};

export const SEED_MUSIC_RANKINGS: MusicRankingEntry[] = RAW_SEED_MUSIC_RANKINGS.map(
  (item) => ({
    ...item,
    pinId: item.pinId ?? MUSIC_PIN_IDS[item.id],
  }),
);

// Where the music was produced. Falls back to the chart's country until an origin is known.
export function originOf(item: MusicRankingEntry): { continent: Continent; name: string; code: string; flag: string } {
  return {
    continent: item.originContinent ?? item.continent,
    name: item.originCountry ?? item.country,
    code: item.originCountryCode ?? item.countryCode,
    flag: item.originFlag ?? item.countryFlag,
  };
}

// Helper to filter and group music rankings hierarchically by the continent and country the
// music was produced in (west to east), not by the chart it appeared on.
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
    const origin = originOf(item);
    if (year !== 'all' && item.year !== Number(year)) return false;
    if (continent !== 'all' && origin.continent !== continent) return false;
    if (country !== 'all' && origin.name !== country) return false;
    if (q) {
      const hay = [
        item.title,
        item.artist,
        origin.name,
        item.originArea ?? '',
        item.country,
        item.chartName,
        item.album?.title ?? '',
        ...item.genres,
      ];
      if (!hay.some((h) => h.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const continentMap = new Map<Continent, Map<string, MusicRankingEntry[]>>();
  for (const c of CONTINENTS) continentMap.set(c, new Map());
  for (const item of filtered) {
    const { continent: c, name } = originOf(item);
    const countryMap = continentMap.get(c) ?? new Map<string, MusicRankingEntry[]>();
    continentMap.set(c, countryMap);
    countryMap.set(name, [...(countryMap.get(name) ?? []), item]);
  }

  const groups: ContinentGroup[] = [];
  for (const c of CONTINENTS) {
    const countryMap = continentMap.get(c);
    if (!countryMap || countryMap.size === 0) continue;

    const countryGroups: CountryGroup[] = [];
    for (const [name, list] of countryMap) {
      list.sort((a, b) => b.year - a.year || a.rank - b.rank);
      const o = originOf(list[0]);
      const longitude =
        ORIGIN_BY_CODE[o.code]?.longitude ??
        COUNTRIES_BY_CONTINENT[c].find((m) => m.code === o.code)?.longitude ??
        0;
      const charts = [...new Set(list.map((r) => r.chartName))];
      const authorities = [...new Set(list.map((r) => r.chartAuthority))];
      countryGroups.push({
        country: name,
        countryCode: o.code,
        countryFlag: o.flag,
        chartName: charts.join(' · '),
        chartAuthority: authorities.join(' · '),
        longitude,
        rankings: list,
      });
    }
    countryGroups.sort((a, b) => a.longitude - b.longitude);

    groups.push({ name: c, slug: CONTINENT_SLUGS[c], countries: countryGroups });
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

// Flattens music rankings into the exact sequential order rendered on the landing page:
// West-to-East continents, West-to-East countries, and descending years.
export function getLandingPageOrderedRankings(
  rankings: MusicRankingEntry[] = SEED_MUSIC_RANKINGS,
  options?: {
    year?: number | 'all';
    continent?: string;
    country?: string;
    query?: string;
  },
): MusicRankingEntry[] {
  const groups = filterAndGroupMusicRankings(rankings, options);
  return groups.flatMap((cg) => cg.countries.flatMap((c) => c.rankings));
}

export function getAdjacentMusicRankings(
  idOrPinId: number | string,
  customRankings?: MusicRankingEntry[],
): {
  previous: MusicRankingEntry;
  next: MusicRankingEntry;
} | undefined {
  const list =
    customRankings && customRankings.length > 0
      ? customRankings
      : getLandingPageOrderedRankings(SEED_MUSIC_RANKINGS);

  const numId = typeof idOrPinId === 'number' ? idOrPinId : Number(idOrPinId);
  const idx = list.findIndex(
    (r) => r.pinId === numId || r.id === String(idOrPinId),
  );
  if (idx === -1) return undefined;
  const previous = list[(idx - 1 + list.length) % list.length];
  const next = list[(idx + 1) % list.length];
  return { previous, next };
}


