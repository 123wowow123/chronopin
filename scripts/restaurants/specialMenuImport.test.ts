import { describe, expect, it } from 'vitest';
import { importSpecialMenu } from './specialMenuImport';

describe('published specials menu import', () => {
  it('uses the happy-hour variation rather than a regular price or another promotion', () => {
    const result = importSpecialMenu({ title: 'À la Carte & Happy Hour Menu', sections: [{ title: 'Food', items: [
      { title: 'Edamame', price: '5', variationGroups: [{ items: [{ title: 'Happy Hour', price: '4' }] }] },
      { title: 'Crab cake', price: '23', variationGroups: [{ items: [{ title: 'Regular', price: '23' }, { title: 'Happy Hour', price: '20' }] }] },
      { title: 'Taco', price: '3', variationGroups: [{ items: [{ title: 'Taco Tuesday', price: '2' }] }] },
      { title: 'Regular-only dish', price: '9' },
    ] }] });
    expect(result.items).toEqual([{ name: 'Edamame', category: 'Food', price: 4 }, { name: 'Crab cake', category: 'Food', price: 20 }]);
    expect(result.full).toBe(false);
  });
  it('preserves portion-specific prices and leaves unpublished prices out', () => {
    const result = importSpecialMenu({ title: 'Happy Hour', sections: [{ title: 'Food', items: [
      { title: 'Oysters', price: null, variationGroups: [{ items: [{ title: 'Half dozen', price: '16' }, { title: 'Dozen', price: '32' }] }] },
      { title: 'Unknown price', price: null }, { title: 'Placeholder', price: 0 }, { title: 'Market price', price: 'MP' },
    ] }] });
    expect(result.items).toEqual([{ name: 'Oysters — Half dozen', category: 'Food', price: 16 }, { name: 'Oysters — Dozen', category: 'Food', price: 32 }]);
  });
  it('shows a published reduction without treating a regular price as the special price', () => {
    const result = importSpecialMenu({ title: 'Happy Hour', sections: [
      { title: 'Burgers', description: '$5 off', items: [{ title: 'Burger', price: '22' }] },
      { title: '1/2 Off Pizza', items: [{ title: 'Margherita', price: '20' }] },
    ] });
    expect(result.items).toEqual([{ name: 'Burger', category: 'Burgers', priceLabel: '$5 off regular price' }, { name: 'Margherita', category: '1/2 Off Pizza', priceLabel: '50% off regular price' }]);
  });
  it('excludes a separate brunch before the happy-hour section and retains surcharges', () => {
    const result = importSpecialMenu({ title: 'Happy Hour', sections: [
      { title: 'Brunch', items: [{ title: 'Bottomless brunch', price: '30' }] },
      { title: 'Happy Hour Menu', description: 'Dine-in only', items: [] },
      { title: 'Tapas', items: [{ title: 'Deviled egg', price: '1.50' }] },
      { title: 'Surcharge', description: 'A 3.5% surcharge is added to checks.', items: [] },
    ] });
    expect(result.items).toEqual([{ name: 'Deviled egg', category: 'Tapas', price: 1.5 }]);
    expect(result.conditions).toEqual(['Published menu lists a 3.5% surcharge.', 'Dine-in only.']);
  });
});
