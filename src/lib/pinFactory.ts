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
// One line of a cost estimate's working: a sourced input, a stated assumption, or a computed result.
export type FactoryBreakdownLine = {
  kind: 'sourced' | 'assumption' | 'result';
  label: string;
  value: string;
  // Sourced lines cite a page; assumptions and results explain themselves in `note`.
  note?: string;
  source?: FactoryEvidence;
};
export type FactoryMetric = {
  // Optional for profiles saved before the buildout display was introduced.
  key?: FactoryMetricKey;
  label: string;
  value: string;
  basis: 'planned' | 'demonstrated';
  source: FactoryEvidence;
  // Step-by-step working behind an estimated figure (the "Estimated ..." investment metric).
  breakdown?: FactoryBreakdownLine[];
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

// Whether the pin's cost is an estimate rather than a published budget: its profile's investment metric says so.
export function hasEstimatedCost(p: FactoryProfile | null | undefined): boolean {
  return !!p?.metrics.some((m) => m.key === 'investment' && /^estimated\b/i.test(m.label));
}

// The pin's price is a published figure for the whole project, larger than the part this pin covers: its profile's
// investment metric is labelled "Whole-project cost".
export function hasWholeProjectCost(p: FactoryProfile | null | undefined): boolean {
  return !!p?.metrics.some((m) => m.key === 'investment' && /^whole[- ]project\b/i.test(m.label));
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// When a milestone's date, kept at the source's precision, falls: a day, "October 2025",
// "Q3 2027" start at the period's first day, a bare year at its last day (a "2027" forecast means by then). Null for a
// date it cannot place ("early 2028", "H2").
export function milestoneTime(date: string): number | null {
  const text = date.trim();
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (day) return Date.UTC(+day[1], +day[2] - 1, +day[3]);
  const quarter = /^Q([1-4])\s+(\d{4})$/i.exec(text);
  if (quarter) return Date.UTC(+quarter[2], (+quarter[1] - 1) * 3, 1);
  const month = /^([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/.exec(text);
  const index = month ? MONTHS.indexOf(month[1].toLowerCase()) : -1;
  if (month && index >= 0) return Date.UTC(+month[2], index, 1);
  const year = /^(\d{4})$/.exec(text);
  return year ? Date.UTC(+year[1], 11, 31) : null;
}

export type BuildMark = { at: number; label: string; date: string };
export const buildMarks = (milestones: FactoryMilestone[] | undefined): BuildMark[] =>
  (milestones ?? []).flatMap((m) => {
    const at = milestoneTime(m.date);
    return at == null ? [] : [{ at, label: m.label, date: m.date }];
  });
