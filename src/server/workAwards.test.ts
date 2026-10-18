import { describe, expect, it } from 'vitest';
import { awardEntries, splitAward } from './workAwards';

describe('splitAward', () => {
  it('splits an award from its category', () => {
    expect(splitAward('British Academy Games Award for Best Game')).toEqual({ body: 'British Academy Games Award', award: 'Best Game' });
    expect(splitAward('Golden Joystick Awards − Ultimate Game of the Year')).toEqual({ body: 'Golden Joystick Awards', award: 'Ultimate Game of the Year' });
  });
  it('keeps an award with no category whole, using the statement category', () => {
    expect(splitAward('Red Dot Award')).toEqual({ body: 'Red Dot Award', award: 'Red Dot Award' });
    expect(splitAward('Red Dot Award', 'Red Dot: Product Design 2020')).toEqual({ body: 'Red Dot Award', award: 'Red Dot: Product Design 2020' });
  });
});

describe('awardEntries', () => {
  const url = 'https://www.wikidata.org/wiki/Q1';
  it('drops a nomination the work went on to win, and undated statements', () => {
    const entries = awardEntries(
      [
        { res: 'nominated', awLabel: 'The Game Awards − Best Remaster', date: '2014-11-20T00:00:00Z' },
        { res: 'won', awLabel: 'The Game Awards − Best Remaster', date: '2014-12-05T00:00:00Z' },
        { res: 'won', awLabel: 'Steam Award for Labor of Love' },
        { res: 'nominated', awLabel: 'Steam Award for Labor of Love', date: '2018-12-18T00:00:00Z' },
      ],
      'Grand Theft Auto V',
      url,
    );
    expect(entries.map((e) => `${e.year} ${e.body}: ${e.award} ${e.result}`)).toEqual([
      '2014 The Game Awards: Best Remaster won',
      '2018 Steam Award: Labor of Love nominated',
    ]);
    expect(entries[0].work).toBe('Grand Theft Auto V');
  });
});
