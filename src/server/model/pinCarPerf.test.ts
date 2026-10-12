import { describe, expect, it } from 'vitest';
import { CAR_PERF_RUBRIC_YEAR, hasCarPerf, isCarPerfScore } from '@/lib/pinCarPerf';
import { isRubricYear, rubricYearProblem } from '@/lib/rubricYear';
import { carPerfProblem } from './pinCarPerf';

const scores = { range: 4, charging: 4.5, acceleration: 3, assistance: 4, space: 3.5, value: 5 };

describe('isCarPerfScore', () => {
  it('takes 0 to 5 in half steps and nothing else', () => {
    for (const ok of [0, 0.5, 3, 4.5, 5]) expect(isCarPerfScore(ok)).toBe(true);
    for (const bad of [-1, 5.5, 3.3, NaN, '4', null, undefined]) expect(isCarPerfScore(bad)).toBe(false);
  });
});

describe('rubric year', () => {
  it('is a whole year from 2020 to 2100', () => {
    for (const ok of [2020, 2026, 2028, 2100]) expect(isRubricYear(ok)).toBe(true);
    for (const bad of [2019, 2101, 2026.5, NaN, '2026', null, undefined]) expect(isRubricYear(bad)).toBe(false);
    expect(Number.isInteger(CAR_PERF_RUBRIC_YEAR) && isRubricYear(CAR_PERF_RUBRIC_YEAR)).toBe(true);
  });

  it('is undefined when the body has none, so the caller decides what absent means', () => {
    expect(rubricYearProblem(undefined)).toBeUndefined();
    expect(rubricYearProblem(null)).toBeUndefined();
    expect(rubricYearProblem(2028)).toBe(2028);
    expect(rubricYearProblem('2026')).toMatch(/rubricYear must be a whole year from 2020 to 2100/);
    expect(rubricYearProblem(1999)).toMatch(/rubricYear must be/);
  });
});

describe('hasCarPerf', () => {
  it('needs every axis to be a score or null, and one score', () => {
    expect(hasCarPerf(scores)).toBe(true);
    expect(hasCarPerf({ ...scores, charging: null })).toBe(true);
    expect(hasCarPerf({ ...scores, charging: undefined })).toBe(false);
    expect(hasCarPerf({ ...scores, value: 7 })).toBe(false);
    expect(hasCarPerf({ range: null, charging: null, acceleration: null, assistance: null, space: null, value: null })).toBe(false);
    expect(hasCarPerf(null)).toBe(false);
  });
});

describe('carPerfProblem', () => {
  it('reads the six scores, the source and the basis', () => {
    expect(carPerfProblem({ ...scores, source: 'session', basis: ' CLTC 800 km, 0-100 in 3.9 s. ', sourceUrl: 'https://example.com/specs' })).toEqual({
      scores,
      source: 'session',
      basis: 'CLTC 800 km, 0-100 in 3.9 s.',
      sourceUrl: 'https://example.com/specs',
    });
  });

  it('keeps an unpublished spec as null', () => {
    expect(carPerfProblem({ ...scores, charging: null })).toMatchObject({ scores: { ...scores, charging: null } });
  });

  it('wants every axis present, null or a score', () => {
    expect(carPerfProblem({ ...scores, charging: undefined })).toMatch(/charging must be a number from 0 to 5 in half steps, or null/);
    expect(carPerfProblem({ ...scores, range: 5.5 })).toMatch(/range must be a number/);
    expect(carPerfProblem({ ...scores, value: '4' })).toMatch(/value must be a number/);
  });

  it('refuses a rubric with nothing scored', () => {
    expect(carPerfProblem({ range: null, charging: null, acceleration: null, assistance: null, space: null, value: null })).toMatch(/At least one axis/);
  });

  it('keeps road-test reviews, once each, and refuses a bad one', () => {
    const review = { url: 'https://example.com/r', title: 'Road test', publishedDate: '2026-09-30', quote: 'Quick and quiet.' };
    expect(carPerfProblem({ ...scores, reviews: [review, review] })).toMatchObject({ reviews: [review] });
    expect(carPerfProblem({ ...scores, reviews: [{ url: 'https://example.com/r' }] })).toMatchObject({
      reviews: [{ url: 'https://example.com/r', title: null, publishedDate: null, quote: null }],
    });
    expect(carPerfProblem({ ...scores, reviews: [{ ...review, publishedDate: null, quote: '' }] })).toMatchObject({ reviews: [{ publishedDate: null, quote: null }] });
    expect(carPerfProblem({ ...scores, reviews: [{ url: 'javascript:1' }] })).toMatch(/needs an http/);
    expect(carPerfProblem({ ...scores, reviews: [{ url: 'http://' }] })).toMatch(/needs an http/);
    expect(carPerfProblem({ ...scores, reviews: [{ ...review, publishedDate: '30/09/2026' }] })).toMatch(/YYYY-MM-DD/);
    expect(carPerfProblem({ ...scores, reviews: [{ ...review, publishedDate: '2026-13-45' }] })).toMatch(/YYYY-MM-DD/);
    expect(carPerfProblem({ ...scores, reviews: [{ ...review, quote: 'x'.repeat(300) }] })).toMatchObject({ reviews: [{ quote: 'x'.repeat(300) }] });
    expect(carPerfProblem({ ...scores, reviews: [{ ...review, quote: 'x'.repeat(301) }] })).toMatch(/quote is a string of at most 300/);
    expect(carPerfProblem({ ...scores, reviews: [{ ...review, title: 'x'.repeat(301) }] })).toMatch(/title is a string/);
    expect(carPerfProblem({ ...scores, reviews: Array.from({ length: 7 }, (_, i) => ({ url: `https://example.com/${i}` })) })).toMatch(/at most 6/);
    expect(carPerfProblem({ ...scores, reviews: 'https://example.com' })).toMatch(/at most 6/);
  });

  it('leaves reviews undefined when the body has none, and takes [] as clearing them', () => {
    expect(carPerfProblem(scores)).toMatchObject({ reviews: undefined });
    expect(carPerfProblem({ ...scores, reviews: [] })).toMatchObject({ reviews: [] });
    expect(carPerfProblem({ ...scores, reviews: null })).toMatchObject({ reviews: [] });
  });

  it('reads the rubric year, and leaves it undefined when the body has none', () => {
    expect(carPerfProblem({ ...scores, rubricYear: 2028 })).toMatchObject({ rubricYear: 2028 });
    expect(carPerfProblem(scores)).toMatchObject({ rubricYear: undefined });
    expect(carPerfProblem({ ...scores, rubricYear: null })).toMatchObject({ rubricYear: undefined });
    expect(carPerfProblem({ ...scores, rubricYear: 2019 })).toMatch(/rubricYear must be a whole year/);
    expect(carPerfProblem({ ...scores, rubricYear: 2026.5 })).toMatch(/rubricYear must be a whole year/);
    expect(carPerfProblem({ ...scores, rubricYear: '2026' })).toMatch(/rubricYear must be a whole year/);
    expect(carPerfProblem({ ...scores, rubricYear: 2101 })).toMatch(/rubricYear must be a whole year/);
  });

  it('defaults to a hand row', () => {
    const checked = carPerfProblem(scores);
    expect(typeof checked === 'object' && checked.source).toBe('hand');
  });

  it('refuses an unknown source, a long basis and a source link that is not a web address', () => {
    expect(carPerfProblem({ ...scores, source: 'steam' })).toMatch(/source must be one of/);
    expect(carPerfProblem({ ...scores, basis: 'x'.repeat(1001) })).toMatch(/basis is at most 1000/);
    expect(carPerfProblem({ ...scores, sourceUrl: 'javascript:alert(1)' })).toMatch(/not a web address/);
  });
});
