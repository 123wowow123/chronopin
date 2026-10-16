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

export const YEARS_AVAILABLE = [2026, 2025, 2024, 2023, 2022, 2021, 2020] as const;

const RAW_SEED_MUSIC_RANKINGS: MusicRankingEntry[] = [
  // -------------------------------------------------------------
  // NORTH AMERICA - United States
  // -------------------------------------------------------------
  {
    id: 'us-2026-1',
    year: 2026,
    rank: 1,
    title: 'Birds of a Feather',
    artist: 'Billie Eilish',
    chartName: 'Billboard Hot 100',
    chartAuthority: 'Billboard / Luminate',
    continent: 'North America',
    country: 'United States',
    countryCode: 'US',
    countryFlag: '🇺🇸',
    sourceUrl: 'https://www.billboard.com/charts/hot-100/',
    releaseDate: '2024-05-17',
    genres: ['Pop', 'Alt-Pop'],
    artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/34/31/d3/3431d34e-847f-5d66-df83-0bce688d997e/mzaf_18106743962423782018.plus.aac.p.m4a',
    youtubeId: 'V9PVRfjEBTI',
    youtubeUrl: 'https://www.youtube.com/watch?v=V9PVRfjEBTI',
    streamsOrUnits: '2.4B Global Streams · 4x Platinum',
    weeksAtNumberOne: 9,
    summary: 'A generational pop masterpiece spanning chart-topping longevity, Grammy Record of the Year honors, and relentless radio airplay.',
  },
  {
    id: 'us-2025-1',
    year: 2025,
    rank: 1,
    title: 'A Bar Song (Tipsy)',
    artist: 'Shaboozey',
    chartName: 'Billboard Hot 100',
    chartAuthority: 'Billboard / Luminate',
    continent: 'North America',
    country: 'United States',
    countryCode: 'US',
    countryFlag: '🇺🇸',
    sourceUrl: 'https://www.billboard.com/charts/year-end/hot-100-songs/',
    releaseDate: '2024-04-12',
    genres: ['Country', 'Hip-Hop'],
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/46/6f/7f/466f7f67-0365-ddf8-16c2-e033371d2f7e/mzaf_3764341442720608698.plus.aac.p.m4a',
    youtubeId: 't7bQwwqW-Hc',
    youtubeUrl: 'https://www.youtube.com/watch?v=t7bQwwqW-Hc',
    streamsOrUnits: '1.9B Global Streams · 7x Platinum',
    weeksAtNumberOne: 19,
    summary: 'Tying Lil Nas X with 19 consecutive weeks atop the Billboard Hot 100, fusing classic J-Kwon hip-hop cadence with modern country swagger.',
  },
  {
    id: 'us-2024-1',
    year: 2024,
    rank: 1,
    title: 'A Bar Song (Tipsy)',
    artist: 'Shaboozey',
    chartName: 'Billboard Hot 100',
    chartAuthority: 'Billboard / Luminate',
    continent: 'North America',
    country: 'United States',
    countryCode: 'US',
    countryFlag: '🇺🇸',
    sourceUrl: 'https://www.billboard.com/charts/year-end/2024/hot-100-songs/',
    releaseDate: '2024-04-12',
    genres: ['Country', 'Country-Rap'],
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/46/6f/7f/466f7f67-0365-ddf8-16c2-e033371d2f7e/mzaf_3764341442720608698.plus.aac.p.m4a',
    youtubeId: 't7bQwwqW-Hc',
    youtubeUrl: 'https://www.youtube.com/watch?v=t7bQwwqW-Hc',
    streamsOrUnits: '1.5B US Streams · Year-End #1',
    weeksAtNumberOne: 17,
    summary: 'The defining crossover anthem of 2024, leading Billboard Hot 100 Year-End and setting historic country streaming records.',
  },
  {
    id: 'us-2023-1',
    year: 2023,
    rank: 1,
    title: 'Last Night',
    artist: 'Morgan Wallen',
    chartName: 'Billboard Hot 100',
    chartAuthority: 'Billboard / Luminate',
    continent: 'North America',
    country: 'United States',
    countryCode: 'US',
    countryFlag: '🇺🇸',
    sourceUrl: 'https://www.billboard.com/charts/year-end/2023/hot-100-songs/',
    releaseDate: '2023-01-31',
    genres: ['Country', 'Pop'],
    artworkUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/5e/80/50/5e80506c-cee2-618a-a481-63ca5c74c5ab/mzaf_1765193813138928866.plus.aac.p.m4a',
    youtubeId: 'bUjPPBxbQrQ',
    youtubeUrl: 'https://www.youtube.com/watch?v=bUjPPBxbQrQ',
    streamsOrUnits: '1.3B US Streams · 6x Platinum',
    weeksAtNumberOne: 16,
    summary: 'Billboard Hot 100 #1 Year-End song of 2023, spending 16 non-consecutive weeks at #1 and anchoring One Thing at a Time.',
  },
  {
    id: 'us-2022-1',
    year: 2022,
    rank: 1,
    title: 'Heat Waves',
    artist: 'Glass Animals',
    chartName: 'Billboard Hot 100',
    chartAuthority: 'Billboard / Luminate',
    continent: 'North America',
    country: 'United States',
    countryCode: 'US',
    countryFlag: '🇺🇸',
    sourceUrl: 'https://www.billboard.com/charts/year-end/2022/hot-100-songs/',
    releaseDate: '2020-06-29',
    genres: ['Indie Pop', 'Psychedelic Pop'],
    artworkUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/a3/4c/b9/a34cb911-40fc-5f0c-e862-14bd171a77aa/mzaf_384792072030970151.plus.aac.p.m4a',
    youtubeId: 'mRD0-GxqHVo',
    youtubeUrl: 'https://www.youtube.com/watch?v=mRD0-GxqHVo',
    streamsOrUnits: '2.8B Global Streams · Diamond Certified',
    weeksAtNumberOne: 5,
    summary: 'The longest climb to #1 in Billboard Hot 100 history (59 weeks), crowned the #1 Year-End song of 2022 worldwide.',
  },
  {
    id: 'us-2021-1',
    year: 2021,
    rank: 1,
    title: 'Levitating',
    artist: 'Dua Lipa',
    chartName: 'Billboard Hot 100',
    chartAuthority: 'Billboard / Luminate',
    continent: 'North America',
    country: 'United States',
    countryCode: 'US',
    countryFlag: '🇺🇸',
    sourceUrl: 'https://www.billboard.com/charts/year-end/2021/hot-100-songs/',
    releaseDate: '2020-03-27',
    genres: ['Disco-Pop', 'Nu-Disco'],
    artworkUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/59/dc/4d/59dc4dda-93ff-8f1c-c536-f005f6ea6af5/mzaf_3066686759813252385.plus.aac.p.m4a',
    youtubeId: 'TUVcZfQe-Kw',
    youtubeUrl: 'https://www.youtube.com/watch?v=TUVcZfQe-Kw',
    streamsOrUnits: '3.2B Global Streams · Diamond',
    weeksAtNumberOne: 1,
    summary: 'Historic Billboard #1 Year-End single of 2021 despite peaking at #2, due to an unprecedented 77 weeks inside the Hot 100.',
  },
  {
    id: 'us-2020-1',
    year: 2020,
    rank: 1,
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    chartName: 'Billboard Hot 100',
    chartAuthority: 'Billboard / Luminate',
    continent: 'North America',
    country: 'United States',
    countryCode: 'US',
    countryFlag: '🇺🇸',
    sourceUrl: 'https://www.billboard.com/charts/year-end/2020/hot-100-songs/',
    releaseDate: '2019-11-29',
    genres: ['Synthwave', 'Synth-Pop'],
    artworkUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/6f/04/de/6f04def7-3116-e461-da6e-43171db830cb/mzaf_12524670770227883365.plus.aac.p.m4a',
    youtubeId: '4NRXx6U8ABQ',
    youtubeUrl: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ',
    streamsOrUnits: '4.5B Global Streams · Billboard All-Time #1',
    weeksAtNumberOne: 4,
    summary: 'Officially recognized by Billboard as the #1 Greatest Hot 100 Song of All Time, spending 90 consecutive weeks on the charts.',
  },

  // -------------------------------------------------------------
  // NORTH AMERICA - Canada
  // -------------------------------------------------------------
  {
    id: 'ca-2025-1',
    year: 2025,
    rank: 1,
    title: 'Dancing in the Flames',
    artist: 'The Weeknd',
    chartName: 'Billboard Canadian Hot 100',
    chartAuthority: 'Music Canada / Billboard',
    continent: 'North America',
    country: 'Canada',
    countryCode: 'CA',
    countryFlag: '🇨🇦',
    sourceUrl: 'https://www.billboard.com/charts/canadian-hot-100/',
    releaseDate: '2024-09-13',
    genres: ['Synth-Pop', 'R&B'],
    artworkUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/dc/9c/c9/dc9cc992-a72d-37aa-3b26-81735048837f/mzaf_7502433658121927367.plus.aac.p.m4a',
    youtubeId: 'MLlSSJ0z7xM',
    youtubeUrl: 'https://www.youtube.com/watch?v=MLlSSJ0z7xM',
    streamsOrUnits: '850M Streams · 3x Platinum',
    weeksAtNumberOne: 8,
    summary: 'The Toronto superstar debuts at #1 across Canadian radio and streaming platforms, heralding Hurry Up Tomorrow.',
  },
  {
    id: 'ca-2024-1',
    year: 2024,
    rank: 1,
    title: 'A Bar Song (Tipsy)',
    artist: 'Shaboozey',
    chartName: 'Billboard Canadian Hot 100',
    chartAuthority: 'Music Canada / Billboard',
    continent: 'North America',
    country: 'Canada',
    countryCode: 'CA',
    countryFlag: '🇨🇦',
    sourceUrl: 'https://www.billboard.com/charts/year-end/2024/canadian-hot-100/',
    releaseDate: '2024-04-12',
    genres: ['Country', 'Hip-Hop'],
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/46/6f/7f/466f7f67-0365-ddf8-16c2-e033371d2f7e/mzaf_3764341442720608698.plus.aac.p.m4a',
    youtubeId: 't7bQwwqW-Hc',
    youtubeUrl: 'https://www.youtube.com/watch?v=t7bQwwqW-Hc',
    streamsOrUnits: 'Canadian Year-End #1 · 5x Platinum',
    weeksAtNumberOne: 12,
    summary: 'Dominated Canadian airplay from Vancouver to Halifax, topping both country and pop charts simultaneously.',
  },

  // -------------------------------------------------------------
  // NORTH AMERICA - Mexico
  // -------------------------------------------------------------
  {
    id: 'mx-2025-1',
    year: 2025,
    rank: 1,
    title: 'La Patrulla',
    artist: 'Peso Pluma & Neton Vega',
    chartName: 'Monitor Latino Mexico Top 100',
    chartAuthority: 'Monitor Latino / AMPROFON',
    continent: 'North America',
    country: 'Mexico',
    countryCode: 'MX',
    countryFlag: '🇲🇽',
    sourceUrl: 'https://monitorlatino.com/top-100-mexico/',
    releaseDate: '2024-08-01',
    genres: ['Corridos Tumbados', 'Regional Mexican'],
    artworkUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/73/3f/b0/733fb0dd-1e88-cc50-d7e5-f3eb7d1c7a52/mzaf_10725724156639437184.plus.aac.p.m4a',
    youtubeId: 'Fr9rMmMp3mY',
    youtubeUrl: 'https://www.youtube.com/watch?v=Fr9rMmMp3mY',
    streamsOrUnits: '900M Streams · 4x Diamond',
    weeksAtNumberOne: 14,
    summary: 'The Mexican heavyweight extends regional Mexican music domination with infectious charcheta brass and rapid-fire lyricism.',
  },
  {
    id: 'mx-2024-1',
    year: 2024,
    rank: 1,
    title: 'La Diabla',
    artist: 'Xavi',
    chartName: 'Monitor Latino Mexico Top 100',
    chartAuthority: 'Monitor Latino / AMPROFON',
    continent: 'North America',
    country: 'Mexico',
    countryCode: 'MX',
    countryFlag: '🇲🇽',
    sourceUrl: 'https://amprofon.com.mx/es/pages/top-anual.php',
    releaseDate: '2023-11-30',
    genres: ['Corridos Tumbados', 'Sierreño'],
    artworkUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/3f/48/19/3f4819e9-a158-a0ab-a281-2758fedbf1a5/mzaf_9713360141782464156.plus.aac.p.m4a',
    youtubeId: 'HfzbN5ky5Co',
    youtubeUrl: 'https://www.youtube.com/watch?v=HfzbN5ky5Co',
    streamsOrUnits: '1.2B Global Streams · Year-End #1',
    weeksAtNumberOne: 11,
    summary: 'Young Mexican singer-songwriter Xavi captivated Latin America, becoming the first solo Mexican artist to lead global Spotify for weeks.',
  },

  // -------------------------------------------------------------
  // LATIN AMERICA - Colombia
  // -------------------------------------------------------------
  {
    id: 'co-2025-1',
    year: 2025,
    rank: 1,
    title: 'Luna',
    artist: 'Feid & ATL Jacob',
    chartName: 'Monitor Latino Colombia',
    chartAuthority: 'Monitor Latino',
    continent: 'Latin America',
    country: 'Colombia',
    countryCode: 'CO',
    countryFlag: '🇨🇴',
    sourceUrl: 'https://monitorlatino.com/top-colombia/',
    releaseDate: '2023-12-01',
    genres: ['Reggaeton', 'Urbano Latino'],
    artworkUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/15/cd/72/15cd7293-b305-36de-0a92-aa1f1d6f01a7/mzaf_17344613567981298000.plus.aac.p.m4a',
    youtubeId: 'x2oUajHp8pg',
    youtubeUrl: 'https://www.youtube.com/watch?v=x2oUajHp8pg',
    streamsOrUnits: '1.1B Global Streams · 6x Platinum',
    weeksAtNumberOne: 15,
    summary: 'The Medellín phenomenon FERXXO crafted an introspective, infectious reggaeton anthem that led Colombian airwaves throughout the year.',
  },
  {
    id: 'co-2024-1',
    year: 2024,
    rank: 1,
    title: 'TQG',
    artist: 'Karol G & Shakira',
    chartName: 'Monitor Latino Colombia',
    chartAuthority: 'Monitor Latino',
    continent: 'Latin America',
    country: 'Colombia',
    countryCode: 'CO',
    countryFlag: '🇨🇴',
    sourceUrl: 'https://monitorlatino.com/top-colombia-anual/',
    releaseDate: '2023-02-24',
    genres: ['Reggaeton', 'Latin Pop'],
    artworkUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ff/d7/15/ffd715fe-b020-ef74-5e8b-bacd72a8ac94/mzaf_7109007155344682925.plus.aac.p.m4a',
    youtubeId: 'jZGpkLElSu8',
    youtubeUrl: 'https://www.youtube.com/watch?v=jZGpkLElSu8',
    streamsOrUnits: '1.6B Global Streams · Diamond',
    weeksAtNumberOne: 18,
    summary: 'A historic pairing of Colombia’s two greatest modern music exports, winning Latin Grammy Best Urban Song.',
  },

  // -------------------------------------------------------------
  // LATIN AMERICA - Argentina
  // -------------------------------------------------------------
  {
    id: 'ar-2025-1',
    year: 2025,
    rank: 1,
    title: 'La Morocha',
    artist: 'Luck Ra & BM',
    chartName: 'Billboard Argentina Hot 100',
    chartAuthority: 'Billboard Argentina / CAPIF',
    continent: 'Latin America',
    country: 'Argentina',
    countryCode: 'AR',
    countryFlag: '🇦🇷',
    sourceUrl: 'https://billboard.com.ar/hot-100/',
    releaseDate: '2023-07-06',
    genres: ['Cuarteto', 'Cumbia'],
    artworkUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/10/3e/da/103edafe-eb6c-4f49-5efa-6392ae3de751/mzaf_13787569669586366589.plus.aac.p.m4a',
    youtubeId: 'aCvjQj1DPrA',
    youtubeUrl: 'https://www.youtube.com/watch?v=aCvjQj1DPrA',
    streamsOrUnits: '650M Streams · 5x Platinum Argentina',
    weeksAtNumberOne: 16,
    summary: 'Revitalized Argentine cuarteto culture with irresistible party horns, dominating stadium crowds and national celebrations.',
  },
  {
    id: 'ar-2024-1',
    year: 2024,
    rank: 1,
    title: 'Bzrp Music Sessions, Vol. 53',
    artist: 'Bizarrap & Shakira',
    chartName: 'Billboard Argentina Hot 100',
    chartAuthority: 'Billboard Argentina / CAPIF',
    continent: 'Latin America',
    country: 'Argentina',
    countryCode: 'AR',
    countryFlag: '🇦🇷',
    sourceUrl: 'https://billboard.com.ar/chart-anual/',
    releaseDate: '2023-01-11',
    genres: ['Electropop', 'Latin Trap'],
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/0a/e1/0e/0ae10eda-19d6-9acb-2dd4-3a8f87c076c9/mzaf_11017736900654766444.plus.aac.p.m4a',
    youtubeId: 'CocEMWdc7Ck',
    youtubeUrl: 'https://www.youtube.com/watch?v=CocEMWdc7Ck',
    streamsOrUnits: '1.4B Streams · 4 Guinness World Records',
    weeksAtNumberOne: 12,
    summary: 'Shattered Spanish-language streaming records within 24 hours, winning Latin Grammy Song of the Year.',
  },

  // -------------------------------------------------------------
  // LATIN AMERICA - Brazil
  // -------------------------------------------------------------
  {
    id: 'br-2025-1',
    year: 2025,
    rank: 1,
    title: 'Me Leva Pra Casa / Escrito Nas Estrelas',
    artist: 'Lauana Prado',
    chartName: 'Crowley / Pro-Música Brasil Top 100',
    chartAuthority: 'Pro-Música Brasil / Crowley Broadcast',
    continent: 'Latin America',
    country: 'Brazil',
    countryCode: 'BR',
    countryFlag: '🇧🇷',
    sourceUrl: 'https://pro-musicabr.org.br/top-100/',
    releaseDate: '2023-10-19',
    genres: ['Sertanejo', 'MPB'],
    artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/c5/22/eb/c522eb09-1c32-2708-dc29-7babf693d7e7/mzaf_11140556367727992588.plus.aac.p.m4a',
    youtubeId: '1lVrYNhUkJg',
    youtubeUrl: 'https://www.youtube.com/watch?v=1lVrYNhUkJg',
    streamsOrUnits: '780M Streams · Triple Diamond Brazil',
    weeksAtNumberOne: 20,
    summary: 'A powerhouse sertanejo medley that captivated Brazilian radio and TikTok, holding #1 nationwide for months.',
  },
  {
    id: 'br-2024-1',
    year: 2024,
    rank: 1,
    title: 'Nosso Quadro',
    artist: 'Ana Castela',
    chartName: 'Crowley / Pro-Música Brasil Top 100',
    chartAuthority: 'Pro-Música Brasil / Crowley Broadcast',
    continent: 'Latin America',
    country: 'Brazil',
    countryCode: 'BR',
    countryFlag: '🇧🇷',
    sourceUrl: 'https://pro-musicabr.org.br/top-anual/',
    releaseDate: '2023-02-02',
    genres: ['Agroplay', 'Sertanejo Universitário'],
    artworkUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/97/34/2b/97342bfe-053c-3af7-0bde-4f946740e110/mzaf_16655926684579155951.plus.aac.p.m4a',
    youtubeId: 'vzEIwc0rG8Y',
    youtubeUrl: 'https://www.youtube.com/watch?v=vzEIwc0rG8Y',
    streamsOrUnits: '850M Streams · Year-End #1 Brazil',
    weeksAtNumberOne: 17,
    summary: 'Crowned Brazil’s #1 song across all streaming platforms, solidifying Ana Castela as the queen of modern agro-sertanejo.',
  },

  // -------------------------------------------------------------
  // EUROPE - Spain
  // -------------------------------------------------------------
  {
    id: 'es-2025-1',
    year: 2025,
    rank: 1,
    title: 'Badgyal',
    artist: 'Saiko',
    chartName: 'PROMUSICAE Top 100 Canciones',
    chartAuthority: 'PROMUSICAE / AGEDI',
    continent: 'Europe',
    country: 'Spain',
    countryCode: 'ES',
    countryFlag: '🇪🇸',
    sourceUrl: 'https://www.promusicae.es/listas/semana/',
    releaseDate: '2024-04-26',
    genres: ['Hyperpop Urbano', 'Reggaeton'],
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/3d/2c/c8/3d2cc82e-44d9-03ba-b68e-5353f63a671c/mzaf_1428317870428627540.plus.aac.p.m4a',
    youtubeId: '_WHBVsQnrFc',
    youtubeUrl: 'https://www.youtube.com/watch?v=_WHBVsQnrFc',
    streamsOrUnits: '320M Streams · 5x Platinum Spain',
    weeksAtNumberOne: 10,
    summary: 'Granada-born prodigy Saiko defined Spain’s new urban sound with energetic synths and melodic flow.',
  },
  {
    id: 'es-2024-1',
    year: 2024,
    rank: 1,
    title: 'Columbia',
    artist: 'Quevedo',
    chartName: 'PROMUSICAE Top 100 Canciones',
    chartAuthority: 'PROMUSICAE / AGEDI',
    continent: 'Europe',
    country: 'Spain',
    countryCode: 'ES',
    countryFlag: '🇪🇸',
    sourceUrl: 'https://www.promusicae.es/listas/anuales/',
    releaseDate: '2023-07-07',
    genres: ['Reggaeton', 'Pop Urbano'],
    artworkUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/0a/9b/c2/0a9bc24e-9231-26d0-e492-cc4a098607d6/mzaf_18022283109657019339.plus.aac.p.m4a',
    youtubeId: 'QlZNGcVfeF0',
    youtubeUrl: 'https://www.youtube.com/watch?v=QlZNGcVfeF0',
    streamsOrUnits: '480M Streams · 8x Platinum Spain',
    weeksAtNumberOne: 14,
    summary: 'The Canary Island sensation broke Spanish single-day Spotify records and anchored summer festivals nationwide.',
  },

  // -------------------------------------------------------------
  // EUROPE - United Kingdom
  // -------------------------------------------------------------
  {
    id: 'gb-2025-1',
    year: 2025,
    rank: 1,
    title: 'Espresso',
    artist: 'Sabrina Carpenter',
    chartName: 'Official Charts UK Singles',
    chartAuthority: 'Official Charts Company',
    continent: 'Europe',
    country: 'United Kingdom',
    countryCode: 'GB',
    countryFlag: '🇬🇧',
    sourceUrl: 'https://www.officialcharts.com/charts/singles-chart/',
    releaseDate: '2024-04-11',
    genres: ['Nu-Disco', 'Pop'],
    artworkUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/99/da/ff/99daffce-cdde-59c6-5ae0-7f922ce411a8/mzaf_5621292401829922816.plus.aac.p.m4a',
    youtubeId: 'eVli-tstM5E',
    youtubeUrl: 'https://www.youtube.com/watch?v=eVli-tstM5E',
    streamsOrUnits: '1.8B Global Streams · 3x Platinum UK',
    weeksAtNumberOne: 8,
    summary: 'An undeniable pop phenomenon, staying at #1 on the Official UK Singles Chart for 8 weeks and winning Global Hit of the Year.',
  },
  {
    id: 'gb-2024-1',
    year: 2024,
    rank: 1,
    title: 'Stick Season',
    artist: 'Noah Kahan',
    chartName: 'Official Charts UK Singles',
    chartAuthority: 'Official Charts Company',
    continent: 'Europe',
    country: 'United Kingdom',
    countryCode: 'GB',
    countryFlag: '🇬🇧',
    sourceUrl: 'https://www.officialcharts.com/chart-news/the-official-biggest-songs-of-2024/',
    releaseDate: '2022-07-08',
    genres: ['Folk-Pop', 'Indie Folk'],
    artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a0/ed/8d/a0ed8d32-ed28-75b7-8de7-6555e84f5617/mzaf_8530395673130453138.plus.aac.p.m4a',
    youtubeId: 'JKrDdsgXuso',
    youtubeUrl: 'https://www.youtube.com/watch?v=JKrDdsgXuso',
    streamsOrUnits: 'Official UK #1 Song of 2024 · 4x Platinum',
    weeksAtNumberOne: 7,
    summary: 'The biggest song in Britain in 2024, leading nationwide sales and streams while inspiring acoustic revivals across the UK.',
  },
  {
    id: 'gb-2023-1',
    year: 2023,
    rank: 1,
    title: 'Flowers',
    artist: 'Miley Cyrus',
    chartName: 'Official Charts UK Singles',
    chartAuthority: 'Official Charts Company',
    continent: 'Europe',
    country: 'United Kingdom',
    countryCode: 'GB',
    countryFlag: '🇬🇧',
    sourceUrl: 'https://www.officialcharts.com/chart-news/the-official-biggest-songs-of-2023/',
    releaseDate: '2023-01-12',
    genres: ['Disco-Funk', 'Pop'],
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/68/9e/f7/689ef7fe-14fe-a846-c87f-7d3b2d6344b1/mzaf_4167137058064023087.plus.aac.p.m4a',
    youtubeId: 'G7KNmW9a75Y',
    youtubeUrl: 'https://www.youtube.com/watch?v=G7KNmW9a75Y',
    streamsOrUnits: 'Official UK #1 Song of 2023 · 3x Platinum',
    weeksAtNumberOne: 10,
    summary: 'Spent 10 consecutive weeks at #1 in the UK, earning the Brit Award for Best International Song.',
  },

  // -------------------------------------------------------------
  // EUROPE - France
  // -------------------------------------------------------------
  {
    id: 'fr-2025-1',
    year: 2025,
    rank: 1,
    title: 'Ceux qu’on était',
    artist: 'Pierre Garnier',
    chartName: 'SNEP Top 200 Singles',
    chartAuthority: 'SNEP',
    continent: 'Europe',
    country: 'France',
    countryCode: 'FR',
    countryFlag: '🇫🇷',
    sourceUrl: 'https://snepmusique.com/les-tops/le-top-de-la-semaine/top-singles/',
    releaseDate: '2024-02-07',
    genres: ['Chanson Française', 'Pop'],
    artworkUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/dc/00/6a/dc006ac0-1882-034a-e2e9-4e8d7e1362e2/mzaf_4717427117376077465.plus.aac.p.m4a',
    youtubeId: 'xhG45EjK14I',
    youtubeUrl: 'https://www.youtube.com/watch?v=xhG45EjK14I',
    streamsOrUnits: '120M Streams · Diamond France',
    weeksAtNumberOne: 12,
    summary: 'The Star Academy winner achieved France’s fastest gold and diamond single in recent streaming history.',
  },
  {
    id: 'fr-2024-1',
    year: 2024,
    rank: 1,
    title: 'Spider',
    artist: 'Gims & Dystinct',
    chartName: 'SNEP Top 200 Singles',
    chartAuthority: 'SNEP',
    continent: 'Europe',
    country: 'France',
    countryCode: 'FR',
    countryFlag: '🇫🇷',
    sourceUrl: 'https://snepmusique.com/les-tops/top-singles-annee/',
    releaseDate: '2024-05-10',
    genres: ['Afropop', 'French Rap'],
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/b0/9c/cb/b09ccb01-b016-9928-94b8-1ece0b275d02/mzaf_17520789315862495338.plus.aac.p.m4a',
    youtubeId: 'NLXiGXbxl6Q',
    youtubeUrl: 'https://www.youtube.com/watch?v=NLXiGXbxl6Q',
    streamsOrUnits: '140M Streams · SNEP Year-End #1',
    weeksAtNumberOne: 8,
    summary: 'Summer anthem across France and francophone Africa, staying at the summit of SNEP charts for consecutive months.',
  },

  // -------------------------------------------------------------
  // EUROPE - Germany
  // -------------------------------------------------------------
  {
    id: 'de-2025-1',
    year: 2025,
    rank: 1,
    title: 'I Like the Way You Kiss Me',
    artist: 'Artemas',
    chartName: 'GfK Top 100 Singles',
    chartAuthority: 'GfK Entertainment / BVMI',
    continent: 'Europe',
    country: 'Germany',
    countryCode: 'DE',
    countryFlag: '🇩🇪',
    sourceUrl: 'https://www.offiziellecharts.de/charts/single',
    releaseDate: '2024-03-19',
    genres: ['Darkwave', 'Synth-Pop'],
    artworkUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/cc/49/c1/cc49c165-07b1-fd9e-1092-07fb1d3bd484/mzaf_11754248539941798058.plus.aac.p.m4a',
    youtubeId: 'evJ6gX1lp2o',
    youtubeUrl: 'https://www.youtube.com/watch?v=evJ6gX1lp2o',
    streamsOrUnits: '950M Streams · Platinum Germany',
    weeksAtNumberOne: 9,
    summary: 'Hypnotic post-punk electronic rhythms that topped the Offizielle Deutsche Charts and club playlists across Europe.',
  },
  {
    id: 'de-2024-1',
    year: 2024,
    rank: 1,
    title: 'Wunder',
    artist: 'Ayliva & Apache 207',
    chartName: 'GfK Top 100 Singles',
    chartAuthority: 'GfK Entertainment / BVMI',
    continent: 'Europe',
    country: 'Germany',
    countryCode: 'DE',
    countryFlag: '🇩🇪',
    sourceUrl: 'https://www.offiziellecharts.de/jahrescharts',
    releaseDate: '2024-04-26',
    genres: ['German Pop', 'R&B'],
    artworkUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/cb/bd/95/cbbd95e6-8487-a046-dd2b-8601b618106f/mzaf_14569377787414638763.plus.aac.p.m4a',
    youtubeId: 'Sf6DIUk5fhc',
    youtubeUrl: 'https://www.youtube.com/watch?v=Sf6DIUk5fhc',
    streamsOrUnits: '180M Streams · Official Germany Year-End #1',
    weeksAtNumberOne: 7,
    summary: 'Two of Germany’s biggest streaming giants unite for an emotional pop-rap ballad that broke German Spotify single-week records.',
  },

  // -------------------------------------------------------------
  // EUROPE - Italy
  // -------------------------------------------------------------
  {
    id: 'it-2025-1',
    year: 2025,
    rank: 1,
    title: 'I P’ Me, Tu P’ Te',
    artist: 'Geolier',
    chartName: 'FIMI Top of the Music',
    chartAuthority: 'FIMI / GfK Italia',
    continent: 'Europe',
    country: 'Italy',
    countryCode: 'IT',
    countryFlag: '🇮🇹',
    sourceUrl: 'https://www.fimi.it/top-of-the-music/classifiche.kl',
    releaseDate: '2024-02-07',
    genres: ['Neapolitan Rap', 'Trap'],
    artworkUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/00/a0/c7/00a0c775-01ff-eeba-79ab-f8367e73f839/mzaf_5418567130586700476.plus.aac.p.m4a',
    youtubeId: 'qon1NJ6D3co',
    youtubeUrl: 'https://www.youtube.com/watch?v=qon1NJ6D3co',
    streamsOrUnits: '250M Streams · 6x Platinum Italy',
    weeksAtNumberOne: 11,
    summary: 'Sanremo sensation sung entirely in the Neapolitan dialect, setting unprecedented all-time Italian streaming milestones.',
  },

  // -------------------------------------------------------------
  // EUROPE - Sweden
  // -------------------------------------------------------------
  {
    id: 'se-2025-1',
    year: 2025,
    rank: 1,
    title: 'Farväl',
    artist: 'Bolaget',
    chartName: 'Sverigetopplistan Årslistor',
    chartAuthority: 'GLF / Ifpi Sverige',
    continent: 'Europe',
    country: 'Sweden',
    countryCode: 'SE',
    countryFlag: '🇸🇪',
    sourceUrl: 'https://www.sverigetopplistan.se/chart/215',
    releaseDate: '2024-03-01',
    genres: ['EPA-Dunk', 'Swedish Pop'],
    artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/65/0a/6f/650a6fd9-15cc-230c-9f7f-e14342d60e82/mzaf_13208896415465055544.plus.aac.p.m4a',
    youtubeId: 'Re4KS8K1UlU',
    youtubeUrl: 'https://www.youtube.com/watch?v=Re4KS8K1UlU',
    streamsOrUnits: '85M Streams · 4x Platinum Sweden',
    weeksAtNumberOne: 8,
    summary: 'Falun quartet Bolaget captured the heart of Sweden with upbeat party anthems that dominated midsummer playlists.',
  },

  // -------------------------------------------------------------
  // AFRICA - Nigeria
  // -------------------------------------------------------------
  {
    id: 'ng-2025-1',
    year: 2025,
    rank: 1,
    title: 'MMS',
    artist: 'Asake & Wizkid',
    chartName: 'TurnTable Official Nigeria Top 100',
    chartAuthority: 'TurnTable Charts',
    continent: 'Africa',
    country: 'Nigeria',
    countryCode: 'NG',
    countryFlag: '🇳🇬',
    sourceUrl: 'https://www.turntablecharts.com/charts/1',
    releaseDate: '2024-08-09',
    genres: ['Afrobeats', 'Amapiano'],
    artworkUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/74/27/70/74277067-0b8e-8754-3e1d-896e0409b1a1/mzaf_3401626578708743518.plus.aac.p.m4a',
    youtubeId: 'iiOHqmmjdGk',
    youtubeUrl: 'https://www.youtube.com/watch?v=iiOHqmmjdGk',
    streamsOrUnits: '310M Streams · TurnTable Record Debut',
    weeksAtNumberOne: 13,
    summary: 'A transcendent meeting of two Afrobeats titans, blending Fuji harmonies with smooth contemporary cadence on Lungu Boy.',
  },
  {
    id: 'ng-2024-1',
    year: 2024,
    rank: 1,
    title: 'Lonely at the Top',
    artist: 'Asake',
    chartName: 'TurnTable Official Nigeria Top 100',
    chartAuthority: 'TurnTable Charts',
    continent: 'Africa',
    country: 'Nigeria',
    countryCode: 'NG',
    countryFlag: '🇳🇬',
    sourceUrl: 'https://www.turntablecharts.com/year-end/2024',
    releaseDate: '2023-06-16',
    genres: ['Afrobeats', 'Fuji'],
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/af/79/fd/af79fdf3-e757-5acd-c0de-b5c6edfaa77a/mzaf_15402833629808241649.plus.aac.p.m4a',
    youtubeId: 'bbVZo4Yw7pI',
    youtubeUrl: 'https://www.youtube.com/watch?v=bbVZo4Yw7pI',
    streamsOrUnits: 'TurnTable Chart All-Time Record (13 Weeks #1)',
    weeksAtNumberOne: 13,
    summary: 'The longest-running #1 song in Nigerian chart history, capturing universal themes of ambition, pressure, and resilience.',
  },

  // -------------------------------------------------------------
  // AFRICA - South Africa
  // -------------------------------------------------------------
  {
    id: 'za-2025-1',
    year: 2025,
    rank: 1,
    title: 'Tshwala Bam',
    artist: 'TitoM & Yuppe ft. S.N.E & EeQue',
    chartName: 'The Official South African Charts (TOSAC)',
    chartAuthority: 'Recording Industry of South Africa (RiSA)',
    continent: 'Africa',
    country: 'South Africa',
    countryCode: 'ZA',
    countryFlag: '🇿🇦',
    sourceUrl: 'https://theofficialsacharts.co.za/charts/',
    releaseDate: '2024-02-23',
    genres: ['Amapiano', 'Kwaito'],
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/4e/b0/90/4eb0908d-30b8-970e-b798-c1c653805b7d/mzaf_3835466240602528598.plus.aac.p.m4a',
    youtubeId: 'KK4dC7rASYs',
    youtubeUrl: 'https://www.youtube.com/watch?v=KK4dC7rASYs',
    streamsOrUnits: '420M Global Streams · RiSA Multi-Platinum',
    weeksAtNumberOne: 15,
    summary: 'The biggest Amapiano viral dance craze on the planet in 2024-2025, charting globally from Johannesburg to London.',
  },
  {
    id: 'za-2024-1',
    year: 2024,
    rank: 1,
    title: 'Water',
    artist: 'Tyla',
    chartName: 'The Official South African Charts (TOSAC)',
    chartAuthority: 'Recording Industry of South Africa (RiSA)',
    continent: 'Africa',
    country: 'South Africa',
    countryCode: 'ZA',
    countryFlag: '🇿🇦',
    sourceUrl: 'https://theofficialsacharts.co.za/year-end/',
    releaseDate: '2023-07-28',
    genres: ['Popiano', 'Afrobeats', 'R&B'],
    artworkUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/9a/62/e6/9a62e688-9080-feed-2411-cc793c4545cf/mzaf_4449175929344535361.plus.aac.p.m4a',
    youtubeId: 'XoiOOiuH8iI',
    youtubeUrl: 'https://www.youtube.com/watch?v=XoiOOiuH8iI',
    streamsOrUnits: '1.2B Global Streams · Grammy Winner',
    weeksAtNumberOne: 14,
    summary: 'Won the inaugural Grammy Award for Best African Music Performance, making Tyla the youngest African artist to enter the Billboard Top 10.',
  },

  // -------------------------------------------------------------
  // ASIA - China
  // -------------------------------------------------------------
  {
    id: 'cn-2025-1',
    year: 2025,
    rank: 1,
    title: 'Miracle (奇迹)',
    artist: 'Charlie Zhou (Zhou Shen 周深)',
    chartName: 'TME Tencent Music Uni Chart',
    chartAuthority: 'Tencent Music Entertainment',
    continent: 'Asia',
    country: 'China',
    countryCode: 'CN',
    countryFlag: '🇨🇳',
    sourceUrl: 'https://y.qq.com/n/ryqq/toplist/26',
    releaseDate: '2024-05-18',
    genres: ['Mandopop', 'Symphonic Pop'],
    artworkUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/36/e8/61/36e86129-e1b0-66a6-add0-d55d9a01a0e1/mzaf_15946939765575667680.plus.aac.p.m4a',
    youtubeId: '7iAyn-xizLw',
    youtubeUrl: 'https://www.youtube.com/watch?v=7iAyn-xizLw',
    streamsOrUnits: '1.1B Streams Across QQ / Kugou / Kuwo',
    weeksAtNumberOne: 12,
    summary: 'Renowned vocalist Zhou Shen dazzles with an angelic vocal range, leading China’s official Tencent Uni Chart for consecutive months.',
  },
  {
    id: 'cn-2024-1',
    year: 2024,
    rank: 1,
    title: 'Christmas Star (圣诞星)',
    artist: 'Jay Chou (周杰伦)',
    chartName: 'TME Tencent Music Uni Chart',
    chartAuthority: 'Tencent Music Entertainment',
    continent: 'Asia',
    country: 'China',
    countryCode: 'CN',
    countryFlag: '🇨🇳',
    sourceUrl: 'https://y.qq.com/n/ryqq/toplist/4',
    releaseDate: '2023-12-21',
    genres: ['Mandopop', 'R&B'],
    artworkUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/35/55/9c/35559c35-1d9a-293a-1865-624d9889bffd/mzaf_11402035867852200545.plus.aac.p.m4a',
    youtubeId: 'IXuhdnB2dAY',
    youtubeUrl: 'https://www.youtube.com/watch?v=IXuhdnB2dAY',
    streamsOrUnits: '950M Streams · TME Annual Champion',
    weeksAtNumberOne: 9,
    summary: 'The King of Mandopop delighted millions across the Chinese-speaking world with a signature melodic European winter ballad.',
  },

  // -------------------------------------------------------------
  // ASIA - Taiwan
  // -------------------------------------------------------------
  {
    id: 'tw-2025-1',
    year: 2025,
    rank: 1,
    title: 'Finally (又到天黑)',
    artist: 'Accusefive (告五人)',
    chartName: 'KKBOX Annual Top 100 Singles',
    chartAuthority: 'KKBOX',
    continent: 'Asia',
    country: 'Taiwan',
    countryCode: 'TW',
    countryFlag: '🇹🇼',
    sourceUrl: 'https://kchart.kkbox.com/tw/annual/singles',
    releaseDate: '2023-02-14',
    genres: ['Indie Rock', 'Mandopop'],
    artworkUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/2f/48/6a/2f486aea-49ce-4bd8-0392-1b46b5b99c40/mzaf_9473331430726024879.plus.aac.p.m4a',
    youtubeId: 'caxiOmSWWEM',
    youtubeUrl: 'https://www.youtube.com/watch?v=caxiOmSWWEM',
    streamsOrUnits: 'Golden Melody Song of the Year Winner',
    weeksAtNumberOne: 16,
    summary: 'Won Song of the Year at the 35th Golden Melody Awards, becoming an emotional anthem for everyday workers across Taiwan.',
  },

  // -------------------------------------------------------------
  // ASIA - South Korea
  // -------------------------------------------------------------
  {
    id: 'kr-2026-1',
    year: 2026,
    rank: 1,
    title: 'APT.',
    artist: 'ROSÉ & Bruno Mars',
    chartName: 'Circle Digital Chart (Melon Year-End)',
    chartAuthority: 'Korea Music Content Association (KMCA)',
    continent: 'Asia',
    country: 'South Korea',
    countryCode: 'KR',
    countryFlag: '🇰🇷',
    sourceUrl: 'https://circlechart.kr/page_chart/onoff.circle?serviceGbn=ALL',
    releaseDate: '2024-10-18',
    genres: ['Pop-Punk', 'K-Pop'],
    artworkUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/7a/15/38/7a1538f3-f41a-a2eb-0f24-8eb6712ee043/mzaf_7740628412097685267.plus.aac.p.m4a',
    youtubeId: 'ekr2nIex040',
    youtubeUrl: 'https://www.youtube.com/watch?v=ekr2nIex040',
    streamsOrUnits: '2.1B Global Streams · Perfect All-Kill Record',
    weeksAtNumberOne: 14,
    summary: 'Inspired by the Korean drinking game Apateu, this infectious worldwide smash scored over 200 Perfect All-Kills across Korean music charts.',
  },
  {
    id: 'kr-2025-1',
    year: 2025,
    rank: 1,
    title: 'Supernova',
    artist: 'aespa',
    chartName: 'Circle Digital Chart (Melon Year-End)',
    chartAuthority: 'Korea Music Content Association (KMCA)',
    continent: 'Asia',
    country: 'South Korea',
    countryCode: 'KR',
    countryFlag: '🇰🇷',
    sourceUrl: 'https://circlechart.kr/page_chart/onoff.circle',
    releaseDate: '2024-05-13',
    genres: ['Hyperpop', 'Dance-Pop'],
    artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/f6/cc/58/f6cc5863-c60a-caac-e7f8-bd66b414a917/mzaf_8631809138360097160.plus.aac.p.m4a',
    youtubeId: 'phuiiNCxRMg',
    youtubeUrl: 'https://www.youtube.com/watch?v=phuiiNCxRMg',
    streamsOrUnits: 'Circle Digital #1 · 315 Consecutive PAK Hours',
    weeksAtNumberOne: 15,
    summary: 'Set the all-time Melon chart record for most consecutive weeks at #1 (15 weeks), sparking global choreography trends.',
  },
  {
    id: 'kr-2024-1',
    year: 2024,
    rank: 1,
    title: 'Ditto',
    artist: 'NewJeans',
    chartName: 'Circle Digital Chart (Melon Year-End)',
    chartAuthority: 'Korea Music Content Association (KMCA)',
    continent: 'Asia',
    country: 'South Korea',
    countryCode: 'KR',
    countryFlag: '🇰🇷',
    sourceUrl: 'https://circlechart.kr/page_chart/year.circle',
    releaseDate: '2022-12-19',
    genres: ['Baltimore Club', 'Y2K Pop'],
    artworkUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/85/72/66/8572665a-d35f-ce5d-43c5-9ae4b69b4b46/mzaf_2317272666428796662.plus.aac.p.m4a',
    youtubeId: 'pSUydWEqKwE',
    youtubeUrl: 'https://www.youtube.com/watch?v=pSUydWEqKwE',
    streamsOrUnits: 'Korean Song of the Year · MAMA Daesang',
    weeksAtNumberOne: 14,
    summary: 'Swept all grand prizes (Daesang) at MAMA and Golden Disc Awards, universally celebrated for its nostalgic lo-fi winter ambiance.',
  },

  // -------------------------------------------------------------
  // ASIA - Japan
  // -------------------------------------------------------------
  {
    id: 'jp-2026-1',
    year: 2026,
    rank: 1,
    title: 'Lilac (ライラック)',
    artist: 'Mrs. GREEN APPLE',
    chartName: 'Billboard Japan Hot 100 (Oricon Annual)',
    chartAuthority: 'Billboard Japan / Oricon',
    continent: 'Asia',
    country: 'Japan',
    countryCode: 'JP',
    countryFlag: '🇯🇵',
    sourceUrl: 'https://www.billboard-japan.com/charts/detail?kind=jsingle',
    releaseDate: '2024-04-12',
    genres: ['J-Rock', 'J-Pop'],
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/71/a0/a9/71a0a91a-f778-13b3-0c17-0faf0c3f9409/mzaf_13145882720743927078.plus.aac.p.m4a',
    youtubeId: 'QjrkrVmC-8M',
    youtubeUrl: 'https://www.youtube.com/watch?v=QjrkrVmC-8M',
    streamsOrUnits: '500M Streams (RIAJ Double Platinum)',
    weeksAtNumberOne: 11,
    summary: 'Opening theme for Oblivion Battery, showcasing Motoki Ohmori’s virtuosic vocal dexterity and propelling the band to historic dome tours.',
  },
  {
    id: 'jp-2025-1',
    year: 2025,
    rank: 1,
    title: 'Bling-Bang-Bang-Born',
    artist: 'Creepy Nuts',
    chartName: 'Billboard Japan Hot 100 (Oricon Annual)',
    chartAuthority: 'Billboard Japan / Oricon',
    continent: 'Asia',
    country: 'Japan',
    countryCode: 'JP',
    countryFlag: '🇯🇵',
    sourceUrl: 'https://www.billboard-japan.com/charts/detail?kind=year',
    releaseDate: '2024-01-07',
    genres: ['Jersey Club', 'J-Hip Hop'],
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f0/db/16/f0db16be-457e-f10f-98b6-f30b11de34e4/mzaf_5189430943078523093.plus.aac.p.m4a',
    youtubeId: '5NzfqW_Yt6Y',
    youtubeUrl: 'https://www.youtube.com/watch?v=5NzfqW_Yt6Y',
    streamsOrUnits: 'Billboard Japan Hot 100 #1 Year-End · 600M Streams',
    weeksAtNumberOne: 19,
    summary: 'The anime theme for Mashle Season 2 that took over the world, spending 19 consecutive weeks at #1 on Billboard Japan.',
  },
  {
    id: 'jp-2024-1',
    year: 2024,
    rank: 1,
    title: 'Idol (アイドル)',
    artist: 'YOASOBI',
    chartName: 'Billboard Japan Hot 100 (Oricon Annual)',
    chartAuthority: 'Billboard Japan / Oricon',
    continent: 'Asia',
    country: 'Japan',
    countryCode: 'JP',
    countryFlag: '🇯🇵',
    sourceUrl: 'https://www.billboard-japan.com/charts/detail?kind=year_2023',
    releaseDate: '2023-04-12',
    genres: ['J-Pop', 'Future Bass'],
    artworkUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/5c/54/5e/5c545e9a-c8ca-c673-f85d-a74b14c2c882/mzaf_2313943576213161760.plus.aac.p.m4a',
    youtubeId: 'ZRtdQ81jPUQ',
    youtubeUrl: 'https://www.youtube.com/watch?v=ZRtdQ81jPUQ',
    streamsOrUnits: 'Fastest in Japanese history to 800M Streams · RIAJ Diamond',
    weeksAtNumberOne: 21,
    summary: 'Theme for Oshi no Ko; shattered the all-time Billboard Japan record with 21 consecutive weeks at #1 and topped the Billboard Global Excl. US chart.',
  },

  // -------------------------------------------------------------
  // OCEANIA - Australia
  // -------------------------------------------------------------
  {
    id: 'au-2025-1',
    year: 2025,
    rank: 1,
    title: 'Stumblin’ In',
    artist: 'CYRIL',
    chartName: 'ARIA Top 100 Singles',
    chartAuthority: 'Australian Recording Industry Association',
    continent: 'Oceania',
    country: 'Australia',
    countryCode: 'AU',
    countryFlag: '🇦🇺',
    sourceUrl: 'https://www.aria.com.au/charts/singles-chart',
    releaseDate: '2023-11-10',
    genres: ['Deep House', 'Dance-Pop'],
    artworkUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/c9/97/5e/c9975ef9-ced5-f725-81e7-522a8b3ae9f2/mzaf_10103871341352316648.plus.aac.p.m4a',
    youtubeId: '57VMB1IzLKY',
    youtubeUrl: 'https://www.youtube.com/watch?v=57VMB1IzLKY',
    streamsOrUnits: 'ARIA Platinum · 500M Global Streams',
    weeksAtNumberOne: 6,
    summary: 'Regional Australian producer Cyril Riley transformed the 1978 Suzi Quatro classic into an infectious deep house summer anthem.',
  },
  {
    id: 'au-2024-1',
    year: 2024,
    rank: 1,
    title: 'Beautiful Things',
    artist: 'Benson Boone',
    chartName: 'ARIA Top 100 Singles',
    chartAuthority: 'Australian Recording Industry Association',
    continent: 'Oceania',
    country: 'Australia',
    countryCode: 'AU',
    countryFlag: '🇦🇺',
    sourceUrl: 'https://www.aria.com.au/charts/2024/singles-chart',
    releaseDate: '2024-01-18',
    genres: ['Pop Rock', 'Soul'],
    artworkUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/4d/d5/00/4dd5006f-ee02-c3f1-94db-0ed4b8dd68f1/mzaf_14250561294796027079.plus.aac.p.m4a',
    youtubeId: 'Oa_RSwwpPaA',
    youtubeUrl: 'https://www.youtube.com/watch?v=Oa_RSwwpPaA',
    streamsOrUnits: 'ARIA Year-End #1 · 5x Platinum Australia',
    weeksAtNumberOne: 9,
    summary: 'The biggest radio and streaming hit in Australia in 2024, maintaining a stranglehold on ARIA charts for over 2 months.',
  },

  // -------------------------------------------------------------
  // OCEANIA - New Zealand
  // -------------------------------------------------------------
  {
    id: 'nz-2025-1',
    year: 2025,
    rank: 1,
    title: 'Casanova',
    artist: 'L.A.B.',
    chartName: 'Recorded Music NZ Official Top 40',
    chartAuthority: 'Recorded Music NZ',
    continent: 'Oceania',
    country: 'New Zealand',
    countryCode: 'NZ',
    countryFlag: '🇳🇿',
    sourceUrl: 'https://nztop40.co.nz/chart/singles',
    releaseDate: '2024-02-23',
    genres: ['Reggae', 'Funk Rock'],
    artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/2d/64/a7/2d64a708-6b6c-9f38-0cff-3bb0871ae1af/mzaf_8640791630339519352.plus.aac.p.m4a',
    youtubeId: '_u7d1wNDOyc',
    youtubeUrl: 'https://www.youtube.com/watch?v=_u7d1wNDOyc',
    streamsOrUnits: 'Aotearoa Music Awards Single of the Year',
    weeksAtNumberOne: 8,
    summary: 'New Zealand’s premiere roots-reggae-funk outfit L.A.B. captured their unprecedented fifth consecutive NZ #1 single.',
  },
];

export const SEED_MUSIC_RANKINGS: MusicRankingEntry[] = RAW_SEED_MUSIC_RANKINGS.map(
  (item, idx) => ({
    ...item,
    pinId: item.pinId ?? 16983 + idx,
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

