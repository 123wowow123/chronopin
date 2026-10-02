import { describe, expect, it } from 'vitest';
import { adProblem, asinOf, sameBrand } from './adQuality';

const good = { title: 'Tamiya 18710 JR Starter Pack', brand: 'TAMIYA', price: 24.69, rating: 4.6, reviewCount: 304, available: true };

describe('adProblem', () => {
  it('passes a well-reviewed branded product in stock', () => expect(adProblem(good)).toBeNull());
  it('rejects thin or poor reviews, no brand, and out of stock', () => {
    expect(adProblem({ ...good, reviewCount: 40 })).toMatch(/reviews/);
    expect(adProblem({ ...good, rating: 3.9 })).toMatch(/rated/);
    expect(adProblem({ ...good, brand: null })).toMatch(/brand/);
    expect(adProblem({ ...good, rating: null, reviewCount: null })).toMatch(/no reviews/);
    expect(adProblem({ ...good, available: false, price: null })).toMatch(/stock/);
  });
});

describe('asinOf', () => {
  it('reads the ASIN from the product link forms, tracking noise ignored', () => {
    expect(asinOf('https://www.amazon.com/Tamiya-18710-Starter-Balanced-Rowdy/dp/B082V7DYQV/ref=sr_1_1?dib=abc&keywords=Mini+4WD')).toBe('B082V7DYQV');
    expect(asinOf('https://amazon.com/gp/product/b082v7dyqv?tag=x')).toBe('B082V7DYQV');
  });
  it('rejects other stores and non-product pages', () => {
    expect(asinOf('https://www.amazon.co.uk/dp/B082V7DYQV')).toBeNull();
    expect(asinOf('https://www.amazon.com/s?k=mini+4wd')).toBeNull();
    expect(asinOf('https://example.com/dp/B082V7DYQV')).toBeNull();
  });
});

describe('sameBrand', () => {
  it('matches a maker however it is written', () => {
    expect(sameBrand('TAMIYA', 'Tamiya Inc.')).toBe(true);
    expect(sameBrand('Sony', 'Sony Interactive Entertainment')).toBe(true);
    expect(sameBrand('BANDAI SPIRITS', 'Bandai Namco Holdings')).toBe(true);
    expect(sameBrand('Bandai Hobby', 'Bandai Namco Entertainment')).toBe(true);
    expect(sameBrand('Visit the LEGO Store'.replace(/^Visit the | Store$/g, ''), 'The LEGO Group')).toBe(true);
  });
  it('does not match different makers or nothing', () => {
    expect(sameBrand('Bandai', 'Tamiya')).toBe(false);
    expect(sameBrand('Sonic', 'Sony')).toBe(false);
    expect(sameBrand(null, 'Tamiya')).toBe(false);
  });
});
