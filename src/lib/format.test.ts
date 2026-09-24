import { describe, expect, it } from 'vitest';
import { averageRating, ratingPercent, compactCount, dayKeyIn, dayStartIn, daysAway, daysBetween, formatDayKey, formatPosted, formatStart, lunarDate, money, moonPhase, monthDayOf, nextDayKey, plainText, ratingScore, startsWhen, timeAgo, timespan, weekdayPlanet } from './format';
import { buildBags, pinTense, resolveTodayMarker } from './timeline';

describe('money', () => {
  it('abbreviates large figures with the currency symbol', () => {
    expect(money(6_400_000_000, 'CAD')).toBe('C$6.4B');
    expect(money(27_000_000_000, 'AUD')).toBe('A$27B');
    expect(money(128_000_000_000, 'AED')).toBe('AED 128B');
    expect(money(999)).toBe('$999.00');
    expect(money(1_500)).toBe('$1.5K');
    expect(money(-2_300)).toBe('$-2.3K');
    expect(money(999_950)).toBe('$1M');
  });
});

describe('compactCount', () => {
  it('shortens a count with K, M, B as it grows', () => {
    expect(compactCount(0)).toBe('0');
    expect(compactCount(999)).toBe('999');
    expect(compactCount(1_000)).toBe('1K');
    expect(compactCount(1_540)).toBe('1.5K');
    expect(compactCount(38_200)).toBe('38.2K');
    expect(compactCount(999_950)).toBe('1M');
    expect(compactCount(2_300_000)).toBe('2.3M');
    expect(compactCount(4_000_000_000)).toBe('4B');
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
    expect(formatPosted('2026-09-13T04:02:00Z', 'America/Los_Angeles', { dateOnly: true })).toBe('09/12/2026');
    expect(formatStart({ utcStartDateTime: '2026-09-14T00:00:00Z', allDay: true }, 'America/Los_Angeles')).toBe(
      'Starts 09/14/2026',
    );
    expect(formatStart({ utcStartDateTime: '2026-09-14T16:00:00Z' }, 'UTC')).toBe('Starts 09/14/2026 4:00PM');
  });

  it('labels a day as all day only where the source said so', () => {
    const pin = { utcStartDateTime: '2026-09-14T00:00:00Z', allDay: true };
    // Nearly every pin is all-day only because its page gave no clock time.
    expect(formatStart(pin, 'UTC', { allDaySuffix: true })).toBe('Starts 09/14/2026');
    expect(formatStart({ ...pin, allDayStated: true }, 'UTC', { allDaySuffix: true })).toBe('Starts 09/14/2026 - All day');
    // Without the suffix asked for, a stated one is worded like any other.
    expect(formatStart({ ...pin, allDayStated: true }, 'UTC')).toBe('Starts 09/14/2026');
  });

  it('reads a multi-day all-day pin as the span it covers', () => {
    const start = '2026-09-02T00:00:00Z';
    // The stored end is exclusive, so 12 December reads as running to the 11th.
    expect(formatStart({ utcStartDateTime: start, utcEndDateTime: '2026-12-12T00:00:00Z', allDay: true }, 'UTC')).toBe('09/02/2026 - 12/11/2026');
    // A one-day pin that happens to carry an explicit end still reads as a day.
    expect(formatStart({ utcStartDateTime: start, utcEndDateTime: '2026-09-03T00:00:00Z', allDay: true }, 'UTC')).toBe('Starts 09/02/2026');
    // A timed pin keeps its instant, end date or not.
    expect(formatStart({ utcStartDateTime: '2026-09-14T16:00:00Z', utcEndDateTime: '2026-09-20T16:00:00Z' }, 'UTC')).toBe('Starts 09/14/2026 4:00PM');
  });

  it('keys early and BC dates by astronomical year, padded to four digits', () => {
    expect(dayKeyIn('-002560-01-01T00:00:00Z', 'UTC')).toBe('-2560-01-01');
    expect(dayKeyIn('-000279-01-01T00:00:00Z', 'UTC')).toBe('-0279-01-01');
    expect(dayKeyIn('0000-06-15T00:00:00Z', 'UTC')).toBe('0000-06-15');
    expect(dayKeyIn('0079-08-24T00:00:00Z', 'UTC')).toBe('0079-08-24');
    // Local midnight on 1 January AD 1 is still 1 BC a few hours west.
    expect(dayKeyIn('0001-01-01T03:00:00Z', 'America/Los_Angeles')).toBe('0000-12-31');
    expect(monthDayOf('-2560-01-01')).toBe('01-01');
    expect(daysBetween('0000-12-31', '0001-01-01')).toBe(1);
    expect(daysBetween('0079-08-24', '0079-08-25')).toBe(1);
  });

  it('labels early and BC dates with their era', () => {
    expect(formatDayKey('2026-09-14')).toBe('09/14/2026');
    expect(formatDayKey('-2560-01-01')).toBe('01/01/2561 BC');
    expect(formatDayKey('0000-06-15')).toBe('06/15/1 BC');
    expect(formatDayKey('0079-08-24')).toBe('08/24/79');
    expect(formatStart({ utcStartDateTime: '-002560-01-01T00:00:00Z', allDay: true }, 'UTC')).toBe('Starts 01/01/2561 BC');
    expect(timespan('2026-09-16', '-2560-01-01', 'y')).toBe('-4586.7 years');
  });

  it('says how far a day is from today', () => {
    expect(daysAway('2026-09-16', '2026-09-16')).toBe('Today');
    expect(daysAway('2026-09-16', '2026-09-17')).toBe('in 1 day');
    expect(daysAway('2026-09-16', '2026-09-13')).toBe('3 days ago');
    expect(daysAway('2026-09-16', '2027-11-16')).toBe('in 1.2 years');
    expect(daysAway('2026-09-16', '-2560-01-01')).toBe('4586.7 years ago');
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

  it('orders BC and early AD days by date, not as text', () => {
    const bags = buildBags(
      [pin(1, '2026-09-14T00:00:00Z', true), pin(2, '-000279-01-01T00:00:00Z', true), pin(3, '-002560-01-01T00:00:00Z', true), pin(4, '0280-01-01T00:00:00Z', true)],
      [],
      'UTC',
    );
    expect(bags.map((b) => b.day)).toEqual(['-2560-01-01', '-0279-01-01', '0280-01-01', '2026-09-14']);
    expect(pinTense(pin(3, '-002560-01-01T00:00:00Z', true), '2026-09-16T00:00:00Z', '2026-09-16')).toBe('past');
  });

  it('places the TODAY marker before the first future day', () => {
    const bags = buildBags([pin(1, '2026-09-10T00:00:00Z', true), pin(2, '2026-09-20T00:00:00Z', true)], [], 'UTC');
    expect(resolveTodayMarker(bags, '2026-09-13')).toEqual({ index: 1, atEnd: false, todayBagIndex: -1 });
    expect(resolveTodayMarker(bags, '2026-09-25')).toEqual({ index: -1, atEnd: true, todayBagIndex: -1 });
    expect(resolveTodayMarker(bags, '2026-09-20')).toEqual({ index: -1, atEnd: false, todayBagIndex: 1 });
  });
});

describe('ratingScore', () => {
  it('shows each source the way the source does', () => {
    expect(ratingScore(92, 100, 'Rotten Tomatoes')).toBe('92%');
    expect(ratingScore(85, 100, 'AniList')).toBe('85%');
    expect(ratingScore(82, 100, 'Metacritic')).toBe('82/100');
    expect(ratingScore(8.67, 10, 'MyAnimeList')).toBe('8.67/10');
    expect(ratingScore(8.2, 10, 'IMDb')).toBe('8.2/10');
  });
});

describe('ratingPercent', () => {
  it('rescales even a single source, leaving out forecasts', () => {
    expect(ratingPercent([{ source: 'MyAnimeList', score: 8.07, scoreMax: 10 }])).toBe(81);
    expect(ratingPercent([{ source: 'Kalshi RT forecast', score: 95, scoreMax: 100 }])).toBeUndefined();
    expect(ratingPercent([])).toBeUndefined();
  });
});

describe('averageRating', () => {
  it('averages the sources on their own scales, as a percentage', () => {
    // Howl's Moving Castle: AniList 85, MAL 8.67/10, IMDb 8.2/10, RT 88, Metacritic 82.
    expect(
      averageRating([
        { score: 85, scoreMax: 100 },
        { score: 8.67, scoreMax: 10 },
        { score: 8.2, scoreMax: 10 },
        { score: 88, scoreMax: 100 },
        { score: 82, scoreMax: 100 },
      ]),
    ).toBe(85);
    expect(
      averageRating([
        { score: 90, scoreMax: 100 },
        { score: 9, scoreMax: 10 },
      ]),
    ).toBe(90);
  });

  it('has nothing to average below two sources', () => {
    expect(averageRating([{ score: 85, scoreMax: 100 }])).toBeUndefined();
    // A market's forecast of a score is not a review.
    expect(averageRating([{ score: 85, scoreMax: 100 }, { source: 'Kalshi RT forecast', score: 95, scoreMax: 100 }])).toBeUndefined();
    expect(averageRating([])).toBeUndefined();
    expect(averageRating(undefined)).toBeUndefined();
  });

  it('skips a source with no usable scale', () => {
    expect(
      averageRating([
        { score: 80, scoreMax: 100 },
        { score: 90, scoreMax: 100 },
        { score: 5, scoreMax: 0 },
      ]),
    ).toBe(85);
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-09-16T12:00:00Z');
  const ago = (seconds: number) => timeAgo(new Date(now - seconds * 1000), now);

  it('uses the smallest unit that fits', () => {
    expect(ago(30)).toBe('30 seconds ago');
    expect(ago(5 * 60)).toBe('5 minutes ago');
    expect(ago(3 * 3600)).toBe('3 hours ago');
    expect(ago(2 * 86_400)).toBe('2 days ago');
  });

  it('never rounds up to a full next unit', () => {
    expect(ago(59.6)).toBe('1 minute ago');
    expect(ago(59 * 60 + 40)).toBe('1 hour ago');
    expect(ago(23.6 * 3600)).toBe('yesterday');
    expect(ago(29.6 * 86_400)).toBe('last month');
    expect(ago(11.6 * 2_592_000)).toBe('last year');
  });

  it('formats future instants', () => {
    expect(timeAgo(new Date(now + 59 * 60_000 + 50_000), now)).toBe('in 1 hour');
  });

  it('gives hours and up a decimal place in numbers when asked', () => {
    const posted = (seconds: number) => timeAgo(new Date(now - seconds * 1000), now, 'en', { numeric: 'always', decimals: true });
    expect(posted(0)).toBe('now');
    expect(posted(5 * 60)).toBe('5 minutes ago');
    expect(posted(66 * 60)).toBe('1.1 hours ago');
    expect(posted(3600)).toBe('1 hour ago');
    expect(posted(23.97 * 3600)).toBe('1 day ago');
    expect(posted(36 * 3600)).toBe('1.5 days ago');
  });
});

describe('startsWhen', () => {
  // Noon on the viewer's clock, whatever zone the tests run in.
  const now = new Date(2026, 8, 16, 12).getTime();

  it('reads a timed pin by its instant', () => {
    expect(startsWhen(new Date(now + 3 * 3600_000).toISOString(), false, now)).toEqual({ started: false, when: 'in 3 hours' });
    expect(startsWhen(new Date(now - 2 * 86_400_000).toISOString(), false, now)).toEqual({ started: true, when: '2 days ago' });
    expect(startsWhen(new Date(now + 40 * 86_400_000).toISOString(), false, now)).toEqual({ started: false, when: 'in 40 days' });
  });

  it('reads an all-day pin by its date against the local today', () => {
    expect(startsWhen('2026-09-16T00:00:00Z', true, now)).toEqual({ started: false, when: 'today' });
    expect(startsWhen('2026-09-17T00:00:00Z', true, now)).toEqual({ started: false, when: 'in 1 day' });
    expect(startsWhen('2026-09-15T00:00:00Z', true, now)).toEqual({ started: true, when: '1 day ago' });
    expect(startsWhen('2026-08-16T00:00:00Z', true, now)).toEqual({ started: true, when: '31 days ago' });
    expect(startsWhen('2026-09-13T00:00:00Z', true, now)).toEqual({ started: true, when: '3 days ago' });
    expect(startsWhen('2027-03-16T00:00:00Z', true, now)).toEqual({ started: false, when: 'in 181 days' });
    expect(startsWhen('2028-09-16T00:00:00Z', true, now)).toEqual({ started: false, when: 'in 2 years' });
  });
});

describe('dayStartIn', () => {
  it('finds a day\'s first instant in a zone', () => {
    expect(new Date(dayStartIn('2026-09-13', 'UTC')).toISOString()).toBe('2026-09-13T00:00:00.000Z');
    expect(new Date(dayStartIn('2026-09-13', 'America/Los_Angeles')).toISOString()).toBe('2026-09-13T07:00:00.000Z');
    expect(new Date(dayStartIn('2026-01-13', 'America/Los_Angeles')).toISOString()).toBe('2026-01-13T08:00:00.000Z');
    expect(new Date(dayStartIn('2026-09-13', 'Pacific/Kiritimati')).toISOString()).toBe('2026-09-12T10:00:00.000Z');
    expect(new Date(dayStartIn('2026-09-13', 'Asia/Kolkata')).toISOString()).toBe('2026-09-12T18:30:00.000Z');
  });

  it('starts the day after the DST change at the new offset', () => {
    expect(new Date(dayStartIn('2026-03-09', 'America/New_York')).toISOString()).toBe('2026-03-09T04:00:00.000Z');
    expect(new Date(dayStartIn('2026-11-02', 'America/New_York')).toISOString()).toBe('2026-11-02T05:00:00.000Z');
  });

  it('works for a day before the common era', () => {
    expect(dayKeyIn(dayStartIn('-2560-01-01', 'Asia/Tokyo'), 'Asia/Tokyo')).toBe('-2560-01-01');
    expect(nextDayKey('-2560-12-31')).toBe('-2559-01-01');
  });
});

describe('lunarDate', () => {
  it('writes the Chinese lunar month and day', () => {
    expect(lunarDate('2026-09-18')?.text).toBe('八月初八');
    expect(lunarDate('2026-02-17')?.text).toBe('正月初一');
    expect(lunarDate('2026-10-25')?.text).toBe('九月十六');
    expect(lunarDate('2025-08-01')?.text).toBe('闰六月初八');
    expect(lunarDate('2026-09-18')?.title).toContain('丙午年');
  });

  it('names every day of a month', () => {
    expect(lunarDate('2026-02-26')?.text).toBe('正月初十');
    expect(lunarDate('2026-02-27')?.text).toBe('正月十一');
    expect(lunarDate('2026-03-08')?.text).toBe('正月二十');
    expect(lunarDate('2026-03-09')?.text).toBe('正月廿一');
  });

  it('has none before the Taichu calendar', () => {
    expect(lunarDate('-2560-01-01')).toBeNull();
  });
});

describe('moonPhase', () => {
  it('names the phase of known moons', () => {
    expect(moonPhase('2026-09-11').name).toBe('New moon');
    expect(moonPhase('2026-09-26').name).toBe('Full moon');
    expect(moonPhase('2026-09-18').name).toBe('First quarter');
    expect(moonPhase('2026-09-26').illumination).toBeGreaterThan(0.97);
    expect(moonPhase('2026-09-11').illumination).toBeLessThan(0.03);
  });
});
