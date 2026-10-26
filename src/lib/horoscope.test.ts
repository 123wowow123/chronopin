import { describe, expect, it } from 'vitest';
import { sunSign } from './horoscope';

describe('sunSign', () => {
  it('reads the sign from the month and day', () => {
    expect(sunSign('1990-03-21')?.name).toBe('Aries');
    expect(sunSign('1990-03-20')?.name).toBe('Pisces');
    expect(sunSign('1985-12-31')?.name).toBe('Capricorn');
    expect(sunSign('1985-01-19')?.name).toBe('Capricorn');
    expect(sunSign('1985-01-20')?.name).toBe('Aquarius');
    expect(sunSign('2000-10-26')?.name).toBe('Scorpio');
  });
  it('is null without a birthday', () => {
    expect(sunSign(null)).toBeNull();
    expect(sunSign('')).toBeNull();
  });
});
