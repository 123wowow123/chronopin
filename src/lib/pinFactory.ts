// Factory capability profiles: sector-specific editorial assessments, never an overall rating.
export const FACTORY_RUBRIC_YEAR = 2026;
export const FACTORY_AXES = [
  { key: 'scale' }, { key: 'automation' }, { key: 'technical' },
  { key: 'efficiency' }, { key: 'supplyChain' }, { key: 'workforce' },
] as const;
export type FactoryAxis = (typeof FACTORY_AXES)[number]['key'];
export const FACTORY_KEYS = FACTORY_AXES.map(({ key }) => key);
export const FACTORY_STATUSES = ['announced', 'construction', 'commissioning', 'production', 'offline'] as const;
export type FactoryStatus = (typeof FACTORY_STATUSES)[number];
export type FactoryEvidence = {
  url: string;
  title: string;
  publishedDate: string | null;
  quote: string;
};
export type FactoryBenchmark = { cohortSize: number; description: string; sources: FactoryEvidence[] };
export type FactoryAssessment = {
  score: number | null;
  // planned: design/target; demonstrated: specific capability evidenced as installed or achieved.
  basis: 'planned' | 'demonstrated' | 'unknown';
  reasoning: string;
  sources: FactoryEvidence[];
  benchmark?: FactoryBenchmark;
};
export type FactoryProfile = {
  sector: string;
  status: FactoryStatus;
  assessmentDate: string;
  rubricYear: number;
  source: 'session' | 'hand';
  axes: Record<FactoryAxis, FactoryAssessment>;
  // Raw figures with units/conditions, separate from scores. E.g. annual capacity, area, jobs.
  metrics: { label: string; value: string; basis: 'planned' | 'demonstrated'; source: FactoryEvidence }[];
};
export type PinFactoryJson = FactoryProfile & { checkedAt: string };
export const isFactoryScore = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 5 && Number.isInteger(v * 2);
export const factoryScores = (p: FactoryProfile): Record<FactoryAxis, number | null> =>
  Object.fromEntries(FACTORY_KEYS.map(k => [k, p.axes[k].score])) as Record<FactoryAxis, number | null>;
export const hasFactoryScores = (p: FactoryProfile): boolean => FACTORY_KEYS.some(k => p.axes[k].score !== null);
