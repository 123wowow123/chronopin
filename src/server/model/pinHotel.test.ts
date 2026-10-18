import { describe, expect, it } from 'vitest';
import { hasHotel, isHotelScore } from '@/lib/pinHotel';
import { parseSearchQuery } from '../util/searchQuery';
import { hotelProblem } from './pinHotel';

const scores = { rooms: 4.5, service: 4, location: 3.5, cleanliness: 4.5, value: 3, acclaim: 5 };
const allNull = { rooms: null, service: null, location: null, cleanliness: null, value: null, acclaim: null };

describe('isHotelScore', () => {
  it('takes 0 to 5 in half steps and nothing else', () => {
    for (const ok of [0, 0.5, 3, 4.5, 5]) expect(isHotelScore(ok)).toBe(true);
    for (const bad of [-1, 5.5, 3.3, NaN, '4', null, undefined]) expect(isHotelScore(bad)).toBe(false);
  });
});

describe('hasHotel', () => {
  it('needs every axis to be a score or null, and one score', () => {
    expect(hasHotel(scores)).toBe(true);
    expect(hasHotel({ ...scores, acclaim: null })).toBe(true);
    expect(hasHotel({ ...scores, acclaim: undefined })).toBe(false);
    expect(hasHotel(allNull)).toBe(false);
    expect(hasHotel(null)).toBe(false);
  });
});

describe('hotelProblem', () => {
  it('accepts a full body and defaults the source to hand', () => {
    const checked = hotelProblem(scores);
    expect(typeof checked).toBe('object');
    if (typeof checked === 'object') expect(checked.source).toBe('hand');
  });

  it('says what is wrong', () => {
    expect(hotelProblem({ ...scores, rooms: 6 })).toMatch(/rooms must be a number/);
    expect(hotelProblem({ rooms: 4, service: 4 })).toMatch(/location must be/);
    expect(hotelProblem(allNull)).toMatch(/At least one axis/);
    expect(hotelProblem({ ...scores, source: 'robot' })).toMatch(/source must be/);
  });
});

describe('hotel: search term', () => {
  it('reads axes, leaving out names the rubric does not have', () => {
    expect(parseSearchQuery('hotel:Rooms hotel:service hotel:rooms hotel:parking').hotels).toEqual(['rooms', 'service']);
    expect(parseSearchQuery('hotel:any').hotels).toEqual(['any']);
  });
});
