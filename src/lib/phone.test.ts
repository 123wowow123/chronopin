import { describe, expect, it } from 'vitest';
import { normalizePhone, phoneProblem } from './phone';

describe('phoneProblem', () => {
  it('lets an optional phone number go unanswered', () => {
    expect(phoneProblem(undefined)).toBeUndefined();
    expect(phoneProblem(null)).toBeUndefined();
    expect(phoneProblem('')).toBeUndefined();
    expect(phoneProblem('   ')).toBeUndefined();
  });

  it('takes a number however it is punctuated', () => {
    expect(phoneProblem('+1 (415) 555-0132')).toBeUndefined();
    expect(phoneProblem('020 7946 0958')).toBeUndefined();
    expect(phoneProblem('+81.3.1234.5678')).toBeUndefined();
    expect(phoneProblem('5550132')).toBeUndefined();
  });

  it('refuses anything that is not a number', () => {
    expect(phoneProblem('call me')).toBe('format');
    expect(phoneProblem('555-0132 ext 4')).toBe('format');
    expect(phoneProblem('1+415 555 0132')).toBe('format');
    expect(phoneProblem(4155550132)).toBe('format');
  });

  it('refuses too few or too many digits', () => {
    expect(phoneProblem('555-013')).toBe('format');
    expect(phoneProblem('+1234567890123456')).toBe('format');
  });
});

describe('normalizePhone', () => {
  it('tidies the whitespace and turns nothing into null', () => {
    expect(normalizePhone('  +44  20 7946\t0958 ')).toBe('+44 20 7946 0958');
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('  ')).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});
