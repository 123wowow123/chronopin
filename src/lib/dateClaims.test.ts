import { describe, expect, it } from 'vitest';
import { isLaterClaim, pinDateRanges, topReference } from './dateClaims';

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

  it('keeps a BC day as a day key rather than dropping its era', () => {
    const ancient = { allDay: true, utcStartDateTime: '-002560-01-01T00:00:00.000Z', dateConfidence: 'estimated', references: [] };
    expect(pinDateRanges(ancient, 'UTC').start?.best.day).toBe('-2560-01-01');
  });
});

describe('topReference: the newest credible update wins', () => {
  const posted = '2026-09-24T15:32:26.000Z';
  const original = { url: 'https://bondbuyer.example', confidence: 85, startDate: '2026-12-08', utcCreatedDateTime: '2026-09-24T15:32:26.500Z' };

  it('keeps the most confident claim the pin was posted with', () => {
    expect(topReference([original], 'startDate', 75, posted)).toBe(original);
  });

  it('lets a later reference move the date however confident the older claims are', () => {
    const later = { url: 'https://dailybreeze.example', confidence: 60, startDate: '2027-01-06', utcCreatedDateTime: '2026-09-25T08:16:00.000Z' };
    expect(topReference([original, later], 'startDate', 90, posted)).toBe(later);
  });

  it('ignores a later reference below the low-confidence bar', () => {
    const weak = { url: 'https://rumour.example', confidence: 40, startDate: '2027-03-01', utcCreatedDateTime: '2026-09-26T00:00:00.000Z' };
    expect(topReference([original, weak], 'startDate', 75, posted)).toBe(original);
  });

  it('dates a reference by when it was published, so an old page added late is not news', () => {
    const old = { url: 'https://archive.example', confidence: 90, startDate: '2026-06-01', publishedDate: '2025-01-01', utcCreatedDateTime: '2026-09-26T00:00:00.000Z' };
    expect(isLaterClaim(old, posted)).toBe(false);
    expect(topReference([original, old], 'startDate', 75, posted)).toBe(old);
  });

  it('counts what arrived within the hour of posting as the pin posted', () => {
    const soon = { url: 'https://podcast.example', confidence: 60, startDate: '2027-01-06', utcCreatedDateTime: '2026-09-24T16:00:00.000Z' };
    expect(isLaterClaim(soon, posted)).toBe(false);
    expect(topReference([soon], 'startDate', 75, posted)).toBeUndefined();
  });

  it('picks the newest of several updates', () => {
    const first = { url: 'https://a.example', confidence: 90, startDate: '2027-01-06', utcCreatedDateTime: '2026-09-25T00:00:00.000Z' };
    const second = { url: 'https://b.example', confidence: 55, startDate: '2027-02-01', utcCreatedDateTime: '2026-10-01T00:00:00.000Z' };
    expect(topReference([second, first], 'startDate', 75, posted)).toBe(second);
  });

  it('marks the later claims on the pin page range', () => {
    const pin = {
      allDay: true,
      utcStartDateTime: '2027-01-06T00:00:00.000Z',
      sourceStartDateTime: '2026-12-08T00:00:00.000Z',
      dateConfidence: 'confirmed',
      utcCreatedDateTime: posted,
      references: [{ url: 'https://dailybreeze.example', confidence: 60, startDate: '2027-01-06', utcCreatedDateTime: '2026-09-25T08:16:00.000Z' }],
    };
    const { start } = pinDateRanges(pin, 'UTC');
    expect(start?.best).toMatchObject({ day: '2027-01-06', later: true, used: true });
  });
});
