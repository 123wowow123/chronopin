import { describe, expect, it } from 'vitest';
import { commonsFileUrl, day, PersonInputError, readImpact, readMatter, readPerson, readPhase, readResearchNote } from './personInput';

describe('day', () => {
  it('takes real ISO days only', () => {
    expect(day('2026-10-10')).toBe('2026-10-10');
    expect(day('2026-02-30')).toBeNull();
    expect(day('10/10/2026')).toBeNull();
    expect(day(20261010)).toBeNull();
  });
});

describe('readPerson', () => {
  it('needs an object with a name', () => {
    expect(() => readPerson(null)).toThrow(PersonInputError);
    expect(() => readPerson({ name: '  ' })).toThrow('needs a name');
  });

  it('keeps health, religion and weight only with their source', () => {
    const bare = readPerson({ name: 'A', health: 'Surgery', religion: 'Catholic', weightKg: 80 });
    expect(bare).toMatchObject({ health: null, religion: null, weightKg: null });
    const sourced = readPerson({
      name: 'A', health: 'Surgery', healthAsOf: '2025-01-02', healthSourceUrl: 'https://example.com/h',
      religion: 'Catholic', religionSourceUrl: 'https://example.com/r', weightKg: 80.04, weightSourceUrl: 'https://example.com/w',
    });
    expect(sourced).toMatchObject({ health: 'Surgery', healthAsOf: '2025-01-02', religion: 'Catholic', weightKg: 80 });
  });

  it('drops a weight that cannot be real, and links that are not https', () => {
    expect(readPerson({ name: 'A', weightKg: 900, weightSourceUrl: 'https://example.com/w' }).weightKg).toBeNull();
    expect(readPerson({ name: 'A', wikiUrl: 'http://example.com', websiteUrl: 'javascript:1' })).toMatchObject({ wikiUrl: null, websiteUrl: null });
  });

  it('leaves the role to the stored one unless a valid role is sent', () => {
    expect(readPerson({ name: 'A' }).role).toBeUndefined();
    expect(readPerson({ name: 'A', role: 'wizard' }).role).toBeUndefined();
    expect(readPerson({ name: 'A', role: 'senator' }).role).toBe('senator');
  });

  it('reads lists, dropping rows that cannot stand', () => {
    const p = readPerson({
      name: 'A',
      earnings: [
        { year: 2025, kind: 'salary', amount: 174000 },
        { year: 2025, kind: 'investments', amountLow: 50000, amountHigh: 15000 },
        { year: 1800, amount: 1 },
        { year: 2025 },
      ],
      contributions: [{ title: 'A law', kind: 'law', date: '2020-02-30', importance: 9 }, { kind: 'law' }],
      properties: [{ name: 'Home', valueLow: 1, valueHigh: 2 }, { name: '' }],
      trips: [{ destination: 'Paris', startDate: '2025-05-01', endDate: '2025-04-01' }, { destination: 'Nowhere' }],
    });
    expect(p.earnings).toHaveLength(2);
    expect(p.earnings![1]).toMatchObject({ amount: null, amountLow: 15000, amountHigh: 50000 });
    expect(p.contributions).toHaveLength(1);
    expect(p.contributions![0]).toMatchObject({ date: null, importance: 3 });
    expect(p.properties).toHaveLength(1);
    expect(p.trips).toEqual([expect.objectContaining({ destination: 'Paris', endDate: null })]);
  });

  it('refuses a list that is not an array', () => {
    expect(() => readPerson({ name: 'A', earnings: 'lots' })).toThrow('earnings must be an array');
  });
});

describe('readMatter', () => {
  const ok = { title: 'SEC v. Someone', status: 'settled', kind: 'insider-trading', sourceUrl: 'https://www.sec.gov/litigation/x.pdf', authority: 'SEC' };

  it('keeps a matter that has a title, a status and an https source', () => {
    expect(readMatter({ ...ok, filedDate: '2020-01-02', resolvedDate: '2021-03-04', penalty: '$1M' })).toMatchObject({ status: 'settled', kind: 'insider-trading', penalty: '$1M' });
  });

  it('never stores a matter without its status or its source', () => {
    expect(readMatter({ ...ok, status: undefined })).toBeNull();
    expect(readMatter({ ...ok, status: 'guilty-ish' })).toBeNull();
    expect(readMatter({ ...ok, sourceUrl: undefined })).toBeNull();
    expect(readMatter({ ...ok, sourceUrl: 'http://example.com/x' })).toBeNull();
    expect(readMatter({ ...ok, title: '' })).toBeNull();
  });

  it('drops a decision day before the filing day', () => {
    expect(readMatter({ ...ok, filedDate: '2021-01-01', resolvedDate: '2020-01-01' })).toMatchObject({ resolvedDate: null });
  });

  it('is read from a person with the check day, and a list that is not an array is refused', () => {
    expect(readPerson({ name: 'A', mattersCheckedDate: '2026-10-10', matters: [ok, { title: 'x' }] })).toMatchObject({ mattersCheckedDate: '2026-10-10' });
    expect(readPerson({ name: 'A', matters: [ok, { title: 'x' }] }).matters).toHaveLength(1);
    expect(() => readPerson({ name: 'A', matters: 'many' })).toThrow('matters must be an array');
  });
});

describe('readImpact', () => {
  const ok = { scores: { efficiency: 1, fiscal: -1.5, distribution: 0, bogus: 2 }, confidence: 'medium', contested: true, basis: 'CBO scored it.', evidenceUrl: 'https://www.cbo.gov/publication/1', assessedDate: '2026-10-10' };

  it('keeps known criteria in range, rounded to half points, with its evidence', () => {
    expect(readImpact(ok)).toEqual({
      scores: { efficiency: 1, fiscal: -1.5, distribution: 0 },
      confidence: 'medium', contested: true, basis: 'CBO scored it.', evidenceUrl: 'https://www.cbo.gov/publication/1', assessedDate: '2026-10-10',
    });
    expect(readImpact({ ...ok, scores: { growth: 1.26, efficiency: 3 } })).toMatchObject({ scores: { growth: 1.5 } });
  });

  it('refuses an assessment without evidence, a confidence or a score', () => {
    expect(readImpact({ ...ok, evidenceUrl: 'http://example.com' })).toBeNull();
    expect(readImpact({ ...ok, evidenceUrl: undefined })).toBeNull();
    expect(readImpact({ ...ok, confidence: 'certain' })).toBeNull();
    expect(readImpact({ ...ok, scores: { efficiency: 'good' } })).toBeNull();
    expect(readImpact(null)).toBeNull();
  });

  it('rides on a contribution in a person', () => {
    const p = readPerson({ name: 'A', contributions: [{ title: 'A law', kind: 'law', impact: ok }, { title: 'Another', kind: 'law', impact: { scores: { growth: 1 } } }] });
    expect(p.contributions![0].impact).not.toBeNull();
    expect(p.contributions![1].impact).toBeNull();
  });
});

describe('readPhase', () => {
  const axis = (score: number) => ({ score, basis: 'Gallup average.', evidenceUrl: 'https://news.gallup.com/poll/116677/', confidence: 'high' });

  it('keeps scored axes with their evidence, and drops the rest', () => {
    const phase = readPhase({
      label: 'President, first term',
      startYear: 2017,
      endYear: 2021,
      axes: {
        standing: axis(2.74),
        misconduct: { score: 4, evidenceUrl: 'http://not-https.example.com', confidence: 'high' },
        social: { score: 3, confidence: 'low' },
        economic: { score: 7, evidenceUrl: 'https://www.cbo.gov/x', confidence: 'medium' },
        appearance: axis(5),
      },
    });
    expect(phase).not.toBeNull();
    expect(Object.keys(phase!.axes)).toEqual(['standing']);
    // Rounded to half points.
    expect(phase!.axes.standing!.score).toBe(2.5);
  });

  it('is nothing without a label or without a single supportable axis', () => {
    expect(readPhase({ axes: { standing: axis(3) } })).toBeNull();
    expect(readPhase({ label: 'X', axes: { standing: { score: 3 } } })).toBeNull();
    expect(readPhase({ label: 'X', axes: {} })).toBeNull();
  });

  it('drops an end year before the start year, and rides on a person', () => {
    expect(readPhase({ label: 'X', startYear: 2021, endYear: 2017, axes: { standing: axis(3) } })).toMatchObject({ startYear: 2021, endYear: null });
    expect(readPerson({ name: 'A', phases: [{ label: 'X', axes: { standing: axis(3) } }, { label: 'Y' }] }).phases).toHaveLength(1);
    expect(() => readPerson({ name: 'A', phases: 'many' })).toThrow('phases must be an array');
  });
});

describe('readResearchNote', () => {
  it('needs a known topic and some words, and defaults the coverage to partial', () => {
    expect(readResearchNote({ topic: 'legal', note: '' })).toBeNull();
    expect(readResearchNote({ topic: 'sports', note: 'x' })).toBeNull();
    expect(readResearchNote({ topic: 'legal', note: 'Swept the House Ethics list.', checkedDate: '2026-10-11' })).toMatchObject({
      topic: 'legal', coverage: 'partial', checkedDate: '2026-10-11', unciteable: [],
    });
  });

  it('keeps only https pages among those that could not be cited', () => {
    const n = readResearchNote({
      topic: 'standing', coverage: 'searched', note: 'Morning Consult chart only.',
      unciteable: [{ url: 'https://morningconsult.com/x', why: 'chart' }, { url: 'http://insecure.example', why: 'x' }, 'junk'],
    });
    expect(n?.coverage).toBe('searched');
    expect(n?.unciteable).toEqual([{ url: 'https://morningconsult.com/x', why: 'chart' }]);
  });

  it('reaches the person input as a list, and an absent list stays absent', () => {
    expect(readPerson({ name: 'A', researchNotes: [{ topic: 'legal', note: 'n' }] }).researchNotes).toHaveLength(1);
    expect(readPerson({ name: 'A' }).researchNotes).toBeUndefined();
  });
});

describe('commonsFileUrl', () => {
  const base = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
  it('drops the utm query a Wikipedia thumbnail URL carried into the file name', () => {
    expect(commonsFileUrl(`${base}Yayoi_Kusama_in_2005.jpg%3Futm_source%3Den.wikipedia.org%26utm_campaign%3Dapi?width=480`)).toBe(`${base}Yayoi_Kusama_in_2005.jpg?width=480`);
  });
  it('leaves a clean URL and other hosts alone', () => {
    expect(commonsFileUrl(`${base}Susan_Collins.jpg?width=480`)).toBe(`${base}Susan_Collins.jpg?width=480`);
    expect(commonsFileUrl('https://example.com/a.jpg%3Fx')).toBe('https://example.com/a.jpg%3Fx');
    expect(commonsFileUrl(null)).toBeNull();
  });
});
