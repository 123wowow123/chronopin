// A company's revenue by reporting segment, one figure per segment and
// quarter (CompanySegmentRevenue, 0246), each from the results pin that
// reports it. Pure helpers for the "Earnings by segment" pane.

export type SegmentRow = { period: string; periodEnd: string; segment: string; amountBillions: number; pinId: number | null };

export type SegmentQuarter = { period: string; periodEnd: string; total: number; parts: { segment: string; amountBillions: number; pinId: number | null }[] };

// Quarters oldest first, each with its segments in the order the segments first
// appear, so a segment keeps one colour and one place in every column.
export function segmentQuarters(rows: SegmentRow[]): { quarters: SegmentQuarter[]; segments: string[] } {
  const segments = [...new Set([...rows].sort((a, b) => a.periodEnd.localeCompare(b.periodEnd) || b.amountBillions - a.amountBillions).map((r) => r.segment))];
  const by = new Map<string, SegmentQuarter>();
  for (const r of rows) {
    const q = by.get(r.periodEnd) ?? { period: r.period, periodEnd: r.periodEnd, total: 0, parts: [] };
    q.parts.push({ segment: r.segment, amountBillions: r.amountBillions, pinId: r.pinId });
    q.total += r.amountBillions;
    by.set(r.periodEnd, q);
  }
  const quarters = [...by.values()].sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
  for (const q of quarters) q.parts.sort((a, b) => segments.indexOf(a.segment) - segments.indexOf(b.segment));
  return { quarters, segments };
}

// A segment's change on the same quarter a year earlier, as a fraction, or null
// when that quarter is not on record.
export function yearOverYear(quarters: SegmentQuarter[], quarter: SegmentQuarter, segment: string): number | null {
  const prior = new Date(`${quarter.periodEnd}T00:00:00Z`);
  prior.setUTCFullYear(prior.getUTCFullYear() - 1);
  const key = prior.toISOString().slice(0, 10);
  const before = quarters.find((q) => Math.abs(+new Date(`${q.periodEnd}T00:00:00Z`) - +new Date(`${key}T00:00:00Z`)) <= 5 * 864e5)?.parts.find((p) => p.segment === segment);
  const now = quarter.parts.find((p) => p.segment === segment);
  return before && now && before.amountBillions ? now.amountBillions / before.amountBillions - 1 : null;
}
