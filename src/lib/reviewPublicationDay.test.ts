import { expect, it } from 'vitest';
import { reviewPublicationDay } from './reviewPublicationDay';

it('rejects placeholder, impossible, future and conflicting publication days', () => {
  for (const values of [['0001-01-01T00:00:00+00:00'], ['2025-02-29'], ['2027-01-01'], ['2025-01-01', '2025-01-02']]) expect(reviewPublicationDay(values, '2026-10-26')).toBeNull();
});
it('uses the publishers local calendar day rather than converting it to UTC', () => {
  expect(reviewPublicationDay(['2025-01-01T23:30:00-08:00', '2025-01-01'], '2026-10-26')).toBe('2025-01-01');
});
