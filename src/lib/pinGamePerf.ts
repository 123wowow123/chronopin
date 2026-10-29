// A video game pin's rubric (PinGamePerf, 0229): seven axes scored 0-5 in half
// steps from the game's published critic reviews. Unlike the engineering
// rubrics, whose anchors are one edition for everything scored today, a game
// is judged against its own era: rubricYear is the game's release year, so a
// 1995 "5" for visuals is the best of 1995, not the best of now. Scores are
// only comparable within one year. Anchors: docs/okf/scraping/strategy.md
// ("Video game rubric"). An axis is null when it does not apply or no review
// speaks to it.

export const GAME_PERF_AXES = [
  { key: 'gameplay', label: 'Gameplay' },
  { key: 'story', label: 'Story' },
  { key: 'visuals', label: 'Visuals' },
  { key: 'audio', label: 'Audio & music' },
  { key: 'content', label: 'Content & replay' },
  { key: 'polish', label: 'Technical polish' },
  { key: 'acclaim', label: 'Critic acclaim' },
] as const;

export type GamePerfAxis = (typeof GAME_PERF_AXES)[number]['key'];
export const GAME_PERF_KEYS = GAME_PERF_AXES.map((axis) => axis.key) as GamePerfAxis[];
export const GAME_PERF_MAX = 5;
export const GAME_PERF_YEAR_MIN = 1970;
export const GAME_PERF_YEAR_MAX = 2100;
export const GAME_PERF_SOURCES = ['session', 'hand'] as const;
export type GamePerfSource = (typeof GAME_PERF_SOURCES)[number];
export type GamePerfScores = Record<GamePerfAxis, number | null>;

export type PinGamePerfJson = GamePerfScores & {
  source: GamePerfSource;
  basis: string | null;
  sourceUrl: string | null;
  rubricYear: number;
  checkedAt: string;
};

export const isGamePerfScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= GAME_PERF_MAX && Number.isInteger(value * 2);

export const isGamePerfYear = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= GAME_PERF_YEAR_MIN && value <= GAME_PERF_YEAR_MAX;

// A radar with fewer scored axes than this is a sliver, not a shape: the row is
// kept (the API accepts one score) but the pin page hides the panel until more
// axes are scored.
export const GAME_PERF_MIN_AXES = 3;

export const hasGamePerf = (perf: Partial<Record<GamePerfAxis, unknown>> | null | undefined): boolean =>
  !!perf && GAME_PERF_KEYS.every((key) => perf[key] === null || isGamePerfScore(perf[key])) && GAME_PERF_KEYS.filter((key) => perf[key] !== null).length >= GAME_PERF_MIN_AXES;
