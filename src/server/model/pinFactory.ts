import * as db from '../db';
import { FACTORY_KEYS, FACTORY_RUBRIC_YEAR, FACTORY_STATUSES, isFactoryScore, type FactoryEvidence, type FactoryProfile, type PinFactoryJson } from '@/lib/pinFactory';

const day = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function evidence(v: unknown): v is FactoryEvidence {
  if (!record(v) || !text(v.url, 4000) || !text(v.title, 1024) || !text(v.quote, 300) || !(v.publishedDate === null || day(v.publishedDate))) return false;
  try { const u = new URL(v.url); return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password; } catch { return false; }
}

// Full replacement. Unknown axes require an explicit research gap; scored axes require evidence.
export function factoryProblem(input: unknown): FactoryProfile | string {
  if (!record(input)) return 'Expected a factory profile object.';
  if (!text(input.sector, 160)) return 'sector is required (at most 160 characters).';
  if (!FACTORY_STATUSES.includes(input.status as FactoryProfile['status'])) return 'Invalid factory status.';
  if (!day(input.assessmentDate)) return 'assessmentDate must be a real YYYY-MM-DD day.';
  if (input.rubricYear !== FACTORY_RUBRIC_YEAR) return `rubricYear must be ${FACTORY_RUBRIC_YEAR}; older criteria require an explicit implementation.`;
  if (!['session', 'hand'].includes(String(input.source))) return 'source must be session or hand.';
  if (!record(input.axes) || Object.keys(input.axes).length !== FACTORY_KEYS.length) return 'All six factory axes are required.';
  const assessmentDate = input.assessmentDate;
  const axes = {} as FactoryProfile['axes'];
  for (const k of FACTORY_KEYS) {
    const a = input.axes[k];
    if (!record(a) || !(a.score === null || isFactoryScore(a.score))) return `${k}: score must be 0–5 in half steps or null.`;
    if (!text(a.reasoning, 2000)) return `${k}: reasoning or a specific research gap is required.`;
    if (!Array.isArray(a.sources) || a.sources.length > 6 || !a.sources.every(evidence)) return `${k}: sources need HTTPS URLs, titles, dates (or null) and quotes (at most 300 characters).`;
    if (a.score === null ? a.basis !== 'unknown' : !['planned', 'demonstrated'].includes(String(a.basis)) || !a.sources.length) return `${k}: scored axes need planned/demonstrated evidence; null axes use unknown.`;
    if (input.status === 'announced' && a.basis === 'demonstrated') return `${k}: an announced factory cannot claim demonstrated performance.`;
    if (a.sources.some(s => s.publishedDate && s.publishedDate > assessmentDate)) return `${k}: evidence cannot postdate the assessment.`;
    let benchmark;
    if (a.benchmark !== undefined) {
      const b = a.benchmark;
      if (!record(b) || !Number.isInteger(b.cohortSize) || Number(b.cohortSize) < 5 || !text(b.description, 2000) || !Array.isArray(b.sources) || !b.sources.length || b.sources.length > 6 || !b.sources.every(evidence)) return `${k}: benchmark needs at least five comparable facilities, a method description and HTTPS evidence.`;
      benchmark = { cohortSize: Number(b.cohortSize), description: b.description, sources: b.sources };
      if (b.sources.some(s => s.publishedDate && s.publishedDate > assessmentDate)) return `${k}: benchmark evidence cannot postdate the assessment.`;
    }
    if ((k === 'scale' || k === 'efficiency') && a.score !== null && !benchmark) return `${k}: a scored percentile requires a sourced comparable benchmark.`;
    axes[k] = { ...(benchmark ? { benchmark } : {}), score: a.score, basis: a.basis as FactoryProfile['axes'][typeof k]['basis'], reasoning: a.reasoning, sources: a.sources };
  }
  if (!Array.isArray(input.metrics) || input.metrics.length > 12) return 'metrics must be a list of at most 12 sourced figures.';
  const metrics: FactoryProfile['metrics'] = [];
  for (const m of input.metrics) {
    if (!record(m) || !text(m.label, 100) || !text(m.value, 500) || !['planned', 'demonstrated'].includes(String(m.basis)) || !evidence(m.source)) return 'Each metric needs a label, value with units, planned/demonstrated basis and source.';
    if (input.status === 'announced' && m.basis === 'demonstrated') return 'An announced factory cannot claim demonstrated metrics.';
    if (m.source.publishedDate && m.source.publishedDate > assessmentDate) return 'Metric evidence cannot postdate the assessment.';
    metrics.push({ label: m.label, value: m.value, basis: m.basis as 'planned' | 'demonstrated', source: m.source });
  }
  return { sector: input.sector.trim(), status: input.status as FactoryProfile['status'], assessmentDate: input.assessmentDate, rubricYear: input.rubricYear, source: input.source as FactoryProfile['source'], axes, metrics };
}

export async function factoryForPin(pinId: number): Promise<PinFactoryJson | null> {
  const [row] = await db.query<{ profile: FactoryProfile; checkedAt: Date }>('SELECT "profile", "checkedAt" FROM "PinFactory" WHERE "pinId" = $1', [pinId]);
  return row ? { ...row.profile, checkedAt: new Date(row.checkedAt).toISOString() } : null;
}
export async function saveFactory(pinId: number, profile: FactoryProfile): Promise<boolean> {
  const rows = await db.query(`INSERT INTO "PinFactory" ("pinId", "profile") VALUES ($1, $2::jsonb)
    ON CONFLICT ("pinId") DO UPDATE SET "profile" = EXCLUDED."profile", "checkedAt" = now()
    WHERE "PinFactory"."profile"->>'source' <> 'hand' OR EXCLUDED."profile"->>'source' = 'hand'
    RETURNING "pinId"`, [pinId, JSON.stringify(profile)]);
  return rows.length > 0;
}
export async function deleteFactory(pinId: number): Promise<void> {
  await db.query('DELETE FROM "PinFactory" WHERE "pinId" = $1', [pinId]);
}
