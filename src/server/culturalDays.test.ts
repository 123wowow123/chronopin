import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { addDays, holidayForMarker, HOLIDAYS, isAstronomyMarker, tierOf, windowOffset } from '@/lib/culturalDays';
import { culturalDaysInYear, culturalDaysOn, holidaysInWindow, occurrencesIn } from './culturalDays';

const start = (year: number, id: string) => occurrencesIn(year).find((o) => o.def.id === id)?.start;

describe('cultural holiday dates', () => {
  it('moves the lunar, Islamic and Hebrew holidays with the year', () => {
    expect(start(2026, 'mid-autumn')).toBe('2026-09-25');
    expect(start(2027, 'mid-autumn')).toBe('2027-09-15');
    expect(start(2026, 'hanukkah')).toBe('2026-12-05');
    expect(start(2026, 'eid-al-fitr')).toBe('2026-03-20');
    expect(start(2026, 'buddhas-birthday')).toBe('2026-05-24');
    expect(start(2026, 'diwali')).toBe('2026-11-08');
  });

  it('works the Western ones out from their rules', () => {
    expect(start(2026, 'easter')).toBe('2026-04-05');
    expect(start(2026, 'mardi-gras')).toBe('2026-02-17');
    expect(start(2026, 'thanksgiving')).toBe('2026-11-26');
    expect(start(2026, 'halloween')).toBe('2026-10-31');
  });

  it('finds a date for every holiday in a recent year', () => {
    for (const def of HOLIDAYS) expect(start(2026, def.id), def.id).toBeTruthy();
  });

  it('tags the day, with its traditions, in the page language', () => {
    const [day] = culturalDaysOn('2026-09-25', 'en');
    expect(day).toMatchObject({ id: 'mid-autumn', name: 'Mid-Autumn Festival', day: 1 });
    expect(day.traditions.map((t) => t.name)).toEqual(['Mooncakes', 'Lantern lighting', 'Moon gazing', 'Pomelo']);
  });

  it('tags each day of a holiday that lasts several', () => {
    expect(culturalDaysOn('2026-09-26', 'en').map((d) => d.id)).toContain('sukkot');
    expect(culturalDaysOn('2026-10-02', 'en').find((d) => d.id === 'sukkot')?.day).toBe(7);
    expect(culturalDaysOn('2026-10-03', 'en').map((d) => d.id)).not.toContain('sukkot');
    // Hanukkah begun in December runs into January when the year turns.
    expect(culturalDaysOn('2027-12-31', 'en').map((d) => d.id)).toContain('hanukkah');
    expect(Object.keys(culturalDaysInYear(2026, 'en'))).toContain('2026-09-25');
  });

  it('tags China\'s National Day Golden Week on 1-7 October', () => {
    expect(culturalDaysOn('2026-10-01', 'en').map((d) => d.id)).toContain('national-day-golden-week');
    expect(culturalDaysOn('2026-10-05', 'en').find((d) => d.id === 'national-day-golden-week')?.day).toBe(5);
    expect(culturalDaysOn('2026-10-08', 'en').map((d) => d.id)).not.toContain('national-day-golden-week');
  });

  it('works out the holidays that follow a weekday or another holiday', () => {
    expect(start(2026, 'us-mothers-day')).toBe('2026-05-10');
    expect(start(2026, 'us-fathers-day')).toBe('2026-06-21');
    expect(start(2026, 'us-black-friday')).toBe('2026-11-27');
    expect(start(2026, 'germany-oktoberfest')).toBe('2026-09-19');
    expect(start(2026, 'orthodox-easter')).toBe('2026-04-12');
    expect(start(2026, 'russia-maslenitsa')).toBe('2026-02-16');
    expect(start(2026, 'chaharshanbe-suri')).toBe('2026-03-17');
    expect(start(2027, 'chaharshanbe-suri')).toBe('2027-03-16');
    expect(start(2026, 'brazil-carnival')).toBe('2026-02-14');
    expect(start(2026, 'yalda')).toBe('2026-12-21');
    expect(start(2028, 'yalda')).toBe('2028-12-20');
  });

  it('keeps each country its own lunar new year', () => {
    expect(start(2027, 'lunar-new-year')).toBe('2027-02-06');
    expect(start(2027, 'korea-seollal')).toBe('2027-02-07');
    expect(start(2026, 'vietnam-tet')).toBe('2026-02-17');
  });

  it('reads the Hindu festivals from the year table', () => {
    expect(start(2026, 'india-holi')).toBe('2026-03-04');
    expect(start(2026, 'india-navratri')).toBe('2026-10-11');
    expect(start(2026, 'india-dussehra')).toBe('2026-10-20');
    expect(start(2026, 'india-ganesh-chaturthi')).toBe('2026-09-14');
    expect(start(2026, 'india-raksha-bandhan')).toBe('2026-08-28');
    expect(start(2026, 'kerala-onam')).toBe('2026-08-26');
    expect(start(2026, 'thailand-loy-krathong')).toBe('2026-11-24');
    // The table ends in 2035.
    expect(start(2040, 'india-holi')).toBeUndefined();
  });

  it('tags Ramadan on each of its thirty days and Japan\'s Golden Week on 29 April to 5 May', () => {
    expect(culturalDaysOn('2026-03-19', 'en').find((d) => d.id === 'ramadan')?.day).toBe(30);
    expect(culturalDaysOn('2026-03-20', 'en').map((d) => d.id)).not.toContain('ramadan');
    expect(culturalDaysOn('2026-05-05', 'en').find((d) => d.id === 'japan-golden-week')?.day).toBe(7);
  });

  it('says which country or region a holiday belongs to', () => {
    expect(HOLIDAYS.find((h) => h.id === 'japan-golden-week')?.name).toBe("Japan's Golden Week");
    expect(HOLIDAYS.find((h) => h.id === 'nordic-midsummer')?.name).toBe('Nordic Midsummer');
  });

  it('leaves out years the calendars cannot answer for', () => {
    expect(culturalDaysOn('1900-01-01', 'en')).toEqual([]);
  });
});

describe('the ad window', () => {
  it('opens a month before the holiday and closes three weeks after it', () => {
    expect(windowOffset('2026-08-26', '2026-09-25')).toEqual({ offset: -30, active: true });
    expect(windowOffset('2026-08-25', '2026-09-25').active).toBe(false);
    expect(windowOffset('2026-10-16', '2026-09-25').active).toBe(true);
    expect(windowOffset('2026-10-17', '2026-09-25').active).toBe(false);
    // Three weeks after the last day of a multi-day holiday.
    expect(windowOffset(addDays('2026-12-05', 7 + 21), '2026-12-05', 8).active).toBe(true);
    expect(windowOffset(addDays('2026-12-05', 7 + 22), '2026-12-05', 8).active).toBe(false);
  });

  it('lists the holidays whose window holds a day', () => {
    const ids = holidaysInWindow('2026-10-03', 30, 21).map((h) => h.id);
    expect(ids).toContain('mid-autumn');
    expect(ids).toContain('halloween');
    expect(ids).toContain('double-ninth');
    expect(ids).not.toContain('diwali');
    expect(ids).not.toContain('easter');
  });

  it('splits prices into three tiers', () => {
    expect(tierOf(12.99, [20, 45])).toBe('value');
    expect(tierOf(20, [20, 45])).toBe('mid');
    expect(tierOf(44.99, [20, 45])).toBe('mid');
    expect(tierOf(45, [20, 45])).toBe('premium');
  });
});

describe('date markers', () => {
  it('tells an astronomy marker from a holiday and finds the holiday a marker repeats', () => {
    expect(isAstronomyMarker('Winter Solstice')).toBe(true);
    expect(isAstronomyMarker('Fall Equinoxes')).toBe(true);
    expect(isAstronomyMarker('Sukkot')).toBe(false);
    expect(holidayForMarker('Sukkot')).toBe('sukkot');
    expect(holidayForMarker('Thanksgiving Day')).toBe('thanksgiving');
    expect(holidayForMarker('Memorial Day')).toBeUndefined();
    expect(holidayForMarker('Independence Day')).toBe('us-independence-day');
    expect(holidayForMarker('Boxing Day')).toBe('uk-boxing-day');
  });
});

describe('translations', () => {
  const names = [...new Set(HOLIDAYS.flatMap((h) => [h.name, ...h.traditions]))];
  const locales = ['ar', 'de', 'es', 'fr', 'hi', 'id', 'it', 'ja', 'ko', 'ms', 'pt', 'ru', 'th', 'vi', 'zh'] as const;

  it.each(locales)('names every holiday and tradition in %s', (locale) => {
    const labels = JSON.parse(readFileSync(path.join(__dirname, 'data', `culturalDays.${locale}.json`), 'utf8')) as Record<string, string>;
    expect(names.filter((name) => !labels[name]?.trim())).toEqual([]);
  });

  it('labels a day in the page language', () => {
    const [day] = culturalDaysOn('2026-09-25', 'zh');
    expect(day.name).toBe('Mid-Autumn Festival');
    expect(day.label).not.toBe(day.name);
    expect(day.traditions[0].name).toBe('Mooncakes');
    expect(day.traditions[0].label).not.toBe('Mooncakes');
  });
});
