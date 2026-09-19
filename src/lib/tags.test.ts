import { describe, expect, it } from 'vitest';
import { autoTags, awardTag, awardTagsInText, cleanTag, marketTags, cloudSteps, cloudTags, nominationTag, parseTags, splitTags, tagKind, tagParent, groupTags, tagGroupPatterns } from './tags';

describe('cleanTag', () => {
  it('trims, drops a leading # and double quotes', () => {
    expect(cleanTag('  #Studio   Ghibli ')).toBe('Studio Ghibli');
    expect(cleanTag('"Artemis"')).toBe('Artemis');
    expect(cleanTag('  ')).toBeNull();
    expect(cleanTag(3)).toBeNull();
  });

  it('caps the length', () => {
    expect(cleanTag('x'.repeat(200))!.length).toBe(80);
  });
});

describe('parseTags', () => {
  it('leaves a body without tags alone', () => {
    expect(parseTags(undefined)).toBeUndefined();
    expect(parseTags(null)).toBeUndefined();
  });

  it('takes an array, a comma list or tag objects, without repeats', () => {
    expect(parseTags(['Artemis', 'artemis', ' NASA '])).toEqual(['Artemis', 'NASA']);
    expect(parseTags('Artemis, Moon,,')).toEqual(['Artemis', 'Moon']);
    expect(parseTags([{ name: 'Moon', kind: 'topic' }])).toEqual(['Moon']);
    expect(parseTags([])).toEqual([]);
  });

  it('keeps at most 20', () => {
    expect(parseTags(Array.from({ length: 30 }, (_, i) => `t${i}`))).toHaveLength(20);
  });
});

describe('splitTags', () => {
  it('splits on commas and new lines', () => {
    expect(splitTags('a, b\nc')).toEqual(['a', 'b', 'c']);
  });
});

describe('tagKind', () => {
  it('knows an award', () => {
    expect(tagKind('Tokyo Anime Award Festival 2024')).toBe('award');
    expect(tagKind('97th Academy Awards')).toBe('award');
    expect(tagKind('Japan Academy Film Prize 2025')).toBe('award');
    expect(tagKind('Studio Ghibli')).toBe('topic');
  });
});

describe('awardTag', () => {
  it('is the body and year', () => {
    expect(awardTag({ body: 'Tokyo Anime Award Festival', year: 2024 })).toBe('Tokyo Anime Award Festival 2024');
  });
});

describe('awardTagsInText', () => {
  it('finds an award with its year on either side', () => {
    expect(awardTagsInText('Frieren won Anime of the Year at the 2024 Crunchyroll Anime Awards.')).toEqual(['Crunchyroll Anime Awards 2024']);
    expect(awardTagsInText('It took the Grand Prize at the Tokyo Anime Award Festival 2024.')).toEqual(['Tokyo Anime Award Festival 2024']);
    expect(awardTagsInText('Winner of the Japan Academy Film Prize 2025 for Animation of the Year')).toEqual(['Japan Academy Film Prize 2025']);
  });

  it('finds an edition by its ordinal, as its year for a yearly body', () => {
    // A nomination is its own tag ("... Nominee").
    expect(awardTagsInText('It was nominated at the 97th Academy Awards.')).toEqual(['Academy Awards 2025 Nominee']);
    expect(awardTagsInText('It won Best Action at the 8th Crunchyroll Anime Awards.')).toEqual(['Crunchyroll Anime Awards 2024']);
    expect(awardTagsInText('It won the 10th Next Manga Award.')).toEqual(['10th Next Manga Award']);
  });

  it('reads summary HTML', () => {
    expect(awardTagsInText('<ul><li>Won at the Annie Awards 2023</li><li>Premiered at the Cannes Film Festival 2025</li></ul>')).toEqual([
      'Annie Awards 2023',
      'Cannes Film Festival 2025',
    ]);
  });

  it('keeps the name of The Game Awards', () => {
    expect(awardTagsInText('It won Game of the Year at The Game Awards 2024.')).toEqual(['The Game Awards 2024']);
  });

  it('skips awards with no year or edition, and festivals that give none', () => {
    expect(awardTagsInText('The studio said the Award was great. Coachella Festival 2024 lineup. Won an award in 2024.')).toEqual([]);
    expect(awardTagsInText('A Crunchyroll Anime Awards favourite.')).toEqual([]);
    expect(awardTagsInText(null)).toEqual([]);
  });
});

describe('the cloud', () => {
  const counts = [
    { name: 'Crunchyroll Anime Awards 2025', kind: 'award' as const, count: 120 },
    { name: 'Artemis', kind: 'topic' as const, count: 3 },
    { name: 'Moon', kind: 'topic' as const, count: 1 },
  ];

  it('sizes by count on a log scale', () => {
    const steps = cloudSteps(counts);
    expect(steps.get('crunchyroll anime awards 2025')).toBe(5);
    expect(steps.get('moon')).toBe(1);
    expect(steps.get('artemis')).toBeGreaterThan(1);
    expect(cloudSteps([counts[1]]).get('artemis')).toBe(3);
    expect(cloudSteps(counts, 8).get('crunchyroll anime awards 2025')).toBe(8);
    expect(cloudSteps([counts[1]], 8).get('artemis')).toBe(4);
  });

  it('shows the busiest and anything picked, picked first, by name', () => {
    expect(cloudTags(counts, [], 2).map((t) => t.name)).toEqual(['Artemis', 'Crunchyroll Anime Awards 2025']);
    expect(cloudTags(counts, ['moon', 'Gone'], 2).map((t) => [t.name, t.count])).toEqual([
      ['Gone', 0],
      ['Moon', 1],
      ['Artemis', 3],
      ['Crunchyroll Anime Awards 2025', 120],
    ]);
  });
});

describe('nomination tags', () => {
  it('names a body and year the work was only nominated in', () => {
    expect(nominationTag({ body: 'Crunchyroll Anime Awards', year: 2024 })).toBe('Crunchyroll Anime Awards 2024 Nominee');
  });

  it('is its own kind, typed or derived', () => {
    expect(tagKind('Crunchyroll Anime Awards 2024 Nominee')).toBe('nomination');
    expect(tagKind('Oscar nominee')).toBe('nomination');
    expect(tagKind('Crunchyroll Anime Awards 2024')).toBe('award');
    expect(tagKind('Nominees of the year list')).toBe('topic');
  });
});

describe('nominations in prose', () => {
  it('tags a nomination as one, and a win as a win', () => {
    expect(awardTagsInText('Nominated for Best Action at the 8th Crunchyroll Anime Awards in 2024.')).toEqual(['Crunchyroll Anime Awards 2024 Nominee']);
    expect(awardTagsInText('Won Anime of the Year at the 4th Crunchyroll Anime Awards.')).toEqual(['Crunchyroll Anime Awards 2020']);
    expect(awardTagsInText('It was nominated in 2023. It won the 2024 Crunchyroll Anime Awards.')).toEqual(['Crunchyroll Anime Awards 2024']);
    expect(awardTagsInText('It won Best Score and was nominated at the 2025 Crunchyroll Anime Awards.')).toEqual(['Crunchyroll Anime Awards 2025 Nominee']);
  });
});


describe('marketTags', () => {
  it('names the exchanges a pin links a market on, once each', () => {
    expect(marketTags({ sourceUrl: 'https://kalshi.com/markets/kxfed/fed-meeting/KXFED-26OCT' })).toEqual(['Prediction Market', 'Kalshi']);
    expect(
      marketTags({
        sourceUrl: 'https://polymarket.com/event/fed-decision-in-october',
        references: [{ url: 'https://polymarket.com/event/other' }, { url: 'https://polymarket.us/event/nba-finals' }, { url: 'https://example.com/news' }],
      }),
    ).toEqual(['Prediction Market', 'Polymarket', 'Polymarket US']);
    expect(marketTags({ sourceUrl: 'https://kalshi.com/about', references: null })).toEqual([]);
  });

  it('joins the award tags in autoTags', () => {
    expect(autoTags({ description: 'It won the 2024 Crunchyroll Anime Awards.', sourceUrl: 'https://kalshi.com/markets/kxoscar' })).toEqual(['Crunchyroll Anime Awards 2024', 'Prediction Market', 'Kalshi']);
  });
});

describe('tag groups', () => {
  it('wraps award years and nominations into their body', () => {
    expect(tagParent('Crunchyroll Anime Awards 2024 Nominee')).toBe('Crunchyroll Anime Awards');
    expect(tagParent('Crunchyroll Anime Awards 2024')).toBe('Crunchyroll Anime Awards');
    expect(tagParent('Crunchyroll Anime Awards')).toBeNull();
    expect(tagParent('Kalshi')).toBe('Prediction Market');
    expect(tagParent('Artemis')).toBeNull();
  });

  it('groups only two or more, keeping the members', () => {
    const counts = [
      { name: 'Crunchyroll Anime Awards 2024', kind: 'award' as const, count: 3 },
      { name: 'Crunchyroll Anime Awards 2023 Nominee', kind: 'nomination' as const, count: 2 },
      { name: 'Lone Awards 2020', kind: 'award' as const, count: 1 },
      { name: 'Artemis', kind: 'topic' as const, count: 5 },
    ];
    const grouped = groupTags(counts);
    expect(grouped.map((g) => g.name)).toEqual(['Lone Awards 2020', 'Artemis', 'Crunchyroll Anime Awards']);
    expect(grouped[2]).toMatchObject({ count: 5, kind: 'award' });
    expect(grouped[2].members).toHaveLength(2);
  });

  it('makes a group name match its members in search', () => {
    const [re] = tagGroupPatterns(['Crunchyroll Anime Awards']);
    const rx = new RegExp(re, 'i');
    expect(rx.test('Crunchyroll Anime Awards 2024 Nominee')).toBe(true);
    expect(rx.test('Crunchyroll Anime Awards Extra')).toBe(false);
  });
});
