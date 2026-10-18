import { describe, expect, it } from 'vitest';
import { hasDining, isDiningScore } from '@/lib/pinDining';
import { parseSearchQuery } from '../util/searchQuery';
import { diningProblem } from './pinDining';

const scores = { food: 4.5, service: 4, ambience: 3.5, value: 3, acclaim: 5 };

describe('isDiningScore', () => {
  it('takes 0 to 5 in half steps and nothing else', () => {
    for (const ok of [0, 0.5, 3, 4.5, 5]) expect(isDiningScore(ok)).toBe(true);
    for (const bad of [-1, 5.5, 3.3, NaN, '4', null, undefined]) expect(isDiningScore(bad)).toBe(false);
  });
});

describe('hasDining', () => {
  it('needs every axis to be a score or null, and one score', () => {
    expect(hasDining(scores)).toBe(true);
    expect(hasDining({ ...scores, acclaim: null })).toBe(true);
    expect(hasDining({ ...scores, acclaim: undefined })).toBe(false);
    expect(hasDining({ food: null, service: null, ambience: null, value: null, acclaim: null })).toBe(false);
    expect(hasDining(null)).toBe(false);
  });
});

describe('diningProblem', () => {
  it('accepts a full body and defaults the source to hand', () => {
    const checked = diningProblem(scores);
    expect(typeof checked).toBe('object');
    if (typeof checked === 'object') expect(checked.source).toBe('hand');
  });

  it('says what is wrong', () => {
    expect(diningProblem({ ...scores, food: 6 })).toMatch(/food must be a number/);
    expect(diningProblem({ food: 4, service: 4 })).toMatch(/ambience must be/);
    expect(diningProblem({ food: null, service: null, ambience: null, value: null, acclaim: null })).toMatch(/At least one axis/);
    expect(diningProblem({ ...scores, source: 'robot' })).toMatch(/source must be/);
  });
});

describe('dining: search term', () => {
  it('reads axes, leaving out names the rubric does not have', () => {
    expect(parseSearchQuery('dining:Food dining:service dining:food dining:parking').dinings).toEqual(['food', 'service']);
    expect(parseSearchQuery('dining:any').dinings).toEqual(['any']);
  });
});
