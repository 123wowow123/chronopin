import { describe, expect, it } from 'vitest';
import { pinDateRanges } from './dateClaims';

describe('pinDateRanges', () => {
  const pin = {
    allDay: true,
    utcStartDateTime: '2026-11-05T00:00:00.000Z',
    utcEndDateTime: '2026-11-08T00:00:00.000Z',
    sourceStartDateTime: '2026-10-01T00:00:00.000Z',
    sourceEndDateTime: '2026-10-04T00:00:00.000Z',
    dateConfidence: 'estimated',
    references: [
      { url: 'https://a.example', confidence: 90, startDate: '2026-11-05' },
      { url: 'https://b.example', confidence: 40, startDate: '2026-12-01', endDate: '2026-12-02' },
      { url: 'https://c.example', confidence: 80 },
    ],
  };

  it('spans the source and every dated reference, marking the one used', () => {
    const { start, end } = pinDateRanges(pin, 'UTC');
    expect(start).toMatchObject({ earliest: '2026-10-01', latest: '2026-12-01', used: { url: 'https://a.example', day: '2026-11-05' } });
    expect(start?.claims.map((c) => c.day)).toEqual(['2026-10-01', '2026-11-05', '2026-12-01']);
    // The source's exclusive all-day end reads as its last day; it outranks b.
    expect(end).toMatchObject({ earliest: '2026-10-03', latest: '2026-12-02', used: { isSource: true, day: '2026-10-03' } });
  });

  it('takes the most confident claim on each side as the best', () => {
    const { start, end } = pinDateRanges(pin, 'UTC');
    // Source (estimated) 50, a 90, b 40.
    expect(start?.best).toMatchObject({ url: 'https://a.example', day: '2026-11-05', confidence: 90 });
    expect(end?.best).toMatchObject({ isSource: true, day: '2026-10-03', confidence: 50 });
  });

  it('uses a low-confidence end when the source gives none', () => {
    // A confirmed source (90) with no end does not compete with b's end.
    const noEnd = { ...pin, utcEndDateTime: '2026-12-03T00:00:00.000Z', sourceEndDateTime: undefined, dateConfidence: 'confirmed' };
    const { end } = pinDateRanges(noEnd, 'UTC');
    expect(end?.used).toMatchObject({ url: 'https://b.example', day: '2026-12-02', confidence: 40 });
    expect(end?.best).toBe(end?.used);
  });

  it('reads a timed source in the viewer time zone', () => {
    const timed = { allDay: false, utcStartDateTime: '2026-10-02T02:30:00.000Z', dateConfidence: 'confirmed', references: [] };
    expect(pinDateRanges(timed, 'America/Los_Angeles').start?.earliest).toBe('2026-10-01');
    expect(pinDateRanges(timed, 'America/Los_Angeles').end).toBeUndefined();
  });
});
