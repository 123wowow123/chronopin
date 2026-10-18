import { describe, expect, it } from 'vitest';
import { isKidsFriendlyProduct, PRODUCT_SHELVES, SHELF_SIZE } from './products';
import type { PinTagJson } from './tags';

const tag = (name: string): PinTagJson => ({ name, kind: 'topic', source: 'user' });

describe('products', () => {
  it('defines valid product shelves with non-empty names and labels', () => {
    expect(PRODUCT_SHELVES.length).toBeGreaterThan(0);
    expect(SHELF_SIZE).toBe(12);
    for (const shelf of PRODUCT_SHELVES) {
      expect(shelf.name).toBeTruthy();
      expect(shelf.label).toBeTruthy();
    }
  });

  describe('isKidsFriendlyProduct', () => {
    it('returns true when kidsFriendly is explicitly true', () => {
      expect(isKidsFriendlyProduct({ kidsFriendly: true })).toBe(true);
    });

    it('returns false when kidsFriendly is explicitly false', () => {
      expect(isKidsFriendlyProduct({ kidsFriendly: false, tags: [tag('Kids')] })).toBe(false);
    });

    it('returns false for Alcoholic Drinks shelf regardless of tags or text', () => {
      expect(isKidsFriendlyProduct({ tags: [tag('Kids')] }, 'Alcoholic Drinks')).toBe(false);
      expect(isKidsFriendlyProduct({ description: 'Delicious drink for kids' }, 'Alcoholic Drinks')).toBe(false);
    });

    it('returns false when pin has alcohol category or alcohol tag', () => {
      expect(isKidsFriendlyProduct({ categories: ['Alcoholic Drinks'], tags: [tag('Kids')] })).toBe(false);
      expect(isKidsFriendlyProduct({ tags: [tag('Beer')], description: 'A family brewery for kids' })).toBe(false);
      expect(isKidsFriendlyProduct({ tags: [tag('cider')], description: 'kid friendly cider' })).toBe(false);
      expect(isKidsFriendlyProduct({ tags: [tag('wine')], description: 'family vineyards' })).toBe(false);
    });

    it('returns false when explicitly marked as not for kids or mature audience', () => {
      expect(isKidsFriendlyProduct({ tags: [tag('Kids')], description: 'Adults only, not for kids' })).toBe(false);
      expect(isKidsFriendlyProduct({ description: 'Rated R and unsuitable for children' })).toBe(false);
    });

    it('detects kids-friendly tags', () => {
      expect(isKidsFriendlyProduct({ tags: [tag('Kids')] })).toBe(true);
      expect(isKidsFriendlyProduct({ tags: [tag('Kids Friendly')] })).toBe(true);
      expect(isKidsFriendlyProduct({ tags: [tag('kid-friendly')] })).toBe(true);
      expect(isKidsFriendlyProduct({ tags: [tag('Children')] })).toBe(true);
      expect(isKidsFriendlyProduct({ tags: [tag('Child Friendly')] })).toBe(true);
      expect(isKidsFriendlyProduct({ tags: [tag('Family Friendly')] })).toBe(true);
      expect(isKidsFriendlyProduct({ tags: [tag('family-friendly')] })).toBe(true);
      expect(isKidsFriendlyProduct({ tags: [tag('Toys')] })).toBe(true);
      expect(isKidsFriendlyProduct({ tags: [tag('Toy')] })).toBe(true);
      expect(isKidsFriendlyProduct({ tags: [tag('Toddler')] })).toBe(true);
      expect(isKidsFriendlyProduct({ tags: [tag('Baby')] })).toBe(true);
    });

    it('works with string arrays for tags', () => {
      expect(isKidsFriendlyProduct({ tags: ['Kids'] as unknown as PinTagJson[] })).toBe(true);
      expect(isKidsFriendlyProduct({ tags: ['Toys'] as unknown as PinTagJson[] })).toBe(true);
      expect(isKidsFriendlyProduct({ tags: ['Family Friendly'] as unknown as PinTagJson[] })).toBe(true);
    });

    it('does not false-positive on unrelated tags containing kid or family', () => {
      expect(isKidsFriendlyProduct({ tags: [tag('Stray Kids')] })).toBe(false);
      expect(isKidsFriendlyProduct({ tags: [tag('Kaito Kid')] })).toBe(false);
      expect(isKidsFriendlyProduct({ tags: [tag('Family Drama')] })).toBe(false);
      expect(isKidsFriendlyProduct({ tags: [tag('Toyota')] })).toBe(false);
    });

    it('detects kids-friendly categories', () => {
      expect(isKidsFriendlyProduct({ categories: ['Kids'] })).toBe(true);
      expect(isKidsFriendlyProduct({ categories: ['Toys'] })).toBe(true);
      expect(isKidsFriendlyProduct({ categories: ['Children'] })).toBe(true);
    });

    it('detects kids-friendly text phrases in title, productName, blurb, and description', () => {
      expect(isKidsFriendlyProduct({ title: 'VTech Kid-Friendly Smartwatch' })).toBe(true);
      expect(isKidsFriendlyProduct({ productName: 'Audio Player for Kids' })).toBe(true);
      expect(isKidsFriendlyProduct({ blurb: 'Designed for children with tactile controls' })).toBe(true);
      expect(isKidsFriendlyProduct({ description: 'A wonderful board game made for kids and family game nights' })).toBe(true);
      expect(isKidsFriendlyProduct({ description: 'Fast-paced, family-friendly card game for 2-4 players' })).toBe(true);
    });

    it('evaluates Tonies Toniebox 2 accurately as kids friendly', () => {
      const toniebox = {
        id: 15646,
        title: 'Tonies Toniebox 2 Wins CES 2026 Best of Innovation in EdTech and Audio',
        productName: 'Tonies Toniebox 2',
        description: 'Tonies took home the CES 2026 Best of Innovation award in EdTech for the Toniebox 2, an innovative screen-free smart audio player for kids that activates curated stories, audiobooks, and music through magnetic character figures.',
        blurb: 'CES 2026 Best of Innovation winner in EdTech: screen-free interactive smart audio storytelling player featuring tactile figurine controls for children.',
        categories: ['Audio', 'Award'],
        tags: [
          tag('Award Winner'),
          tag('CES Innovation Awards'),
          tag('Best of Innovation'),
          tag('EdTech'),
          tag('Exceptional'),
          tag('Kids'),
          tag('Tonies'),
          tag('Top Rated'),
          tag('Toys'),
        ],
      };

      expect(isKidsFriendlyProduct(toniebox, 'Audio')).toBe(true);
    });

    it('evaluates standard electronics and watches as not kids friendly', () => {
      expect(
        isKidsFriendlyProduct(
          {
            title: 'Apple iPhone Duo',
            categories: ['Electronics'],
            tags: [tag('Apple'), tag('Smartphone')],
          },
          'Electronics',
        ),
      ).toBe(false);

      expect(
        isKidsFriendlyProduct(
          {
            title: 'Seiko 145th Anniversary Edo Purple Limited Editions',
            categories: ['Fashion'],
            tags: [tag('Watches'), tag('Seiko')],
          },
          'Watches',
        ),
      ).toBe(false);
    });
  });
});
