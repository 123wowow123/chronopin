import { modelKey } from '@/lib/modelChart';
import { parseRows } from './epochSeries';
import { hasRun, wordsOf } from './modelChart';
import type { EciPoint } from '@/lib/eciChart';

const num = (raw: string | undefined): number | null => {
  const v = Number((raw ?? '').trim());
  return (raw ?? '').trim() !== '' && Number.isFinite(v) ? v : null;
};

// Rows without a score or a dated release are skipped, never read as zero.
export function parseEciScores(csv: string): EciPoint[] {
  const [header, ...rows] = parseRows(csv);
  const at = (name: string) => header.indexOf(name);
  const [nameAt, eciAt, lowAt, highAt, dateAt, orgAt, groupAt] = ['Display name', 'eci', 'eci_ci_low', 'eci_ci_high', 'date', 'Organization', 'Accessibility group'].map(at);
  if ([nameAt, eciAt, dateAt].some((i) => i < 0)) throw new Error('Epoch ECI columns changed');
  const out: EciPoint[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const name = (r[nameAt] ?? '').trim();
    const eci = num(r[eciAt]);
    const date = (r[dateAt] ?? '').trim();
    const key = modelKey(name);
    if (!name || eci == null || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      name,
      organization: (r[orgAt] ?? '').trim() || null,
      eci,
      low: num(r[lowAt]),
      high: num(r[highAt]),
      date,
      open: /open/i.test(r[groupAt] ?? ''),
      frontier: false,
    });
  }
  return out;
}

// Oldest first; a model is on the frontier when it beats every earlier one.
export function markFrontierByDate(points: EciPoint[]): EciPoint[] {
  const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : b.eci - a.eci));
  let best = -Infinity;
  return sorted.map((p) => {
    const frontier = p.eci > best;
    if (frontier) best = p.eci;
    return { ...p, frontier };
  });
}

// The longest model name the title contains as whole words ("claude opus 5.5"
// is in "Claude Opus 5.5 Released"; "claude opus 5" is not).
export function matchModel(points: EciPoint[], title: string): EciPoint | null {
  const words = wordsOf(title);
  let best: EciPoint | null = null;
  for (const p of points) {
    if (hasRun(words, wordsOf(p.key)) && (!best || p.key.length > best.key.length)) best = p;
  }
  return best;
}
