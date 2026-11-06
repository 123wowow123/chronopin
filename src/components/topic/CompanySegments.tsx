import { segmentQuarters, yearOverYear, type SegmentQuarter, type SegmentRow } from '@/lib/companySegments';
import type { Translator } from '@/lib/i18n/translate';
import { CompanySegmentsPane, type SegmentColumn } from './CompanySegmentsPane';

// One colour per segment, in the order the segments appear: the categorical
// tones the sentiment graph and rating tiles already define.
const COLOURS = ['var(--color-tone-news)', 'var(--color-tone-comments)', 'var(--color-tags)', 'var(--color-privileged)'];

const money = (n: number) => `$${n.toFixed(1)}B`;
const pct = (n: number) => `${n >= 0 ? '+' : '-'}${Math.abs(n * 100).toFixed(0)}%`;

// "Earnings by segment": the latest quarter's revenue split and a column per
// quarter, with a hover tooltip. Formats and translates everything here so the
// client pane (CompanySegmentsPane) only draws and reacts to the pointer.
export function CompanySegments({ rows, t, className }: { rows: SegmentRow[]; t: Translator; className?: string }) {
  const { quarters, segments } = segmentQuarters(rows);
  const latest = quarters.at(-1);
  if (!latest) return null;
  const max = Math.max(...quarters.map((q) => q.total));
  const column = (q: SegmentQuarter): SegmentColumn => {
    const priorPeriod = q.period.replace(/\d{4}$/, (y) => String(Number(y) - 1));
    return {
      key: q.periodEnd,
      period: q.period,
      total: money(q.total),
      heightPct: (q.total / max) * 82,
      parts: q.parts.map((p) => {
        const change = yearOverYear(quarters, q, p.segment);
        const share = `${((p.amountBillions / q.total) * 100).toFixed(0)}%`;
        return {
          segment: p.segment,
          colour: COLOURS[segments.indexOf(p.segment) % COLOURS.length],
          amount: money(p.amountBillions),
          share,
          shareLabel: t('topic.segmentsShare', { pct: share }),
          change: change == null ? null : pct(change),
          changeLabel: change == null ? null : t('topic.segmentsVs', { change: pct(change), period: priorPeriod }),
          sharePct: (p.amountBillions / q.total) * 100,
          heightPct: (p.amountBillions / q.total) * 100,
          pinId: p.pinId,
        };
      }),
    };
  };
  const columns = quarters.map(column);
  return <CompanySegmentsPane heading={t('topic.segmentsHeading')} note={t('topic.segmentsNote')} yoyNote={t('topic.segmentsYoY')} latest={columns.at(-1)!} columns={columns} className={className} />;
}
