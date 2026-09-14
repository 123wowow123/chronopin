import { describe, expect, it } from 'vitest';
import { dayKeyIn, formatPosted, formatStart, money, plainText, timespan, weekdayPlanet } from './format';
import { buildBags, resolveTodayMarker } from './timeline';

describe('money', () => {
  it('abbreviates large figures with the currency symbol', () => {
    expect(money(6_400_000_000, 'CAD')).toBe('C$6.4B');
    expect(money(27_000_000_000, 'AUD')).toBe('A$27B');
    expect(money(128_000_000_000, 'AED')).toBe('AED 128B');
    expect(money(999)).toBe('$999.00');
    expect(money(1_500)).toBe('$1.5K');
    expect(money(-2_300)).toBe('$-2.3K');
  });
});

describe('timespan', () => {
  it('counts days and switches to years a year out', () => {
    expect(timespan('2026-09-13', '2026-09-13')).toBe('Today');
    expect(timespan('2026-09-13', '2026-09-14', 'y')).toBe('1 day');
    expect(timespan('2026-09-13', '2026-09-18', 'y')).toBe('5 days');
    expect(timespan('2026-09-13', '2026-09-10', 'y')).toBe('-3 days');
    expect(timespan('2026-09-13', '2027-09-13', 'y')).toBe('1.0 years');
    expect(timespan('2026-09-13', '2028-03-13', 'y')).toBe('1.5 years');
  });
});

describe('dates', () => {
  it('reads a calendar date in a time zone', () => {
    expect(dayKeyIn('2026-09-14T03:00:00Z', 'America/Los_Angeles')).toBe('2026-09-13');
    expect(dayKeyIn('2026-09-14T03:00:00Z', 'UTC')).toBe('2026-09-14');
  });

  it('formats posted and start times', () => {
    expect(formatPosted('2026-09-13T04:02:00Z', 'America/Los_Angeles')).toBe('09/12/2026 at 9:02 pm');
    expect(formatStart({ utcStartDateTime: '2026-09-14T00:00:00Z', allDay: true }, 'America/Los_Angeles')).toBe(
      'Starts 09/14/2026',
    );
    expect(formatStart({ utcStartDateTime: '2026-09-14T16:00:00Z' }, 'UTC')).toBe('Starts 09/14/2026 4:00PM');
  });

  it('names the planet for the weekday', () => {
    expect(weekdayPlanet('2026-09-14')).toMatchObject({ planet: 'The Moon', glyph: 'A', weekday: 'Monday' });
  });
});

describe('plainText', () => {
  it('strips markup and truncates on a word', () => {
    expect(plainText('<ul><li>One &amp; two</li><li>Three</li></ul>')).toBe('One & two Three');
    expect(plainText('alpha beta gamma delta', 12)).toBe('alpha beta…');
  });
});

describe('timeline bags', () => {
  const pin = (id: number, utcStartDateTime: string, allDay = false) => ({ id, title: `p${id}`, utcStartDateTime, allDay });

  it('groups by local date for timed pins and UTC date for all-day pins', () => {
    const bags = buildBags(
      [pin(1, '2026-09-14T03:00:00Z'), pin(2, '2026-09-14T00:00:00Z', true), pin(3, '2026-09-13T20:00:00Z')],
      [],
      'America/Los_Angeles',
    );
    expect(bags.map((b) => [b.day, b.pins.map((p) => p.id)])).toEqual([
      ['2026-09-13', [3, 1]],
      ['2026-09-14', [2]],
    ]);
  });

  it('places the TODAY marker before the first future day', () => {
    const bags = buildBags([pin(1, '2026-09-10T00:00:00Z', true), pin(2, '2026-09-20T00:00:00Z', true)], [], 'UTC');
    expect(resolveTodayMarker(bags, '2026-09-13')).toEqual({ index: 1, atEnd: false, todayBagIndex: -1 });
    expect(resolveTodayMarker(bags, '2026-09-25')).toEqual({ index: -1, atEnd: true, todayBagIndex: -1 });
    expect(resolveTodayMarker(bags, '2026-09-20')).toEqual({ index: -1, atEnd: false, todayBagIndex: 1 });
  });
});
