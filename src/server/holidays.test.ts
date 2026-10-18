import { describe, expect, it } from 'vitest';
import { astronomyTitles, holidayRanges, suggestHolidays } from './holidays';

describe('holidayRanges', () => {
  it('works a moving holiday out year by year', () => {
    const runs = holidayRanges(['Mid-Autumn Festival']);
    expect(runs).toContainEqual({ from: '2026-09-25', to: '2026-09-25' });
    expect(runs).toContainEqual({ from: '2027-09-15', to: '2027-09-15' });
  });

  it('runs a holiday of several days from its first to its last', () => {
    const run = holidayRanges(["China's National Day Golden Week"]).find((r) => r.from === '2026-10-01');
    expect(run).toEqual({ from: '2026-10-01', to: '2026-10-07' });
  });

  it('knows a holiday by an alias or without regard to case', () => {
    expect(holidayRanges(["china's national day"]).length).toBeGreaterThan(100);
    expect(holidayRanges(['HALLOWEEN'])).toContainEqual({ from: '2026-10-31', to: '2026-10-31' });
  });

  it('keeps a special day to its date every year, leap days to leap years', () => {
    const runs = holidayRanges(['National Peanut Day']);
    expect(runs).toContainEqual({ from: '2026-09-13', to: '2026-09-13' });
    expect(holidayRanges(['National Leap Day']).map((r) => r.from.slice(0, 4))).not.toContain('2027');
  });

  it('matches nothing for a name nobody keeps', () => {
    expect(holidayRanges(['Not A Holiday'])).toEqual([]);
  });
});

describe('suggestHolidays', () => {
  it('suggests a holiday by a word of its name, with its next day', () => {
    const [first] = suggestHolidays('hallow', 'en', '2026-10-09', 4);
    expect(first).toEqual({ name: 'Halloween', label: 'Halloween', kind: 'holiday', next: '2026-10-31' });
  });

  it('puts the cultural holidays before the special days they tie with', () => {
    const kinds = suggestHolidays('day of', 'en', '2026-10-09', 6).map((s) => s.kind);
    expect(kinds).toEqual([...kinds].sort());
  });

  it('suggests a special day, and a holiday in the page\'s language', () => {
    expect(suggestHolidays('peanut', 'en', '2026-09-01', 4).map((s) => s.name)).toContain('National Peanut Day');
    const [first] = suggestHolidays('中秋', 'zh', '2026-09-01', 4);
    expect(first).toMatchObject({ name: 'Mid-Autumn Festival', next: '2026-09-25' });
  });

  it('waits for two letters and a word that begins with them', () => {
    expect(suggestHolidays('h', 'en', '2026-10-09', 4)).toEqual([]);
    expect(suggestHolidays('zzzz', 'en', '2026-10-09', 4)).toEqual([]);
  });
});

describe('suggestHolidays dedupe', () => {
  it('suggests a special day the catalog also keeps once, as the holiday', () => {
    expect(suggestHolidays('hallo', 'en', '2026-10-09', 4)).toEqual([{ name: 'Halloween', label: 'Halloween', kind: 'holiday', next: '2026-10-31' }]);
  });
});

describe('astronomy markers', () => {
  it('knows a solstice or equinox by its season, month or alone', () => {
    expect(astronomyTitles('Winter Solstice')).toEqual(['Winter Solstice']);
    expect(astronomyTitles('september equinox')).toEqual(['Fall Equinoxes']);
    expect(astronomyTitles('Solstice')).toEqual(['Summer Solstice', 'Winter Solstice']);
    expect(astronomyTitles('equinox')).toEqual(['Spring Equinoxes', 'Fall Equinoxes']);
    expect(astronomyTitles('Halloween')).toEqual([]);
  });

  it('has no days before the markers are loaded', () => {
    expect(holidayRanges(['Winter Solstice'], 'UTC')).toEqual([]);
  });

  it('suggests them by a word of the name', () => {
    const found = suggestHolidays('equin', 'en', '2026-10-09', 4);
    expect(found.map((s) => s.name).sort()).toEqual(['Fall Equinox', 'Spring Equinox']);
    expect(found.every((s) => s.kind === 'astronomy')).toBe(true);
  });
});
