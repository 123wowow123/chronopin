import { describe, expect, it } from 'vitest';
import { hasCarPerf, isCarPerfScore } from '@/lib/pinCarPerf';
import { carPerfProblem } from './pinCarPerf';

const scores = { range: 4, charging: 4.5, acceleration: 3, assistance: 4, space: 3.5, value: 5 };

describe('isCarPerfScore', () => {
  it('takes 0 to 5 in half steps and nothing else', () => {
    for (const ok of [0, 0.5, 3, 4.5, 5]) expect(isCarPerfScore(ok)).toBe(true);
    for (const bad of [-1, 5.5, 3.3, NaN, '4', null, undefined]) expect(isCarPerfScore(bad)).toBe(false);
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
