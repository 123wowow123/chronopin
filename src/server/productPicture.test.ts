import { describe, expect, it } from 'vitest';
import { isProductArticle } from './productPicture';

describe('isProductArticle', () => {
  it('takes the product itself, qualified or named with its maker', () => {
    expect(isProductArticle('iPhone', 'Apple', 'iPhone')).toBe(true);
    expect(isProductArticle('Tesla Cybertruck', 'Tesla, Inc.', 'Cybertruck')).toBe(true);
    expect(isProductArticle('Tesla Roadster (first generation)', 'Tesla', 'Roadster')).toBe(true);
    expect(isProductArticle('Dragonfly (Titan space probe)', 'NASA', 'Dragonfly')).toBe(true);
  });

  it('refuses an article that only shares a word', () => {
    expect(isProductArticle('Odette Annable', 'Odette', 'Odette')).toBe(false);
    expect(isProductArticle('Roadster', 'Tesla', 'Model 3')).toBe(false);
    expect(isProductArticle('Tesla, Inc.', 'Tesla', 'Cybertruck')).toBe(false);
  });
});
