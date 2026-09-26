import { describe, expect, it } from 'vitest';
import { searchModelFor } from './searchPin';

describe('searchModelFor', () => {
  it('reads English text on an English page with the English model', () => {
    expect(searchModelFor('iphone launch')).toBe('en');
    expect(searchModelFor('Nausicaä café', 'en')).toBe('en');
  });

  it('reads any search from a page in another language with the multilingual one', () => {
    expect(searchModelFor('Gucci', 'zh')).toBe('multi');
    expect(searchModelFor('premio Nobel', 'es')).toBe('multi');
  });

  it('reads text in a script English does not use with the multilingual one, whatever the page', () => {
    expect(searchModelFor('台积电', 'en')).toBe('multi');
    expect(searchModelFor('Москва')).toBe('multi');
  });
});
