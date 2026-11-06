import { describe, expect, it } from 'vitest';
import { segmentQuarters, yearOverYear } from './companySegments';

const rows = [
  { period: 'Q2 2025', periodEnd: '2025-06-30', segment: 'Automotive', amountBillions: 16.7, pinId: 1 },
  { period: 'Q2 2025', periodEnd: '2025-06-30', segment: 'Energy', amountBillions: 2.8, pinId: 1 },
  { period: 'Q2 2026', periodEnd: '2026-06-30', segment: 'Energy', amountBillions: 3.1, pinId: 2 },
  { period: 'Q2 2026', periodEnd: '2026-06-30', segment: 'Automotive', amountBillions: 20.5, pinId: 2 },
];

describe('segmentQuarters', () => {
  it('orders quarters oldest first and keeps one segment order', () => {
    const { quarters, segments } = segmentQuarters(rows);
    expect(quarters.map((q) => q.period)).toEqual(['Q2 2025', 'Q2 2026']);
    expect(segments).toEqual(['Automotive', 'Energy']);
    expect(quarters[1].parts.map((p) => p.segment)).toEqual(['Automotive', 'Energy']);
    expect(quarters[1].total).toBeCloseTo(23.6);
  });
});

describe('yearOverYear', () => {
  it('compares with the same quarter a year earlier', () => {
    const { quarters } = segmentQuarters(rows);
    expect(yearOverYear(quarters, quarters[1], 'Automotive')).toBeCloseTo(0.2275, 3);
    expect(yearOverYear(quarters, quarters[0], 'Automotive')).toBeNull();
  });
});
