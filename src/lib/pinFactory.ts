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
export const FACTORY_METRIC_KEYS = ['investment', 'employment', 'floorArea', 'siteArea', 'capacity', 'timeline', 'stage', 'products'] as const;
export type FactoryMetricKey = (typeof FACTORY_METRIC_KEYS)[number];
export type FactoryMetric = {
  // Optional for profiles saved before the buildout display was introduced.
  key?: FactoryMetricKey;
  label: string;
  value: string;
  basis: 'planned' | 'demonstrated';
  source: FactoryEvidence;
};
export type FactoryMilestone = {
  label: string;
  // Preserve the source's precision: a day, year, quarter or qualitative window.
  date: string;
  basis: 'planned' | 'demonstrated';
  source: FactoryEvidence;
};
export type FactoryProfile = {
  sector: string;
  status: FactoryStatus;
  assessmentDate: string;
  rubricYear: number;
  source: 'session' | 'hand';
  axes: Record<FactoryAxis, FactoryAssessment>;
  // Raw figures with units/conditions, separate from scores. E.g. annual capacity, area, jobs.
  metrics: FactoryMetric[];
  milestones?: FactoryMilestone[];
};
export type PinFactoryJson = FactoryProfile & { checkedAt: string };
export const isFactoryScore = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 5 && Number.isInteger(v * 2);
export const factoryScores = (p: FactoryProfile): Record<FactoryAxis, number | null> =>
  Object.fromEntries(FACTORY_KEYS.map(k => [k, p.axes[k].score])) as Record<FactoryAxis, number | null>;
export const hasFactoryScores = (p: FactoryProfile): boolean => FACTORY_KEYS.some(k => p.axes[k].score !== null);
// Keep sparse research profiles stored, but only display a rubric with three scored axes.
export const hasFactoryRubric = (p: FactoryProfile | null | undefined): boolean =>
  !!p && FACTORY_KEYS.filter(k => isFactoryScore(p.axes[k].score)).length >= 3;

const LEGACY_METRIC_KEYS: Record<string, FactoryMetricKey> = {
  'site investment': 'investment', 'q&t project investment': 'investment',
  'permanent jobs': 'employment', 'operating workforce': 'employment',
  'floor area': 'floorArea', 'site area': 'siteArea',
  'capacity target': 'capacity', 'design capacity': 'capacity',
  'module targets': 'timeline', 'readiness targets': 'timeline',
  'production target': 'timeline', 'completion target': 'timeline',
  'commercial shipments': 'timeline', 'commissioning milestone': 'timeline',
  'production scope': 'products',
};

// Count distinct factual fields, not repeated job figures or multiple dates for one field.
export function factoryBuildoutMetrics(p: FactoryProfile): (FactoryMetric & { key: FactoryMetricKey })[] {
  const fields = new Map<FactoryMetricKey, FactoryMetric & { key: FactoryMetricKey }>();
  for (const m of p.metrics) {
    const key = m.key ?? LEGACY_METRIC_KEYS[m.label.trim().toLowerCase()];
    if (!key || !FACTORY_METRIC_KEYS.includes(key) || !m.value.trim() || !m.source?.url?.startsWith('https://')) continue;
    if (!fields.has(key)) fields.set(key, { ...m, key });
  }
  return FACTORY_METRIC_KEYS.flatMap(key => fields.has(key) ? [fields.get(key)!] : []);
}
export const hasFactoryBuildout = (p: FactoryProfile | null | undefined): boolean =>
  !!p && factoryBuildoutMetrics(p).length >= 3;
