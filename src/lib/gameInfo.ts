// A game pin's maturity rating and supported platforms (PinGameInfo, 0124).
// Platforms are stored as the fixed keys below; each belongs to a logo family
// the pin page draws (src/components/pin/PlatformLogo.tsx).

export type PlatformFamily = 'windows' | 'apple' | 'linux' | 'playstation' | 'xbox' | 'switch' | 'steamdeck';

export const PLATFORMS = {
  windows: { label: 'Windows', family: 'windows' },
  macos: { label: 'macOS', family: 'apple' },
  linux: { label: 'Linux', family: 'linux' },
  ps5: { label: 'PlayStation 5', family: 'playstation' },
  ps4: { label: 'PlayStation 4', family: 'playstation' },
  ps3: { label: 'PlayStation 3', family: 'playstation' },
  'xbox-series': { label: 'Xbox Series X|S', family: 'xbox' },
  'xbox-one': { label: 'Xbox One', family: 'xbox' },
  'xbox-360': { label: 'Xbox 360', family: 'xbox' },
  switch: { label: 'Nintendo Switch', family: 'switch' },
  switch2: { label: 'Nintendo Switch 2', family: 'switch' },
  'steam-deck': { label: 'Steam Deck', family: 'steamdeck' },
} as const satisfies Record<string, { label: string; family: PlatformFamily }>;

export type PlatformKey = keyof typeof PLATFORMS;
export const PLATFORM_KEYS = Object.keys(PLATFORMS) as PlatformKey[];

export const isPlatformKey = (value: unknown): value is PlatformKey => typeof value === 'string' && value in PLATFORMS;

export const MATURITY_BOARDS = ['ESRB', 'PEGI'] as const;
export type MaturityBoard = (typeof MATURITY_BOARDS)[number];
export const GAME_INFO_SOURCES = ['steam', 'wikidata', 'session', 'hand'] as const;
export type GameInfoSource = (typeof GAME_INFO_SOURCES)[number];

export type PinGameInfoJson = {
  maturityBoard: MaturityBoard | null;
  maturityRating: string | null;
  descriptors: string[];
  platforms: PlatformKey[];
  source: GameInfoSource;
  sourceUrl: string | null;
  checkedAt: string;
};

export type GameInfoFields = Pick<PinGameInfoJson, 'maturityBoard' | 'maturityRating' | 'descriptors' | 'platforms'>;

export const hasGameInfo = (info: GameInfoFields | null | undefined): boolean =>
  !!info && (!!info.maturityRating || info.platforms.length > 0);

// A platform name as Wikidata or a store spells it -> its key.
export function platformFromName(name: string): PlatformKey | undefined {
  const n = name.toLowerCase();
  if (/switch\s*2/.test(n)) return 'switch2';
  if (/switch/.test(n)) return 'switch';
  if (/steam\s*deck/.test(n)) return 'steam-deck';
  if (/playstation\s*5|\bps5\b/.test(n)) return 'ps5';
  if (/playstation\s*4|\bps4\b/.test(n)) return 'ps4';
  if (/playstation\s*3|\bps3\b/.test(n)) return 'ps3';
  if (/xbox series/.test(n)) return 'xbox-series';
  if (/xbox one/.test(n)) return 'xbox-one';
  if (/xbox 360/.test(n)) return 'xbox-360';
  if (/macos|mac os|os x/.test(n)) return 'macos';
  if (/linux/.test(n)) return 'linux';
  if (/windows/.test(n)) return 'windows';
  return undefined;
}

// Wikidata's ESRB items are named "ESRB Mature 17+" / "M (Mature)"; a store
// prints "Mature 17+". Both read to the board's label, or nothing.
const ESRB_LABELS: [RegExp, string][] = [
  [/adults? only|\bao\b/i, 'Adults Only 18+'],
  [/mature|\bm\b/i, 'Mature 17+'],
  [/teen|\bt\b/i, 'Teen'],
  [/everyone 10|\be10/i, 'Everyone 10+'],
  [/everyone|\be\b/i, 'Everyone'],
  [/early childhood|\bec\b/i, 'Early Childhood'],
];
export const esrbLabel = (text: string): string | undefined => ESRB_LABELS.find(([re]) => re.test(text))?.[1];
